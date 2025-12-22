const { fetchResultMysql, transaction } = require("libs/db");
const stockFunctions = require("./stock-functions");
const cxcStorage = require("../cuentasPorCobrar/storage-functions");

const getPurchases = fetchResultMysql(
  (
    {
      empresa_id,
      id,
      producto_codigo,
      producto_descripcion,
      producto_serie,
      producto_categoria,
      producto_estado,
      cliente_nombre,
      cliente_nit,
      cliente_email,
      usuario_nombre,
      estado_venta,
      tipo_precio_aplicado,
      fecha_inicio,
      fecha_fin,
      metodo_pago,
    },
    connection
  ) =>
    connection.execute(
      `
      SELECT *
      FROM vista_ventas_completas
      WHERE (? IS NULL OR empresa_id = ?)
        AND (? IS NULL OR id = ?)
        AND (? IS NULL OR producto_codigo LIKE CONCAT('%', ?, '%'))
        AND (? IS NULL OR producto_descripcion LIKE CONCAT('%', ?, '%'))
        AND (? IS NULL OR producto_serie LIKE CONCAT('%', ?, '%'))
        AND (? IS NULL OR producto_categoria LIKE CONCAT('%', ?, '%'))
        AND (? IS NULL OR producto_estado = ?)
        AND (? IS NULL OR cliente_nombre LIKE CONCAT('%', ?, '%'))
        AND (? IS NULL OR cliente_nit = ?)
        AND (? IS NULL OR cliente_email LIKE CONCAT('%', ?, '%'))
        AND (? IS NULL OR usuario_nombre LIKE CONCAT('%', ?, '%'))
        AND (? IS NULL OR estado_venta = ?)
        AND (? IS NULL OR tipo_precio_aplicado = ?)        
        AND (
          (? IS NULL AND ? IS NULL) 
          OR 
          (DATE(fecha_venta) BETWEEN ? AND ?)          
        )
          AND (? IS NULL OR metodos_pago = ?)        
      ORDER BY fecha_venta DESC
      `,
      [
        empresa_id || null,
        empresa_id || null,
        id || null,
        id || null,
        producto_codigo || null,
        producto_codigo || null,
        producto_descripcion || null,
        producto_descripcion || null,
        producto_serie || null,
        producto_serie || null,
        producto_categoria || null,
        producto_categoria || null,
        producto_estado || null,
        producto_estado || null,
        cliente_nombre || null,
        cliente_nombre || null,
        cliente_nit || null,
        cliente_nit || null,
        cliente_email || null,
        cliente_email || null,
        usuario_nombre || null,
        usuario_nombre || null,
        estado_venta || null,
        estado_venta || null,
        tipo_precio_aplicado || null,
        tipo_precio_aplicado || null,
        fecha_inicio || null,
        fecha_fin || null,
        fecha_inicio || null,
        fecha_fin || null,
        metodo_pago || null,
        metodo_pago || null,
      ]
    ),
  { singleResult: false }
);

// A partir del nuevo esquema, el stock y su validación viven exclusivamente
// en la base de datos (triggers/vistas). Dejamos de consultar `productos_stock`
// para validar cantidades disponibles desde el backend.

// Validar que los productos no estén en transferencias en estado borrador
const validateProductosNoEnTransferenciasBorrador = transaction(
  async ({ producto_ids, empresa_id }, connection) => {
    if (!producto_ids || producto_ids.length === 0) {
      return; // No hay productos que validar
    }

    // Buscar productos que estén en transferencias en estado 'borrador'
    const placeholders = producto_ids.map(() => "?").join(",");
    const [productosEnBorrador] = await connection.execute(
      `
      SELECT DISTINCT
        p.id AS producto_id,
        p.codigo AS producto_codigo,
        p.descripcion AS producto_descripcion,
        t.id AS transferencia_id,
        t.estado AS transferencia_estado,
        t.empresa_origen_id,
        t.empresa_destino_id
      FROM productos p
      INNER JOIN transferencias_inventario_detalle td ON td.producto_id = p.id
      INNER JOIN transferencias_inventario t ON t.id = td.transferencia_id
      WHERE p.id IN (${placeholders})
        AND t.estado = 'borrador'
        AND (t.empresa_origen_id = ? OR t.empresa_destino_id = ?)
      `,
      [...producto_ids, empresa_id, empresa_id]
    );

    // productosEnBorrador es un array, verificar si tiene elementos
    if (
      productosEnBorrador &&
      Array.isArray(productosEnBorrador) &&
      productosEnBorrador.length > 0
    ) {
      const productosList = productosEnBorrador
        .map(
          (p) =>
            `${p.producto_codigo || p.producto_id} (${
              p.producto_descripcion || "Sin descripción"
            })`
        )
        .join(", ");
      throw new Error(
        `No se puede realizar la venta: los siguientes productos están en transferencias en estado 'borrador': ${productosList}. Por favor, confirme o cancele las transferencias antes de realizar la venta.`
      );
    }
  }
);

const createVenta = transaction(
  async (
    {
      empresa_id,
      cliente_id,
      usuario_id,
      total,
      estado = "vendido",
      comentario,
      detalles,
    },
    connection
  ) => {
    // Validar que los productos no estén en transferencias en estado borrador
    if (detalles && detalles.length > 0) {
      const producto_ids = detalles.map((d) => d.producto_id);
      await validateProductosNoEnTransferenciasBorrador(
        { producto_ids, empresa_id },
        connection
      );
    }

    // estado_pago se establece como 'pendiente' por defecto (definido en el schema)
    // Se actualizará automáticamente cuando se creen pagos
    await connection.execute(
      `
      INSERT INTO ventas (
        empresa_id, cliente_id, usuario_id, total, estado, estado_pago, moneda_id, comentario
      ) VALUES (?, ?, ?, ?, ?, 'pendiente', 1, ?)
      `,
      [empresa_id, cliente_id, usuario_id, total, estado, comentario || null]
    );

    const [ventaResult] = await connection.execute(
      "SELECT * FROM ventas WHERE id = LAST_INSERT_ID()"
    );
    const venta = ventaResult[0];

    // Los movimientos de inventario por venta ahora son responsabilidad
    // exclusiva de los triggers de base de datos (por ejemplo,
    // `trg_registrar_movimiento_por_venta_ai`), no del código.

    // Sincronizar cuenta por cobrar si la venta está en estado 'vendido'
    if (estado === "vendido") {
      try {
        await cxcStorage.syncCuentaPorCobrarFromVentaInternal(
          { venta_id: venta.id },
          connection
        );
      } catch (error) {
        // Log error but don't fail the transaction
        console.error("Error syncing CXC from venta:", error);
      }
    }

    return venta;
  }
);

const createDetalleVenta = fetchResultMysql(
  async (
    {
      venta_id,
      producto_id,
      cantidad,
      precio_unitario,
      subtotal,
      tipo_precio_aplicado,
    },
    connection
  ) => {
    await connection.execute(
      `
      INSERT INTO detalles_ventas (
        venta_id, producto_id, cantidad, precio_unitario, subtotal, tipo_precio_aplicado
      ) VALUES (?, ?, ?, ?, ?, ?)
      `,
      [
        venta_id,
        producto_id,
        cantidad,
        precio_unitario,
        subtotal,
        tipo_precio_aplicado,
      ]
    );
    const [result] = await connection.execute(
      "SELECT * FROM detalles_ventas WHERE id = LAST_INSERT_ID()"
    );
    return result;
  },
  { singleResult: true }
);

const deleteVenta = transaction(async ({ venta_id }, connection) => {
  // First, get the record before deleting it
  const [existingRecord] = await connection.execute(
    "SELECT * FROM ventas WHERE id = ?",
    [venta_id]
  );

  if (existingRecord.length === 0) {
    throw new Error("Venta not found");
  }

  // Eliminar la cuenta por cobrar asociada si existe
  // Nota: Con ON DELETE CASCADE en la constraint, esto se hará automáticamente,
  // pero lo hacemos explícitamente para mejor control y logging
  try {
    const [cxcRows] = await connection.execute(
      "SELECT id FROM cuentas_por_cobrar WHERE venta_id = ?",
      [venta_id]
    );

    if (cxcRows && cxcRows.length > 0) {
      // Eliminar la CXC relacionada (los abonos se eliminarán automáticamente por ON DELETE CASCADE)
      await connection.execute(
        "DELETE FROM cuentas_por_cobrar WHERE venta_id = ?",
        [venta_id]
      );
    }
  } catch (error) {
    console.error("Error al eliminar CXC al eliminar venta:", error);
    // Si la constraint CASCADE está activa, la base de datos eliminará las CxC automáticamente
    // No lanzar error para no bloquear la eliminación de la venta
  }

  // Delete the record
  await connection.execute(`DELETE FROM ventas WHERE id = ?`, [venta_id]);

  // Return the deleted record
  return existingRecord;
});

const updateVenta = transaction(async ({ venta_id, estado }, connection) => {
  await connection.execute(
    `
      INSERT INTO ventas (
        empresa_id, cliente_id, usuario_id, total, estado, moneda_id, comentario
      )
      SELECT empresa_id, cliente_id, usuario_id, total, ?, moneda_id, comentario
      FROM ventas
      WHERE id = ?
      `,
    [estado, venta_id]
  );
  const [result] = await connection.execute(
    "SELECT * FROM ventas WHERE id = LAST_INSERT_ID()"
  );
  const nuevaVenta = result[0];

  // Sincronizar CXC si la nueva venta está en estado 'vendido'
  if (estado === "vendido") {
    try {
      await cxcStorage.syncCuentaPorCobrarFromVentaInternal(
        { venta_id: nuevaVenta.id },
        connection
      );
    } catch (error) {
      console.error("Error syncing CXC on venta update:", error);
    }
  }

  return nuevaVenta;
});

const replaceDetallesVenta = fetchResultMysql(
  async ({ venta_id, detalle }, connection) => {
    // Eliminar los detalles actuales
    await connection.execute(`DELETE FROM detalles_ventas WHERE venta_id = ?`, [
      venta_id,
    ]);

    // Insertar los nuevos detalles
    for (const item of detalle) {
      await connection.execute(
        `
        INSERT INTO detalles_ventas (
          venta_id, producto_id, cantidad, precio_unitario, subtotal, tipo_precio_aplicado
        ) VALUES (?, ?, ?, ?, ?, ?)
        `,
        [
          venta_id,
          item.producto_id,
          item.cantidad,
          item.precio_unitario,
          item.subtotal,
          item.tipo_precio_aplicado,
        ]
      );
    }

    return { success: true };
  },
  { singleResult: true }
);

const getVentaById = fetchResultMysql(
  ({ venta_id }, connection) =>
    connection.execute(`SELECT * FROM ventas WHERE id = ?`, [venta_id]),
  { singleResult: true }
);

const getDetallesVentaByVentaId = fetchResultMysql(
  ({ venta_id }, connection) =>
    connection.execute(`SELECT * FROM detalles_ventas WHERE venta_id = ?`, [
      venta_id,
    ]),
  { singleResult: false }
);

const cancelarVenta = transaction(async ({ venta_id }, connection) => {
  await connection.execute(
    `UPDATE ventas SET estado = 'cancelado' WHERE id = ?`,
    [venta_id]
  );

  // Sincronizar CXC para anularla si existe
  try {
    await cxcStorage.syncCuentaPorCobrarFromVentaInternal(
      { venta_id },
      connection
    );
  } catch (error) {
    console.error("Error syncing CXC on cancel:", error);
  }

  const [result] = await connection.execute(
    "SELECT * FROM ventas WHERE id = ?",
    [venta_id]
  );
  return result[0];
});

const crearMovimientoDevolucion = async ({
  empresa_id,
  producto_id,
  usuario_id,
  cantidad,
  comentario,
  referencia,
}) => {
  // Registrar el movimiento de devolución. El ajuste de stock real
  // lo realiza la base de datos mediante triggers sobre movimientos_inventario.
  return await stockFunctions.createInventoryMovementWithStock({
    empresa_id,
    producto_id,
    usuario_id,
    tipo_movimiento: "devolucion",
    cantidad,
    comentario,
    referencia,
  });
};

const getPurchasesFlat = fetchResultMysql(
  (
    {
      empresa_id,
      id,
      cliente_nombre,
      cliente_nit,
      cliente_email,
      usuario_nombre,
      estado_venta,
      fecha_venta,
    },
    connection
  ) =>
    connection.execute(
      `
      SELECT * FROM vista_ventas_detalle_anidado
      WHERE (? IS NULL OR empresa_id = ?)
        AND (? IS NULL OR id = ?)
        AND (? IS NULL OR cliente_nombre LIKE CONCAT('%', ?, '%'))
        AND (? IS NULL OR cliente_nit = ?)
        AND (? IS NULL OR cliente_email LIKE CONCAT('%', ?, '%'))
        AND (? IS NULL OR usuario_nombre LIKE CONCAT('%', ?, '%'))
        AND (? IS NULL OR estado_venta = ?)
        AND (? IS NULL OR DATE(fecha_venta) = ?)
      ORDER BY fecha_venta DESC
      `,
      [
        empresa_id || null,
        empresa_id || null,
        id || null,
        id || null,
        cliente_nombre || null,
        cliente_nombre || null,
        cliente_nit || null,
        cliente_nit || null,
        cliente_email || null,
        cliente_email || null,
        usuario_nombre || null,
        usuario_nombre || null,
        estado_venta || null,
        estado_venta || null,
        fecha_venta || null,
        fecha_venta || null,
      ]
    ),
  { singleResult: false }
);

const copiarDetallesVenta = fetchResultMysql(
  ({ venta_id_original, venta_id_nueva }, connection) =>
    connection.execute(
      `
      INSERT INTO detalles_ventas (
        venta_id, producto_id, cantidad, precio_unitario, subtotal, tipo_precio_aplicado
      )
      SELECT ?, producto_id, cantidad, precio_unitario, subtotal, tipo_precio_aplicado
      FROM detalles_ventas
      WHERE venta_id = ?
      `,
      [venta_id_nueva, venta_id_original]
    ),
  { singleResult: false }
);

const updateVentaStatus = transaction(
  async ({ venta_id, estado }, connection) => {
    await connection.execute(
      `
        UPDATE ventas
        SET estado = ?         
        WHERE id = ?
        `,
      [estado, venta_id]
    );

    // Sincronizar CXC si la venta está en estado 'vendido' o fue cancelada
    if (estado === "vendido" || estado === "cancelado") {
      try {
        await cxcStorage.syncCuentaPorCobrarFromVentaInternal(
          { venta_id },
          connection
        );
      } catch (error) {
        console.error("Error syncing CXC on status update:", error);
      }
    }

    const [result] = await connection.execute(
      "SELECT * FROM ventas WHERE id = ?",
      [venta_id]
    );
    return result[0];
  }
);

const updateSale = transaction(
  async (
    { venta_id, empresa_id, cliente_id, usuario_id, total, estado, detalle },
    connection
  ) => {
    await connection.execute(
      `
      UPDATE ventas
      SET empresa_id = ?,
          cliente_id = ?,
          usuario_id = ?,
          total = ?,
          estado = ?
      WHERE id = ?
      `,
      [empresa_id, cliente_id, usuario_id, total, estado, venta_id]
    );

    // Delete existing details
    await connection.execute(`DELETE FROM detalles_ventas WHERE venta_id = ?`, [
      venta_id,
    ]);

    // Insert new details
    for (const item of detalle) {
      await connection.execute(
        `
        INSERT INTO detalles_ventas (
          venta_id, producto_id, cantidad, precio_unitario, subtotal, tipo_precio_aplicado
        ) VALUES (?, ?, ?, ?, ?, ?)
        `,
        [
          venta_id,
          item.producto_id,
          item.cantidad,
          item.precio_unitario,
          item.subtotal,
          item.tipo_precio_aplicado,
        ]
      );
    }

    // Sincronizar CXC si la venta está en estado 'vendido'
    if (estado === "vendido") {
      try {
        await cxcStorage.syncCuentaPorCobrarFromVentaInternal(
          { venta_id },
          connection
        );
      } catch (error) {
        console.error("Error syncing CXC on sale update:", error);
      }
    }

    const [result] = await connection.execute(
      "SELECT * FROM ventas WHERE id = ?",
      [venta_id]
    );
    return result[0];
  }
);

// Payment functions
const getVentaByIdWithPayments = fetchResultMysql(
  ({ ventaId }, connection) =>
    connection.execute(
      `SELECT v.id, v.total, v.estado, v.empresa_id, v.cliente_id, v.usuario_id, v.fecha
       FROM ventas v WHERE v.id = ?`,
      [ventaId]
    ),
  { singleResult: true }
);

const getVentaPayments = fetchResultMysql(
  ({ ventaId }, connection) =>
    connection.execute(
      `SELECT 
       vp.id,
       vp.venta_id,
       m.id AS moneda_id,
       m.codigo AS moneda_codigo,
       m.simbolo AS moneda_simbolo,
       vp.monto,
       vp.tasa_cambio,
       vp.monto_en_moneda_venta,
       mp.nombre AS metodo_pago,
       mp.id AS metodo_pago_id,
       vp.referencia,
       vp.fecha
       FROM ventas_pagos vp
       JOIN metodos_pago mp ON mp.id = vp.metodo_pago_id
       JOIN monedas m ON m.id = vp.moneda_id
       WHERE vp.venta_id = ?
       ORDER BY vp.id DESC`,
      [ventaId]
    ),
  { singleResult: false }
);

const sumPagosByVenta = fetchResultMysql(
  ({ ventaId, excludePaymentId }, connection) => {
    const params = [ventaId];
    let where = "venta_id = ?";
    if (excludePaymentId) {
      where += " AND id <> ?";
      params.push(excludePaymentId);
    }
    return connection.execute(
      `SELECT IFNULL(SUM(monto_en_moneda_venta),0) AS total FROM ventas_pagos WHERE ${where}`,
      params
    );
  },
  { singleResult: true }
);

const createVentaPayment = transaction(
  async (
    {
      venta_id,
      metodo_pago_id,
      moneda_id,
      monto,
      referencia_pago,
      monto_en_moneda_venta,
      tasa_cambio,
    },
    connection
  ) => {
    // Calcular monto_en_moneda_venta si no se proporciona
    let montoConvertido = monto_en_moneda_venta;
    if (montoConvertido == null) {
      if (tasa_cambio != null) {
        // Si hay tasa_cambio, calcular el monto convertido
        montoConvertido = Number(monto) * Number(tasa_cambio);
      } else {
        // Si no hay tasa_cambio, asumimos que es la misma moneda
        montoConvertido = Number(monto);
      }
    } else {
      montoConvertido = Number(montoConvertido);
    }

    // Validar que el pago no exceda el total de la venta (permite pagos parciales)
    await validatePagosNoExcedenTotal(
      { venta_id, montoNuevo: montoConvertido },
      connection
    );

    // Insertar el pago
    const [result] = await connection.execute(
      `INSERT INTO ventas_pagos (venta_id, metodo_pago_id, moneda_id, monto, monto_en_moneda_venta, tasa_cambio, referencia)
       VALUES (?,?,?,?,?,?,?)`,
      [
        venta_id,
        metodo_pago_id || null,
        moneda_id || null,
        Number(monto) || null,
        montoConvertido || null,
        tasa_cambio ? Number(tasa_cambio) : null,
        referencia_pago || null,
      ]
    );

    // Actualizar estado_pago (permite pagos parciales)
    await updateEstadoPagoInternal({ venta_id }, connection);

    // Sincronizar cuenta por cobrar
    try {
      await cxcStorage.syncCuentaPorCobrarFromVentaInternal(
        { venta_id },
        connection
      );
    } catch (error) {
      console.error("Error syncing CXC on payment create:", error);
    }

    // Retornar el pago creado con información completa
    const [inserted] = await connection.execute(
      `SELECT vp.*, mp.nombre AS metodo_pago, m.codigo AS moneda_codigo, m.simbolo AS moneda_simbolo
       FROM ventas_pagos vp
       JOIN metodos_pago mp ON mp.id = vp.metodo_pago_id
       JOIN monedas m ON m.id = vp.moneda_id
       WHERE vp.id = ?`,
      [result.insertId]
    );
    return inserted[0];
  }
);

const updateVentaPayment = transaction(
  async (
    {
      id,
      venta_id,
      metodo_pago_id,
      moneda_id,
      monto,
      referencia_pago,
      monto_en_moneda_venta,
      tasa_cambio,
    },
    connection
  ) => {
    // Obtener el pago actual para calcular monto_en_moneda_venta si no se proporciona
    const [pagoActual] = await connection.execute(
      "SELECT monto, monto_en_moneda_venta, tasa_cambio FROM ventas_pagos WHERE id = ? AND venta_id = ?",
      [id, venta_id]
    );
    if (!pagoActual || pagoActual.length === 0) {
      throw new Error("Pago no encontrado");
    }

    // Calcular monto_en_moneda_venta si no se proporciona
    let montoConvertido = monto_en_moneda_venta;
    if (montoConvertido == null && monto != null) {
      // Si cambió el monto pero no el monto_en_moneda_venta, recalcular
      if (tasa_cambio != null) {
        // Usar la nueva tasa_cambio si se proporciona
        montoConvertido = Number(monto) * Number(tasa_cambio);
      } else if (pagoActual[0].tasa_cambio != null) {
        // Usar la tasa_cambio existente del pago
        montoConvertido = Number(monto) * Number(pagoActual[0].tasa_cambio);
      } else {
        // Sin tasa_cambio, asumir misma moneda
        montoConvertido = Number(monto);
      }
    } else if (montoConvertido == null) {
      // Si no se proporciona monto_en_moneda_venta ni monto, mantener el valor actual
      montoConvertido = Number(pagoActual[0].monto_en_moneda_venta);
    } else {
      montoConvertido = Number(montoConvertido);
    }

    // Validar que el pago actualizado no exceda el total de la venta (permite pagos parciales)
    await validatePagosNoExcedenTotal(
      { venta_id, montoNuevo: montoConvertido, excludePaymentId: id },
      connection
    );

    // Actualizar el pago
    await connection.execute(
      `UPDATE ventas_pagos
         SET metodo_pago_id = COALESCE(?, metodo_pago_id),
             moneda_id      = COALESCE(?, moneda_id),
             monto          = COALESCE(?, monto),
             monto_en_moneda_venta = COALESCE(?, monto_en_moneda_venta),
             tasa_cambio    = COALESCE(?, tasa_cambio),
             referencia     = COALESCE(?, referencia)
       WHERE id = ? AND venta_id = ?`,
      [
        metodo_pago_id || null,
        moneda_id || null,
        monto ? Number(monto) : null,
        montoConvertido || null,
        tasa_cambio ? Number(tasa_cambio) : null,
        referencia_pago || null,
        id,
        venta_id,
      ]
    );

    // Actualizar estado_pago (permite pagos parciales)
    await updateEstadoPagoInternal({ venta_id }, connection);

    // Sincronizar cuenta por cobrar
    try {
      await cxcStorage.syncCuentaPorCobrarFromVentaInternal(
        { venta_id },
        connection
      );
    } catch (error) {
      console.error("Error syncing CXC on payment update:", error);
    }

    // Retornar el pago actualizado con información completa
    const [updated] = await connection.execute(
      `SELECT vp.*, mp.nombre AS metodo_pago, m.codigo AS moneda_codigo, m.simbolo AS moneda_simbolo
       FROM ventas_pagos vp
       JOIN metodos_pago mp ON mp.id = vp.metodo_pago_id
       JOIN monedas m ON m.id = vp.moneda_id
       WHERE vp.id = ?`,
      [id]
    );
    return updated[0];
  }
);

const deleteVentaPayment = transaction(async ({ id, venta_id }, connection) => {
  const [venta] = await connection.execute(
    "SELECT id, total FROM ventas WHERE id = ? FOR UPDATE",
    [venta_id]
  );
  if (!venta || venta.length === 0) {
    throw new Error("Venta no encontrada");
  }

  // Get the record before deleting it
  const [prev] = await connection.execute(
    "SELECT * FROM ventas_pagos WHERE id = ? AND venta_id = ?",
    [id, venta_id]
  );
  if (!prev || prev.length === 0) {
    return [];
  }

  await connection.execute(
    "DELETE FROM ventas_pagos WHERE id = ? AND venta_id = ?",
    [id, venta_id]
  );

  // Actualizar estado_pago usando la función interna (ya estamos en transacción)
  await updateEstadoPagoInternal({ venta_id }, connection);

  // Sincronizar cuenta por cobrar
  try {
    await cxcStorage.syncCuentaPorCobrarFromVentaInternal(
      { venta_id },
      connection
    );
  } catch (error) {
    console.error("Error syncing CXC on payment delete:", error);
  }

  return prev[0];
});

// Bulk payment functions for create/update operations
const createVentaPayments = transaction(
  async ({ venta_id, pagos }, connection) => {
    if (!pagos || pagos.length === 0) {
      return [];
    }

    // Calcular el total de los nuevos pagos
    let totalNuevosPagos = 0;
    const pagosConMontos = pagos.map((pago) => {
      // Calcular monto_en_moneda_venta si no se proporciona
      let montoConvertido = pago.monto_en_moneda_venta;
      if (montoConvertido == null) {
        if (pago.tasa_cambio != null) {
          montoConvertido = Number(pago.monto || 0) * Number(pago.tasa_cambio);
        } else {
          montoConvertido = Number(pago.monto || 0);
        }
      } else {
        montoConvertido = Number(montoConvertido);
      }
      totalNuevosPagos += montoConvertido;
      return { ...pago, montoConvertido };
    });

    // Validar que los pagos no excedan el total de la venta (permite pagos parciales)
    await validatePagosNoExcedenTotal(
      { venta_id, montoNuevo: totalNuevosPagos },
      connection
    );

    // Crear todos los pagos
    const createdPayments = [];
    for (const pago of pagosConMontos) {
      const [result] = await connection.execute(
        `INSERT INTO ventas_pagos (venta_id, metodo_pago_id, moneda_id, monto, monto_en_moneda_venta, tasa_cambio, referencia)
         VALUES (?,?,?,?,?,?,?)`,
        [
          venta_id,
          pago.metodo_pago_id || null,
          pago.moneda_id || null,
          pago.monto ? Number(pago.monto) : null,
          pago.montoConvertido || null,
          pago.tasa_cambio ? Number(pago.tasa_cambio) : null,
          pago.referencia_pago || null,
        ]
      );

      const [inserted] = await connection.execute(
        `SELECT vp.*, mp.nombre AS metodo_pago, m.codigo AS moneda_codigo, m.simbolo AS moneda_simbolo
         FROM ventas_pagos vp
         JOIN metodos_pago mp ON mp.id = vp.metodo_pago_id
         JOIN monedas m ON m.id = vp.moneda_id
         WHERE vp.id = ?`,
        [result.insertId]
      );
      createdPayments.push(inserted[0]);
    }

    // Actualizar estado_pago después de crear todos los pagos (usar función interna, ya estamos en transacción)
    await updateEstadoPagoInternal({ venta_id }, connection);

    // Sincronizar cuenta por cobrar
    try {
      await cxcStorage.syncCuentaPorCobrarFromVentaInternal(
        { venta_id },
        connection
      );
    } catch (error) {
      console.error("Error syncing CXC on bulk payments create:", error);
    }

    return createdPayments;
  }
);

const getVentaWithPayments = fetchResultMysql(
  ({ ventaId }, connection) =>
    connection.execute(
      `SELECT v.*, 
              (SELECT IFNULL(SUM(vp.monto_en_moneda_venta),0) FROM ventas_pagos vp WHERE vp.venta_id = v.id) AS monto_pagado,
              (v.total - (SELECT IFNULL(SUM(vp.monto_en_moneda_venta),0) FROM ventas_pagos vp WHERE vp.venta_id = v.id)) AS saldo
       FROM ventas v WHERE v.id = ?`,
      [ventaId]
    ),
  { singleResult: true }
);

// Función auxiliar para validar que los pagos no excedan el total de la venta
const validatePagosNoExcedenTotal = async (
  { venta_id, montoNuevo, excludePaymentId },
  connection
) => {
  const [venta] = await connection.execute(
    "SELECT id, total FROM ventas WHERE id = ? FOR UPDATE",
    [venta_id]
  );
  if (!venta || venta.length === 0) {
    throw new Error("Venta no encontrada");
  }

  const params = [venta_id];
  let where = "venta_id = ?";
  if (excludePaymentId) {
    where += " AND id <> ?";
    params.push(excludePaymentId);
  }

  const [sumRow] = await connection.execute(
    `SELECT IFNULL(SUM(monto_en_moneda_venta),0) AS total FROM ventas_pagos WHERE ${where}`,
    params
  );

  const totalPagado = Number(sumRow[0].total);
  const totalVenta = Number(venta[0].total);
  const nuevoTotal = totalPagado + Number(montoNuevo || 0);

  // Validar que no se exceda el total (con tolerancia de 0.01 para errores de redondeo)
  if (nuevoTotal > totalVenta + 0.01) {
    throw new Error(
      `La suma de pagos excede el total de la venta. Total venta: ${totalVenta}, Total pagado: ${totalPagado}, Nuevo pago: ${montoNuevo}, Nuevo total: ${nuevoTotal}`
    );
  }

  return { totalVenta, totalPagado, nuevoTotal };
};

// Función interna para actualizar estado_pago (acepta conexión)
const updateEstadoPagoInternal = async ({ venta_id }, connection) => {
  const [venta] = await connection.execute(
    "SELECT id, total FROM ventas WHERE id = ? FOR UPDATE",
    [venta_id]
  );
  if (!venta || venta.length === 0) {
    throw new Error("Venta no encontrada");
  }

  const [sumRow] = await connection.execute(
    "SELECT IFNULL(SUM(monto_en_moneda_venta),0) AS total FROM ventas_pagos WHERE venta_id = ?",
    [venta_id]
  );
  const totalPagado = Number(sumRow[0].total);
  const totalVenta = Number(venta[0].total);

  // Actualizar estado_pago: 'completa' si total_pagado >= total (con tolerancia de 0.01), 'pendiente' en caso contrario
  // Esto permite pagos parciales: si el total pagado es menor al total, queda como 'pendiente'
  const nuevoEstadoPago =
    totalPagado >= totalVenta - 0.01 ? "completa" : "pendiente";

  await connection.execute("UPDATE ventas SET estado_pago = ? WHERE id = ?", [
    nuevoEstadoPago,
    venta_id,
  ]);

  return nuevoEstadoPago;
};

// Función externa que crea su propia transacción
const updateEstadoPago = transaction(updateEstadoPagoInternal);

module.exports = {
  getPurchases,
  createVenta,
  createDetalleVenta,
  updateVenta,
  replaceDetallesVenta,
  cancelarVenta,
  crearMovimientoDevolucion,
  getVentaById,
  getDetallesVentaByVentaId,
  getPurchasesFlat,
  deleteVenta,
  copiarDetallesVenta,
  updateVentaStatus,
  updateSale,
  // Payment functions
  getVentaByIdWithPayments,
  getVentaPayments,
  sumPagosByVenta,
  createVentaPayment,
  updateVentaPayment,
  deleteVentaPayment,
  createVentaPayments,
  getVentaWithPayments,
  updateEstadoPago,
  updateEstadoPagoInternal,
  // Validation functions
  validateProductosNoEnTransferenciasBorrador,
};

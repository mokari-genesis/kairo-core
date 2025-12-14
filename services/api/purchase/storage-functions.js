const { fetchResultMysql, transaction } = require("libs/db");

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

const verificarStockDisponible = fetchResultMysql(
  ({ producto_id }, connection) =>
    connection.execute(
      `
      SELECT stock, estado, descripcion
      FROM productos
      WHERE id = ?
      `,
      [producto_id]
    ),
  { singleResult: true }
);

const createVenta = fetchResultMysql(
  async (
    {
      empresa_id,
      cliente_id,
      usuario_id,
      total,
      estado = "vendido",
      comentario,
    },
    connection
  ) => {
    await connection.execute(
      `
      INSERT INTO ventas (
        empresa_id, cliente_id, usuario_id, total, estado, moneda_id, comentario
      ) VALUES (?, ?, ?, ?, ?, 1, ?)
      `,
      [empresa_id, cliente_id, usuario_id, total, estado, comentario || null]
    );
    const [result] = await connection.execute(
      "SELECT * FROM ventas WHERE id = LAST_INSERT_ID()"
    );
    return result;
  },
  { singleResult: true }
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

const deleteVenta = fetchResultMysql(
  async ({ venta_id }, connection) => {
    // First, get the record before deleting it
    const [existingRecord] = await connection.execute(
      "SELECT * FROM ventas WHERE id = ?",
      [venta_id]
    );

    if (existingRecord.length === 0) {
      throw new Error("Venta not found");
    }

    // Delete the record
    await connection.execute(`DELETE FROM ventas WHERE id = ?`, [venta_id]);

    // Return the deleted record
    return existingRecord;
  },
  { singleResult: true }
);

const updateVenta = fetchResultMysql(
  async ({ venta_id, estado }, connection) => {
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
    return result;
  },
  { singleResult: true }
);

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

const cancelarVenta = fetchResultMysql(
  async ({ venta_id }, connection) => {
    await connection.execute(
      `UPDATE ventas SET estado = 'cancelado' WHERE id = ?`,
      [venta_id]
    );
    const [result] = await connection.execute(
      "SELECT * FROM ventas WHERE id = ?",
      [venta_id]
    );
    return result;
  },
  { singleResult: true }
);

const crearMovimientoDevolucion = fetchResultMysql(
  async (
    { empresa_id, producto_id, usuario_id, cantidad, comentario, referencia },
    connection
  ) => {
    await connection.execute(
      `
      INSERT INTO movimientos_inventario (
        empresa_id,
        producto_id,
        usuario_id,
        tipo_movimiento,
        cantidad,
        comentario,
        referencia
      ) VALUES (?, ?, ?, 'devolucion', ?, ?, ?)
      `,
      [empresa_id, producto_id, usuario_id, cantidad, comentario, referencia]
    );
    const [result] = await connection.execute(
      "SELECT * FROM movimientos_inventario WHERE id = LAST_INSERT_ID()"
    );
    return result;
  },
  { singleResult: true }
);

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

const updateVentaStatus = fetchResultMysql(
  async ({ venta_id, estado }, connection) => {
    await connection.execute(
      `
        UPDATE ventas
        SET estado = ?         
        WHERE id = ?
        `,
      [estado, venta_id]
    );
    const [result] = await connection.execute(
      "SELECT * FROM ventas WHERE id = ?",
      [venta_id]
    );
    return result;
  },
  { singleResult: true }
);

const updateSale = fetchResultMysql(
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

    const [result] = await connection.execute(
      "SELECT * FROM ventas WHERE id = ?",
      [venta_id]
    );
    return result;
  },
  { singleResult: true }
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
      `SELECT IFNULL(SUM(monto),0) AS total FROM ventas_pagos WHERE ${where}`,
      params
    );
  },
  { singleResult: true }
);

const createVentaPayment = transaction(
  async (
    { venta_id, metodo_pago_id, moneda_id, monto, referencia_pago },
    connection
  ) => {
    // Lock the sale for consistency
    const [venta] = await connection.execute(
      "SELECT id, total FROM ventas WHERE id = ? FOR UPDATE",
      [venta_id]
    );
    if (!venta || venta.length === 0) {
      throw new Error("Venta no encontrada");
    }

    const [sumRow] = await connection.execute(
      "SELECT IFNULL(SUM(monto),0) AS total FROM ventas_pagos WHERE venta_id = ?",
      [venta_id]
    );
    if (Number(sumRow[0].total) + Number(monto) > Number(venta[0].total)) {
      throw new Error("La suma de pagos excede el total de la venta");
    }

    const [result] = await connection.execute(
      `INSERT INTO ventas_pagos (venta_id, metodo_pago_id, moneda_id, monto, referencia)
       VALUES (?,?,?,?,?)`,
      [
        venta_id,
        metodo_pago_id || null,
        moneda_id || null,
        monto || null,
        referencia_pago || null,
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
    return inserted[0];
  }
);

const updateVentaPayment = transaction(
  async (
    { id, venta_id, metodo_pago_id, moneda_id, monto, referencia_pago },
    connection
  ) => {
    const [venta] = await connection.execute(
      "SELECT id, total FROM ventas WHERE id = ? FOR UPDATE",
      [venta_id]
    );
    if (!venta || venta.length === 0) {
      throw new Error("Venta no encontrada");
    }

    // Sum without this payment
    const [sumRow] = await connection.execute(
      "SELECT IFNULL(SUM(monto),0) AS total FROM ventas_pagos WHERE venta_id = ? AND id <> ?",
      [venta_id, id]
    );
    if (
      monto != null &&
      Number(sumRow[0].total) + Number(monto) > Number(venta[0].total)
    ) {
      throw new Error("La suma de pagos excede el total de la venta");
    }

    await connection.execute(
      `UPDATE ventas_pagos
         SET metodo_pago_id = COALESCE(?, metodo_pago_id),
             moneda_id      = COALESCE(?, moneda_id),
             monto          = COALESCE(?, monto),
             referencia = COALESCE(?, referencia)
       WHERE id = ? AND venta_id = ?`,
      [
        metodo_pago_id || null,
        moneda_id || null,
        monto || null,
        referencia_pago || null,
        id,
        venta_id,
      ]
    );

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
  return prev[0];
});

// Bulk payment functions for create/update operations
const createVentaPayments = transaction(
  async ({ venta_id, pagos }, connection) => {
    if (!pagos || pagos.length === 0) {
      return [];
    }

    // Validate total payments don't exceed sale total
    const [venta] = await connection.execute(
      "SELECT id, total FROM ventas WHERE id = ? FOR UPDATE",
      [venta_id]
    );
    if (!venta || venta.length === 0) {
      throw new Error("Venta no encontrada");
    }

    const totalPagos = pagos.reduce((sum, pago) => sum + Number(pago.monto), 0);
    if (totalPagos > Number(venta[0].total)) {
      throw new Error("La suma de pagos excede el total de la venta");
    }

    const createdPayments = [];
    for (const pago of pagos) {
      const [result] = await connection.execute(
        `INSERT INTO ventas_pagos (venta_id, metodo_pago_id, moneda_id, monto, referencia)
         VALUES (?,?,?,?,?)`,
        [
          venta_id,
          pago.metodo_pago_id || null,
          pago.moneda_id || null,
          pago.monto || null,
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
    return createdPayments;
  }
);

const getVentaWithPayments = fetchResultMysql(
  ({ ventaId }, connection) =>
    connection.execute(
      `SELECT v.*, 
              (SELECT IFNULL(SUM(vp.monto),0) FROM ventas_pagos vp WHERE vp.venta_id = v.id) AS monto_pagado,
              (v.total - (SELECT IFNULL(SUM(vp.monto),0) FROM ventas_pagos vp WHERE vp.venta_id = v.id)) AS saldo
       FROM ventas v WHERE v.id = ?`,
      [ventaId]
    ),
  { singleResult: true }
);

module.exports = {
  getPurchases,
  createVenta,
  verificarStockDisponible,
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
};

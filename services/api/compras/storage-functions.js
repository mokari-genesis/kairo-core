const { fetchResultMysql, transaction } = require("libs/db");
const stockFunctions = require("../purchase/stock-functions");
const cxpStorage = require("../cuentasPorPagar/storage-functions");

// ============================================
// FUNCIONES DE ACCESO A DATOS - MÓDULO COMPRAS
// ============================================

// Listar compras con filtros
const getCompras = fetchResultMysql(
  (
    {
      empresa_id,
      id,
      proveedor_id,
      usuario_id,
      estado,
      tipo_pago,
      fecha_inicio,
      fecha_fin,
      producto_id,
    },
    connection
  ) =>
    connection.execute(
      `
      SELECT 
        c.id,
        c.empresa_id,
        e.nombre AS empresa_nombre,
        c.proveedor_id,
        p.nombre AS proveedor_nombre,
        p.nit AS proveedor_nit,
        c.usuario_id,
        u.nombre AS usuario_nombre,
        c.fecha,
        c.total,
        c.estado,
        c.moneda_id,
        m.codigo AS moneda_codigo,
        m.simbolo AS moneda_simbolo,
        c.tipo_pago,
        c.comentario,
        COALESCE(SUM(cd.cantidad), 0) AS total_items,
        COUNT(DISTINCT cd.producto_id) AS total_productos
      FROM compras c
      INNER JOIN empresas e ON e.id = c.empresa_id
      INNER JOIN proveedores p ON p.id = c.proveedor_id
      LEFT JOIN usuarios u ON u.id = c.usuario_id
      INNER JOIN monedas m ON m.id = c.moneda_id
      LEFT JOIN compras_detalles cd ON cd.compra_id = c.id
      WHERE (? IS NULL OR c.empresa_id = ?)
        AND (? IS NULL OR c.id = ?)
        AND (? IS NULL OR c.proveedor_id = ?)
        AND (? IS NULL OR c.usuario_id = ?)
        AND (? IS NULL OR c.estado = ?)
        AND (? IS NULL OR c.tipo_pago = ?)
        AND (? IS NULL OR DATE(c.fecha) >= ?)
        AND (? IS NULL OR DATE(c.fecha) <= ?)
        AND (? IS NULL OR EXISTS (
          SELECT 1 FROM compras_detalles cd2 
          WHERE cd2.compra_id = c.id AND cd2.producto_id = ?
        ))
      GROUP BY c.id
      ORDER BY c.fecha DESC, c.id DESC
      `,
      [
        empresa_id || null,
        empresa_id || null,
        id || null,
        id || null,
        proveedor_id || null,
        proveedor_id || null,
        usuario_id || null,
        usuario_id || null,
        estado || null,
        estado || null,
        tipo_pago || null,
        tipo_pago || null,
        fecha_inicio || null,
        fecha_inicio || null,
        fecha_fin || null,
        fecha_fin || null,
        producto_id || null,
        producto_id || null,
      ]
    ),
  { singleResult: false }
);

// Obtener una compra por ID con detalles
const getCompraById = fetchResultMysql(
  ({ compra_id }, connection) =>
    connection.execute(
      `
      SELECT 
        c.id,
        c.empresa_id,
        e.nombre AS empresa_nombre,
        c.proveedor_id,
        p.nombre AS proveedor_nombre,
        p.nit AS proveedor_nit,
        p.email AS proveedor_email,
        p.telefono AS proveedor_telefono,
        p.direccion AS proveedor_direccion,
        c.usuario_id,
        u.nombre AS usuario_nombre,
        u.email AS usuario_email,
        c.fecha,
        c.total,
        c.estado,
        c.moneda_id,
        m.codigo AS moneda_codigo,
        m.simbolo AS moneda_simbolo,
        m.nombre AS moneda_nombre,
        c.tipo_pago,
        c.comentario
      FROM compras c
      INNER JOIN empresas e ON e.id = c.empresa_id
      INNER JOIN proveedores p ON p.id = c.proveedor_id
      LEFT JOIN usuarios u ON u.id = c.usuario_id
      INNER JOIN monedas m ON m.id = c.moneda_id
      WHERE c.id = ?
      `,
      [compra_id]
    ),
  { singleResult: true }
);

// Obtener detalles de una compra
const getCompraDetalles = fetchResultMysql(
  ({ compra_id }, connection) =>
    connection.execute(
      `
      SELECT 
        cd.id,
        cd.compra_id,
        cd.producto_id,
        p.codigo AS producto_codigo,
        p.descripcion AS producto_descripcion,
        p.serie AS producto_serie,
        p.categoria AS producto_categoria,
        cd.cantidad,
        cd.costo_unitario,
        cd.subtotal
      FROM compras_detalles cd
      INNER JOIN productos p ON p.id = cd.producto_id
      WHERE cd.compra_id = ?
      ORDER BY cd.id ASC
      `,
      [compra_id]
    ),
  { singleResult: false }
);

// Obtener compra completa con detalles y CxP si existe
const getCompraCompleta = fetchResultMysql(
  ({ compra_id }, connection) =>
    connection.execute(
      `
      SELECT 
        c.id,
        c.empresa_id,
        e.nombre AS empresa_nombre,
        c.proveedor_id,
        p.nombre AS proveedor_nombre,
        p.nit AS proveedor_nit,
        c.usuario_id,
        u.nombre AS usuario_nombre,
        c.fecha,
        c.total,
        c.estado,
        c.moneda_id,
        m.codigo AS moneda_codigo,
        m.simbolo AS moneda_simbolo,
        c.tipo_pago,
        c.comentario,
        cxp.id AS cxp_id,
        cxp.total AS cxp_total,
        cxp.saldo AS cxp_saldo,
        cxp.estado AS cxp_estado,
        cxp.fecha_emision AS cxp_fecha_emision,
        cxp.fecha_vencimiento AS cxp_fecha_vencimiento
      FROM compras c
      INNER JOIN empresas e ON e.id = c.empresa_id
      INNER JOIN proveedores p ON p.id = c.proveedor_id
      LEFT JOIN usuarios u ON u.id = c.usuario_id
      INNER JOIN monedas m ON m.id = c.moneda_id
      LEFT JOIN cuentas_por_pagar cxp ON cxp.compra_id = c.id
      WHERE c.id = ?
      `,
      [compra_id]
    ),
  { singleResult: true }
);

// Crear compra con detalles y movimientos de inventario
const createCompra = transaction(
  async (
    {
      empresa_id,
      proveedor_id,
      usuario_id,
      fecha,
      moneda_id,
      tipo_pago,
      fecha_vencimiento,
      comentario,
      items,
    },
    connection
  ) => {
    // Validar proveedor
    const [proveedorRows] = await connection.execute(
      "SELECT id FROM proveedores WHERE id = ?",
      [proveedor_id]
    );
    if (!proveedorRows || proveedorRows.length === 0) {
      throw new Error("Proveedor no encontrado");
    }

    // Validar moneda
    const [monedaRows] = await connection.execute(
      "SELECT id FROM monedas WHERE id = ?",
      [moneda_id]
    );
    if (!monedaRows || monedaRows.length === 0) {
      throw new Error("Moneda no encontrada");
    }

    // Validar items
    if (!items || items.length === 0) {
      throw new Error("La compra debe tener al menos un item");
    }

    // Validar items
    for (const item of items) {
      if (!item.producto_id || !item.cantidad || !item.costo_unitario) {
        throw new Error(
          "Cada item debe tener producto_id, cantidad y costo_unitario"
        );
      }
      if (item.cantidad <= 0) {
        throw new Error("La cantidad debe ser mayor a 0");
      }
      if (item.costo_unitario < 0) {
        throw new Error("El costo unitario debe ser >= 0");
      }

      // Validar que el producto existe
      const [productoRows] = await connection.execute(
        "SELECT id FROM productos WHERE id = ?",
        [item.producto_id]
      );
      if (!productoRows || productoRows.length === 0) {
        throw new Error(`Producto con id ${item.producto_id} no encontrado`);
      }
    }

    // Validar tipo_pago
    if (tipo_pago && !["contado", "credito"].includes(tipo_pago)) {
      throw new Error("tipo_pago debe ser 'contado' o 'credito'");
    }

    // Calcular total
    const total = items.reduce(
      (sum, item) => sum + Number(item.cantidad) * Number(item.costo_unitario),
      0
    );

    if (total <= 0) {
      throw new Error("El total de la compra debe ser mayor a 0");
    }

    // Crear compra
    const [compraResult] = await connection.execute(
      `
      INSERT INTO compras (
        empresa_id,
        proveedor_id,
        usuario_id,
        fecha,
        total,
        estado,
        moneda_id,
        tipo_pago,
        comentario
      ) VALUES (?, ?, ?, ?, ?, 'registrada', ?, ?, ?)
      `,
      [
        empresa_id,
        proveedor_id,
        usuario_id || null,
        fecha || new Date(),
        total,
        moneda_id,
        tipo_pago || null,
        comentario || null,
      ]
    );

    const compra_id = compraResult.insertId;

    // Crear detalles
    for (const item of items) {
      const subtotal = Number(item.cantidad) * Number(item.costo_unitario);
      await connection.execute(
        `
        INSERT INTO compras_detalles (
          compra_id,
          producto_id,
          cantidad,
          costo_unitario,
          subtotal
        ) VALUES (?, ?, ?, ?, ?)
        `,
        [
          compra_id,
          item.producto_id,
          item.cantidad,
          item.costo_unitario,
          subtotal,
        ]
      );

      // Crear movimiento de inventario tipo "entrada" (compra)
      await stockFunctions.createInventoryMovementWithStockInternal(
        {
          empresa_id,
          producto_id: item.producto_id,
          usuario_id: usuario_id || null,
          tipo_movimiento: "entrada",
          cantidad: item.cantidad,
          precio_compra: item.costo_unitario,
          compra_id: compra_id,
          comentario: `Compra #${compra_id}`,
          referencia: null,
          transferencia_id: null,
        },
        connection
      );

      // Convertir costo_unitario a moneda local (VES) antes de actualizar precio sugerido
      let costoEnMonedaLocal = item.costo_unitario;

      // Obtener moneda de la compra
      const [monedaCompraRows] = await connection.execute(
        "SELECT id, codigo, tasa_vs_base, decimales FROM monedas WHERE id = ?",
        [moneda_id]
      );

      if (!monedaCompraRows || monedaCompraRows.length === 0) {
        throw new Error("Moneda de la compra no encontrada");
      }

      const monedaCompra = monedaCompraRows[0];

      // Si la moneda de la compra no es VES, convertir a VES
      if (monedaCompra.codigo !== "VES") {
        // Obtener moneda VES
        const [monedaVESRows] = await connection.execute(
          "SELECT id, codigo, tasa_vs_base, decimales FROM monedas WHERE codigo = 'VES'"
        );

        if (!monedaVESRows || monedaVESRows.length === 0) {
          throw new Error("Moneda local (VES) no encontrada");
        }

        const monedaVES = monedaVESRows[0];
        const tasaFrom = Number(monedaCompra.tasa_vs_base);
        const tasaTo = Number(monedaVES.tasa_vs_base);

        if (!tasaFrom || !tasaTo || tasaFrom <= 0 || tasaTo <= 0) {
          throw new Error(
            "Falta tasa_vs_base válida en monedas para convertir el precio a moneda local"
          );
        }

        // Calcular tasa de conversión: tasa_from / tasa_to
        // Ejemplo: si compra en USD (tasa=1) y VES (tasa=36), tasa = 1/36
        // costo_en_ves = costo_usd * (1/36) = costo_usd * tasa
        const tasa = tasaFrom / tasaTo;
        const decimales = monedaVES.decimales || 2;
        costoEnMonedaLocal = Number(
          (Number(item.costo_unitario) * tasa).toFixed(decimales)
        );
      }

      // Actualizar precio sugerido del producto con el costo unitario convertido a moneda local
      // Usamos INSERT ... ON DUPLICATE KEY UPDATE para crear o actualizar el precio sugerido
      // El trigger trg_pp_sync_precio_au actualizará automáticamente productos.precio
      await connection.execute(
        `
        INSERT INTO productos_precios (producto_id, tipo, precio)
        VALUES (?, 'sugerido', ?)
        ON DUPLICATE KEY UPDATE precio = ?
        `,
        [item.producto_id, costoEnMonedaLocal, costoEnMonedaLocal]
      );
    }

    // Si es crédito, crear cuenta por pagar usando syncCuentaPorPagarFromCompraInternal
    if (tipo_pago === "credito") {
      try {
        // Actualizar fecha_vencimiento si se proporcionó
        if (fecha_vencimiento) {
          // La función syncCuentaPorPagarFromCompraInternal crea la CxP pero no acepta fecha_vencimiento
          // Necesitamos crear la CxP manualmente o actualizarla después
          await cxpStorage.syncCuentaPorPagarFromCompraInternal(
            { compra_id },
            connection
          );

          // Actualizar fecha_vencimiento si existe CxP
          const [cxpRows] = await connection.execute(
            "SELECT id FROM cuentas_por_pagar WHERE compra_id = ?",
            [compra_id]
          );
          if (cxpRows && cxpRows.length > 0) {
            await connection.execute(
              "UPDATE cuentas_por_pagar SET fecha_vencimiento = ? WHERE compra_id = ?",
              [fecha_vencimiento, compra_id]
            );
          }
        } else {
          await cxpStorage.syncCuentaPorPagarFromCompraInternal(
            { compra_id },
            connection
          );
        }
      } catch (error) {
        console.error("Error creando CxP para compra:", error);
        // No lanzar error para no romper la transacción, pero loguear
      }
    }

    // Obtener compra completa usando la misma conexión
    const [compraRows] = await connection.execute(
      `
      SELECT 
        c.id,
        c.empresa_id,
        e.nombre AS empresa_nombre,
        c.proveedor_id,
        p.nombre AS proveedor_nombre,
        p.nit AS proveedor_nit,
        c.usuario_id,
        u.nombre AS usuario_nombre,
        c.fecha,
        c.total,
        c.estado,
        c.moneda_id,
        m.codigo AS moneda_codigo,
        m.simbolo AS moneda_simbolo,
        c.tipo_pago,
        c.comentario
      FROM compras c
      INNER JOIN empresas e ON e.id = c.empresa_id
      INNER JOIN proveedores p ON p.id = c.proveedor_id
      LEFT JOIN usuarios u ON u.id = c.usuario_id
      INNER JOIN monedas m ON m.id = c.moneda_id
      WHERE c.id = ?
      `,
      [compra_id]
    );

    const compra = compraRows[0];

    // Obtener detalles
    const [detallesRows] = await connection.execute(
      `
      SELECT 
        cd.id,
        cd.compra_id,
        cd.producto_id,
        p.codigo AS producto_codigo,
        p.descripcion AS producto_descripcion,
        p.serie AS producto_serie,
        p.categoria AS producto_categoria,
        cd.cantidad,
        cd.costo_unitario,
        cd.subtotal
      FROM compras_detalles cd
      INNER JOIN productos p ON p.id = cd.producto_id
      WHERE cd.compra_id = ?
      ORDER BY cd.id ASC
      `,
      [compra_id]
    );

    // Obtener CxP si existe
    const [cxpRows] = await connection.execute(
      `
      SELECT 
        cxp.id,
        cxp.total,
        cxp.saldo,
        cxp.estado,
        cxp.fecha_emision,
        cxp.fecha_vencimiento
      FROM cuentas_por_pagar cxp
      WHERE cxp.compra_id = ?
      `,
      [compra_id]
    );

    return {
      ...compra,
      detalles: detallesRows,
      cuenta_por_pagar:
        cxpRows && cxpRows.length > 0
          ? {
              id: cxpRows[0].id,
              total: cxpRows[0].total,
              saldo: cxpRows[0].saldo,
              estado: cxpRows[0].estado,
              fecha_emision: cxpRows[0].fecha_emision,
              fecha_vencimiento: cxpRows[0].fecha_vencimiento,
            }
          : null,
    };
  }
);

// Anular compra
const anularCompra = transaction(async ({ compra_id }, connection) => {
  // Verificar que la compra existe y no está anulada
  const [compraRows] = await connection.execute(
    "SELECT id, estado, tipo_pago FROM compras WHERE id = ?",
    [compra_id]
  );

  if (!compraRows || compraRows.length === 0) {
    throw new Error("Compra no encontrada");
  }

  const compra = compraRows[0];

  if (compra.estado === "anulada") {
    throw new Error("La compra ya está anulada");
  }

  // Obtener detalles para revertir movimientos usando la misma conexión
  const [detallesRows] = await connection.execute(
    `
    SELECT 
      cd.id,
      cd.compra_id,
      cd.producto_id,
      cd.cantidad,
      cd.costo_unitario,
      cd.subtotal
    FROM compras_detalles cd
    WHERE cd.compra_id = ?
    ORDER BY cd.id ASC
    `,
    [compra_id]
  );

  // Anular la compra
  await connection.execute(
    "UPDATE compras SET estado = 'anulada' WHERE id = ?",
    [compra_id]
  );

  // Si tiene CxP, verificar si tiene pagos antes de anular
  if (compra.tipo_pago === "credito") {
    const [cxpRows] = await connection.execute(
      "SELECT id, saldo, estado FROM cuentas_por_pagar WHERE compra_id = ?",
      [compra_id]
    );

    if (cxpRows && cxpRows.length > 0) {
      const cxp = cxpRows[0];

      // Verificar si tiene pagos registrados
      const [pagosRows] = await connection.execute(
        "SELECT COUNT(*) as total_pagos FROM cuentas_por_pagar_abonos WHERE cxp_id = ?",
        [cxp.id]
      );

      const totalPagos =
        pagosRows && pagosRows.length > 0 ? pagosRows[0].total_pagos : 0;

      if (totalPagos > 0 && cxp.saldo < cxp.total) {
        throw new Error(
          `No se puede anular la compra porque la cuenta por pagar tiene pagos registrados. ` +
            `Saldo pendiente: ${cxp.saldo}, Total: ${cxp.total}`
        );
      }

      // Si la CxP ya está anulada, no hacer nada
      if (cxp.estado !== "anulada") {
        await connection.execute(
          "UPDATE cuentas_por_pagar SET estado = 'anulada' WHERE compra_id = ?",
          [compra_id]
        );
      }
    }
  }

  // Revertir movimientos de inventario creando movimientos de salida
  // Nota: No eliminamos los movimientos originales para mantener el historial
  // Solo creamos movimientos de salida para revertir el stock
  if (!detallesRows || detallesRows.length === 0) {
    throw new Error("La compra no tiene detalles para revertir");
  }

  // Obtener empresa_id y usuario_id de la compra para usar en los movimientos
  const [compraInfoRows] = await connection.execute(
    "SELECT empresa_id, usuario_id FROM compras WHERE id = ?",
    [compra_id]
  );

  if (!compraInfoRows || compraInfoRows.length === 0) {
    throw new Error("No se pudo obtener información de la compra");
  }

  const compraInfo = compraInfoRows[0];
  const empresa_id = compraInfo.empresa_id;
  const usuario_id = compraInfo.usuario_id;

  // Revertir movimientos de inventario
  // IMPORTANTE: Se permite que el stock quede negativo al anular una compra
  // Si el stock quedaría negativo, usamos un ajuste en lugar de salida
  for (const detalle of detallesRows) {
    // Buscar el movimiento original de entrada
    const [movimientoRows] = await connection.execute(
      `
      SELECT empresa_id, usuario_id 
      FROM movimientos_inventario 
      WHERE compra_id = ? AND producto_id = ? AND tipo_movimiento = 'entrada'
      ORDER BY id DESC LIMIT 1
      `,
      [compra_id, detalle.producto_id]
    );

    // Si no encuentra movimiento, usar los datos de la compra
    const empresaIdParaMovimiento =
      movimientoRows && movimientoRows.length > 0
        ? movimientoRows[0].empresa_id
        : empresa_id;
    const usuarioIdParaMovimiento =
      movimientoRows && movimientoRows.length > 0
        ? movimientoRows[0].usuario_id
        : usuario_id;

    // Verificar stock actual
    const [stockRows] = await connection.execute(
      `
      SELECT COALESCE(stock, 0) as stock
      FROM productos_stock
      WHERE empresa_id = ? AND producto_id = ?
      `,
      [empresaIdParaMovimiento, detalle.producto_id]
    );

    const stockActual =
      stockRows && stockRows.length > 0 ? stockRows[0].stock : 0;
    const nuevoStock = stockActual - detalle.cantidad;

    // Si el stock resultante sería negativo, restar solo el stock disponible
    // La constraint productos_stock_chk_1 no permite stock negativo
    // La constraint movimientos_inventario_chk_1 requiere cantidad > 0
    if (nuevoStock < 0) {
      // Si hay stock disponible, hacer una salida de todo el stock disponible
      if (stockActual > 0) {
        await stockFunctions.createInventoryMovementWithStockInternal(
          {
            empresa_id: empresaIdParaMovimiento,
            producto_id: detalle.producto_id,
            usuario_id: usuarioIdParaMovimiento,
            tipo_movimiento: "salida",
            cantidad: stockActual, // Restar todo el stock disponible
            precio_compra: null,
            compra_id: compra_id,
            comentario: `Anulación de compra #${compra_id} - Se restaron ${stockActual} unidades (stock disponible). Se deberían restar ${detalle.cantidad} pero el stock quedó en 0 (debería ser ${nuevoStock} pero se limitó a 0)`,
            referencia: null,
            transferencia_id: null,
          },
          connection
        );
      }
      // Si no hay stock disponible (stockActual = 0), no crear movimiento
      // porque la constraint requiere cantidad > 0 y ya está en 0
      // Solo documentar en un comentario si fuera necesario, pero no creamos movimiento
    } else {
      // Si hay stock suficiente, usar salida normal
      await stockFunctions.createInventoryMovementWithStockInternal(
        {
          empresa_id: empresaIdParaMovimiento,
          producto_id: detalle.producto_id,
          usuario_id: usuarioIdParaMovimiento,
          tipo_movimiento: "salida",
          cantidad: detalle.cantidad,
          precio_compra: null,
          compra_id: compra_id, // Mantener referencia a la compra anulada
          comentario: `Anulación de compra #${compra_id}`,
          referencia: null, // No usar referencia porque tiene FK a ventas, no compras
          transferencia_id: null,
        },
        connection
      );
    }
  }

  return { compra_id, estado: "anulada" };
});

// ============================================
// REPORTES
// ============================================

// Compras por rango de fechas
const getComprasPorRangoFechas = fetchResultMysql(
  ({ empresa_id, fecha_inicio, fecha_fin }, connection) =>
    connection.execute(
      `
      SELECT 
        DATE(c.fecha) AS fecha,
        COUNT(DISTINCT c.id) AS total_compras,
        SUM(c.total) AS total_monto,
        COUNT(DISTINCT c.proveedor_id) AS total_proveedores,
        SUM(CASE WHEN c.tipo_pago = 'contado' THEN c.total ELSE 0 END) AS total_contado,
        SUM(CASE WHEN c.tipo_pago = 'credito' THEN c.total ELSE 0 END) AS total_credito
      FROM compras c
      WHERE c.estado = 'registrada'
        AND (? IS NULL OR c.empresa_id = ?)
        AND (? IS NULL OR DATE(c.fecha) >= ?)
        AND (? IS NULL OR DATE(c.fecha) <= ?)
      GROUP BY DATE(c.fecha)
      ORDER BY fecha DESC
      `,
      [
        empresa_id || null,
        empresa_id || null,
        fecha_inicio || null,
        fecha_inicio || null,
        fecha_fin || null,
        fecha_fin || null,
      ]
    ),
  { singleResult: false }
);

// Compras por proveedor
const getComprasPorProveedor = fetchResultMysql(
  ({ empresa_id, fecha_inicio, fecha_fin }, connection) =>
    connection.execute(
      `
      SELECT 
        c.proveedor_id,
        p.nombre AS proveedor_nombre,
        p.nit AS proveedor_nit,
        COUNT(DISTINCT c.id) AS total_compras,
        SUM(c.total) AS total_monto,
        AVG(c.total) AS promedio_compra,
        SUM(CASE WHEN c.tipo_pago = 'contado' THEN c.total ELSE 0 END) AS total_contado,
        SUM(CASE WHEN c.tipo_pago = 'credito' THEN c.total ELSE 0 END) AS total_credito
      FROM compras c
      INNER JOIN proveedores p ON p.id = c.proveedor_id
      WHERE c.estado = 'registrada'
        AND (? IS NULL OR c.empresa_id = ?)
        AND (? IS NULL OR DATE(c.fecha) >= ?)
        AND (? IS NULL OR DATE(c.fecha) <= ?)
      GROUP BY c.proveedor_id, p.nombre, p.nit
      ORDER BY total_monto DESC
      `,
      [
        empresa_id || null,
        empresa_id || null,
        fecha_inicio || null,
        fecha_inicio || null,
        fecha_fin || null,
        fecha_fin || null,
      ]
    ),
  { singleResult: false }
);

// Compras contado vs crédito
const getComprasContadoVsCredito = fetchResultMysql(
  ({ empresa_id, fecha_inicio, fecha_fin }, connection) =>
    connection.execute(
      `
      SELECT 
        c.tipo_pago,
        COUNT(DISTINCT c.id) AS total_compras,
        SUM(c.total) AS total_monto,
        AVG(c.total) AS promedio_compra
      FROM compras c
      WHERE c.estado = 'registrada'
        AND (? IS NULL OR c.empresa_id = ?)
        AND (? IS NULL OR DATE(c.fecha) >= ?)
        AND (? IS NULL OR DATE(c.fecha) <= ?)
        AND c.tipo_pago IS NOT NULL
      GROUP BY c.tipo_pago
      `,
      [
        empresa_id || null,
        empresa_id || null,
        fecha_inicio || null,
        fecha_inicio || null,
        fecha_fin || null,
        fecha_fin || null,
      ]
    ),
  { singleResult: false }
);

// Cuentas por pagar por compras
const getCxpPorCompras = fetchResultMysql(
  ({ empresa_id, fecha_inicio, fecha_fin }, connection) =>
    connection.execute(
      `
      SELECT 
        c.id AS compra_id,
        c.fecha AS compra_fecha,
        c.total AS compra_total,
        c.tipo_pago,
        cxp.id AS cxp_id,
        cxp.total AS cxp_total,
        cxp.saldo AS cxp_saldo,
        cxp.estado AS cxp_estado,
        cxp.fecha_emision,
        cxp.fecha_vencimiento,
        p.nombre AS proveedor_nombre,
        p.nit AS proveedor_nit
      FROM compras c
      INNER JOIN proveedores p ON p.id = c.proveedor_id
      LEFT JOIN cuentas_por_pagar cxp ON cxp.compra_id = c.id
      WHERE c.estado = 'registrada'
        AND c.tipo_pago = 'credito'
        AND (? IS NULL OR c.empresa_id = ?)
        AND (? IS NULL OR DATE(c.fecha) >= ?)
        AND (? IS NULL OR DATE(c.fecha) <= ?)
      ORDER BY c.fecha DESC
      `,
      [
        empresa_id || null,
        empresa_id || null,
        fecha_inicio || null,
        fecha_inicio || null,
        fecha_fin || null,
        fecha_fin || null,
      ]
    ),
  { singleResult: false }
);

// Productos más comprados
const getProductosMasComprados = fetchResultMysql(
  ({ empresa_id, fecha_inicio, fecha_fin, limit = 10 }, connection) =>
    connection.execute(
      `
      SELECT 
        cd.producto_id,
        p.codigo AS producto_codigo,
        p.descripcion AS producto_descripcion,
        p.categoria AS producto_categoria,
        COUNT(DISTINCT cd.compra_id) AS total_compras,
        SUM(cd.cantidad) AS total_cantidad,
        SUM(cd.subtotal) AS total_monto,
        AVG(cd.costo_unitario) AS costo_promedio
      FROM compras_detalles cd
      INNER JOIN compras c ON c.id = cd.compra_id
      INNER JOIN productos p ON p.id = cd.producto_id
      WHERE c.estado = 'registrada'
        AND (? IS NULL OR c.empresa_id = ?)
        AND (? IS NULL OR DATE(c.fecha) >= ?)
        AND (? IS NULL OR DATE(c.fecha) <= ?)
      GROUP BY cd.producto_id, p.codigo, p.descripcion, p.categoria
      ORDER BY total_cantidad DESC
      LIMIT ?
      `,
      [
        empresa_id || null,
        empresa_id || null,
        fecha_inicio || null,
        fecha_inicio || null,
        fecha_fin || null,
        fecha_fin || null,
        limit,
      ]
    ),
  { singleResult: false }
);

module.exports = {
  getCompras,
  getCompraById,
  getCompraDetalles,
  getCompraCompleta,
  createCompra,
  anularCompra,
  // Reportes
  getComprasPorRangoFechas,
  getComprasPorProveedor,
  getComprasContadoVsCredito,
  getCxpPorCompras,
  getProductosMasComprados,
};

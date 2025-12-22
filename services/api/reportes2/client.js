const { fetchResultMysql } = require("libs/db");

// Helper function to normalize empty strings to null
const normalizeToNull = (value) => {
  if (value === "" || value === undefined || value === null) {
    return null;
  }
  return value;
};

// ============ VENTAS ============

const getReporteVentasResumen = fetchResultMysql(
  (
    {
      empresa_id,
      fecha_inicio,
      fecha_fin,
      estado_venta,
      usuario_id,
      cliente_id,
    },
    connection
  ) =>
    connection.execute(
      `
      SELECT 
        v.id,
        v.empresa_id,
        e.nombre as empresa_nombre,
        v.cliente_id,
        c.nombre as cliente_nombre,
        c.nit as cliente_nit,
        v.usuario_id,
        u.nombre as usuario_nombre,
        v.total as total_venta,
        COALESCE(SUM(vp.monto_en_moneda_venta), 0) as total_pagado,
        (v.total - COALESCE(SUM(vp.monto_en_moneda_venta), 0)) as saldo_pendiente,
        v.estado as estado_venta,
        v.fecha as fecha_venta,
        COUNT(DISTINCT v.id) as numero_ventas,
        AVG(v.total) as ticket_promedio
      FROM ventas v
      LEFT JOIN empresas e ON e.id = v.empresa_id
      LEFT JOIN clientes c ON c.id = v.cliente_id
      LEFT JOIN usuarios u ON u.id = v.usuario_id
      LEFT JOIN ventas_pagos vp ON vp.venta_id = v.id
      WHERE (? IS NULL OR v.empresa_id = ?)
        AND (? IS NULL OR v.estado = ?)
        AND (? IS NULL OR v.usuario_id = ?)
        AND (? IS NULL OR v.cliente_id = ?)
        AND (
          (? IS NULL AND ? IS NULL) 
          OR 
          (DATE(v.fecha) BETWEEN ? AND ?)          
        )
      GROUP BY v.id, v.empresa_id, e.nombre, v.cliente_id, c.nombre, c.nit, v.usuario_id, u.nombre, v.total, v.estado, v.fecha
      ORDER BY v.fecha DESC
      `,
      [
        empresa_id || null,
        empresa_id || null,
        estado_venta || null,
        estado_venta || null,
        usuario_id || null,
        usuario_id || null,
        cliente_id || null,
        cliente_id || null,
        fecha_inicio || null,
        fecha_fin || null,
        fecha_inicio || null,
        fecha_fin || null,
      ]
    ),
  { singleResult: false }
);

const getReporteVentasPorVendedor = fetchResultMysql(
  ({ empresa_id, fecha_inicio, fecha_fin }, connection) =>
    connection.execute(
      `
      SELECT 
        v.usuario_id,
        u.nombre as usuario_nombre,
        COUNT(DISTINCT v.id) as cantidad_ventas,
        SUM(v.total) as total_vendido,
        COALESCE(SUM(pagos_agg.total_pagado), 0) as total_pagado,
        (SUM(v.total) - COALESCE(SUM(pagos_agg.total_pagado), 0)) as saldo_pendiente,
        AVG(v.total) as ticket_promedio
      FROM ventas v
      LEFT JOIN usuarios u ON u.id = v.usuario_id
      LEFT JOIN (
        SELECT 
          vp.venta_id,
          SUM(vp.monto_en_moneda_venta) as total_pagado
        FROM ventas_pagos vp
        INNER JOIN ventas v2 ON v2.id = vp.venta_id
        WHERE (? IS NULL OR v2.empresa_id = ?)
          AND (
            (? IS NULL AND ? IS NULL) 
            OR 
            (DATE(v2.fecha) BETWEEN ? AND ?)          
          )
        GROUP BY vp.venta_id
      ) pagos_agg ON pagos_agg.venta_id = v.id
      WHERE (? IS NULL OR v.empresa_id = ?)
        AND (
          (? IS NULL AND ? IS NULL) 
          OR 
          (DATE(v.fecha) BETWEEN ? AND ?)          
        )
      GROUP BY v.usuario_id, u.nombre
      ORDER BY total_vendido DESC
      `,
      [
        empresa_id || null,
        empresa_id || null,
        fecha_inicio || null,
        fecha_fin || null,
        fecha_inicio || null,
        fecha_fin || null,
        empresa_id || null,
        empresa_id || null,
        fecha_inicio || null,
        fecha_fin || null,
        fecha_inicio || null,
        fecha_fin || null,
      ]
    ),
  { singleResult: false }
);

const getReporteVentasPorCliente = fetchResultMysql(
  ({ empresa_id, fecha_inicio, fecha_fin }, connection) =>
    connection.execute(
      `
      SELECT 
        v.cliente_id,
        c.nombre as cliente_nombre,
        c.nit as cliente_nit,
        COUNT(DISTINCT v.id) as numero_ventas,
        SUM(v.total) as total_vendido,
        AVG(v.total) as promedio_ticket,
        (SUM(v.total) - COALESCE(SUM(pagos_agg.total_pagado), 0)) as saldo_pendiente_acumulado
      FROM ventas v
      LEFT JOIN clientes c ON c.id = v.cliente_id
      LEFT JOIN (
        SELECT 
          vp.venta_id,
          SUM(vp.monto_en_moneda_venta) as total_pagado
        FROM ventas_pagos vp
        INNER JOIN ventas v2 ON v2.id = vp.venta_id
        WHERE (? IS NULL OR v2.empresa_id = ?)
          AND (
            (? IS NULL AND ? IS NULL) 
            OR 
            (DATE(v2.fecha) BETWEEN ? AND ?)          
          )
        GROUP BY vp.venta_id
      ) pagos_agg ON pagos_agg.venta_id = v.id
      WHERE (? IS NULL OR v.empresa_id = ?)
        AND (
          (? IS NULL AND ? IS NULL) 
          OR 
          (DATE(v.fecha) BETWEEN ? AND ?)          
        )
      GROUP BY v.cliente_id, c.nombre, c.nit
      ORDER BY total_vendido DESC
      `,
      [
        empresa_id || null,
        empresa_id || null,
        fecha_inicio || null,
        fecha_fin || null,
        fecha_inicio || null,
        fecha_fin || null,
        empresa_id || null,
        empresa_id || null,
        fecha_inicio || null,
        fecha_fin || null,
        fecha_inicio || null,
        fecha_fin || null,
      ]
    ),
  { singleResult: false }
);

const getReporteVentasPorMetodoPago = fetchResultMysql(
  ({ empresa_id, fecha_inicio, fecha_fin }, connection) =>
    connection.execute(
      `
      SELECT 
        vp.metodo_pago_id,
        mp.nombre as metodo_pago_nombre,
        vp.moneda_id,
        m.codigo as moneda_codigo,
        SUM(vp.monto_en_moneda_venta) as total_ventas,
        COUNT(DISTINCT vp.venta_id) as numero_ventas
      FROM ventas_pagos vp
      INNER JOIN ventas v ON v.id = vp.venta_id
      LEFT JOIN metodos_pago mp ON mp.id = vp.metodo_pago_id
      LEFT JOIN monedas m ON m.id = vp.moneda_id
      WHERE (? IS NULL OR v.empresa_id = ?)
        AND (
          (? IS NULL AND ? IS NULL) 
          OR 
          (DATE(v.fecha) BETWEEN ? AND ?)          
        )
      GROUP BY vp.metodo_pago_id, mp.nombre, vp.moneda_id, m.codigo
      ORDER BY total_ventas DESC
      `,
      [
        empresa_id || null,
        empresa_id || null,
        fecha_inicio || null,
        fecha_fin || null,
        fecha_inicio || null,
        fecha_fin || null,
      ]
    ),
  { singleResult: false }
);

// ============ CARTERA ============

const getReporteCxcAging = fetchResultMysql(
  ({ empresa_id, fecha_inicio, fecha_fin, cliente_id }, connection) =>
    connection.execute(
      `
      SELECT 
        cxc.cliente_id,
        c.nombre as cliente_nombre,
        c.nit as cliente_nit,
        SUM(cxc.saldo) as total_saldo,
        SUM(CASE 
          WHEN DATEDIFF(CURDATE(), COALESCE(cxc.fecha_vencimiento, cxc.fecha_emision)) <= 30 
          THEN cxc.saldo ELSE 0 END) as saldo_0_30,
        SUM(CASE 
          WHEN DATEDIFF(CURDATE(), COALESCE(cxc.fecha_vencimiento, cxc.fecha_emision)) BETWEEN 31 AND 60 
          THEN cxc.saldo ELSE 0 END) as saldo_31_60,
        SUM(CASE 
          WHEN DATEDIFF(CURDATE(), COALESCE(cxc.fecha_vencimiento, cxc.fecha_emision)) BETWEEN 61 AND 90 
          THEN cxc.saldo ELSE 0 END) as saldo_61_90,
        SUM(CASE 
          WHEN DATEDIFF(CURDATE(), COALESCE(cxc.fecha_vencimiento, cxc.fecha_emision)) > 90 
          THEN cxc.saldo ELSE 0 END) as saldo_mas_90,
        AVG(DATEDIFF(CURDATE(), COALESCE(cxc.fecha_vencimiento, cxc.fecha_emision))) as dias_promedio_atraso
      FROM cuentas_por_cobrar cxc
      LEFT JOIN clientes c ON c.id = cxc.cliente_id
      WHERE (? IS NULL OR cxc.empresa_id = ?)
        AND cxc.saldo > 0
        AND cxc.estado NOT IN ('cancelada', 'anulada')
        AND (? IS NULL OR cxc.cliente_id = ?)
        AND (
          (? IS NULL AND ? IS NULL) 
          OR 
          (DATE(cxc.fecha_emision) BETWEEN ? AND ?)          
        )
      GROUP BY cxc.cliente_id, c.nombre, c.nit
      ORDER BY total_saldo DESC
      `,
      [
        empresa_id || null,
        empresa_id || null,
        cliente_id || null,
        cliente_id || null,
        fecha_inicio || null,
        fecha_fin || null,
        fecha_inicio || null,
        fecha_fin || null,
      ]
    ),
  { singleResult: false }
);

const getReporteCxpAging = fetchResultMysql(
  ({ empresa_id, fecha_inicio, fecha_fin, proveedor_id }, connection) =>
    connection.execute(
      `
      SELECT 
        cxp.proveedor_id,
        p.nombre as proveedor_nombre,
        SUM(cxp.saldo) as total_saldo,
        SUM(CASE 
          WHEN DATEDIFF(CURDATE(), COALESCE(cxp.fecha_vencimiento, cxp.fecha_emision)) <= 30 
          THEN cxp.saldo ELSE 0 END) as saldo_0_30,
        SUM(CASE 
          WHEN DATEDIFF(CURDATE(), COALESCE(cxp.fecha_vencimiento, cxp.fecha_emision)) BETWEEN 31 AND 60 
          THEN cxp.saldo ELSE 0 END) as saldo_31_60,
        SUM(CASE 
          WHEN DATEDIFF(CURDATE(), COALESCE(cxp.fecha_vencimiento, cxp.fecha_emision)) BETWEEN 61 AND 90 
          THEN cxp.saldo ELSE 0 END) as saldo_61_90,
        SUM(CASE 
          WHEN DATEDIFF(CURDATE(), COALESCE(cxp.fecha_vencimiento, cxp.fecha_emision)) > 90 
          THEN cxp.saldo ELSE 0 END) as saldo_mas_90,
        AVG(DATEDIFF(CURDATE(), COALESCE(cxp.fecha_vencimiento, cxp.fecha_emision))) as dias_promedio_atraso
      FROM cuentas_por_pagar cxp
      LEFT JOIN proveedores p ON p.id = cxp.proveedor_id
      WHERE (? IS NULL OR cxp.empresa_id = ?)
        AND cxp.saldo > 0
        AND cxp.estado NOT IN ('cancelada', 'anulada')
        AND (? IS NULL OR cxp.proveedor_id = ?)
        AND (
          (? IS NULL AND ? IS NULL) 
          OR 
          (DATE(cxp.fecha_emision) BETWEEN ? AND ?)          
        )
      GROUP BY cxp.proveedor_id, p.nombre
      ORDER BY total_saldo DESC
      `,
      [
        empresa_id || null,
        empresa_id || null,
        proveedor_id || null,
        proveedor_id || null,
        fecha_inicio || null,
        fecha_fin || null,
        fecha_inicio || null,
        fecha_fin || null,
      ]
    ),
  { singleResult: false }
);

const getReporteFlujoCaja = fetchResultMysql(
  ({ empresa_id, fecha_inicio, fecha_fin }, connection) =>
    connection.execute(
      `
      SELECT 
        DATE_FORMAT(COALESCE(cxc.fecha_vencimiento, cxc.fecha_emision), '%Y-%m') as periodo,
        'cobro' as tipo,
        SUM(cxc.saldo) as monto_estimado,
        0 as saldo_neto
      FROM cuentas_por_cobrar cxc
      WHERE (? IS NULL OR cxc.empresa_id = ?)
        AND cxc.saldo > 0
        AND cxc.estado NOT IN ('cancelada', 'anulada')
        AND (
          (? IS NULL AND ? IS NULL) 
          OR 
          (DATE(COALESCE(cxc.fecha_vencimiento, cxc.fecha_emision)) BETWEEN ? AND ?)          
        )
      GROUP BY DATE_FORMAT(COALESCE(cxc.fecha_vencimiento, cxc.fecha_emision), '%Y-%m')
      
      UNION ALL
      
      SELECT 
        DATE_FORMAT(COALESCE(cxp.fecha_vencimiento, cxp.fecha_emision), '%Y-%m') as periodo,
        'pago' as tipo,
        SUM(cxp.saldo) as monto_estimado,
        0 as saldo_neto
      FROM cuentas_por_pagar cxp
      WHERE (? IS NULL OR cxp.empresa_id = ?)
        AND cxp.saldo > 0
        AND cxp.estado NOT IN ('cancelada', 'anulada')
        AND (
          (? IS NULL AND ? IS NULL) 
          OR 
          (DATE(COALESCE(cxp.fecha_vencimiento, cxp.fecha_emision)) BETWEEN ? AND ?)          
        )
      GROUP BY DATE_FORMAT(COALESCE(cxp.fecha_vencimiento, cxp.fecha_emision), '%Y-%m')
      
      ORDER BY periodo, tipo
      `,
      [
        empresa_id || null,
        empresa_id || null,
        fecha_inicio || null,
        fecha_fin || null,
        fecha_inicio || null,
        fecha_fin || null,
        empresa_id || null,
        empresa_id || null,
        fecha_inicio || null,
        fecha_fin || null,
        fecha_inicio || null,
        fecha_fin || null,
      ]
    ),
  { singleResult: false }
);

// ============ INVENTARIO ============

const getReporteInventarioRotacion = fetchResultMysql(
  ({ empresa_id, fecha_inicio, fecha_fin, categoria }, connection) =>
    connection.execute(
      `
      SELECT 
        p.id as producto_id,
        p.codigo as producto_codigo,
        p.descripcion as producto_descripcion,
        p.categoria,
        COALESCE(SUM(CASE WHEN dv.cantidad > 0 THEN dv.cantidad ELSE 0 END), 0) as unidades_vendidas,
        COALESCE(AVG(ps.stock), 0) as stock_promedio,
        CASE 
          WHEN COALESCE(AVG(ps.stock), 0) > 0 
          THEN COALESCE(SUM(CASE WHEN dv.cantidad > 0 THEN dv.cantidad ELSE 0 END), 0) / COALESCE(AVG(ps.stock), 1)
          ELSE 0 
        END as rotacion,
        CASE 
          WHEN COALESCE(SUM(CASE WHEN dv.cantidad > 0 THEN dv.cantidad ELSE 0 END), 0) > 0
          THEN (COALESCE(ps.stock, 0) * DATEDIFF(COALESCE(?, CURDATE()), COALESCE(?, CURDATE()))) / COALESCE(SUM(CASE WHEN dv.cantidad > 0 THEN dv.cantidad ELSE 0 END), 1)
          ELSE NULL
        END as dias_cobertura
      FROM productos p
      LEFT JOIN productos_stock ps ON ps.producto_id = p.id AND ps.empresa_id = p.empresa_id
      LEFT JOIN detalles_ventas dv ON dv.producto_id = p.id
      LEFT JOIN ventas v ON v.id = dv.venta_id
      WHERE (? IS NULL OR p.empresa_id = ?)
        AND (? IS NULL OR p.categoria = ?)
        AND (
          (? IS NULL AND ? IS NULL) 
          OR 
          (DATE(v.fecha) BETWEEN ? AND ?)          
        )
      GROUP BY p.id, p.codigo, p.descripcion, p.categoria, ps.stock
      ORDER BY rotacion DESC
      `,
      [
        fecha_fin || null,
        fecha_inicio || null,
        empresa_id || null,
        empresa_id || null,
        categoria || null,
        categoria || null,
        fecha_inicio || null,
        fecha_fin || null,
        fecha_inicio || null,
        fecha_fin || null,
      ]
    ),
  { singleResult: false }
);

const getReporteInventarioBajaRotacion = fetchResultMysql(
  ({ empresa_id, dias_minimos, categoria }, connection) =>
    connection.execute(
      `
      SELECT *
      FROM (
        SELECT
          p.id AS producto_id,
          p.codigo,
          p.descripcion,
          p.categoria,
          p.fecha_creacion,
          COUNT(m.id) AS total_movimientos,
          SUM(m.tipo_movimiento = 'venta') AS total_ventas,
          MAX(m.fecha) AS ultimo_movimiento,
          MAX(CASE WHEN m.tipo_movimiento = 'venta' THEN m.fecha END) AS ultima_venta,
          COALESCE(ps.stock, 0) AS stock_actual,
          CASE
            WHEN COUNT(m.id) = 0
              THEN DATEDIFF(CURDATE(), p.fecha_creacion)
            WHEN SUM(m.tipo_movimiento = 'venta') > 0
              THEN DATEDIFF(CURDATE(), MAX(CASE WHEN m.tipo_movimiento = 'venta' THEN m.fecha END))
            ELSE
              DATEDIFF(CURDATE(), MAX(m.fecha))
          END AS dias_sin_rotacion
        FROM productos p
        LEFT JOIN movimientos_inventario m
          ON m.producto_id = p.id
          AND m.empresa_id = p.empresa_id
        LEFT JOIN productos_stock ps
          ON ps.producto_id = p.id
          AND ps.empresa_id = p.empresa_id
        WHERE (? IS NULL OR p.empresa_id = ?)
          AND (? IS NULL OR p.categoria = ?)
        GROUP BY p.id
      ) t
      WHERE (? IS NULL OR dias_sin_rotacion >= ?)
      ORDER BY dias_sin_rotacion DESC
      `,
      [
        empresa_id || null,
        empresa_id || null,
        categoria || null,
        categoria || null,
        dias_minimos || null,
        dias_minimos || null,
      ]
    ),
  { singleResult: false }
);

const getReporteInventarioRupturas = fetchResultMysql(
  ({ empresa_id, categoria }, connection) =>
    connection.execute(
      `
      SELECT 
        p.id as producto_id,
        p.codigo as producto_codigo,
        p.descripcion as producto_descripcion,
        p.categoria,
        COALESCE(ps.stock, 0) as stock_actual,
        0 as stock_minimo,
        (0 - COALESCE(ps.stock, 0)) as diferencia,
        CASE 
          WHEN COALESCE(ps.stock, 0) = 0 THEN 'Agotado'
          WHEN COALESCE(ps.stock, 0) <= 5 THEN 'Bajo'
          ELSE 'Normal'
        END as estado
      FROM productos p
      LEFT JOIN productos_stock ps ON ps.producto_id = p.id AND ps.empresa_id = p.empresa_id
      WHERE (? IS NULL OR p.empresa_id = ?)
        AND (? IS NULL OR p.categoria = ?)
        AND COALESCE(ps.stock, 0) <= 5
      ORDER BY stock_actual ASC
      `,
      [
        empresa_id || null,
        empresa_id || null,
        categoria || null,
        categoria || null,
      ]
    ),
  { singleResult: false }
);

// ============ RELACIONES ============

const getReporteTopClientes = fetchResultMysql(
  ({ empresa_id, fecha_inicio, fecha_fin, limite }, connection) => {
    const empresaId = normalizeToNull(empresa_id);
    const fechaInicio =
      fecha_inicio && fecha_inicio !== "" ? fecha_inicio : null;
    const fechaFin = fecha_fin && fecha_fin !== "" ? fecha_fin : null;
    const limiteValue = limite ? parseInt(limite, 10) : 20;

    // Build WHERE conditions dinámicamente sin subconsultas
    const whereConditions = [];
    const params = [];

    if (empresaId) {
      whereConditions.push("v.empresa_id = ?");
      params.push(empresaId);
    }

    if (fechaInicio) {
      whereConditions.push("v.fecha >= ?");
      params.push(fechaInicio);
    }

    if (fechaFin) {
      whereConditions.push("v.fecha <= ?");
      params.push(fechaFin);
    }

    // Solo clientes válidos
    whereConditions.push("v.cliente_id IS NOT NULL");

    const whereClause =
      whereConditions.length > 0
        ? `WHERE ${whereConditions.join(" AND ")}`
        : "";

    const query = `
      SELECT 
        v.cliente_id,
        c.nombre as cliente_nombre,
        c.nit as cliente_nit,
        SUM(v.total) as total_ventas,
        COUNT(DISTINCT v.id) as numero_ventas,
        AVG(v.total) as ticket_promedio
      FROM ventas v
      LEFT JOIN clientes c ON c.id = v.cliente_id
      ${whereClause}
      GROUP BY v.cliente_id, c.nombre, c.nit
      HAVING total_ventas > 0
      ORDER BY total_ventas DESC
      LIMIT ${limiteValue}
    `;

    // Solo parámetros de filtros; el LIMIT va embebido para evitar problemas con placeholders
    const allParams = [...params];

    return connection.execute(query, allParams);
  },
  { singleResult: false }
);

const getReporteTopProveedores = fetchResultMysql(
  ({ empresa_id, fecha_inicio, fecha_fin, limite }, connection) => {
    const empresaId = normalizeToNull(empresa_id);
    const fechaInicio =
      fecha_inicio && fecha_inicio !== "" ? fecha_inicio : null;
    const fechaFin = fecha_fin && fecha_fin !== "" ? fecha_fin : null;
    const limiteValue = limite ? parseInt(limite, 10) : 20;

    // Build WHERE conditions dynamically (same pattern as getReporteTopClientes)
    const whereConditions = ["cxp.estado <> 'anulada'"];
    const params = [];

    if (empresaId) {
      whereConditions.push("cxp.empresa_id = ?");
      params.push(empresaId);
    }

    if (fechaInicio) {
      whereConditions.push("cxp.fecha_emision >= ?");
      params.push(fechaInicio);
    }

    if (fechaFin) {
      whereConditions.push("cxp.fecha_emision <= ?");
      params.push(fechaFin);
    }

    const whereClause =
      whereConditions.length > 0
        ? `WHERE ${whereConditions.join(" AND ")}`
        : "";

    const query = `
      SELECT 
        cxp.proveedor_id,
        p.nombre AS proveedor_nombre,
        SUM(cxp.total) AS total_compras,
        COUNT(DISTINCT cxp.id) AS numero_compras,
        AVG(cxp.total) AS promedio_compra
      FROM cuentas_por_pagar cxp
      LEFT JOIN proveedores p ON p.id = cxp.proveedor_id
      ${whereClause}
      GROUP BY cxp.proveedor_id, p.nombre
      ORDER BY total_compras DESC
      LIMIT ${limiteValue}
    `;

    const allParams = [...params];

    return connection.execute(query, allParams);
  },
  { singleResult: false }
);

const getReporteClientesRiesgo = fetchResultMysql(
  ({ empresa_id }, connection) => {
    const empresaId = normalizeToNull(empresa_id);
    return connection.execute(
      `
      SELECT 
        cxc.cliente_id,
        c.nombre as cliente_nombre,
        c.nit as cliente_nit,
        SUM(CASE WHEN DATEDIFF(CURDATE(), COALESCE(cxc.fecha_vencimiento, cxc.fecha_emision)) > 0 THEN cxc.saldo ELSE 0 END) as saldo_vencido_total,
        AVG(CASE WHEN DATEDIFF(CURDATE(), COALESCE(cxc.fecha_vencimiento, cxc.fecha_emision)) > 0 
          THEN DATEDIFF(CURDATE(), COALESCE(cxc.fecha_vencimiento, cxc.fecha_emision)) 
          ELSE 0 END) as dias_atraso_promedio,
        COUNT(CASE WHEN DATEDIFF(CURDATE(), COALESCE(cxc.fecha_vencimiento, cxc.fecha_emision)) > 0 THEN 1 END) as numero_cuentas_vencidas,
        CASE 
          WHEN SUM(CASE WHEN DATEDIFF(CURDATE(), COALESCE(cxc.fecha_vencimiento, cxc.fecha_emision)) > 90 THEN cxc.saldo ELSE 0 END) > 0 THEN 'Alto'
          WHEN SUM(CASE WHEN DATEDIFF(CURDATE(), COALESCE(cxc.fecha_vencimiento, cxc.fecha_emision)) > 60 THEN cxc.saldo ELSE 0 END) > 0 THEN 'Medio'
          WHEN SUM(CASE WHEN DATEDIFF(CURDATE(), COALESCE(cxc.fecha_vencimiento, cxc.fecha_emision)) > 0 THEN cxc.saldo ELSE 0 END) > 0 THEN 'Bajo'
          ELSE 'Sin riesgo'
        END as riesgo_nivel
      FROM cuentas_por_cobrar cxc
      LEFT JOIN clientes c ON c.id = cxc.cliente_id
      WHERE (? IS NULL OR cxc.empresa_id = ?)
        AND cxc.saldo > 0
        AND cxc.estado NOT IN ('cancelada', 'anulada')
      GROUP BY cxc.cliente_id, c.nombre, c.nit
      HAVING saldo_vencido_total > 0
      ORDER BY saldo_vencido_total DESC
      `,
      [empresaId, empresaId]
    );
  },
  { singleResult: false }
);

// ============ HANDLERS ============

const getReporteVentasResumenHandler = async ({ request, params }) => {
  const {
    empresa_id,
    fecha_inicio,
    fecha_fin,
    estado_venta,
    usuario_id,
    cliente_id,
  } = params;
  return await getReporteVentasResumen({
    empresa_id,
    fecha_inicio,
    fecha_fin,
    estado_venta,
    usuario_id,
    cliente_id,
  });
};

const getReporteVentasPorVendedorHandler = async ({ request, params }) => {
  const { empresa_id, fecha_inicio, fecha_fin } = params;
  return await getReporteVentasPorVendedor({
    empresa_id,
    fecha_inicio,
    fecha_fin,
  });
};

const getReporteVentasPorClienteHandler = async ({ request, params }) => {
  const { empresa_id, fecha_inicio, fecha_fin } = params;
  return await getReporteVentasPorCliente({
    empresa_id,
    fecha_inicio,
    fecha_fin,
  });
};

const getReporteVentasPorMetodoPagoHandler = async ({ request, params }) => {
  const { empresa_id, fecha_inicio, fecha_fin } = params;
  return await getReporteVentasPorMetodoPago({
    empresa_id,
    fecha_inicio,
    fecha_fin,
  });
};

const getReporteCxcAgingHandler = async ({ request, params }) => {
  const { empresa_id, fecha_inicio, fecha_fin, cliente_id } = params;
  return await getReporteCxcAging({
    empresa_id,
    fecha_inicio,
    fecha_fin,
    cliente_id,
  });
};

const getReporteCxpAgingHandler = async ({ request, params }) => {
  const { empresa_id, fecha_inicio, fecha_fin, proveedor_id } = params;
  return await getReporteCxpAging({
    empresa_id,
    fecha_inicio,
    fecha_fin,
    proveedor_id,
  });
};

const getReporteFlujoCajaHandler = async ({ request, params }) => {
  const { empresa_id, fecha_inicio, fecha_fin } = params;
  return await getReporteFlujoCaja({
    empresa_id,
    fecha_inicio,
    fecha_fin,
  });
};

const getReporteInventarioRotacionHandler = async ({ request, params }) => {
  const { empresa_id, fecha_inicio, fecha_fin, categoria } = params;
  return await getReporteInventarioRotacion({
    empresa_id,
    fecha_inicio,
    fecha_fin,
    categoria,
  });
};

const getReporteInventarioBajaRotacionHandler = async ({ request, params }) => {
  const { empresa_id, dias_minimos, categoria } = params;
  const paramsProcessed = {
    empresa_id: empresa_id ? parseInt(empresa_id, 10) : null,
    dias_minimos: dias_minimos ? parseInt(dias_minimos, 10) : null,
    categoria: categoria || null,
  };
  try {
    const result = await getReporteInventarioBajaRotacion(paramsProcessed);
    return result;
  } catch (error) {
    console.error("getReporteInventarioBajaRotacion error:", error);
    throw error;
  }
};

const getReporteInventarioRupturasHandler = async ({ request, params }) => {
  const { empresa_id, categoria } = params;
  return await getReporteInventarioRupturas({
    empresa_id,
    categoria,
  });
};

const getReporteTopClientesHandler = async ({ request, params }) => {
  const { empresa_id, fecha_inicio, fecha_fin, limite } = params;
  const paramsProcessed = {
    empresa_id:
      empresa_id && empresa_id !== "" ? parseInt(empresa_id, 10) : null,
    fecha_inicio: fecha_inicio && fecha_inicio !== "" ? fecha_inicio : null,
    fecha_fin: fecha_fin && fecha_fin !== "" ? fecha_fin : null,
    limite: limite && limite !== "" ? parseInt(limite, 10) : null,
  };
  try {
    const result = await getReporteTopClientes(paramsProcessed);
    return result;
  } catch (error) {
    console.error("getReporteTopClientes error:", error);
    throw error;
  }
};

const getReporteTopProveedoresHandler = async ({ request, params }) => {
  const { empresa_id, fecha_inicio, fecha_fin, limite } = params;
  const paramsProcessed = {
    empresa_id:
      empresa_id && empresa_id !== "" ? parseInt(empresa_id, 10) : null,
    fecha_inicio: fecha_inicio && fecha_inicio !== "" ? fecha_inicio : null,
    fecha_fin: fecha_fin && fecha_fin !== "" ? fecha_fin : null,
    limite: limite && limite !== "" ? parseInt(limite, 10) : null,
  };
  return await getReporteTopProveedores(paramsProcessed);
};

const getReporteClientesRiesgoHandler = async ({ request, params }) => {
  const { empresa_id } = params;
  const paramsProcessed = {
    empresa_id:
      empresa_id && empresa_id !== "" ? parseInt(empresa_id, 10) : null,
  };
  return await getReporteClientesRiesgo(paramsProcessed);
};

module.exports = {
  getReporteVentasResumen: getReporteVentasResumenHandler,
  getReporteVentasPorVendedor: getReporteVentasPorVendedorHandler,
  getReporteVentasPorCliente: getReporteVentasPorClienteHandler,
  getReporteVentasPorMetodoPago: getReporteVentasPorMetodoPagoHandler,
  getReporteCxcAging: getReporteCxcAgingHandler,
  getReporteCxpAging: getReporteCxpAgingHandler,
  getReporteFlujoCaja: getReporteFlujoCajaHandler,
  getReporteInventarioRotacion: getReporteInventarioRotacionHandler,
  getReporteInventarioBajaRotacion: getReporteInventarioBajaRotacionHandler,
  getReporteInventarioRupturas: getReporteInventarioRupturasHandler,
  getReporteTopClientes: getReporteTopClientesHandler,
  getReporteTopProveedores: getReporteTopProveedoresHandler,
  getReporteClientesRiesgo: getReporteClientesRiesgoHandler,
};

const { fetchResultMysql } = require("libs/db");

const getReporteInventarioConMetodo = fetchResultMysql(
  (
    { empresa_id, producto_id, tipo_movimiento, fecha_inicio, fecha_fin },
    connection
  ) =>
    connection.execute(
      `
      SELECT * FROM reporte_inventario_con_metodo
      WHERE (? IS NULL OR empresa_id = ?)
        AND (? IS NULL OR producto_id = ?)
        AND (? IS NULL OR tipo_movimiento = ?)
        AND (
          (? IS NULL AND ? IS NULL) 
          OR 
          (DATE(fecha_movimiento) BETWEEN ? AND ?)          
        )
      AND estado_venta is not null
      ORDER BY fecha_movimiento DESC
      `,
      [
        empresa_id || null,
        empresa_id || null,
        producto_id || null,
        producto_id || null,
        tipo_movimiento || null,
        tipo_movimiento || null,
        fecha_inicio || null,
        fecha_fin || null,
        fecha_inicio || null,
        fecha_fin || null,
      ]
    ),
  { singleResult: false }
)

const getReporteVentasConPagos = fetchResultMysql(
  ({ empresa_id, fecha_inicio, fecha_fin, estado_venta }, connection) =>
    connection.execute(
      `
      SELECT 
        v.id,
        v.empresa_id,
        v.cliente_id,
        v.usuario_id,
        v.total,
        v.estado as estado_venta,
        v.fecha as fecha_venta,
        c.nombre as cliente_nombre,
        c.nit as cliente_nit,
        u.nombre as usuario_nombre,
        (SELECT IFNULL(SUM(vp.monto),0) FROM ventas_pagos vp WHERE vp.venta_id = v.id) AS monto_pagado,
        (v.total - (SELECT IFNULL(SUM(vp.monto),0) FROM ventas_pagos vp WHERE vp.venta_id = v.id)) AS saldo,
        JSON_ARRAYAGG(
          JSON_OBJECT(
            'id', vp.id,
            'metodo_pago', mp.nombre,
            'moneda', m.codigo,
            'monto', vp.monto,
            'referencia_pago', vp.referencia_pago,
            'fecha_creacion', vp.fecha_creacion
          )
        ) as pagos
      FROM ventas v
      LEFT JOIN clientes c ON c.id = v.cliente_id
      LEFT JOIN usuarios u ON u.id = v.usuario_id
      LEFT JOIN ventas_pagos vp ON vp.venta_id = v.id
      LEFT JOIN metodos_pago mp ON mp.id = vp.metodo_pago_id
      LEFT JOIN monedas m ON m.id = vp.moneda_id
      WHERE (? IS NULL OR v.empresa_id = ?)
        AND (? IS NULL OR v.estado = ?)
        AND (
          (? IS NULL AND ? IS NULL) 
          OR 
          (DATE(v.fecha) BETWEEN ? AND ?)          
        )
      GROUP BY v.id, v.empresa_id, v.cliente_id, v.usuario_id, v.total, v.estado, v.fecha, c.nombre, c.nit, u.nombre
      ORDER BY v.fecha DESC
      `,
      [
        empresa_id || null,
        empresa_id || null,
        estado_venta || null,
        estado_venta || null,
        fecha_inicio || null,
        fecha_fin || null,
        fecha_inicio || null,
        fecha_fin || null,
      ]
    ),
  { singleResult: false }
)

const getReporteMovimientosInventario = fetchResultMysql(
  (
    { empresa_id, producto_id, tipo_movimiento, fecha_inicio, fecha_fin },
    connection
  ) =>
    connection.execute(
      `
      SELECT * FROM reporte_movimientos_inventario
      WHERE (? IS NULL OR empresa_id = ?)
        AND (? IS NULL OR producto_id = ?)
        AND (? IS NULL OR tipo_movimiento = ?)
        AND (
          (? IS NULL AND ? IS NULL) 
          OR 
          (DATE(fecha) BETWEEN ? AND ?)          
        )
      ORDER BY fecha DESC
      `,
      [
        empresa_id || null,
        empresa_id || null,
        producto_id || null,
        producto_id || null,
        tipo_movimiento || null,
        tipo_movimiento || null,
        fecha_inicio || null,
        fecha_fin || null,
        fecha_inicio || null,
        fecha_fin || null,
      ]
    ),
  { singleResult: false }
)

const getReporteStockActual = fetchResultMysql(
  (
    {
      empresa_id,
      codigo,
      serie,
      descripcion,
      categoria,
      proveedor_nombre,
      proveedor_tipo,
    },
    connection
  ) =>
    connection.execute(
      `
      SELECT * FROM reporte_stock_actual
      WHERE (? IS NULL OR empresa_id = ?)
        AND (? IS NULL OR codigo = ?)
        AND (? IS NULL OR serie = ?)
        AND (? IS NULL OR descripcion LIKE ?)
        AND (? IS NULL OR categoria = ?)
        AND (? IS NULL OR proveedor_nombre LIKE ?)
        AND (? IS NULL OR proveedor_tipo = ?)
      ORDER BY empresa, descripcion
      `,
      [
        empresa_id || null,
        empresa_id || null,
        codigo || null,
        codigo || null,
        serie || null,
        serie || null,
        descripcion || null,
        descripcion ? `%${descripcion}%` : null,
        categoria || null,
        categoria || null,
        proveedor_nombre || null,
        proveedor_nombre ? `%${proveedor_nombre}%` : null,
        proveedor_tipo || null,
        proveedor_tipo || null,
      ]
    ),
  { singleResult: false }
)

// Handler functions
const getReporteInventarioConMetodoHandler = async ({ request, params }) => {
  const {
    empresa_id,
    producto_id,
    tipo_movimiento,
    fecha_inicio,
    fecha_fin,
  } = params;

  const reporte = await getReporteInventarioConMetodo({
    empresa_id,
    producto_id,
    tipo_movimiento,
    fecha_inicio,
    fecha_fin,
  });
  return reporte;
};

const getReporteMovimientosInventarioHandler = async ({ request, params }) => {
  const {
    empresa_id,
    producto_id,
    tipo_movimiento,
    fecha_inicio,
    fecha_fin,
  } = params;

  const reporte = await getReporteMovimientosInventario({
    empresa_id,
    producto_id,
    tipo_movimiento,
    fecha_inicio,
    fecha_fin,
  });
  return reporte;
};

const getReporteStockActualHandler = async ({ request, params }) => {
  const {
    empresa_id,
    codigo,
    serie,
    descripcion,
    categoria,
    proveedor_nombre,
    proveedor_tipo,
  } = params;

  const reporte = await getReporteStockActual({
    empresa_id,
    codigo,
    serie,
    descripcion,
    categoria,
    proveedor_nombre,
    proveedor_tipo,
  });
  return reporte;
};

const getReporteVentasConPagosHandler = async ({ request, params }) => {
  const { empresa_id, fecha_inicio, fecha_fin, estado_venta } = params;

  const reporte = await getReporteVentasConPagos({
    empresa_id,
    fecha_inicio,
    fecha_fin,
    estado_venta,
  });
  return reporte;
};

module.exports = {
  getReporteInventarioConMetodo: getReporteInventarioConMetodoHandler,
  getReporteMovimientosInventario: getReporteMovimientosInventarioHandler,
  getReporteStockActual: getReporteStockActualHandler,
  getReporteVentasConPagos: getReporteVentasConPagosHandler,
};


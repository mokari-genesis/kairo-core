const { fetchResultMysql } = require("libs/db");

const getMetodosPagoUnificado = fetchResultMysql(
  async (
    {
      empresa_id,
      venta_id,
      cliente_id,
      usuario_id,
      metodo_pago_id,
      moneda_id,
      estado_venta,
      estado_pago,
      fecha_venta_inicio,
      fecha_venta_fin,
      fecha_pago_inicio,
      fecha_pago_fin,
      venta_es_vendida,
      limit,
      offset,
    },
    connection
  ) => {
    return connection.execute(
      `
      SELECT 
        *
      FROM vista_metodos_pago_unificado
      WHERE (? IS NULL OR empresa_id = ?)
        AND (? IS NULL OR venta_id = ?)
        AND (? IS NULL OR cliente_id = ?)
        AND (? IS NULL OR usuario_id = ?)
        AND (? IS NULL OR metodo_pago_id = ?)
        AND (? IS NULL OR moneda_pago_id = ?)
        AND (? IS NULL OR estado_venta = ?)
        AND (? IS NULL OR estado_pago = ?)
        AND (? IS NULL OR venta_es_vendida_bool = ?)
        AND (? IS NULL OR fecha_venta_dia >= ?)
        AND (? IS NULL OR fecha_venta_dia <= ?)
        AND (? IS NULL OR fecha_pago_dia >= ?)
        AND (? IS NULL OR fecha_pago_dia <= ?)
      ORDER BY fecha_venta DESC, venta_id DESC, fecha_pago DESC
      LIMIT 100 OFFSET 0
      
      `,
      [
        empresa_id || null,
        empresa_id || null,
        venta_id || null,
        venta_id || null,
        cliente_id || null,
        cliente_id || null,
        usuario_id || null,
        usuario_id || null,
        metodo_pago_id || null,
        metodo_pago_id || null,
        moneda_id || null,
        moneda_id || null,
        estado_venta || null,
        estado_venta || null,
        estado_pago || null,
        estado_pago || null,
        venta_es_vendida || null,
        venta_es_vendida || null,
        fecha_venta_inicio || null,
        fecha_venta_inicio || null,
        fecha_venta_fin || null,
        fecha_venta_fin || null,
        fecha_pago_inicio || null,
        fecha_pago_inicio || null,
        fecha_pago_fin || null,
        fecha_pago_fin || null,
      ]
    );
  },
  { singleResult: false }
);

const getMetodosPagoUnificadoResumen = fetchResultMysql(
  async (
    {
      empresa_id,
      cliente_id,
      usuario_id,
      metodo_pago_id,
      moneda_id,
      estado_venta,
      estado_pago,
      fecha_venta_inicio,
      fecha_venta_fin,
      fecha_pago_inicio,
      fecha_pago_fin,
      venta_es_vendida,
      agrupar_por,
    },
    connection
  ) => {
    let groupByClause = "";
    let selectFields = "";

    switch (agrupar_por) {
      case "metodo_pago":
        groupByClause = "metodo_pago_id, metodo_pago";
        selectFields = "metodo_pago_id, metodo_pago, NULL as grupo_nombre";
        break;
      case "cliente":
        groupByClause = "cliente_id, cliente_nombre";
        selectFields =
          "cliente_id, cliente_nombre as grupo_nombre, NULL as metodo_pago";
        break;
      case "usuario":
        groupByClause = "usuario_id, usuario_nombre";
        selectFields =
          "usuario_id, usuario_nombre as grupo_nombre, NULL as metodo_pago";
        break;
      case "moneda":
        groupByClause = "moneda_pago_id, moneda_pago_codigo";
        selectFields =
          "moneda_pago_id, moneda_pago_codigo as grupo_nombre, NULL as metodo_pago";
        break;
      case "fecha_venta_dia":
        groupByClause = "fecha_venta_dia";
        selectFields =
          "fecha_venta_dia as grupo_nombre, NULL as metodo_pago, NULL as cliente_id";
        break;
      case "fecha_pago_dia":
        groupByClause = "fecha_pago_dia";
        selectFields =
          "fecha_pago_dia as grupo_nombre, NULL as metodo_pago, NULL as cliente_id";
        break;
      default:
        groupByClause = "metodo_pago_id, metodo_pago";
        selectFields = "metodo_pago_id, metodo_pago, NULL as grupo_nombre";
    }

    return connection.execute(
      `
      SELECT 
        ${selectFields},
        COUNT(DISTINCT venta_id) as total_ventas,
        COUNT(pago_id) as total_pagos,
        SUM(monto_pago) as total_monto_pagado,
        AVG(monto_pago) as promedio_monto_pago,
        MIN(monto_pago) as monto_minimo,
        MAX(monto_pago) as monto_maximo,
        SUM(monto_pago_convertido) as total_ventas_monto,
        AVG(total_venta) as promedio_venta,
        SUM(saldo_pendiente_venta) as total_saldo_pendiente,
        COUNT(DISTINCT CASE WHEN venta_es_vendida_bool = 1 THEN venta_id END) as ventas_completadas,
        COUNT(DISTINCT CASE WHEN venta_es_vendida_bool = 0 THEN venta_id END) as ventas_pendientes,
        moneda_pago_codigo,
        moneda_pago_nombre,
        moneda_pago_simbolo,
        estado_venta,
        monto_pago_convertido,
        tasa_cambio_aplicada
      FROM vista_metodos_pago_unificado
      WHERE (? IS NULL OR empresa_id = ?)
        AND (? IS NULL OR cliente_id = ?)
        AND (? IS NULL OR usuario_id = ?)
        AND (? IS NULL OR metodo_pago_id = ?)
        AND (? IS NULL OR moneda_pago_id = ?)
        AND (? IS NULL OR estado_venta = ?)
        AND (? IS NULL OR estado_pago = ?)
        AND (? IS NULL OR venta_es_vendida_bool = ?)
        AND (? IS NULL OR fecha_venta_dia >= ?)
        AND (? IS NULL OR fecha_venta_dia <= ?)
        AND (? IS NULL OR fecha_pago_dia >= ?)
        AND (? IS NULL OR fecha_pago_dia <= ?)
        AND estado_venta = 'vendido'
      GROUP BY ${groupByClause}
      ORDER BY total_monto_pagado DESC
      `,
      [
        empresa_id || null,
        empresa_id || null,
        cliente_id || null,
        cliente_id || null,
        usuario_id || null,
        usuario_id || null,
        metodo_pago_id || null,
        metodo_pago_id || null,
        moneda_id || null,
        moneda_id || null,
        estado_venta || null,
        estado_venta || null,
        estado_pago || null,
        estado_pago || null,
        venta_es_vendida || null,
        venta_es_vendida || null,
        fecha_venta_inicio || null,
        fecha_venta_inicio || null,
        fecha_venta_fin || null,
        fecha_venta_fin || null,
        fecha_pago_inicio || null,
        fecha_pago_inicio || null,
        fecha_pago_fin || null,
        fecha_pago_fin || null,
      ]
    );
  },
  { singleResult: false }
);

// Handler functions
const getMetodosPagoUnificadoHandler = async ({ request, params }) => {
  const {
    empresa_id,
    venta_id,
    cliente_id,
    usuario_id,
    metodo_pago_id,
    moneda_id,
    estado_venta,
    estado_pago,
    fecha_venta_inicio,
    fecha_venta_fin,
    fecha_pago_inicio,
    fecha_pago_fin,
    venta_es_vendida,
    limit,
    offset,
  } = params;

  const reporte = await getMetodosPagoUnificado({
    empresa_id: empresa_id ? parseInt(empresa_id) : null,
    venta_id: venta_id ? parseInt(venta_id) : null,
    cliente_id: cliente_id ? parseInt(cliente_id) : null,
    usuario_id: usuario_id ? parseInt(usuario_id) : null,
    metodo_pago_id: metodo_pago_id ? parseInt(metodo_pago_id) : null,
    moneda_id: moneda_id ? parseInt(moneda_id) : null,
    estado_venta,
    estado_pago,
    fecha_venta_inicio,
    fecha_venta_fin,
    fecha_pago_inicio,
    fecha_pago_fin,
    venta_es_vendida: venta_es_vendida
      ? venta_es_vendida === "true" || venta_es_vendida === "1"
      : null,
    limit: !isNaN(parseInt(limit)) ? parseInt(limit) : 100,
    offset: !isNaN(parseInt(offset)) ? parseInt(offset) : 0,
  });
  return reporte;
};

const getMetodosPagoUnificadoResumenHandler = async ({ request, params }) => {
  const {
    empresa_id,
    cliente_id,
    usuario_id,
    metodo_pago_id,
    moneda_id,
    estado_venta,
    estado_pago,
    fecha_venta_inicio,
    fecha_venta_fin,
    fecha_pago_inicio,
    fecha_pago_fin,
    venta_es_vendida,
    agrupar_por = "metodo_pago",
  } = params;

  const resumen = await getMetodosPagoUnificadoResumen({
    empresa_id,
    cliente_id,
    usuario_id,
    metodo_pago_id,
    moneda_id,
    estado_venta,
    estado_pago,
    fecha_venta_inicio,
    fecha_venta_fin,
    fecha_pago_inicio,
    fecha_pago_fin,
    venta_es_vendida,
    agrupar_por,
  });
  return resumen;
};

module.exports = {
  getMetodosPagoUnificado: getMetodosPagoUnificadoHandler,
  getMetodosPagoUnificadoResumen: getMetodosPagoUnificadoResumenHandler,
};

// Import all storage functions
const storage = require("./storage-functions");

// ============================================
// HANDLERS HTTP - MÓDULO COMPRAS
// ============================================

// Listar compras
const getCompras = async ({ request, params }) => {
  const {
    empresa_id,
    id,
    proveedor_id,
    usuario_id,
    estado,
    tipo_pago,
    fecha_inicio,
    fecha_fin,
    producto_id,
  } = params;

  const compras = await storage.getCompras({
    empresa_id,
    id,
    proveedor_id,
    usuario_id,
    estado,
    tipo_pago,
    fecha_inicio,
    fecha_fin,
    producto_id,
  });

  return compras;
};

// Obtener compra por ID
const getCompra = async ({ request, params }) => {
  const { id } = params;

  if (!id) {
    throw new Error("Missing required field: id");
  }

  const compra = await storage.getCompraById({ compra_id: id });
  if (!compra) {
    throw new Error("Compra no encontrada");
  }

  const detalles = await storage.getCompraDetalles({ compra_id: id });
  const compraCompleta = await storage.getCompraCompleta({ compra_id: id });

  return {
    ...compra,
    detalles,
    cuenta_por_pagar: compraCompleta.cxp_id
      ? {
          id: compraCompleta.cxp_id,
          total: compraCompleta.cxp_total,
          saldo: compraCompleta.cxp_saldo,
          estado: compraCompleta.cxp_estado,
          fecha_emision: compraCompleta.cxp_fecha_emision,
          fecha_vencimiento: compraCompleta.cxp_fecha_vencimiento,
        }
      : null,
  };
};

// Crear compra
const postCompra = async ({ request, params }) => {
  const {
    empresa_id,
    proveedor_id,
    usuario_id,
    fecha,
    moneda_id,
    tipo_pago,
    fecha_vencimiento,
    comentario,
    items,
  } = params;

  // Validaciones básicas
  if (!empresa_id || !proveedor_id || !moneda_id || !items) {
    throw new Error("Missing required fields: empresa_id, proveedor_id, moneda_id, items");
  }

  if (!Array.isArray(items) || items.length === 0) {
    throw new Error("items debe ser un array con al menos un elemento");
  }

  // Validar tipo_pago si se proporciona
  if (tipo_pago && !["contado", "credito"].includes(tipo_pago)) {
    throw new Error("tipo_pago debe ser 'contado' o 'credito'");
  }

  // Si es crédito, fecha_vencimiento es opcional pero recomendado
  if (tipo_pago === "credito" && fecha_vencimiento) {
    const fechaVenc = new Date(fecha_vencimiento);
    const fechaCompra = fecha ? new Date(fecha) : new Date();
    if (fechaVenc < fechaCompra) {
      throw new Error("fecha_vencimiento no puede ser anterior a fecha de compra");
    }
  }

  const compra = await storage.createCompra({
    empresa_id,
    proveedor_id,
    usuario_id,
    fecha,
    moneda_id,
    tipo_pago,
    fecha_vencimiento,
    comentario,
    items,
  });

  return compra;
};

// Anular compra
const anularCompra = async ({ request, params }) => {
  const { id } = params;

  if (!id) {
    throw new Error("Missing required field: id");
  }

  const result = await storage.anularCompra({ compra_id: id });
  return result;
};

// ============================================
// REPORTES
// ============================================

// Compras por rango de fechas
const getComprasPorRangoFechas = async ({ request, params }) => {
  const { empresa_id, fecha_inicio, fecha_fin } = params;

  const reporte = await storage.getComprasPorRangoFechas({
    empresa_id,
    fecha_inicio,
    fecha_fin,
  });

  return reporte;
};

// Compras por proveedor
const getComprasPorProveedor = async ({ request, params }) => {
  const { empresa_id, fecha_inicio, fecha_fin } = params;

  const reporte = await storage.getComprasPorProveedor({
    empresa_id,
    fecha_inicio,
    fecha_fin,
  });

  return reporte;
};

// Compras contado vs crédito
const getComprasContadoVsCredito = async ({ request, params }) => {
  const { empresa_id, fecha_inicio, fecha_fin } = params;

  const reporte = await storage.getComprasContadoVsCredito({
    empresa_id,
    fecha_inicio,
    fecha_fin,
  });

  return reporte;
};

// Cuentas por pagar por compras
const getCxpPorCompras = async ({ request, params }) => {
  const { empresa_id, fecha_inicio, fecha_fin } = params;

  const reporte = await storage.getCxpPorCompras({
    empresa_id,
    fecha_inicio,
    fecha_fin,
  });

  return reporte;
};

// Productos más comprados
const getProductosMasComprados = async ({ request, params }) => {
  const { empresa_id, fecha_inicio, fecha_fin, limit } = params;

  const reporte = await storage.getProductosMasComprados({
    empresa_id,
    fecha_inicio,
    fecha_fin,
    limit: limit || 10,
  });

  return reporte;
};

module.exports = {
  getCompras,
  getCompra,
  postCompra,
  anularCompra,
  // Reportes
  getComprasPorRangoFechas,
  getComprasPorProveedor,
  getComprasContadoVsCredito,
  getCxpPorCompras,
  getProductosMasComprados,
};


const storage = require("./storage-functions");

// Obtener todas las cuentas por pagar
const getCuentasPorPagar = async ({ request, params }) => {
  const {
    empresa_id,
    proveedor_id,
    compra_id,
    estado,
    fecha_inicio,
    fecha_fin,
    id,
  } = params;

  // Convertir id a número si está presente
  const idNumber = id ? Number(id) : null;

  const cuentas = await storage.getCuentasPorPagar({
    empresa_id,
    proveedor_id,
    compra_id,
    estado,
    fecha_inicio,
    fecha_fin,
    id: idNumber && !isNaN(idNumber) ? idNumber : null,
  });

  return cuentas;
};

// Obtener detalle de una cuenta por pagar (incluye abonos)
const getCuentaPorPagar = async ({ request, params }) => {
  const { id } = params;

  if (!id) {
    throw new Error("Missing required field: id");
  }

  const cuenta = await storage.getCuentaPorPagarById({ id });

  if (!cuenta) {
    throw new Error("Cuenta por pagar no encontrada");
  }

  const abonos = await storage.getAbonosByCxpId({ cxp_id: id });

  return {
    ...cuenta,
    abonos,
  };
};

// Crear una cuenta por pagar manualmente
const postCuentaPorPagar = async ({ request, params }) => {
  const {
    empresa_id,
    proveedor_id,
    compra_id,
    moneda_id,
    total,
    fecha_emision,
    fecha_vencimiento,
    comentario,
  } = params;

  if (!empresa_id || !proveedor_id || !moneda_id || !total || !fecha_emision) {
    throw new Error("Missing required fields");
  }

  const cuenta = await storage.createCuentaPorPagar({
    empresa_id,
    proveedor_id,
    compra_id: compra_id || null,
    moneda_id,
    total,
    fecha_emision,
    fecha_vencimiento: fecha_vencimiento || null,
    comentario: comentario || null,
  });

  return cuenta;
};

// Registrar abono/pago
const postAbono = async ({ request, params }) => {
  const {
    id,
    cxp_id,
    metodo_pago_id,
    moneda_id,
    monto,
    tasa_cambio,
    referencia,
    fecha,
  } = params;

  const cuentaId = cxp_id || id;

  if (!cuentaId || !moneda_id || !monto) {
    throw new Error("Missing required fields");
  }

  await storage.addAbonoToCuentaPorPagar({
    cxp_id: cuentaId,
    metodo_pago_id: metodo_pago_id || null,
    moneda_id,
    monto,
    tasa_cambio: tasa_cambio || null,
    referencia: referencia || null,
    fecha: fecha || null,
  });

  const cuenta = await storage.getCuentaPorPagarById({ id: cuentaId });
  const abonos = await storage.getAbonosByCxpId({ cxp_id: cuentaId });

  return { ...cuenta, abonos };
};

// Resumen de saldos por proveedor
const getSaldoProveedores = async ({ request, params }) => {
  const { empresa_id, proveedor_id, estado } = params;

  const resumen = await storage.getSaldoPorProveedor({
    empresa_id,
    proveedor_id,
    estado,
  });

  return resumen;
};

// Sincronizar cuenta por pagar desde una compra
const syncFromCompra = async ({ request, params }) => {
  const { compra_id } = params;

  if (!compra_id) {
    throw new Error("Missing required field: compra_id");
  }

  const cxpId = await storage.syncCuentaPorPagarFromCompra({ compra_id });

  if (!cxpId) {
    return { message: "No se creó o actualizó ninguna cuenta por pagar" };
  }

  const cuenta = await storage.getCuentaPorPagarById({ id: cxpId });
  const abonos = await storage.getAbonosByCxpId({ cxp_id: cxpId });

  return {
    ...cuenta,
    abonos,
  };
};

// Eliminar abono
const deleteAbono = async ({ request, params }) => {
  const { id, abono_id } = params;

  if (!id || !abono_id) {
    throw new Error(
      "Missing required fields: id (cxp_id de URL), abono_id (de URL)"
    );
  }

  await storage.deleteAbonoFromCuentaPorPagar({
    cxp_id: id,
    abono_id: abono_id,
  });

  const cuenta = await storage.getCuentaPorPagarById({ id });
  const abonos = await storage.getAbonosByCxpId({ cxp_id: id });

  return { ...cuenta, abonos };
};

module.exports = {
  getCuentasPorPagar,
  getCuentaPorPagar,
  postCuentaPorPagar,
  postAbono,
  getSaldoProveedores,
  syncFromCompra,
  deleteAbono,
};

const storage = require("./storage-functions");

// Obtener todas las cuentas por cobrar
const getCuentasPorCobrar = async ({ request, params }) => {
  const {
    empresa_id,
    cliente_id,
    venta_id,
    estado,
    fecha_inicio,
    fecha_fin,
    dias_antiguedad_min,
    dias_antiguedad_max,
  } = params;

  const cuentas = await storage.getCuentasPorCobrar({
    empresa_id,
    cliente_id,
    venta_id,
    estado,
    fecha_inicio,
    fecha_fin,
    dias_antiguedad_min,
    dias_antiguedad_max,
  });

  return cuentas;
};

// Obtener una cuenta por cobrar por ID
const getCuentaPorCobrar = async ({ request, params }) => {
  const { id } = params;

  if (!id) {
    throw new Error("Missing required field: id");
  }

  const cuenta = await storage.getCuentaPorCobrarById({ id });

  if (!cuenta) {
    throw new Error("Cuenta por cobrar no encontrada");
  }

  // Obtener abonos
  const abonos = await storage.getAbonosByCxcId({ cxc_id: id });

  return {
    ...cuenta,
    abonos,
  };
};

// Crear una cuenta por cobrar manualmente
const postCuentaPorCobrar = async ({ request, params }) => {
  const {
    empresa_id,
    cliente_id,
    venta_id,
    moneda_id,
    total,
    fecha_emision,
    fecha_vencimiento,
    comentario,
  } = params;

  if (!empresa_id || !cliente_id || !moneda_id || !total || !fecha_emision) {
    throw new Error("Missing required fields");
  }

  const cuenta = await storage.createCuentaPorCobrar({
    empresa_id,
    cliente_id,
    venta_id: venta_id || null,
    moneda_id,
    total,
    fecha_emision,
    fecha_vencimiento: fecha_vencimiento || null,
    comentario: comentario || null,
  });

  return cuenta;
};

// Actualizar una cuenta por cobrar
const putCuentaPorCobrar = async ({ request, params }) => {
  const { id, fecha_vencimiento, comentario } = params;

  if (!id) {
    throw new Error("Missing required field: id");
  }

  const cuenta = await storage.updateCuentaPorCobrar({
    id,
    fecha_vencimiento: fecha_vencimiento || null,
    comentario: comentario || null,
  });

  return cuenta;
};

// Sincronizar cuenta por cobrar desde una venta
const syncFromVenta = async ({ request, params }) => {
  const { venta_id } = params;

  if (!venta_id) {
    throw new Error("Missing required field: venta_id");
  }

  const cxcId = await storage.syncCuentaPorCobrarFromVenta({ venta_id });

  if (!cxcId) {
    return { message: "No se creó o actualizó ninguna cuenta por cobrar" };
  }

  const cuenta = await storage.getCuentaPorCobrarById({ id: cxcId });
  const abonos = await storage.getAbonosByCxcId({ cxc_id: cxcId });

  return {
    ...cuenta,
    abonos,
  };
};

// Registrar abono/pago
const postAbono = async ({ request, params }) => {
  const {
    id, // De la URL: /cuentas-por-cobrar/:id/abonos
    cxc_id, // Del body (opcional, para compatibilidad)
    metodo_pago_id,
    moneda_id,
    monto,
    tasa_cambio,
    referencia,
    fecha,
  } = params;

  // El id viene de la URL, pero también puede venir cxc_id del body
  const cuentaId = id || cxc_id;

  if (!cuentaId || !moneda_id || !monto) {
    throw new Error(
      "Missing required fields: id (de URL) o cxc_id, moneda_id, monto"
    );
  }

  await storage.addAbonoToCuentaPorCobrar({
    cxc_id: cuentaId,
    metodo_pago_id: metodo_pago_id || null,
    moneda_id,
    monto,
    tasa_cambio: tasa_cambio || null,
    referencia: referencia || null,
    fecha: fecha || null,
  });

  const cuenta = await storage.getCuentaPorCobrarById({ id: cuentaId });
  const abonos = await storage.getAbonosByCxcId({ cxc_id: cuentaId });

  return { ...cuenta, abonos };
};

// Eliminar abono
const deleteAbono = async ({ request, params }) => {
  const { id, abono_id } = params;

  if (!id || !abono_id) {
    throw new Error(
      "Missing required fields: id (cxc_id de URL), abono_id (de URL)"
    );
  }

  await storage.deleteAbonoFromCuentaPorCobrar({
    cxc_id: id,
    abono_id: abono_id,
  });

  const cuenta = await storage.getCuentaPorCobrarById({ id });
  const abonos = await storage.getAbonosByCxcId({ cxc_id: id });

  return { ...cuenta, abonos };
};

module.exports = {
  getCuentasPorCobrar,
  getCuentaPorCobrar,
  postCuentaPorCobrar,
  putCuentaPorCobrar,
  syncFromVenta,
  postAbono,
  deleteAbono,
};

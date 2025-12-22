// Import all storage functions
const storage = require("./storage-functions");

// Handler functions that wrap storage functions
const getPurchase = async ({ request, params }) => {
  const {
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
  } = params;

  const purchases = await storage.getPurchases({
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
  });
  return purchases;
};

const getPurchaseFlat = async ({ request, params }) => {
  const {
    empresa_id,
    id,
    cliente_nombre,
    cliente_nit,
    cliente_email,
    usuario_nombre,
    estado_venta,
    fecha_venta,
  } = params;

  const purchases = await storage.getPurchasesFlat({
    empresa_id,
    id,
    cliente_nombre,
    cliente_nit,
    cliente_email,
    usuario_nombre,
    estado_venta,
    fecha_venta,
  });
  return purchases;
};

const postPurchase = async ({ request, params }) => {
  const {
    empresa_id,
    cliente_id,
    usuario_id,
    total,
    estado,
    detalle,
    metodo_pago_id,
    moneda_id,
    moneda,
    referencia_pago,
    pagos,
    comentario,
  } = params;

  if (
    !empresa_id ||
    !cliente_id ||
    !usuario_id ||
    !total ||
    !estado ||
    !detalle
  ) {
    throw new Error("Missing required fields");
  }

  // Validar pagos si se proporcionan (pero no son obligatorios)
  if (pagos && pagos.length > 0) {
    for (const pago of pagos) {
      if (!pago.metodo_pago_id || !pago.moneda_id) {
        throw new Error("Cada pago debe tener metodo_pago_id y moneda_id");
      }
    }

    const totalPagos = pagos.reduce(
      (sum, pago) => sum + Number(pago.monto_en_moneda_venta),
      0
    );
    if (totalPagos > Number(total) + 0.01) {
      throw new Error("La suma de pagos no puede exceder el total de la venta");
    }
  }

  // La validación de stock y estado de producto ahora la realiza la BD
  // (checks/triggers). El backend solo registra la venta.

  // Validar que los productos no estén en transferencias en estado borrador
  // Esta validación se hace antes de crear la venta
  if (detalle && detalle.length > 0) {
    const producto_ids = detalle.map((d) => d.producto_id);
    await storage.validateProductosNoEnTransferenciasBorrador({
      producto_ids,
      empresa_id,
    });
  }

  // Crear la venta con detalles para generar movimientos (vía triggers)
  const venta = await storage.createVenta({
    empresa_id,
    cliente_id,
    usuario_id,
    total,
    estado,
    comentario: comentario || null,
    detalles: estado === "vendido" ? detalle : [],
  });

  // Insertar detalles
  for (const item of detalle) {
    await storage.createDetalleVenta({
      venta_id: venta.id,
      producto_id: item.producto_id,
      cantidad: item.cantidad,
      precio_unitario: item.precio_unitario,
      subtotal: item.subtotal,
      tipo_precio_aplicado: item.tipo_precio_aplicado,
    });
  }

  // Crear pagos si existen
  let pagosCreados = [];
  if (pagos && pagos.length > 0) {
    pagosCreados = await storage.createVentaPayments({
      venta_id: venta.id,
      pagos: pagos,
    });
    // updateEstadoPago ya se llama dentro de createVentaPayments
  }

  // Obtener venta con información de pagos
  const ventaCompleta = await storage.getVentaWithPayments({
    ventaId: venta.id,
  });
  const pagosList = await storage.getVentaPayments({ ventaId: venta.id });

  return {
    ...ventaCompleta,
    pagos: pagosList,
  };
};

const putPurchase = async ({ request, params }) => {
  const { venta_id, estado, pagos } = params;

  if (!venta_id || !estado) {
    throw new Error("Missing required fields");
  }

  if (estado !== "vendido") {
    throw new Error("Estado no válido");
  }

  // Validar pagos si se proporcionan (pero no son obligatorios)
  if (pagos && pagos.length > 0) {
    for (const pago of pagos) {
      if (!pago.metodo_pago_id || !pago.moneda_id) {
        throw new Error("Cada pago debe tener metodo_pago_id y moneda_id");
      }
    }

    const ventaActual = await storage.getVentaById({ venta_id });
    if (!ventaActual) {
      throw new Error("Venta no encontrada");
    }

    const totalPagos = pagos.reduce(
      (sum, pago) => sum + Number(pago.monto_en_moneda_venta),
      0
    );
    if (totalPagos > Number(ventaActual.total) + 0.01) {
      throw new Error("La suma de pagos no puede exceder el total de la venta");
    }
  }

  const ventaActual = await storage.getVentaById({ venta_id });
  if (!ventaActual) {
    throw new Error("Venta no encontrada");
  }

  const nuevaVenta = await storage.updateVenta({
    venta_id,
    estado,
  });

  await storage.copiarDetallesVenta({
    venta_id_original: venta_id,
    venta_id_nueva: nuevaVenta.id,
  });

  if (pagos && pagos.length > 0) {
    await storage.createVentaPayments({
      venta_id: nuevaVenta.id,
      pagos: pagos,
    });
    // updateEstadoPago ya se llama dentro de createVentaPayments
  }

  await storage.deleteVenta({ venta_id });

  const ventaCompleta = await storage.getVentaWithPayments({
    ventaId: nuevaVenta.id,
  });
  const pagosList = await storage.getVentaPayments({ ventaId: nuevaVenta.id });

  return {
    ...ventaCompleta,
    pagos: pagosList,
  };
};

const cancelPurchase = async ({ request, params }) => {
  const { venta_id } = params;

  if (!venta_id) {
    throw new Error("Missing required fields");
  }

  const venta = await storage.getVentaById({ venta_id });

  if (!venta || venta.estado === "cancelado") {
    throw new Error("La venta no existe o ya está cancelada");
  }

  const detalles = await storage.getDetallesVentaByVentaId({ venta_id });

  await storage.cancelarVenta({ venta_id });

  for (const detalle of detalles) {
    await storage.crearMovimientoDevolucion({
      empresa_id: venta.empresa_id,
      producto_id: detalle.producto_id,
      usuario_id: venta.usuario_id,
      cantidad: detalle.cantidad,
      comentario: `Devolución al stock de productos por cancelación de venta`,
      referencia: venta_id,
    });
  }

  return { venta_id };
};

const updatePurchaseStatus = async ({ request, params }) => {
  const { venta_id, estado } = params;

  if (!venta_id || !estado) {
    throw new Error("Missing required fields");
  }

  const venta = await storage.updateVentaStatus({ venta_id, estado });
  return venta;
};

const updateSale = async ({ request, params }) => {
  const {
    venta_id,
    empresa_id,
    cliente_id,
    usuario_id,
    total,
    estado,
    detalle,
    pagos,
    comentario,
  } = params;

  if (
    !venta_id ||
    !empresa_id ||
    !cliente_id ||
    !usuario_id ||
    !total ||
    !estado ||
    !detalle
  ) {
    throw new Error("Missing required fields");
  }

  // Validar pagos si se proporcionan (pero no son obligatorios)
  if (pagos && pagos.length > 0) {
    for (const pago of pagos) {
      if (!pago.metodo_pago_id || !pago.moneda_id) {
        throw new Error("Cada pago debe tener metodo_pago_id y moneda_id");
      }
    }

    const totalPagos = pagos.reduce(
      (sum, pago) => sum + Number(pago.monto_en_moneda_venta),
      0
    );
    if (totalPagos > Number(total) + 0.01) {
      throw new Error("La suma de pagos no puede exceder el total de la venta");
    }
  }

  const existingVenta = await storage.getVentaById({ venta_id });
  if (!existingVenta) {
    throw new Error("Venta no encontrada");
  }

  const detalles = await storage.getDetallesVentaByVentaId({ venta_id });

  await storage.cancelarVenta({ venta_id });

  for (const detalle of detalles) {
    await storage.crearMovimientoDevolucion({
      empresa_id: existingVenta.empresa_id,
      producto_id: detalle.producto_id,
      usuario_id: existingVenta.usuario_id,
      cantidad: detalle.cantidad,
      comentario: `Devolución al stock de productos, se edito la informacion de la Venta`,
      referencia: venta_id,
    });
  }

  // La validación de stock pasa a la base de datos (triggers/constraints).

  // Validar que los productos no estén en transferencias en estado borrador
  if (detalle && detalle.length > 0) {
    const producto_ids = detalle.map((d) => d.producto_id);
    await storage.validateProductosNoEnTransferenciasBorrador({
      producto_ids,
      empresa_id,
    });
  }

  await storage.deleteVenta({ venta_id });

  const venta = await storage.createVenta({
    empresa_id,
    cliente_id,
    usuario_id,
    total,
    estado,
    comentario: comentario || null,
    detalles: estado === "vendido" ? detalle : [],
  });

  for (const item of detalle) {
    await storage.createDetalleVenta({
      venta_id: venta.id,
      producto_id: item.producto_id,
      cantidad: item.cantidad,
      precio_unitario: item.precio_unitario,
      subtotal: item.subtotal,
      tipo_precio_aplicado: item.tipo_precio_aplicado,
    });
  }

  if (pagos && pagos.length > 0) {
    await storage.createVentaPayments({
      venta_id: venta.id,
      pagos: pagos,
    });
    // updateEstadoPago ya se llama dentro de createVentaPayments
  }

  const ventaCompleta = await storage.getVentaWithPayments({
    ventaId: venta.id,
  });
  const pagosList = await storage.getVentaPayments({ ventaId: venta.id });

  return {
    ...ventaCompleta,
    pagos: pagosList,
  };
};

const removeSale = async ({ request, params }) => {
  const { venta_id } = params;

  if (!venta_id) {
    throw new Error("Missing required fields");
  }

  const venta = await storage.getVentaById({ venta_id });

  if (!venta || venta.estado !== "cancelado") {
    const detalles = await storage.getDetallesVentaByVentaId({ venta_id });

    for (const detalle of detalles) {
      await storage.crearMovimientoDevolucion({
        empresa_id: venta.empresa_id,
        producto_id: detalle.producto_id,
        usuario_id: venta.usuario_id,
        cantidad: detalle.cantidad,
        comentario: `Devolución al stock de productos por eliminacion de la venta`,
        referencia: venta_id,
      });
    }
  }

  await storage.deleteVenta({ venta_id });
  return { success: true };
};

// Payment handlers
const createPayment = async ({ request, params }) => {
  const {
    ventaId,
    metodo_pago_id,
    moneda_id,
    monto,
    referencia_pago,
    referencia,
    monto_en_moneda_venta,
    tasa_cambio,
  } = params;

  if (!ventaId || !metodo_pago_id || !moneda_id || monto == null) {
    throw new Error("Missing required fields");
  }

  const { total } = await storage.getVentaByIdWithPayments({ ventaId });
  const pagado = await storage.sumPagosByVenta({ ventaId });

  // Calcular monto_en_moneda_venta si no se proporciona (simplificado: asumimos misma moneda)
  const montoConvertido = monto_en_moneda_venta || monto;

  if (Number(pagado) + Number(montoConvertido) > Number(total) + 0.01) {
    throw new Error("La suma de pagos excede el total de la venta");
  }

  const _ref = referencia ?? referencia_pago ?? null;
  const pago = await storage.createVentaPayment({
    venta_id: ventaId,
    metodo_pago_id,
    moneda_id,
    monto,
    monto_en_moneda_venta: montoConvertido,
    tasa_cambio: tasa_cambio || null,
    referencia_pago: _ref,
  });
  // updateEstadoPago ya se llama dentro de createVentaPayment
  return pago;
};

const listPayments = async ({ request, params }) => {
  const { ventaId } = params;
  if (!ventaId) throw new Error("Missing ventaId");
  const pagos = await storage.getVentaPayments({ ventaId });
  const pagosCompat = pagos.map((p) => ({
    ...p,
    referencia_pago: p.referencia,
  }));
  return pagosCompat;
};

const updatePayment = async ({ request, params }) => {
  const {
    ventaId,
    paymentId,
    metodo_pago_id,
    moneda_id,
    monto,
    referencia_pago,
    referencia,
    monto_en_moneda_venta,
    tasa_cambio,
  } = params;

  if (!ventaId || !paymentId) throw new Error("Missing ventaId/paymentId");

  const { total } = await storage.getVentaByIdWithPayments({ ventaId });
  const pagadoSinEste = await storage.sumPagosByVenta({
    ventaId,
    excludePaymentId: paymentId,
  });

  // Calcular monto_en_moneda_venta si no se proporciona
  const montoConvertido = monto_en_moneda_venta || monto;

  if (
    montoConvertido != null &&
    Number(pagadoSinEste) + Number(montoConvertido) > Number(total) + 0.01
  ) {
    throw new Error("La suma de pagos excede el total de la venta");
  }

  const _ref = referencia ?? referencia_pago;
  const pago = await storage.updateVentaPayment({
    id: paymentId,
    venta_id: ventaId,
    metodo_pago_id,
    moneda_id,
    monto,
    monto_en_moneda_venta: montoConvertido,
    tasa_cambio: tasa_cambio || null,
    referencia_pago: _ref,
  });
  // updateEstadoPago ya se llama dentro de updateVentaPayment
  return pago;
};

const deletePayment = async ({ request, params }) => {
  const { ventaId, paymentId } = params;
  if (!ventaId || !paymentId) throw new Error("Missing ventaId/paymentId");
  const pago = await storage.deleteVentaPayment({
    id: paymentId,
    venta_id: ventaId,
  });
  return pago;
};

module.exports = {
  getPurchase,
  getPurchaseFlat,
  postPurchase,
  putPurchase,
  cancelPurchase,
  updatePurchaseStatus,
  updateSale,
  removeSale,
  createPayment,
  listPayments,
  updatePayment,
  deletePayment,
};

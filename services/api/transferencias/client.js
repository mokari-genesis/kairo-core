const storage = require("./storage-functions");

const getTransferencias = async ({ request, params }) => {
  const {
    empresa_origen_id,
    empresa_destino_id,
    estado,
    fecha_inicio,
    fecha_fin,
    usuario_id,
  } = params;

  const transferencias = await storage.getTransferencias({
    empresa_origen_id,
    empresa_destino_id,
    estado,
    fecha_inicio,
    fecha_fin,
    usuario_id,
  });

  const transferenciasConDetalles = await Promise.all(
    transferencias.map(async (transferencia) => {
      const detalles = await storage.getTransferenciaDetalles({
        transferencia_id: transferencia.id,
      });
      return {
        ...transferencia,
        detalles,
      };
    })
  );

  return transferenciasConDetalles;
};

const getTransferencia = async ({ request, params }) => {
  const { transferencia_id } = params;

  if (!transferencia_id) {
    throw new Error("transferencia_id es requerido");
  }

  const transferencia = await storage.getTransferenciaById({
    transferencia_id,
  });

  if (!transferencia) {
    throw new Error("Transferencia no encontrada");
  }

  const detalles = await storage.getTransferenciaDetalles({ transferencia_id });

  return {
    ...transferencia,
    detalles,
  };
};

const postTransferencia = async ({ request, params }) => {
  const {
    empresa_origen_id,
    empresa_destino_id,
    usuario_id,
    estado,
    comentario,
    detalles,
  } = params;

  if (!empresa_origen_id || !empresa_destino_id || !detalles) {
    throw new Error(
      "empresa_origen_id, empresa_destino_id y detalles son requeridos"
    );
  }

  if (!Array.isArray(detalles) || detalles.length === 0) {
    throw new Error("Debe incluir al menos un producto en detalles");
  }

  for (const detalle of detalles) {
    if (!detalle.producto_id || !detalle.cantidad || detalle.cantidad <= 0) {
      throw new Error(
        "Cada detalle debe tener producto_id y cantidad mayor a 0"
      );
    }
  }

  const transferencia = await storage.createTransferencia({
    empresa_origen_id,
    empresa_destino_id,
    usuario_id,
    estado: estado || "borrador",
    comentario,
    detalles,
  });

  const detallesCreados = await storage.getTransferenciaDetalles({
    transferencia_id: transferencia.id,
  });

  return {
    ...transferencia,
    detalles: detallesCreados,
  };
};

const putTransferencia = async ({ request, params }) => {
  const {
    transferencia_id,
    empresa_origen_id,
    empresa_destino_id,
    usuario_id,
    comentario,
    detalles,
  } = params;

  if (!transferencia_id) {
    throw new Error("transferencia_id es requerido");
  }

  const transferencia = await storage.updateTransferencia({
    transferencia_id,
    empresa_origen_id,
    empresa_destino_id,
    usuario_id,
    comentario,
    detalles,
  });

  const detallesActualizados = await storage.getTransferenciaDetalles({
    transferencia_id: transferencia.id,
  });

  return {
    ...transferencia,
    detalles: detallesActualizados,
  };
};

const confirmarTransferencia = async ({ request, params }) => {
  const { transferencia_id, usuario_id } = params;

  if (!transferencia_id) {
    throw new Error("transferencia_id es requerido");
  }

  const transferencia = await storage.confirmarTransferencia({
    transferencia_id,
    usuario_id,
  });

  const detalles = await storage.getTransferenciaDetalles({
    transferencia_id: transferencia.id,
  });

  return {
    ...transferencia,
    detalles,
  };
};

const cancelarTransferencia = async ({ request, params }) => {
  const { transferencia_id } = params;

  if (!transferencia_id) {
    throw new Error("transferencia_id es requerido");
  }

  const transferencia = await storage.cancelarTransferencia({
    transferencia_id,
  });

  const detalles = await storage.getTransferenciaDetalles({
    transferencia_id: transferencia.id,
  });

  return {
    ...transferencia,
    detalles,
  };
};

const deleteTransferencia = async ({ request, params }) => {
  const { transferencia_id } = params;

  if (!transferencia_id) {
    throw new Error("transferencia_id es requerido");
  }

  await storage.deleteTransferencia({ transferencia_id });

  return { success: true };
};

module.exports = {
  getTransferencias,
  getTransferencia,
  postTransferencia,
  putTransferencia,
  confirmarTransferencia,
  cancelarTransferencia,
  deleteTransferencia,
};

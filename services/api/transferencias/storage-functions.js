const { fetchResultMysql, transaction } = require("libs/db");

const getTransferencias = fetchResultMysql(
  (
    {
      empresa_origen_id,
      empresa_destino_id,
      estado,
      fecha_inicio,
      fecha_fin,
      usuario_id,
    },
    connection
  ) =>
    connection.execute(
      `
      SELECT 
        t.*,
        eo.nombre as empresa_origen_nombre,
        ed.nombre as empresa_destino_nombre,
        u.nombre as usuario_nombre
      FROM transferencias_inventario t
      LEFT JOIN empresas eo ON eo.id = t.empresa_origen_id
      LEFT JOIN empresas ed ON ed.id = t.empresa_destino_id
      LEFT JOIN usuarios u ON u.id = t.usuario_id
      WHERE (? IS NULL OR t.empresa_origen_id = ?)
        AND (? IS NULL OR t.empresa_destino_id = ?)
        AND (? IS NULL OR t.estado = ?)
        AND (? IS NULL OR t.usuario_id = ?)
        AND (
          (? IS NULL AND ? IS NULL) 
          OR 
          (DATE(t.fecha) BETWEEN ? AND ?)
        )
      ORDER BY t.fecha DESC, t.id DESC
      `,
      [
        empresa_origen_id || null,
        empresa_origen_id || null,
        empresa_destino_id || null,
        empresa_destino_id || null,
        estado || null,
        estado || null,
        usuario_id || null,
        usuario_id || null,
        fecha_inicio || null,
        fecha_fin || null,
        fecha_inicio || null,
        fecha_fin || null,
      ]
    ),
  { singleResult: false }
);

const getTransferenciaById = fetchResultMysql(
  ({ transferencia_id }, connection) =>
    connection.execute(
      `
      SELECT 
        t.*,
        eo.nombre as empresa_origen_nombre,
        ed.nombre as empresa_destino_nombre,
        u.nombre as usuario_nombre
      FROM transferencias_inventario t
      LEFT JOIN empresas eo ON eo.id = t.empresa_origen_id
      LEFT JOIN empresas ed ON ed.id = t.empresa_destino_id
      LEFT JOIN usuarios u ON u.id = t.usuario_id
      WHERE t.id = ?
      `,
      [transferencia_id]
    ),
  { singleResult: true }
);

const getTransferenciaDetallesInternal = async (
  { transferencia_id },
  connection
) => {
  const [result] = await connection.execute(
    `
    SELECT 
      td.*,
      p.codigo as producto_codigo,
      p.descripcion as producto_descripcion,
      p.categoria as producto_categoria
    FROM transferencias_inventario_detalle td
    LEFT JOIN productos p ON p.id = td.producto_id
    WHERE td.transferencia_id = ?
    ORDER BY td.id
    `,
    [transferencia_id]
  );
  return result;
};

const getTransferenciaDetalles = fetchResultMysql(
  ({ transferencia_id }, connection) =>
    getTransferenciaDetallesInternal({ transferencia_id }, connection),
  { singleResult: false }
);

const createTransferencia = transaction(
  async (
    {
      empresa_origen_id,
      empresa_destino_id,
      usuario_id,
      estado = "borrador",
      comentario,
      detalles,
    },
    connection
  ) => {
    if (empresa_origen_id === empresa_destino_id) {
      throw new Error("La empresa origen y destino no pueden ser la misma");
    }

    if (!detalles || detalles.length === 0) {
      throw new Error("Debe incluir al menos un producto en la transferencia");
    }

    // A partir de aqu?, las transferencias siempre se crean en estado "borrador".
    // La l?gica de stock y creaci?n de movimientos de inventario se realiza
    // EXCLUSIVAMENTE al momento de confirmar la transferencia.
    if (estado === "confirmada") {
      throw new Error(
        "No se puede crear una transferencia ya confirmada. " +
          "Cree la transferencia en estado 'borrador' y luego utilice el endpoint de confirmaci?n."
      );
    }

    await connection.execute(
      `
      INSERT INTO transferencias_inventario (
        empresa_origen_id,
        empresa_destino_id,
        usuario_id,
        estado,
        comentario
      ) VALUES (?, ?, ?, ?, ?)
      `,
      [
        empresa_origen_id,
        empresa_destino_id,
        usuario_id || null,
        // Forzamos que toda nueva transferencia quede en borrador; s?lo el
        // proceso de confirmaci?n puede cambiar el estado y generar movimientos.
        "borrador",
        comentario || null,
      ]
    );

    const [transferenciaResult] = await connection.execute(
      "SELECT * FROM transferencias_inventario WHERE id = LAST_INSERT_ID()"
    );
    const transferencia = transferenciaResult[0];

    for (const detalle of detalles) {
      await connection.execute(
        `
        INSERT INTO transferencias_inventario_detalle (
          transferencia_id,
          producto_id,
          cantidad
        ) VALUES (?, ?, ?)
        `,
        [transferencia.id, detalle.producto_id, detalle.cantidad]
      );
    }

    return transferencia;
  }
);

const confirmarTransferencia = transaction(
  async ({ transferencia_id, usuario_id }, connection) => {
    const [transferencia] = await connection.execute(
      `
      SELECT * FROM transferencias_inventario 
      WHERE id = ? 
      FOR UPDATE
      `,
      [transferencia_id]
    );

    if (!transferencia || transferencia.length === 0) {
      throw new Error("Transferencia no encontrada");
    }

    // Aseguramos expl?citamente que solo se pueda confirmar una transferencia
    // que est? actualmente en estado "borrador". Cualquier otro estado es inv?lido.
    if (transferencia[0].estado === "confirmada") {
      throw new Error("La transferencia ya est? confirmada");
    }

    if (transferencia[0].estado === "cancelada") {
      throw new Error("No se puede confirmar una transferencia cancelada");
    }

    if (transferencia[0].estado !== "borrador") {
      throw new Error(
        "Solo se pueden confirmar transferencias en estado 'borrador'"
      );
    }

    await connection.execute(
      `
      UPDATE transferencias_inventario 
      SET estado = 'confirmada'
      WHERE id = ?
      `,
      [transferencia_id]
    );

    const [updated] = await connection.execute(
      "SELECT * FROM transferencias_inventario WHERE id = ?",
      [transferencia_id]
    );

    return updated[0];
  }
);

const cancelarTransferencia = transaction(
  async ({ transferencia_id }, connection) => {
    const [transferencia] = await connection.execute(
      `
      SELECT * FROM transferencias_inventario 
      WHERE id = ? 
      FOR UPDATE
      `,
      [transferencia_id]
    );

    if (!transferencia || transferencia.length === 0) {
      throw new Error("Transferencia no encontrada");
    }

    if (transferencia[0].estado === "cancelada") {
      throw new Error("La transferencia ya est? cancelada");
    }

    await connection.execute(
      `
      UPDATE transferencias_inventario 
      SET estado = 'cancelada'
      WHERE id = ?
      `,
      [transferencia_id]
    );

    const [updated] = await connection.execute(
      "SELECT * FROM transferencias_inventario WHERE id = ?",
      [transferencia_id]
    );

    return updated[0];
  }
);

const updateTransferencia = transaction(
  async (
    {
      transferencia_id,
      empresa_origen_id,
      empresa_destino_id,
      usuario_id,
      comentario,
      detalles,
    },
    connection
  ) => {
    const [transferencia] = await connection.execute(
      `
      SELECT * FROM transferencias_inventario 
      WHERE id = ? 
      FOR UPDATE
      `,
      [transferencia_id]
    );

    if (!transferencia || transferencia.length === 0) {
      throw new Error("Transferencia no encontrada");
    }

    if (transferencia[0].estado === "confirmada") {
      throw new Error("No se puede modificar una transferencia confirmada");
    }

    if (transferencia[0].estado === "cancelada") {
      throw new Error("No se puede modificar una transferencia cancelada");
    }

    if (empresa_origen_id) {
      await connection.execute(
        `UPDATE transferencias_inventario SET empresa_origen_id = ? WHERE id = ?`,
        [empresa_origen_id, transferencia_id]
      );
    }

    if (empresa_destino_id) {
      await connection.execute(
        `UPDATE transferencias_inventario SET empresa_destino_id = ? WHERE id = ?`,
        [empresa_destino_id, transferencia_id]
      );
    }

    if (usuario_id) {
      await connection.execute(
        `UPDATE transferencias_inventario SET usuario_id = ? WHERE id = ?`,
        [usuario_id, transferencia_id]
      );
    }

    if (comentario !== undefined) {
      await connection.execute(
        `UPDATE transferencias_inventario SET comentario = ? WHERE id = ?`,
        [comentario, transferencia_id]
      );
    }

    if (detalles && detalles.length > 0) {
      await connection.execute(
        `DELETE FROM transferencias_inventario_detalle WHERE transferencia_id = ?`,
        [transferencia_id]
      );

      for (const detalle of detalles) {
        await connection.execute(
          `
          INSERT INTO transferencias_inventario_detalle (
            transferencia_id,
            producto_id,
            cantidad
          ) VALUES (?, ?, ?)
          `,
          [transferencia_id, detalle.producto_id, detalle.cantidad]
        );
      }
    }

    const [updated] = await connection.execute(
      "SELECT * FROM transferencias_inventario WHERE id = ?",
      [transferencia_id]
    );

    return updated[0];
  }
);

const deleteTransferencia = transaction(
  async ({ transferencia_id }, connection) => {
    const [transferencia] = await connection.execute(
      "SELECT * FROM transferencias_inventario WHERE id = ? FOR UPDATE",
      [transferencia_id]
    );

    if (!transferencia || transferencia.length === 0) {
      throw new Error("Transferencia no encontrada");
    }

    // if (transferencia[0].estado === "confirmada") {
    //   throw new Error("No se puede eliminar una transferencia confirmada");
    // }

    await connection.execute(
      `DELETE FROM transferencias_inventario_detalle WHERE transferencia_id = ?`,
      [transferencia_id]
    );

    await connection.execute(
      `DELETE FROM transferencias_inventario WHERE id = ?`,
      [transferencia_id]
    );

    return transferencia[0];
  }
);

module.exports = {
  getTransferencias,
  getTransferenciaById,
  getTransferenciaDetalles,
  createTransferencia,
  confirmarTransferencia,
  cancelarTransferencia,
  updateTransferencia,
  deleteTransferencia,
};

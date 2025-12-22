const { fetchResultMysql, transaction } = require("libs/db");

const getInventoryMovements = fetchResultMysql(
  (
    {
      codigo_producto,
      usuario,
      tipo_movimiento,
      cantidad,
      comentario,
      producto,
      fecha_inicio,
      fecha_fin,
    },
    connection
  ) =>
    connection.execute(
      `
      SELECT * FROM reporte_movimientos_inventario
      WHERE (? IS NULL OR codigo_producto LIKE CONCAT('%', ?, '%'))
        AND (? IS NULL OR usuario LIKE CONCAT('%', ?, '%'))
        AND (? IS NULL OR tipo_movimiento = ?)        
        AND (? IS NULL OR cantidad = ?)
        AND (? IS NULL OR comentario LIKE CONCAT('%', ?, '%'))                
        AND (? IS NULL OR producto LIKE CONCAT('%', ?, '%'))
        AND (
          (? IS NULL AND ? IS NULL) 
          OR 
          (DATE(fecha) BETWEEN ? AND ?)
        )
      ORDER BY id DESC
      `,
      [
        codigo_producto || null,
        codigo_producto || null,
        usuario || null,
        usuario || null,
        tipo_movimiento || null,
        tipo_movimiento || null,
        cantidad || null,
        cantidad || null,
        comentario || null,
        comentario || null,
        producto || null,
        producto || null,
        fecha_inicio || null,
        fecha_fin || null,
        fecha_inicio || null,
        fecha_fin || null,
      ]
    ),
  { singleResult: false }
);

const createInventoryMovementInternal = async (
  {
    empresa_id,
    product_id,
    user_id,
    movement_type,
    quantity,
    comment,
    precio_compra,
    compra_id,
    transferencia_id,
  },
  connection
) => {
  // Validar precio_compra para movimientos tipo entrada que NO sean transferencias
  // Las transferencias no requieren precio_compra porque el producto ya fue adquirido
  // en la sucursal origen y solo se está trasladando a otra sucursal
  if (movement_type === "entrada" && !transferencia_id) {
    if (
      precio_compra === undefined ||
      precio_compra === null ||
      precio_compra < 0
    ) {
      throw new Error(
        "Para movimientos tipo entrada (compra), precio_compra es requerido y debe ser >= 0."
      );
    }
  }

  await connection.execute(
    `
    INSERT INTO movimientos_inventario (
      empresa_id,
      producto_id,
      usuario_id,
      tipo_movimiento,
      cantidad,
      precio_compra,
      compra_id,
      comentario
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    `,
    [
      empresa_id || null,
      product_id,
      user_id || null,
      movement_type,
      quantity,
      precio_compra || null,
      compra_id || null,
      comment || null,
    ]
  );

  const [result] = await connection.execute(
    "SELECT * FROM movimientos_inventario WHERE id = LAST_INSERT_ID()"
  );

  return result[0];
};

const createInventoryMovement = transaction(createInventoryMovementInternal);

const deleteInventoryMovement = transaction(async ({ id }, connection) => {
  const [existing] = await connection.execute(
    "SELECT * FROM movimientos_inventario WHERE id = ?",
    [id]
  );

  if (!existing || existing.length === 0) {
    throw new Error("Inventory movement not found");
  }

  await connection.execute("DELETE FROM movimientos_inventario WHERE id = ?", [
    id,
  ]);

  return existing[0];
});

const updateInventoryMovement = transaction(
  async (
    { id, empresa_id, product_id, movement_type, quantity, comment },
    connection
  ) => {
    const [existing] = await connection.execute(
      "SELECT * FROM movimientos_inventario WHERE id = ?",
      [id]
    );

    if (!existing || existing.length === 0) {
      throw new Error("Movimiento no encontrado");
    }

    const movimientoAnterior = existing[0];
    const empresaIdFinal = empresa_id || movimientoAnterior.empresa_id;

    await connection.execute(
      `
      UPDATE movimientos_inventario
      SET empresa_id = ?,
          producto_id = ?,
          tipo_movimiento = ?,
          cantidad = ?,
          comentario = ?
      WHERE id = ?
      `,
      [
        empresaIdFinal || null,
        product_id,
        movement_type,
        quantity,
        comment || null,
        id,
      ]
    );

    const [updated] = await connection.execute(
      "SELECT * FROM movimientos_inventario WHERE id = ?",
      [id]
    );

    return updated[0];
  }
);

// Handler functions
const getInventoryMovement = async ({ request, params }) => {
  const {
    codigo_producto,
    usuario,
    tipo_movimiento,
    cantidad,
    comentario,
    producto,
    fecha_inicio,
    fecha_fin,
  } = params;

  const movements = await getInventoryMovements({
    codigo_producto,
    usuario,
    tipo_movimiento,
    cantidad,
    comentario,
    producto,
    fecha_inicio,
    fecha_fin,
  });
  return movements;
};

const postInventoryMovement = async ({ request, params }) => {
  const {
    empresa_id,
    product_id,
    user_id,
    movement_type,
    quantity,
    comment,
    precio_compra,
    compra_id,
  } = params;

  if (
    !empresa_id ||
    !product_id ||
    !user_id ||
    !movement_type ||
    !quantity ||
    !comment
  ) {
    throw new Error("Missing required fields");
  }

  const movement = await createInventoryMovement({
    empresa_id,
    product_id,
    user_id,
    movement_type,
    quantity,
    comment,
    precio_compra:
      precio_compra !== undefined ? parseFloat(precio_compra) : null,
    compra_id: compra_id !== undefined ? parseInt(compra_id) : null,
  });
  return movement;
};

const putInventoryMovement = async ({ request, params }) => {
  const { id, empresa_id, product_id, movement_type, quantity, comment } =
    params;

  if (!id || !product_id || !movement_type || !quantity || !comment) {
    throw new Error("Missing required fields");
  }

  const movement = await updateInventoryMovement({
    id,
    empresa_id,
    product_id,
    movement_type,
    quantity,
    comment,
  });

  if (!movement) {
    throw new Error("Inventory movement not found");
  }

  return movement;
};

const deleteInventoryMovementHandler = async ({ request, params }) => {
  const { id } = params;

  if (!id) {
    throw new Error("Missing required fields");
  }

  await deleteInventoryMovement({ id });
  return { success: true };
};

module.exports = {
  getInventoryMovement,
  postInventoryMovement,
  putInventoryMovement,
  deleteInventoryMovement: deleteInventoryMovementHandler,
};

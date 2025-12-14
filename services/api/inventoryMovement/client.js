const { fetchResultMysql } = require("libs/db");

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
)

const createInventoryMovement = fetchResultMysql(
  async (
    { empresa_id, product_id, user_id, movement_type, quantity, comment },
    connection
  ) => {
    await connection.execute(
      `
      INSERT INTO movimientos_inventario (
        empresa_id, producto_id, usuario_id, tipo_movimiento, cantidad, comentario
      ) VALUES (?, ?, ?, ?, ?, ?)
      `,
      [empresa_id, product_id, user_id, movement_type, quantity, comment]
    )
    const [result] = await connection.execute(
      'SELECT * FROM movimientos_inventario WHERE id = LAST_INSERT_ID()'
    )
    return result
  },
  { singleResult: true }
)

const deleteInventoryMovement = fetchResultMysql(
  async ({ id }, connection) => {
    const [existingRecord] = await connection.execute(
      'SELECT * FROM movimientos_inventario WHERE id = ?',
      [id]
    )

    if (existingRecord.length === 0) {
      throw new Error('Inventory movement not found')
    }

    await connection.execute(
      `
      DELETE FROM movimientos_inventario
      WHERE id = ?
      `,
      [id]
    )

    return existingRecord
  },
  { singleResult: true }
)

const updateInventoryMovement = fetchResultMysql(
  async ({ id, product_id, movement_type, quantity, comment }, connection) => {
    await connection.execute(
      `
      UPDATE movimientos_inventario
      SET producto_id = ?,
          tipo_movimiento = ?,
          cantidad = ?,
          comentario = ?,
          fecha = NOW()
      WHERE id = ?
      `,
      [product_id, movement_type, quantity, comment, id]
    )
    const [result] = await connection.execute(
      'SELECT * FROM movimientos_inventario WHERE id = ?',
      [id]
    )
    return result
  },
  { singleResult: true }
)

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
  } = params;

  if (
    !empresa_id ||
    !product_id ||
    !user_id ||
    !movement_type ||
    !quantity ||
    !comment
  ) {
    throw new Error('Missing required fields')
  }

  const movement = await createInventoryMovement({
    empresa_id,
    product_id,
    user_id,
    movement_type,
    quantity,
    comment,
  });
  return movement;
};

const putInventoryMovement = async ({ request, params }) => {
  const {
    id,
    product_id,
    movement_type,
    quantity,
    comment,
  } = params;

  if (!id || !product_id || !movement_type || !quantity || !comment) {
    throw new Error('Missing required fields')
  }

  const movement = await updateInventoryMovement({
    id,
    product_id,
    movement_type,
    quantity,
    comment,
  });

  if (!movement) {
    throw new Error('Inventory movement not found')
  }

  return movement;
};

const deleteInventoryMovementHandler = async ({ request, params }) => {
  const { id } = params;

  if (!id) {
    throw new Error('Missing required fields')
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


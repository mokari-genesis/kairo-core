const { fetchResultMysql } = require("libs/db");

const getMetodosPago = fetchResultMysql(
  ({ activo, nombre }, connection) =>
    connection.execute(
      `
      SELECT * FROM metodos_pago
      WHERE (? IS NULL OR activo = ?)
      AND (? IS NULL OR nombre LIKE CONCAT('%', ?, '%'))
      ORDER BY nombre ASC
      `,
      [activo || null, activo || null, nombre || null, nombre || null]
    ),
  { singleResult: false }
)

const createMetodoPago = fetchResultMysql(
  async ({ nombre, activo = true }, connection) => {
    await connection.execute(
      `
      INSERT INTO metodos_pago (nombre, activo)
      VALUES (?, ?)
      `,
      [nombre, activo]
    )
    const [result] = await connection.execute(
      'SELECT * FROM metodos_pago WHERE id = LAST_INSERT_ID()'
    )
    return result
  },
  { singleResult: true }
)

const updateMetodoPago = fetchResultMysql(
  async ({ id, nombre, activo }, connection) => {
    await connection.execute(
      `
      UPDATE metodos_pago 
      SET nombre = COALESCE(?, nombre),
          activo = COALESCE(?, activo)
      WHERE id = ?
      `,
      [nombre, activo, id]
    )
    const [result] = await connection.execute(
      'SELECT * FROM metodos_pago WHERE id = ?',
      [id]
    )
    return result
  },
  { singleResult: true }
)

const deleteMetodoPago = fetchResultMysql(
  async ({ id }, connection) => {
    const [existingRecord] = await connection.execute(
      'SELECT * FROM metodos_pago WHERE id = ?',
      [id]
    )

    if (existingRecord.length === 0) {
      throw new Error('Método de pago no encontrado')
    }

    await connection.execute(`DELETE FROM metodos_pago WHERE id = ?`, [id])

    return existingRecord
  },
  { singleResult: true }
)

// Handler functions
const getMetodoPago = async ({ request, params }) => {
  const { activo, nombre } = params;

  const metodosPago = await getMetodosPago({ activo, nombre });
  return metodosPago;
};

const postMetodoPago = async ({ request, params }) => {
  const { nombre, activo = true } = params;

  if (!nombre) {
    throw new Error('Missing required fields')
  }

  const metodoPago = await createMetodoPago({
    nombre,
    activo,
  });
  return metodoPago;
};

const putMetodoPago = async ({ request, params }) => {
  const { id, nombre, activo } = params;

  if (!id) {
    throw new Error('Missing required fields')
  }

  const metodoPago = await updateMetodoPago({
    id,
    nombre,
    activo,
  });

  if (metodoPago && metodoPago.length === 0) {
    throw new Error('Método de pago no encontrado')
  }

  return metodoPago;
};

const deleteMetodoPagoHandler = async ({ request, params }) => {
  const { id } = params;

  if (!id) {
    throw new Error('Missing required fields')
  }

  await deleteMetodoPago({ id });
  return { success: true };
};

module.exports = {
  getMetodoPago,
  postMetodoPago,
  putMetodoPago,
  deleteMetodoPago: deleteMetodoPagoHandler,
};


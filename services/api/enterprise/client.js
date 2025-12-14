const { fetchResultMysql } = require("libs/db");

const getEmpresas = fetchResultMysql(
  ({ nombre, nit, direccion, telefono, email }, connection) =>
    connection.execute(
      `
        SELECT *
        FROM empresas
        WHERE (? IS NULL OR nombre LIKE CONCAT('%', ?, '%'))
        AND (? IS NULL OR nit LIKE CONCAT('%', ?, '%'))
        AND (? IS NULL OR direccion LIKE CONCAT('%', ?, '%'))
        AND (? IS NULL OR telefono LIKE CONCAT('%', ?, '%'))
        AND (? IS NULL OR email LIKE CONCAT('%', ?, '%'))
        `,
      [
        nombre ?? null,
        nombre ?? null,
        nit ?? null,
        nit ?? null,
        direccion ?? null,
        direccion ?? null,
        telefono ?? null,
        telefono ?? null,
        email ?? null,
        email ?? null,
      ]
    ),
  { singleResult: false }
)

const createEmpresa = fetchResultMysql(
  async ({ nombre, nit, direccion, telefono, email }, connection) => {
    await connection.execute(
      `
        INSERT INTO empresas (nombre, nit, direccion, telefono, email)
        VALUES (?, ?, ?, ?, ?)
        `,
      [nombre, nit, direccion, telefono, email]
    )
    const [result] = await connection.execute(
      'SELECT * FROM empresas WHERE id = LAST_INSERT_ID()'
    )
    return result
  },
  { singleResult: true }
)

const deleteEmpresa = fetchResultMysql(
  async ({ id }, connection) => {
    // First, get the record before deleting it
    const [existingRecord] = await connection.execute(
      'SELECT * FROM empresas WHERE id = ?',
      [id]
    )

    if (existingRecord.length === 0) {
      throw new Error('Empresa not found')
    }

    // Delete the record
    await connection.execute(`DELETE FROM empresas WHERE id = ?`, [id])

    // Return the deleted record
    return existingRecord
  },
  { singleResult: true }
)

const updateEmpresa = fetchResultMysql(
  async ({ id, nombre, nit, direccion, telefono, email }, connection) => {
    await connection.execute(
      `
        UPDATE empresas
        SET nombre = ?, nit = ?, direccion = ?, telefono = ?, email = ?
        WHERE id = ?
        `,
      [nombre, nit, direccion, telefono, email, id]
    )
    const [result] = await connection.execute(
      'SELECT * FROM empresas WHERE id = ?',
      [id]
    )
    return result
  },
  { singleResult: true }
)

const getEnterprise = async ({ request, params }) => {
  const { nombre, nit, direccion, telefono, email } = params;
  const empresas = await getEmpresas({
    nombre,
    nit,
    direccion,
    telefono,
    email,
  });
  return empresas;
};

const postEnterprise = async ({ request, params }) => {
  const { nombre, nit, direccion, telefono, email } = params;

  if (
    !nombre ||
    !nit ||
    !direccion ||
    !telefono ||
    !email
  ) {
    throw new Error("Missing required fields");
  }

  const empresa = await createEmpresa({
    nombre,
    nit,
    direccion,
    telefono,
    email,
  });
  return empresa;
};

const putEnterprise = async ({ request, params }) => {
  const {
    id,
    nombre,
    nit,
    direccion,
    telefono,
    email,
  } = params;

  if (
    !id ||
    !nombre ||
    !nit ||
    !direccion ||
    !telefono ||
    !email
  ) {
    throw new Error("Missing required fields");
  }

  const empresa = await updateEmpresa({
    id,
    nombre,
    nit,
    direccion,
    telefono,
    email,
  });

  if (!empresa) {
    throw new Error("Empresa not found");
  }

  return empresa;
};

const deleteEnterprise = async ({ request, params }) => {
  const { id } = params;

  if (!id) {
    throw new Error("Missing required fields");
  }

  await deleteEmpresa({ id });
  return { success: true };
};

module.exports = {
  getEnterprise,
  postEnterprise,
  putEnterprise,
  deleteEnterprise,
};


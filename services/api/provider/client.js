const { fetchResultMysql } = require("libs/db");

const getProviders = fetchResultMysql(
  (
    { nombre, nit, direccion, telefono, email, tipo, empresa_id, limit },
    connection
  ) => {
    const baseQuery = `
      SELECT * FROM proveedores 
      WHERE (? IS NULL OR empresa_id = ?)
      AND (? IS NULL OR nombre LIKE CONCAT('%', ?, '%'))
      AND (? IS NULL OR nit LIKE CONCAT('%', ?, '%'))
      AND (? IS NULL OR email LIKE CONCAT('%', ?, '%'))
      AND (? IS NULL OR telefono LIKE CONCAT('%', ?, '%'))
      AND (? IS NULL OR direccion LIKE CONCAT('%', ?, '%'))
      AND (? IS NULL OR tipo = ?)
      ORDER BY id DESC
    `;

    const query = limit ? `${baseQuery} LIMIT ?` : baseQuery;
    const params = [
      empresa_id || null,
      empresa_id || null,
      nombre || null,
      nombre || null,
      nit || null,
      nit || null,
      email || null,
      email || null,
      telefono || null,
      telefono || null,
      direccion || null,
      direccion || null,
      tipo || null,
      tipo || null,
    ];

    if (limit) {
      params.push(limit);
    }

    return connection.execute(query, params);
  },
  { singleResult: false }
);

const createProvider = fetchResultMysql(
  async (
    { empresa_id, nombre, nit, email, telefono, direccion, tipo },
    connection
  ) => {
    await connection.execute(
      `
      INSERT INTO proveedores (
        empresa_id, nombre, nit, email, telefono, direccion, tipo
      ) VALUES (?, ?, ?, ?, ?, ?, ?)
      `,
      [empresa_id, nombre, nit, email, telefono, direccion, tipo]
    );
    const [result] = await connection.execute(
      "SELECT * FROM proveedores WHERE id = LAST_INSERT_ID()"
    );
    return result;
  },
  { singleResult: true }
);

const updateProvider = fetchResultMysql(
  async ({ id, nombre, nit, email, telefono, direccion, tipo }, connection) => {
    await connection.execute(
      `
      UPDATE proveedores
      SET nombre = ?,
          nit = ?,
          email = ?,
          telefono = ?,
          direccion = ?,
          tipo = ?
      WHERE id = ?
      `,
      [nombre, nit, email, telefono, direccion, tipo, id]
    );
    const [result] = await connection.execute(
      "SELECT * FROM proveedores WHERE id = ?",
      [id]
    );
    return result;
  },
  { singleResult: true }
);

const deleteProvider = fetchResultMysql(
  async ({ id }, connection) => {
    const [existingRecord] = await connection.execute(
      "SELECT * FROM proveedores WHERE id = ?",
      [id]
    );

    if (existingRecord.length === 0) {
      throw new Error("Provider not found");
    }

    await connection.execute(
      `
      DELETE FROM proveedores
      WHERE id = ?
      `,
      [id]
    );

    return existingRecord;
  },
  { singleResult: true }
);

// Handler functions
const getProvider = async ({ request, params }) => {
  const { nombre, nit, direccion, telefono, email, tipo, empresa_id, limit } =
    params;

  const providers = await getProviders({
    nombre,
    nit,
    direccion,
    telefono,
    email,
    tipo,
    empresa_id,
    limit,
  });
  return providers;
};

const postProvider = async ({ request, params }) => {
  const { empresa_id, nombre, tipo, nit, email, telefono, direccion } = params;

  if (
    !empresa_id ||
    !nombre ||
    !tipo ||
    !nit ||
    !direccion ||
    !telefono ||
    !email
  ) {
    throw new Error("Missing required fields");
  }

  const provider = await createProvider({
    empresa_id,
    nombre,
    tipo,
    nit,
    email,
    telefono,
    direccion,
  });
  return provider;
};

const putProvider = async ({ request, params }) => {
  const { id, nombre, tipo, nit, direccion, telefono, email } = params;

  if (!id || !nombre || !tipo || !nit || !direccion || !telefono || !email) {
    throw new Error("Missing required fields");
  }

  const provider = await updateProvider({
    id,
    nombre,
    tipo,
    nit,
    direccion,
    telefono,
    email,
  });

  if (!provider) {
    throw new Error("Provider not found");
  }

  return provider;
};

const deleteProviderHandler = async ({ request, params }) => {
  const { id } = params;

  if (!id) {
    throw new Error("Missing required fields");
  }

  await deleteProvider({ id });
  return { success: true };
};

module.exports = {
  getProvider,
  postProvider,
  putProvider,
  deleteProvider: deleteProviderHandler,
};

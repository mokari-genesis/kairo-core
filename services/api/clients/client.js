const { fetchResultMysql } = require("libs/db");

const getClients = fetchResultMysql(
  ({ name, email, phone, address, empresa_id, type, nit }, connection) => {
    // Convert undefined values to null for MySQL compatibility
    const params = [
      empresa_id || null,
      empresa_id || null,
      name || null,
      name || null,
      email || null,
      email || null,
      phone || null,
      phone || null,
      address || null,
      address || null,
      type || null,
      type || null,
      nit || null,
      nit || null,
    ];

    return connection.execute(
      `SELECT * FROM clientes 
    WHERE (? IS NULL OR empresa_id = ?)
    AND (? IS NULL OR nombre LIKE CONCAT('%', ?, '%'))
    AND (? IS NULL OR email LIKE CONCAT('%', ?, '%'))
    AND (? IS NULL OR telefono LIKE CONCAT('%', ?, '%'))
    AND (? IS NULL OR direccion LIKE CONCAT('%', ?, '%'))    
    AND (? IS NULL OR tipo = ?)
    AND (? IS NULL OR nit = ?)`,
      params
    );
  }
);

const createClient = fetchResultMysql(
  async (
    { empresa_id, name, type, nit, email, phone, address },
    connection
  ) => {
    await connection.execute(
      `
      INSERT INTO clientes (
        empresa_id, nombre, tipo, nit, email, telefono, direccion
      ) VALUES (?, ?, ?, ?, ?, ?, ?)
      `,
      [empresa_id, name, type, nit, email, phone, address]
    );
    const [result] = await connection.execute(
      "SELECT * FROM clientes WHERE id = LAST_INSERT_ID()"
    );
    return result;
  },
  { singleResult: true }
);

const deleteClient = fetchResultMysql(({ id }, connection) => {
  return connection.execute(`DELETE FROM clientes WHERE id = ?`, [id]);
});

const updateClient = fetchResultMysql(
  async ({ id, name, type, nit, email, phone, address }, connection) => {
    await connection.execute(
      `
      UPDATE clientes
      SET nombre = ?,
          tipo = ?,
          nit = ?,
          email = ?,
          telefono = ?,
          direccion = ?
      WHERE id = ?
      `,
      [name, type, nit, email, phone, address, id]
    );
    const [result] = await connection.execute(
      "SELECT * FROM clientes WHERE id = ?",
      [id]
    );
    return result;
  },
  { singleResult: true }
);

const getClient = async ({ request, params }) => {
  const { name, email, phone, address, empresa_id, type, nit } = params;
  const clientes = await getClients({
    name,
    email,
    phone,
    address,
    empresa_id,
    type,
    nit,
  });
  return clientes;
};

const postClient = async ({ request, params }) => {
  const { empresa_id, name, type, nit, email, phone, address } = params;

  if (!empresa_id || !name || !type || !nit || !address || !phone || !email) {
    throw new Error("Missing required fields");
  }

  const cliente = await createClient({
    empresa_id,
    name,
    type,
    nit,
    email,
    phone,
    address,
  });
  return cliente;
};

const putClient = async ({ request, params }) => {
  const { id, name, type, nit, address, phone, email } = params;

  if (!id || !name || !type || !nit || !address || !phone || !email) {
    throw new Error("Missing required fields");
  }

  const cliente = await updateClient({
    id,
    name,
    type,
    nit,
    address,
    phone,
    email,
  });

  if (!cliente) {
    throw new Error("Cliente not found");
  }

  return cliente;
};

const deleteClientHandler = async ({ request, params }) => {
  const { id } = params;

  if (!id) {
    throw new Error("Missing required fields");
  }

  await deleteClient({ id });
  return { success: true };
};

module.exports = {
  getClient,
  postClient,
  putClient,
  deleteClient: deleteClientHandler,
};

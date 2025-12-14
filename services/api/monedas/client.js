const { fetchResultMysql } = require("libs/db");

const getMonedas = fetchResultMysql(
  ({ activo }, connection) =>
    connection.execute(
      `
      SELECT * FROM monedas
      WHERE (? IS NULL OR activo = ?)
      ORDER BY codigo ASC
      `,
      [activo || null, activo || null]
    ),
  { singleResult: false }
);

const createMoneda = fetchResultMysql(
  async (
    {
      codigo,
      nombre,
      simbolo,
      decimales = 2,
      activo = true,
      es_base = 0,
      tasa_vs_base,
      tasa_actualizada,
    },
    connection
  ) => {
    await connection.execute(
      `
      INSERT INTO monedas (codigo, nombre, simbolo, decimales, activo,es_base,tasa_vs_base,tasa_actualizada)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?)
      `,
      [
        codigo,
        nombre,
        simbolo,
        decimales,
        activo,
        es_base,
        tasa_vs_base,
        tasa_actualizada,
      ]
    );
    const [result] = await connection.execute(
      "SELECT * FROM monedas WHERE id = LAST_INSERT_ID()"
    );
    return result;
  },
  { singleResult: true }
);

const updateMoneda = fetchResultMysql(
  async (
    {
      id,
      codigo,
      nombre,
      simbolo,
      decimales,
      activo,
      es_base = 0,
      tasa_vs_base,
      tasa_actualizada,
    },
    connection
  ) => {
    await connection.execute(
      `
      UPDATE monedas 
      SET codigo = COALESCE(?, codigo),
          nombre = COALESCE(?, nombre),
          simbolo = COALESCE(?, simbolo),
          decimales = COALESCE(?, decimales),
          activo = COALESCE(?, activo),
          es_base = COALESCE(?, es_base),
          tasa_vs_base = COALESCE(?, tasa_vs_base),
          tasa_actualizada = COALESCE(?, tasa_actualizada)
      WHERE id = ?
      `,
      [
        codigo,
        nombre,
        simbolo,
        decimales,
        activo,
        es_base,
        tasa_vs_base,
        tasa_actualizada,
        id,
      ]
    );
    const [result] = await connection.execute(
      "SELECT * FROM monedas WHERE id = ?",
      [id]
    );
    return result;
  },
  { singleResult: true }
);

const deleteMoneda = fetchResultMysql(
  async ({ id }, connection) => {
    const [existingRecord] = await connection.execute(
      "SELECT * FROM monedas WHERE id = ?",
      [id]
    );

    if (existingRecord.length === 0) {
      throw new Error("Moneda no encontrada");
    }

    await connection.execute(`DELETE FROM monedas WHERE id = ?`, [id]);

    return existingRecord;
  },
  { singleResult: true }
);

// Handler functions
const getMoneda = async ({ request, params }) => {
  const { activo } = params;

  const monedas = await getMonedas({ activo });
  return monedas;
};

const postMoneda = async ({ request, params }) => {
  const {
    codigo,
    nombre,
    simbolo,
    decimales = 2,
    activo = true,
    es_base = 0,
    tasa_vs_base,
    tasa_actualizada,
  } = params;

  if (!codigo || !nombre) {
    throw new Error("Missing required fields: codigo and nombre are required");
  }

  const moneda = await createMoneda({
    activo,
    codigo,
    decimales,
    nombre,
    simbolo,
    es_base,
    tasa_vs_base,
    tasa_actualizada,
  });
  return moneda;
};

const putMoneda = async ({ request, params }) => {
  const {
    id,
    codigo,
    nombre,
    simbolo,
    decimales,
    activo,
    es_base,
    tasa_vs_base,
    tasa_actualizada,
  } = params;

  if (!id) {
    throw new Error("Missing required fields: id is required");
  }

  const moneda = await updateMoneda({
    id,
    codigo,
    nombre,
    simbolo,
    decimales,
    activo,
    es_base,
    tasa_vs_base,
    tasa_actualizada,
  });

  if (moneda && moneda.length === 0) {
    throw new Error("Moneda no encontrada");
  }

  return moneda;
};

const deleteMonedaHandler = async ({ request, params }) => {
  const { id } = params;

  if (!id) {
    throw new Error("Missing required fields: id is required");
  }

  await deleteMoneda({ id });
  return { success: true };
};

module.exports = {
  getMoneda,
  postMoneda,
  putMoneda,
  deleteMoneda: deleteMonedaHandler,
};

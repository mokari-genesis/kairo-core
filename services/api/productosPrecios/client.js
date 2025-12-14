const { fetchResultMysql } = require("libs/db");

const getProductosPrecios = fetchResultMysql(
  ({ producto_id, tipo }, connection) =>
    connection.execute(
      `
      SELECT pp.*, p.codigo as producto_codigo, p.descripcion as producto_descripcion
      FROM productos_precios pp
      LEFT JOIN productos p ON pp.producto_id = p.id
      WHERE (? IS NULL OR pp.producto_id = ?)
        AND (? IS NULL OR pp.tipo = ?)
      ORDER BY pp.producto_id, pp.tipo
      `,
      [producto_id || null, producto_id || null, tipo || null, tipo || null]
    ),
  { singleResult: false }
);

const getPreciosByProducto = fetchResultMysql(
  ({ producto_id }, connection) =>
    connection.execute(
      `
      SELECT pp.*, p.codigo as producto_codigo, p.descripcion as producto_descripcion
      FROM productos_precios pp
      LEFT JOIN productos p ON pp.producto_id = p.id
      WHERE pp.producto_id = ?
      ORDER BY pp.tipo
      `,
      [producto_id]
    ),
  { singleResult: false }
);

const createProductoPrecio = fetchResultMysql(
  async ({ producto_id, tipo, precio }, connection) => {
    await connection.execute(
      `
      INSERT INTO productos_precios (producto_id, tipo, precio)
      VALUES (?, ?, ?)
      `,
      [producto_id, tipo, precio]
    );
    const [result] = await connection.execute(
      `
      SELECT pp.*, p.codigo as producto_codigo, p.descripcion as producto_descripcion
      FROM productos_precios pp
      LEFT JOIN productos p ON pp.producto_id = p.id
      WHERE pp.id = LAST_INSERT_ID()
      `
    );
    return result;
  },
  { singleResult: true }
);

const updateProductoPrecio = fetchResultMysql(
  async ({ id, precio }, connection) => {
    await connection.execute(
      `
      UPDATE productos_precios 
      SET precio = ?
      WHERE id = ?
      `,
      [precio, id]
    );
    const [result] = await connection.execute(
      `
      SELECT pp.*, p.codigo as producto_codigo, p.descripcion as producto_descripcion
      FROM productos_precios pp
      LEFT JOIN productos p ON pp.producto_id = p.id
      WHERE pp.id = ?
      `,
      [id]
    );
    return result;
  },
  { singleResult: true }
);

const deleteProductoPrecio = fetchResultMysql(
  async ({ id }, connection) => {
    const [existingRecord] = await connection.execute(
      `
      SELECT pp.*, p.codigo as producto_codigo, p.descripcion as producto_descripcion
      FROM productos_precios pp
      LEFT JOIN productos p ON pp.producto_id = p.id
      WHERE pp.id = ?
      `,
      [id]
    );

    if (existingRecord.length === 0) {
      throw new Error("Precio de producto no encontrado");
    }

    await connection.execute(`DELETE FROM productos_precios WHERE id = ?`, [
      id,
    ]);

    return existingRecord;
  },
  { singleResult: true }
);

// Handler functions
const getProductoPrecio = async ({ request, params }) => {
  const { producto_id, tipo } = params;

  const productosPrecios = await getProductosPrecios({ producto_id, tipo });
  return productosPrecios;
};

const getProductoPrecioByProducto = async ({ request, params }) => {
  const { producto_id } = params;

  if (!producto_id) {
    throw new Error("Missing required fields: producto_id is required");
  }

  const precios = await getPreciosByProducto({ producto_id });
  return precios;
};

const postProductoPrecio = async ({ request, params }) => {
  const { producto_id, tipo, precio } = params;

  if (!producto_id || !tipo || precio === undefined) {
    throw new Error(
      "Missing required fields: producto_id, tipo, and precio are required"
    );
  }

  const productoPrecio = await createProductoPrecio({
    producto_id,
    tipo,
    precio,
  });
  return productoPrecio;
};

const putProductoPrecio = async ({ request, params }) => {
  const { id, precio } = params;

  if (!id || precio === undefined) {
    throw new Error("Missing required fields: id and precio are required");
  }

  const productoPrecio = await updateProductoPrecio({
    id,
    precio,
  });

  if (productoPrecio && productoPrecio.length === 0) {
    throw new Error("Precio de producto no encontrado");
  }

  return productoPrecio;
};

const deleteProductoPrecioHandler = async ({ request, params }) => {
  const { id } = params;

  if (!id) {
    throw new Error("Missing required fields: id is required");
  }

  await deleteProductoPrecio({ id });
  return { success: true };
};

module.exports = {
  getProductoPrecio,
  getProductoPrecioByProducto,
  postProductoPrecio,
  putProductoPrecio,
  deleteProductoPrecio: deleteProductoPrecioHandler,
};

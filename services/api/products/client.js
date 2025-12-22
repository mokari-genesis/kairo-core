const { fetchResultMysql } = require("libs/db");
const stockFunctions = require("../purchase/stock-functions");

const getProducts = fetchResultMysql(
  (
    {
      empresa_id,
      product_id,
      codigo,
      serie,
      descripcion,
      categoria,
      estado,
      stock,
      nombre_proveedor,
    },
    connection
  ) =>
    connection.execute(
      `
        SELECT 
          p.*,
          pr.nombre as nombre_proveedor,
          COALESCE(ps.stock, 0) as stock
        FROM productos p
        LEFT JOIN proveedores pr ON p.proveedor_id = pr.id
        LEFT JOIN productos_stock ps ON ps.empresa_id = ? AND ps.producto_id = p.id
        WHERE p.empresa_id = ?
          AND (? IS NULL OR p.id = ?)  
          AND (? IS NULL OR p.codigo = ?)
          AND (? IS NULL OR p.serie = ?)
          AND (? IS NULL OR p.descripcion LIKE CONCAT('%', ?, '%'))
          AND (? IS NULL OR p.categoria = ?)
          AND (? IS NULL OR p.estado = ?)
          AND (? IS NULL OR COALESCE(ps.stock, 0) = ?)
          AND (? IS NULL OR pr.nombre LIKE CONCAT('%', ?, '%'))
          ORDER BY p.fecha_creacion DESC
        `,
      [
        empresa_id,
        empresa_id,
        product_id ?? null,
        product_id ?? null,
        codigo ?? null,
        codigo ?? null,
        serie ?? null,
        serie ?? null,
        descripcion ?? null,
        descripcion ?? null,
        categoria ?? null,
        categoria ?? null,
        estado ?? null,
        estado ?? null,
        stock ?? null,
        stock ?? null,
        nombre_proveedor ?? null,
        nombre_proveedor ?? null,
      ]
    )
);

const createProduct = fetchResultMysql(
  async (
    {
      empresa_id,
      codigo,
      serie,
      descripcion,
      categoria,
      estado = "activo",
      // El stock ya NO se asigna al crear producto.
      // El stock debe venir únicamente por movimientos_inventario.
      precio = 0,
      proveedor_id,
      usuario_id,
    },
    connection
  ) => {
    await connection.execute(
      `
      INSERT INTO productos (
        empresa_id,
        codigo,
        serie,
        descripcion,
        categoria,
        estado,
        precio,
        proveedor_id
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?)
      `,
      [
        empresa_id,
        codigo,
        serie,
        descripcion,
        categoria,
        estado,
        precio,
        proveedor_id,
      ]
    );

    const [productoResult] = await connection.execute(
      "SELECT * FROM productos WHERE id = LAST_INSERT_ID()"
    );
    const producto = productoResult[0];

    // El stock inicial ya NO se asigna al crear un producto.
    // El stock debe venir únicamente por movimientos_inventario.
    // Si se necesita stock inicial, debe crearse un movimiento de inventario
    // tipo 'entrada' después de crear el producto.

    const [result] = await connection.execute(
      `
      SELECT 
        p.*,
        pr.nombre as nombre_proveedor,
        COALESCE(ps.stock, 0) as stock
      FROM productos p
      LEFT JOIN proveedores pr ON p.proveedor_id = pr.id
      LEFT JOIN productos_stock ps ON ps.empresa_id = ? AND ps.producto_id = p.id
      WHERE p.id = ?
      `,
      [empresa_id, producto.id]
    );
    return result;
  },
  { singleResult: true }
);

const deleteProducts = fetchResultMysql(async ({ product_ids }, connection) => {
  const ids = Array.isArray(product_ids) ? product_ids : [product_ids];
  const placeholders = ids.map(() => "?").join(",");

  // Primero eliminar las cuentas por pagar relacionadas al producto
  // Los abonos se eliminarán automáticamente por la foreign key con ON DELETE CASCADE
  await connection.execute(
    `
    DELETE FROM cuentas_por_pagar 
    WHERE producto_id IN (${placeholders})
    `,
    ids
  );

  // Luego eliminar el producto
  await connection.execute(
    `
    DELETE FROM productos 
    WHERE id IN (${placeholders})
    `,
    ids
  );
  const [result] = await connection.execute(
    `SELECT * FROM productos WHERE id IN (${placeholders})`,
    ids
  );
  return result;
});

const updateProduct = fetchResultMysql(
  async (
    {
      product_id,
      empresa_id,
      codigo,
      serie,
      descripcion,
      categoria,
      estado,
      // El stock se gestiona únicamente vía movimientos_inventario/triggers.
      // Aquí ignoramos cualquier intento de modificarlo directamente.
      proveedor_id,
    },
    connection
  ) => {
    await connection.execute(
      `
    UPDATE productos 
    SET codigo = ?, 
    serie = ?, 
    descripcion = ?,
    categoria = ?, 
    estado = ?,
    proveedor_id = ?
    WHERE id = ? AND empresa_id = ?
    `,
      [
        codigo,
        serie,
        descripcion,
        categoria,
        estado,
        proveedor_id,
        product_id,
        empresa_id,
      ]
    );

    const [result] = await connection.execute(
      `
      SELECT 
        p.*,
        pr.nombre as nombre_proveedor,
        COALESCE(ps.stock, 0) as stock
      FROM productos p
      LEFT JOIN proveedores pr ON p.proveedor_id = pr.id
      LEFT JOIN productos_stock ps ON ps.empresa_id = ? AND ps.producto_id = p.id
      WHERE p.id = ? AND p.empresa_id = ?
      `,
      [empresa_id, product_id, empresa_id]
    );
    return result;
  }
);

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
    // First, get the record before deleting it
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

    // Delete the record
    await connection.execute(`DELETE FROM productos_precios WHERE id = ?`, [
      id,
    ]);

    // Return the deleted record
    return existingRecord;
  },
  { singleResult: true }
);

// Handler functions
const getProduct = async ({ request, params }) => {
  const {
    product_id,
    empresa_id,
    codigo,
    serie,
    descripcion,
    categoria,
    estado,
    stock,
    nombre_proveedor,
  } = params;

  if (!empresa_id) {
    throw new Error("empresa_id is required");
  }

  const products = await getProducts({
    empresa_id,
    product_id,
    codigo,
    serie,
    descripcion,
    categoria,
    estado,
    stock,
    nombre_proveedor,
  });
  return products;
};

const postProduct = async ({ request, params }) => {
  const {
    empresa_id,
    codigo,
    serie,
    descripcion,
    categoria,
    estado,
    // stock ya no es requerido ni se usa al crear producto
    precio,
    proveedor_id,
    usuario_id,
  } = params;

  if (
    !empresa_id ||
    !codigo ||
    !serie ||
    !descripcion ||
    !categoria ||
    !estado
  ) {
    throw new Error("Missing required fields");
  }

  const product = await createProduct({
    empresa_id,
    codigo,
    serie,
    descripcion,
    categoria,
    estado,
    precio,
    proveedor_id,
    usuario_id,
  });
  return product;
};

const putProduct = async ({ request, params }) => {
  const {
    product_id,
    empresa_id,
    codigo,
    serie,
    descripcion,
    categoria,
    estado,
    stock,
    proveedor_id,
  } = params;

  if (!product_id || !empresa_id) {
    throw new Error("Missing required fields");
  }

  const product = await updateProduct({
    product_id,
    empresa_id,
    codigo,
    serie,
    descripcion,
    categoria,
    estado,
    stock,
    proveedor_id,
  });

  if (product && product.length === 0) {
    throw new Error("Product not found");
  }

  return product;
};

const deleteProduct = async ({ request, params }) => {
  const { product_ids } = params;

  if (!product_ids) {
    throw new Error("Missing required fields");
  }

  await deleteProducts({ product_ids });
  return { success: true };
};

// Precio handlers
const getPrecio = async ({ request, params }) => {
  const { producto_id, tipo } = params;

  const productosPrecios = await getProductosPrecios({ producto_id, tipo });
  return productosPrecios;
};

const postPrecio = async ({ request, params }) => {
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

const putPrecio = async ({ request, params }) => {
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

const deletePrecio = async ({ request, params }) => {
  const { id } = params;

  if (!id) {
    throw new Error("Missing required fields: id is required");
  }

  await deleteProductoPrecio({ id });
  return { success: true };
};

module.exports = {
  getProduct,
  postProduct,
  putProduct,
  deleteProduct,
  getPrecio,
  postPrecio,
  putPrecio,
  deletePrecio,
};

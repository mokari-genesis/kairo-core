const { transaction } = require("libs/db");

/**
 * NUEVO COMPORTAMIENTO:
 *
 * - El backend **NO** calcula ni valida stock.
 * - El backend **SOLO** inserta registros en `movimientos_inventario`.
 * - Los triggers de base de datos son los únicos responsables de:
 *   - Actualizar `productos_stock`.
 *   - Validar stock disponible.
 *   - Mantener la consistencia del inventario.
 */

const createInventoryMovementInternal = async (
  {
    empresa_id,
    producto_id,
    usuario_id,
    tipo_movimiento,
    cantidad,
    comentario,
    referencia,
    transferencia_id,
    precio_compra,
    compra_id,
  },
  connection
) => {
  // Validar precio_compra para movimientos tipo entrada que NO sean transferencias
  // Las transferencias no requieren precio_compra porque el producto ya fue adquirido
  // en la sucursal origen y solo se está trasladando a otra sucursal
  if (tipo_movimiento === "entrada" && !transferencia_id) {
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
        comentario,
        referencia,
        transferencia_id
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `,
    [
      empresa_id || null,
      producto_id,
      usuario_id || null,
      tipo_movimiento,
      cantidad,
      precio_compra || null,
      compra_id || null,
      comentario || null,
      referencia || null,
      transferencia_id || null,
    ]
  );

  const [result] = await connection.execute(
    "SELECT * FROM movimientos_inventario WHERE id = LAST_INSERT_ID()"
  );

  return result[0];
};

// Mantenemos los mismos nombres públicos para no romper a los consumidores
const createInventoryMovementWithStockInternal =
  createInventoryMovementInternal;
const createInventoryMovementWithStock = transaction(
  createInventoryMovementInternal
);

module.exports = {
  createInventoryMovementWithStock,
  createInventoryMovementWithStockInternal,
};

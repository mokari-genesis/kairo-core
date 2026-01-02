const { fetchResultMysql, transaction } = require("libs/db");

// Helpers
const computeEstado = ({ saldo, total, fecha_vencimiento, estado_actual }) => {
  if (estado_actual === "anulada") return "anulada";
  if (saldo <= 0) return "cancelada";
  const isVencida =
    fecha_vencimiento && new Date(fecha_vencimiento) < new Date();
  if (isVencida) return "vencida";
  if (saldo < total) return "parcial";
  return "abierta";
};

// Listar cuentas por pagar
const getCuentasPorPagar = fetchResultMysql(
  (
    {
      empresa_id,
      proveedor_id,
      compra_id,
      estado,
      fecha_inicio,
      fecha_fin,
      id,
    },
    connection
  ) =>
    connection.execute(
      `
      SELECT
        cxp.id,
        cxp.empresa_id,
        e.nombre AS empresa_nombre,
        cxp.proveedor_id,
        p.nombre AS proveedor_nombre,
        p.nit AS proveedor_nit,
        cxp.compra_id,
        c.fecha AS compra_fecha,
        cxp.producto_id,
        cxp.producto_descripcion,
        cxp.moneda_id,
        m.codigo AS moneda_codigo,
        m.simbolo AS moneda_simbolo,
        cxp.total,
        GREATEST(cxp.total - COALESCE(SUM(cxpa.monto_en_moneda_cxp), 0), 0) AS saldo,
        cxp.fecha_emision,
        cxp.fecha_vencimiento,
        CASE
          WHEN cxp.estado = 'anulada' THEN 'anulada'
          WHEN GREATEST(cxp.total - COALESCE(SUM(cxpa.monto_en_moneda_cxp), 0), 0) <= 0 THEN 'cancelada'
          WHEN cxp.fecha_vencimiento IS NOT NULL AND DATE(cxp.fecha_vencimiento) < CURDATE() THEN 'vencida'
          WHEN GREATEST(cxp.total - COALESCE(SUM(cxpa.monto_en_moneda_cxp), 0), 0) < cxp.total THEN 'parcial'
          ELSE 'abierta'
        END AS estado,
        cxp.comentario,
        COALESCE(SUM(cxpa.monto_en_moneda_cxp), 0) AS total_pagado,
        CASE 
          WHEN GREATEST(cxp.total - COALESCE(SUM(cxpa.monto_en_moneda_cxp), 0), 0) <= 0 THEN 'pagada'
          WHEN GREATEST(cxp.total - COALESCE(SUM(cxpa.monto_en_moneda_cxp), 0), 0) < cxp.total THEN 'parcial'
          ELSE 'pendiente'
        END AS estado_pago_clasificacion
      FROM cuentas_por_pagar cxp
      INNER JOIN empresas e ON e.id = cxp.empresa_id
      INNER JOIN proveedores p ON p.id = cxp.proveedor_id
      LEFT JOIN compras c ON c.id = cxp.compra_id
      INNER JOIN monedas m ON m.id = cxp.moneda_id
      LEFT JOIN cuentas_por_pagar_abonos cxpa ON cxpa.cxp_id = cxp.id
      WHERE (? IS NULL OR cxp.empresa_id = ?)
        AND (? IS NULL OR cxp.proveedor_id = ?)
        AND (? IS NULL OR cxp.compra_id = ?)
        AND (? IS NULL OR cxp.estado = ?)
        AND (? IS NULL OR DATE(cxp.fecha_emision) >= ?)
        AND (? IS NULL OR DATE(cxp.fecha_emision) <= ?)
        AND (? IS NULL OR cxp.id = ?)
      GROUP BY cxp.id
      ORDER BY cxp.fecha_emision DESC, cxp.id DESC
      `,
      [
        empresa_id || null,
        empresa_id || null,
        proveedor_id || null,
        proveedor_id || null,
        compra_id || null,
        compra_id || null,
        estado || null,
        estado || null,
        fecha_inicio || null,
        fecha_inicio || null,
        fecha_fin || null,
        fecha_fin || null,
        id || null,
        id || null,
      ]
    ),
  { singleResult: false }
);

// Obtener una cuenta por pagar por ID
const getCuentaPorPagarById = fetchResultMysql(
  ({ id }, connection) =>
    connection.execute(
      `
      SELECT 
        cxp.id,
        cxp.empresa_id,
        e.nombre AS empresa_nombre,
        cxp.proveedor_id,
        p.nombre AS proveedor_nombre,
        p.nit AS proveedor_nit,
        cxp.compra_id,
        cxp.producto_id,
        cxp.producto_descripcion,
        cxp.moneda_id,
        m.codigo AS moneda_codigo,
        m.simbolo AS moneda_simbolo,
        cxp.total,
        GREATEST(cxp.total - COALESCE(SUM(cxpa.monto_en_moneda_cxp), 0), 0) AS saldo,
        cxp.fecha_emision,
        cxp.fecha_vencimiento,
        CASE
          WHEN cxp.estado = 'anulada' THEN 'anulada'
          WHEN GREATEST(cxp.total - COALESCE(SUM(cxpa.monto_en_moneda_cxp), 0), 0) <= 0 THEN 'cancelada'
          WHEN cxp.fecha_vencimiento IS NOT NULL AND DATE(cxp.fecha_vencimiento) < CURDATE() THEN 'vencida'
          WHEN GREATEST(cxp.total - COALESCE(SUM(cxpa.monto_en_moneda_cxp), 0), 0) < cxp.total THEN 'parcial'
          ELSE 'abierta'
        END AS estado,
        cxp.comentario,
        COALESCE(SUM(cxpa.monto_en_moneda_cxp), 0) AS total_pagado,
        CASE 
          WHEN GREATEST(cxp.total - COALESCE(SUM(cxpa.monto_en_moneda_cxp), 0), 0) <= 0 THEN 'pagada'
          WHEN GREATEST(cxp.total - COALESCE(SUM(cxpa.monto_en_moneda_cxp), 0), 0) < cxp.total THEN 'parcial'
          ELSE 'pendiente'
        END AS estado_pago_clasificacion
      FROM cuentas_por_pagar cxp
      INNER JOIN empresas e ON e.id = cxp.empresa_id
      INNER JOIN proveedores p ON p.id = cxp.proveedor_id
      LEFT JOIN compras c ON c.id = cxp.compra_id
      INNER JOIN monedas m ON m.id = cxp.moneda_id
      LEFT JOIN cuentas_por_pagar_abonos cxpa ON cxpa.cxp_id = cxp.id
      WHERE cxp.id = ?
      GROUP BY cxp.id
      `,
      [id]
    ),
  { singleResult: true }
);

// Calcular saldo y estado en base a abonos actuales
const updateCuentaPorPagarSaldoInternal = async ({ cxp_id }, connection) => {
  const [sumResult] = await connection.execute(
    `
      SELECT COALESCE(SUM(monto_en_moneda_cxp), 0) AS total_pagado
      FROM cuentas_por_pagar_abonos
      WHERE cxp_id = ?
      `,
    [cxp_id]
  );

  const totalPagado = Number(sumResult[0].total_pagado);

  const [cxpResult] = await connection.execute(
    `
      SELECT total, fecha_vencimiento, estado
      FROM cuentas_por_pagar
      WHERE id = ?
      `,
    [cxp_id]
  );

  if (!cxpResult || cxpResult.length === 0) {
    throw new Error("Cuenta por pagar no encontrada");
  }

  const cxp = cxpResult[0];
  const total = Number(cxp.total);
  const nuevoSaldo = Math.max(0, total - totalPagado);
  const nuevoEstado = computeEstado({
    saldo: nuevoSaldo,
    total,
    fecha_vencimiento: cxp.fecha_vencimiento,
    estado_actual: cxp.estado,
  });

  await connection.execute(
    `
      UPDATE cuentas_por_pagar
      SET saldo = ?, estado = ?
      WHERE id = ?
      `,
    [nuevoSaldo, nuevoEstado, cxp_id]
  );

  return { saldo: nuevoSaldo, estado: nuevoEstado, total_pagado: totalPagado };
};

const updateCuentaPorPagarSaldo = transaction(
  updateCuentaPorPagarSaldoInternal
);

// Crear cuenta por pagar
const createCuentaPorPagar = transaction(
  async (
    {
      empresa_id,
      proveedor_id,
      compra_id,
      producto_id,
      moneda_id,
      total,
      fecha_emision,
      fecha_vencimiento,
      comentario,
    },
    connection
  ) => {
    // Validar que el proveedor existe
    const [proveedorRows] = await connection.execute(
      "SELECT id FROM proveedores WHERE id = ?",
      [proveedor_id]
    );
    if (!proveedorRows || proveedorRows.length === 0) {
      throw new Error("Proveedor no encontrado");
    }

    // Validar que la moneda existe
    const [monedaRows] = await connection.execute(
      "SELECT id FROM monedas WHERE id = ?",
      [moneda_id]
    );
    if (!monedaRows || monedaRows.length === 0) {
      throw new Error("Moneda no encontrada");
    }

    // Si hay compra_id, validar que existe y usar su total
    let totalFinal = Number(total);
    let finalProductoId = producto_id || null;
    let finalProductoDescripcion = null;
    if (compra_id) {
      const [compraRows] = await connection.execute(
        "SELECT id, total, moneda_id, estado FROM compras WHERE id = ?",
        [compra_id]
      );
      if (!compraRows || compraRows.length === 0) {
        throw new Error("Compra no encontrada");
      }
      const compra = compraRows[0];
      if (compra.estado === "anulada") {
        throw new Error(
          "No se puede crear cuenta por pagar para una compra anulada"
        );
      }
      // Si se proporciona total, validar que coincida con el total de la compra
      if (total && Number(total) !== Number(compra.total)) {
        throw new Error(
          `El total proporcionado (${total}) no coincide con el total de la compra (${compra.total})`
        );
      }
      // Usar el total de la compra
      totalFinal = Number(compra.total);
      // Si no se proporcionó moneda_id, usar la de la compra
      if (!moneda_id) {
        moneda_id = compra.moneda_id;
      } else if (moneda_id !== compra.moneda_id) {
        throw new Error(
          `La moneda proporcionada (${moneda_id}) no coincide con la moneda de la compra (${compra.moneda_id})`
        );
      }

      // Si no se proporcionó producto_id, tomar uno representativo de los detalles
      if (!finalProductoId) {
        const [detalleRows] = await connection.execute(
          `
          SELECT cd.producto_id, p.descripcion
          FROM compras_detalles cd
          LEFT JOIN productos p ON p.id = cd.producto_id
          WHERE cd.compra_id = ?
          ORDER BY cd.id ASC
          LIMIT 1
          `,
          [compra_id]
        );
        if (detalleRows && detalleRows.length > 0) {
          finalProductoId = detalleRows[0].producto_id;
          finalProductoDescripcion = detalleRows[0].descripcion || null;
        }
      }
    }

    // Validar que el total sea positivo
    if (totalFinal <= 0) {
      throw new Error("El total debe ser mayor a 0");
    }

    const [result] = await connection.execute(
      `
      INSERT INTO cuentas_por_pagar (
        empresa_id,
        proveedor_id,
        compra_id,
        producto_id,
        producto_descripcion,
        moneda_id,
        total,
        saldo,
        fecha_emision,
        fecha_vencimiento,
        estado,
        comentario
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `,
      [
        empresa_id,
        proveedor_id,
        compra_id || null,
        finalProductoId,
        finalProductoDescripcion,
        moneda_id,
        totalFinal,
        totalFinal,
        fecha_emision,
        fecha_vencimiento || null,
        computeEstado({
          saldo: totalFinal,
          total: totalFinal,
          fecha_vencimiento,
          estado_actual: "abierta",
        }),
        comentario || null,
      ]
    );

    const insertedId = result.insertId;
    const cuenta = await getCuentaPorPagarById({ id: insertedId });
    return cuenta;
  }
);

// Registrar abono y actualizar saldo/estado
const addAbonoToCuentaPorPagar = transaction(
  async (
    {
      cxp_id,
      metodo_pago_id,
      moneda_id,
      monto,
      tasa_cambio,
      referencia,
      fecha,
    },
    connection
  ) => {
    // Obtener información de la cuenta por pagar
    const [cxpRows] = await connection.execute(
      "SELECT id, moneda_id, total, saldo, estado, fecha_vencimiento FROM cuentas_por_pagar WHERE id = ?",
      [cxp_id]
    );

    if (!cxpRows || cxpRows.length === 0) {
      throw new Error("Cuenta por pagar no encontrada");
    }

    const cxp = cxpRows[0];

    // Validar que la cuenta no esté cancelada o anulada
    if (cxp.estado === "cancelada" || cxp.estado === "anulada") {
      throw new Error(
        `No se pueden registrar abonos en cuentas con estado '${cxp.estado}'`
      );
    }

    // Validar que la moneda del pago existe
    const [monedaRows] = await connection.execute(
      "SELECT id, tasa_vs_base, decimales FROM monedas WHERE id = ?",
      [moneda_id]
    );
    if (!monedaRows || monedaRows.length === 0) {
      throw new Error("Moneda del pago no encontrada");
    }

    // Validar monto
    if (!monto || Number(monto) <= 0) {
      throw new Error("El monto debe ser mayor a 0");
    }

    // Calcular tasa de cambio automáticamente usando tasa_vs_base
    let tasa;
    if (moneda_id === cxp.moneda_id) {
      tasa = 1.0;
    } else {
      // Si se proporciona tasa_cambio manualmente, usarla
      if (tasa_cambio) {
        tasa = Number(tasa_cambio);
      } else {
        // Calcular automáticamente usando tasa_vs_base
        const [monedaCxpRows] = await connection.execute(
          "SELECT tasa_vs_base FROM monedas WHERE id = ?",
          [cxp.moneda_id]
        );
        if (!monedaCxpRows || monedaCxpRows.length === 0) {
          throw new Error("Moneda de la cuenta por pagar no encontrada");
        }

        const tasaFrom = Number(monedaRows[0].tasa_vs_base);
        const tasaTo = Number(monedaCxpRows[0].tasa_vs_base);

        if (!tasaFrom || !tasaTo || tasaFrom <= 0 || tasaTo <= 0) {
          throw new Error(
            "Falta tasa_vs_base válida en monedas para convertir el pago"
          );
        }

        // La tasa es: tasa_from / tasa_to
        // Ejemplo: si pago en USD (tasa_vs_base=1) y CxP en GTQ (tasa_vs_base=7.8)
        // tasa = 1 / 7.8 = 0.128 (1 USD = 0.128 GTQ... espera, eso está mal)
        // Revisando: si tengo 1 USD y quiero convertir a GTQ
        // 1 USD * (tasa_vs_base_USD / tasa_vs_base_GTQ) = 1 * (1 / 7.8) = 0.128... no
        // Mejor: si ambas están en base, entonces:
        // monto_en_moneda_cxp = monto * (tasa_vs_base_moneda_pago / tasa_vs_base_moneda_cxp)
        // Si pago 1 USD (tasa=1) y CxP está en GTQ (tasa=7.8)
        // monto_en_GTQ = 1 * (1 / 7.8) = 0.128... esto está mal
        //
        // Revisando el trigger de ventas_pagos:
        // SET v_tasa = v_tasa_from / v_tasa_to;
        // donde v_tasa_from es la moneda del pago y v_tasa_to es la moneda de la venta
        // Entonces: tasa = tasa_vs_base_moneda_pago / tasa_vs_base_moneda_cxp
        tasa = tasaFrom / tasaTo;
      }
    }

    // Obtener decimales de la moneda de la CxP para redondear
    const [monedaCxpRows] = await connection.execute(
      "SELECT decimales FROM monedas WHERE id = ?",
      [cxp.moneda_id]
    );
    const decimales =
      monedaCxpRows && monedaCxpRows.length > 0
        ? monedaCxpRows[0].decimales
        : 2;

    // Calcular monto en moneda de la CxP
    const montoEnMonedaCxp = Number((Number(monto) * tasa).toFixed(decimales));

    // Validar que el monto no exceda el saldo pendiente
    if (montoEnMonedaCxp > Number(cxp.saldo)) {
      throw new Error(
        `El monto del abono (${montoEnMonedaCxp.toFixed(
          decimales
        )}) no puede exceder el saldo pendiente (${Number(cxp.saldo).toFixed(
          decimales
        )})`
      );
    }

    // Insertar el abono
    await connection.execute(
      `
      INSERT INTO cuentas_por_pagar_abonos (
        cxp_id, metodo_pago_id, moneda_id, monto, monto_en_moneda_cxp,
        tasa_cambio, referencia, fecha
      ) VALUES (?, ?, ?, ?, ?, ?, ?, COALESCE(?, CURRENT_TIMESTAMP))
      `,
      [
        cxp_id,
        metodo_pago_id || null,
        moneda_id,
        monto,
        montoEnMonedaCxp,
        tasa === 1 ? null : tasa,
        referencia || null,
        fecha || null,
      ]
    );

    // Actualizar saldo y estado
    await updateCuentaPorPagarSaldoInternal({ cxp_id }, connection);
  }
);

// Obtener abonos de una cuenta por pagar
const getAbonosByCxpId = fetchResultMysql(
  ({ cxp_id }, connection) =>
    connection.execute(
      `
      SELECT 
        cxpa.*,
        mp.nombre AS metodo_pago,
        m.codigo AS moneda_codigo,
        m.simbolo AS moneda_simbolo
      FROM cuentas_por_pagar_abonos cxpa
      LEFT JOIN metodos_pago mp ON mp.id = cxpa.metodo_pago_id
      INNER JOIN monedas m ON m.id = cxpa.moneda_id
      WHERE cxpa.cxp_id = ?
      ORDER BY cxpa.fecha ASC
      `,
      [cxp_id]
    ),
  { singleResult: false }
);

// Resumen de saldo por proveedor
const getSaldoPorProveedor = fetchResultMysql(
  ({ empresa_id, proveedor_id, estado }, connection) =>
    connection.execute(
      `
      SELECT
        p.id AS proveedor_id,
        p.nombre AS proveedor_nombre,
        p.nit AS proveedor_nit,
        cxp.moneda_id,
        m.codigo AS moneda_codigo,
        m.simbolo AS moneda_simbolo,
        COUNT(DISTINCT cxp.id) AS cuentas,
        COALESCE(SUM(cxp.total), 0) AS total_facturado,
        COALESCE(SUM(ab.total_pagado), 0) AS total_pagado,
        COALESCE(
          SUM(GREATEST(cxp.total - COALESCE(ab.total_pagado, 0), 0)),
          0
        ) AS saldo_pendiente
      FROM cuentas_por_pagar cxp
      INNER JOIN proveedores p ON p.id = cxp.proveedor_id
      INNER JOIN monedas m ON m.id = cxp.moneda_id
      LEFT JOIN (
        SELECT cxp_id, SUM(monto_en_moneda_cxp) AS total_pagado
        FROM cuentas_por_pagar_abonos
        GROUP BY cxp_id
      ) ab ON ab.cxp_id = cxp.id
      WHERE (? IS NULL OR cxp.empresa_id = ?)
        AND (? IS NULL OR cxp.proveedor_id = ?)
        AND (? IS NULL OR cxp.estado = ?)
      GROUP BY p.id, cxp.moneda_id
      ORDER BY saldo_pendiente DESC
      `,
      [
        empresa_id || null,
        empresa_id || null,
        proveedor_id || null,
        proveedor_id || null,
        estado || null,
        estado || null,
      ]
    ),
  { singleResult: false }
);

// Crear o actualizar cuenta por pagar basada en una compra (versión interna que acepta conexión)
const syncCuentaPorPagarFromCompraInternal = async (
  { compra_id },
  connection
) => {
  // Obtener información de la compra
  const [compraResult] = await connection.execute(
    `
      SELECT 
        c.id,
        c.empresa_id,
        c.proveedor_id,
        c.total,
        c.moneda_id,
        DATE(c.fecha) AS fecha_emision,
        c.estado
      FROM compras c
      WHERE c.id = ?
      `,
    [compra_id]
  );

  if (!compraResult || compraResult.length === 0) {
    throw new Error("Compra no encontrada");
  }

  const compra = compraResult[0];

  // Solo crear/actualizar CxP si la compra está en estado 'registrada'
  if (compra.estado !== "registrada") {
    // Si existe una CxP para esta compra y la compra fue anulada, anular la CxP
    const [existingCxp] = await connection.execute(
      "SELECT id FROM cuentas_por_pagar WHERE compra_id = ?",
      [compra_id]
    );

    if (existingCxp && existingCxp.length > 0) {
      await connection.execute(
        "UPDATE cuentas_por_pagar SET estado = 'anulada' WHERE compra_id = ?",
        [compra_id]
      );
    }
    return null;
  }

  const total = Number(compra.total);
  const saldo = total; // Inicialmente el saldo es igual al total

  // Obtener un producto representativo de la compra
  let productoId = null;
  let productoDescripcion = null;
  const [detalleRows] = await connection.execute(
    `
      SELECT cd.producto_id, p.descripcion
      FROM compras_detalles cd
      LEFT JOIN productos p ON p.id = cd.producto_id
      WHERE cd.compra_id = ?
      ORDER BY cd.id ASC
      LIMIT 1
    `,
    [compra_id]
  );
  if (detalleRows && detalleRows.length > 0) {
    productoId = detalleRows[0].producto_id;
    productoDescripcion = detalleRows[0].descripcion || null;
  }

  // Verificar si ya existe una CxP para esta compra
  const [existingCxp] = await connection.execute(
    "SELECT id FROM cuentas_por_pagar WHERE compra_id = ?",
    [compra_id]
  );

  if (existingCxp && existingCxp.length > 0) {
    // Actualizar la CxP existente
    const cxpId = existingCxp[0].id;

    // Determinar estado inicial
    const estado = computeEstado({
      saldo,
      total,
      fecha_vencimiento: null,
      estado_actual: "abierta",
    });

    await connection.execute(
      `
        UPDATE cuentas_por_pagar
        SET total = ?, saldo = ?, estado = ?, producto_id = ?, producto_descripcion = ?
        WHERE id = ?
        `,
      [total, saldo, estado, productoId, productoDescripcion, cxpId]
    );

    // Recalcular saldo considerando abonos existentes
    await updateCuentaPorPagarSaldoInternal({ cxp_id: cxpId }, connection);

    return cxpId;
  } else {
    // Crear nueva CxP
    const estado = computeEstado({
      saldo,
      total,
      fecha_vencimiento: null,
      estado_actual: "abierta",
    });

    const [result] = await connection.execute(
      `
        INSERT INTO cuentas_por_pagar (
          empresa_id,
          proveedor_id,
          compra_id,
          producto_id,
          producto_descripcion,
          moneda_id,
          total,
          saldo,
          fecha_emision,
          fecha_vencimiento,
          estado,
          comentario
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, NULL, ?, NULL)
        `,
      [
        compra.empresa_id,
        compra.proveedor_id,
        compra_id,
        productoId,
        productoDescripcion,
        compra.moneda_id,
        total,
        saldo,
        compra.fecha_emision,
        estado,
      ]
    );

    const cxpId = result.insertId;
    return cxpId;
  }
};

// Versión externa que crea su propia transacción
const syncCuentaPorPagarFromCompra = transaction(
  syncCuentaPorPagarFromCompraInternal
);

// Eliminar abono y actualizar saldo/estado
const deleteAbonoFromCuentaPorPagar = transaction(
  async ({ cxp_id, abono_id }, connection) => {
    // Verificar que el abono existe y pertenece a la cuenta
    const [abonoRows] = await connection.execute(
      `
      SELECT id, cxp_id
      FROM cuentas_por_pagar_abonos
      WHERE id = ? AND cxp_id = ?
      `,
      [abono_id, cxp_id]
    );

    if (!abonoRows || abonoRows.length === 0) {
      throw new Error("Abono no encontrado o no pertenece a esta cuenta");
    }

    // Verificar que la cuenta existe
    const [cxpRows] = await connection.execute(
      "SELECT id, estado FROM cuentas_por_pagar WHERE id = ?",
      [cxp_id]
    );

    if (!cxpRows || cxpRows.length === 0) {
      throw new Error("Cuenta por pagar no encontrada");
    }

    // Eliminar el abono
    await connection.execute(
      "DELETE FROM cuentas_por_pagar_abonos WHERE id = ? AND cxp_id = ?",
      [abono_id, cxp_id]
    );

    // Actualizar saldo y estado de la cuenta
    await updateCuentaPorPagarSaldoInternal({ cxp_id }, connection);
  }
);

module.exports = {
  getCuentasPorPagar,
  getCuentaPorPagarById,
  createCuentaPorPagar,
  addAbonoToCuentaPorPagar,
  getAbonosByCxpId,
  updateCuentaPorPagarSaldo,
  getSaldoPorProveedor,
  syncCuentaPorPagarFromCompra,
  syncCuentaPorPagarFromCompraInternal,
  deleteAbonoFromCuentaPorPagar,
};

const { fetchResultMysql, transaction } = require("libs/db");

// Obtener todas las cuentas por cobrar con informaciรณn relacionada
const getCuentasPorCobrar = fetchResultMysql(
  (
    {
      empresa_id,
      cliente_id,
      venta_id,
      estado,
      fecha_inicio,
      fecha_fin,
      dias_antiguedad_min,
      dias_antiguedad_max,
    },
    connection
  ) =>
    connection.execute(
      `
      SELECT 
        cxc.id,
        cxc.empresa_id,
        e.nombre AS empresa_nombre,
        cxc.cliente_id,
        c.nombre AS cliente_nombre,
        c.nit AS cliente_nit,
        c.email AS cliente_email,
        cxc.venta_id,
        v.fecha AS venta_fecha,
        v.total AS venta_total,
        cxc.moneda_id,
        m.codigo AS moneda_codigo,
        m.simbolo AS moneda_simbolo,
        cxc.total,
        cxc.saldo,
        cxc.fecha_emision,
        cxc.fecha_vencimiento,
        cxc.estado,
        cxc.comentario,
        -- Calcular antigรผedad en dรญas
        DATEDIFF(CURDATE(), cxc.fecha_emision) AS dias_antiguedad,
        -- Calcular total pagado (suma de abonos)
        COALESCE(SUM(cxca.monto_en_moneda_cxc), 0) AS total_pagado,
        -- Clasificaciรณn del estado de pago
        CASE 
          WHEN cxc.saldo <= 0 THEN 'pagada'
          WHEN cxc.saldo < cxc.total THEN 'parcial'
          ELSE 'pendiente'
        END AS estado_pago_clasificacion
      FROM cuentas_por_cobrar cxc
      INNER JOIN empresas e ON e.id = cxc.empresa_id
      INNER JOIN clientes c ON c.id = cxc.cliente_id
      LEFT JOIN ventas v ON v.id = cxc.venta_id
      INNER JOIN monedas m ON m.id = cxc.moneda_id
      LEFT JOIN cuentas_por_cobrar_abonos cxca ON cxca.cxc_id = cxc.id
      WHERE (? IS NULL OR cxc.empresa_id = ?)
        AND (? IS NULL OR cxc.cliente_id = ?)
        AND (? IS NULL OR cxc.venta_id = ?)
        AND (? IS NULL OR cxc.estado = ?)
        AND (
          (? IS NULL AND ? IS NULL) 
          OR 
          (DATE(cxc.fecha_emision) BETWEEN ? AND ?)
        )
      GROUP BY cxc.id
      HAVING (? IS NULL OR DATEDIFF(CURDATE(), cxc.fecha_emision) >= ?)
        AND (? IS NULL OR DATEDIFF(CURDATE(), cxc.fecha_emision) <= ?)
      ORDER BY cxc.fecha_emision DESC, cxc.id DESC
      `,
      [
        empresa_id || null,
        empresa_id || null,
        cliente_id || null,
        cliente_id || null,
        venta_id || null,
        venta_id || null,
        estado || null,
        estado || null,
        fecha_inicio || null,
        fecha_fin || null,
        fecha_inicio || null,
        fecha_fin || null,
        dias_antiguedad_min || null,
        dias_antiguedad_min || null,
        dias_antiguedad_max || null,
        dias_antiguedad_max || null,
      ]
    ),
  { singleResult: false }
);

// Obtener una cuenta por cobrar por ID
const getCuentaPorCobrarById = fetchResultMysql(
  ({ id }, connection) =>
    connection.execute(
      `
      SELECT 
        cxc.*,
        e.nombre AS empresa_nombre,
        c.nombre AS cliente_nombre,
        c.nit AS cliente_nit,
        c.email AS cliente_email,
        v.fecha AS venta_fecha,
        v.total AS venta_total,
        m.codigo AS moneda_codigo,
        m.simbolo AS moneda_simbolo,
        DATEDIFF(CURDATE(), cxc.fecha_emision) AS dias_antiguedad,
        COALESCE(SUM(cxca.monto_en_moneda_cxc), 0) AS total_pagado,
        CASE 
          WHEN cxc.saldo <= 0 THEN 'pagada'
          WHEN cxc.saldo < cxc.total THEN 'parcial'
          ELSE 'pendiente'
        END AS estado_pago_clasificacion
      FROM cuentas_por_cobrar cxc
      INNER JOIN empresas e ON e.id = cxc.empresa_id
      INNER JOIN clientes c ON c.id = cxc.cliente_id
      LEFT JOIN ventas v ON v.id = cxc.venta_id
      INNER JOIN monedas m ON m.id = cxc.moneda_id
      LEFT JOIN cuentas_por_cobrar_abonos cxca ON cxca.cxc_id = cxc.id
      WHERE cxc.id = ?
      GROUP BY cxc.id
      `,
      [id]
    ),
  { singleResult: true }
);

// Crear una cuenta por cobrar
const createCuentaPorCobrar = transaction(
  async (
    {
      empresa_id,
      cliente_id,
      venta_id,
      moneda_id,
      total,
      fecha_emision,
      fecha_vencimiento,
      comentario,
    },
    connection
  ) => {
    // El saldo inicial es igual al total
    const saldo = total;

    // Determinar estado inicial
    // Si el saldo es 0, estรก cancelada, si no estรก abierta
    const estado = saldo <= 0 ? "cancelada" : "abierta";

    await connection.execute(
      `
      INSERT INTO cuentas_por_cobrar (
        empresa_id, cliente_id, venta_id, moneda_id, total, saldo,
        fecha_emision, fecha_vencimiento, estado, comentario
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `,
      [
        empresa_id,
        cliente_id,
        venta_id || null,
        moneda_id,
        total,
        saldo,
        fecha_emision,
        fecha_vencimiento || null,
        estado,
        comentario || null,
      ]
    );

    const [result] = await connection.execute(
      "SELECT * FROM cuentas_por_cobrar WHERE id = LAST_INSERT_ID()"
    );
    return result[0];
  }
);

// Actualizar saldo y estado de una cuenta por cobrar (versiรณn interna que acepta conexiรณn)
const updateCuentaPorCobrarSaldoInternal = async ({ cxc_id }, connection) => {
  // Calcular el total pagado (suma de abonos)
  const [sumResult] = await connection.execute(
    `
      SELECT COALESCE(SUM(monto_en_moneda_cxc), 0) AS total_pagado
      FROM cuentas_por_cobrar_abonos
      WHERE cxc_id = ?
      `,
    [cxc_id]
  );

  const totalPagado = Number(sumResult[0].total_pagado);

  // Obtener el total de la cuenta
  const [cxcResult] = await connection.execute(
    "SELECT total FROM cuentas_por_cobrar WHERE id = ?",
    [cxc_id]
  );

  if (!cxcResult || cxcResult.length === 0) {
    throw new Error("Cuenta por cobrar no encontrada");
  }

  const total = Number(cxcResult[0].total);
  const nuevoSaldo = Math.max(0, total - totalPagado);

  // Determinar el nuevo estado
  let nuevoEstado;
  if (nuevoSaldo <= 0) {
    nuevoEstado = "cancelada";
  } else if (totalPagado > 0) {
    nuevoEstado = "parcial";
  } else {
    nuevoEstado = "abierta";
  }

  // Verificar si estรก vencida (si tiene fecha de vencimiento y ya pasรณ)
  if (nuevoEstado !== "cancelada") {
    const [fechaVenc] = await connection.execute(
      "SELECT fecha_vencimiento FROM cuentas_por_cobrar WHERE id = ?",
      [cxc_id]
    );
    if (
      fechaVenc[0].fecha_vencimiento &&
      new Date(fechaVenc[0].fecha_vencimiento) < new Date()
    ) {
      nuevoEstado = "vencida";
    }
  }

  // Actualizar saldo y estado
  await connection.execute(
    `
      UPDATE cuentas_por_cobrar
      SET saldo = ?, estado = ?
      WHERE id = ?
      `,
    [nuevoSaldo, nuevoEstado, cxc_id]
  );

  return { saldo: nuevoSaldo, estado: nuevoEstado, total_pagado: totalPagado };
};

// Versiรณn externa que crea su propia transacciรณn
const updateCuentaPorCobrarSaldo = transaction(
  updateCuentaPorCobrarSaldoInternal
);

// Crear o actualizar cuenta por cobrar basada en una venta (versiรณn interna que acepta conexiรณn)
const syncCuentaPorCobrarFromVentaInternal = async (
  { venta_id },
  connection
) => {
  // Obtener informaciรณn de la venta
  const [ventaResult] = await connection.execute(
    `
      SELECT 
        v.id,
        v.empresa_id,
        v.cliente_id,
        v.total,
        v.moneda_id,
        DATE(v.fecha) AS fecha_emision,
        v.estado,
        v.estado_pago
      FROM ventas v
      WHERE v.id = ?
      `,
    [venta_id]
  );

  if (!ventaResult || ventaResult.length === 0) {
    throw new Error("Venta no encontrada");
  }

  const venta = ventaResult[0];

  // Solo crear/actualizar CXC si la venta estรก en estado 'vendido'
  if (venta.estado !== "vendido") {
    // Si existe una CXC para esta venta y la venta fue cancelada, anular la CXC
    const [existingCxc] = await connection.execute(
      "SELECT id FROM cuentas_por_cobrar WHERE venta_id = ?",
      [venta_id]
    );

    if (existingCxc && existingCxc.length > 0) {
      await connection.execute(
        "UPDATE cuentas_por_cobrar SET estado = 'anulada' WHERE venta_id = ?",
        [venta_id]
      );
    }
    return null;
  }

  // Calcular el total pagado de la venta
  const [pagosResult] = await connection.execute(
    `
      SELECT COALESCE(SUM(monto_en_moneda_venta), 0) AS total_pagado
      FROM ventas_pagos
      WHERE venta_id = ?
      `,
    [venta_id]
  );

  const totalPagado = Number(pagosResult[0].total_pagado);
  const saldo = Math.max(0, Number(venta.total) - totalPagado);

  // Verificar si ya existe una CXC para esta venta
  const [existingCxc] = await connection.execute(
    "SELECT id FROM cuentas_por_cobrar WHERE venta_id = ?",
    [venta_id]
  );

  if (existingCxc && existingCxc.length > 0) {
    // Actualizar la CXC existente
    const cxcId = existingCxc[0].id;

    // Determinar estado
    let estado;
    if (saldo <= 0) {
      estado = "cancelada";
    } else if (totalPagado > 0) {
      estado = "parcial";
    } else {
      estado = "abierta";
    }

    // Verificar si estรก vencida
    const [fechaVenc] = await connection.execute(
      "SELECT fecha_vencimiento FROM cuentas_por_cobrar WHERE id = ?",
      [cxcId]
    );
    if (
      estado !== "cancelada" &&
      fechaVenc[0].fecha_vencimiento &&
      new Date(fechaVenc[0].fecha_vencimiento) < new Date()
    ) {
      estado = "vencida";
    }

    await connection.execute(
      `
        UPDATE cuentas_por_cobrar
        SET total = ?, saldo = ?, estado = ?
        WHERE id = ?
        `,
      [venta.total, saldo, estado, cxcId]
    );

    // Sincronizar abonos desde ventas_pagos
    await syncAbonosFromVentaPagos({ cxc_id: cxcId, venta_id }, connection);

    return cxcId;
  } else {
    // Crear nueva CXC solo si hay saldo pendiente
    if (saldo > 0) {
      const estado = totalPagado > 0 ? "parcial" : "abierta";

      await connection.execute(
        `
          INSERT INTO cuentas_por_cobrar (
            empresa_id, cliente_id, venta_id, moneda_id, total, saldo,
            fecha_emision, fecha_vencimiento, estado, comentario
          ) VALUES (?, ?, ?, ?, ?, ?, ?, NULL, ?, NULL)
          `,
        [
          venta.empresa_id,
          venta.cliente_id,
          venta_id,
          venta.moneda_id || 1, // Default moneda_id si no existe
          venta.total,
          saldo,
          venta.fecha_emision,
          estado,
        ]
      );

      const [newCxc] = await connection.execute(
        "SELECT id FROM cuentas_por_cobrar WHERE id = LAST_INSERT_ID()"
      );
      const cxcId = newCxc[0].id;

      // Sincronizar abonos desde ventas_pagos
      await syncAbonosFromVentaPagos({ cxc_id: cxcId, venta_id }, connection);

      return cxcId;
    }
  }

  return null;
};

// Versiรณn externa que crea su propia transacciรณn
const syncCuentaPorCobrarFromVenta = transaction(
  syncCuentaPorCobrarFromVentaInternal
);

// Sincronizar abonos desde ventas_pagos
const syncAbonosFromVentaPagos = async ({ cxc_id, venta_id }, connection) => {
  // Obtener todos los pagos de la venta
  const [pagos] = await connection.execute(
    `
    SELECT 
      vp.id,
      vp.metodo_pago_id,
      vp.moneda_id,
      vp.monto,
      vp.monto_en_moneda_venta,
      vp.tasa_cambio,
      vp.referencia,
      vp.fecha
    FROM ventas_pagos vp
    WHERE vp.venta_id = ?
    ORDER BY vp.fecha ASC
    `,
    [venta_id]
  );

  // Obtener la moneda de la CXC
  const [cxcMoneda] = await connection.execute(
    "SELECT moneda_id FROM cuentas_por_cobrar WHERE id = ?",
    [cxc_id]
  );
  const cxcMonedaId = cxcMoneda[0].moneda_id;

  // Obtener la moneda de la venta para conversiรณn
  const [ventaMoneda] = await connection.execute(
    "SELECT moneda_id FROM ventas WHERE id = ?",
    [venta_id]
  );
  const ventaMonedaId = ventaMoneda[0].moneda_id;

  // Eliminar abonos existentes que no correspondan a pagos actuales
  // (esto permite re-sincronizar si se eliminan pagos)
  await connection.execute(
    "DELETE FROM cuentas_por_cobrar_abonos WHERE cxc_id = ?",
    [cxc_id]
  );

  // Crear abonos desde los pagos
  for (const pago of pagos) {
    // El monto_en_moneda_cxc es el monto_en_moneda_venta (ya estรก convertido)
    const montoEnMonedaCxc = Number(pago.monto_en_moneda_venta);

    await connection.execute(
      `
      INSERT INTO cuentas_por_cobrar_abonos (
        cxc_id, metodo_pago_id, moneda_id, monto, monto_en_moneda_cxc,
        tasa_cambio, referencia, fecha
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?)
      `,
      [
        cxc_id,
        pago.metodo_pago_id,
        pago.moneda_id,
        pago.monto,
        montoEnMonedaCxc,
        pago.tasa_cambio || null,
        pago.referencia || null,
        pago.fecha,
      ]
    );
  }

  // Actualizar saldo de la CXC (usar versiรณn interna ya que estamos en transacciรณn)
  await updateCuentaPorCobrarSaldoInternal({ cxc_id }, connection);
};

// Obtener abonos de una cuenta por cobrar
const getAbonosByCxcId = fetchResultMysql(
  ({ cxc_id }, connection) =>
    connection.execute(
      `
      SELECT 
        cxca.*,
        mp.nombre AS metodo_pago,
        m.codigo AS moneda_codigo,
        m.simbolo AS moneda_simbolo
      FROM cuentas_por_cobrar_abonos cxca
      LEFT JOIN metodos_pago mp ON mp.id = cxca.metodo_pago_id
      INNER JOIN monedas m ON m.id = cxca.moneda_id
      WHERE cxca.cxc_id = ?
      ORDER BY cxca.fecha ASC
      `,
      [cxc_id]
    ),
  { singleResult: false }
);

// Actualizar cuenta por cobrar
const updateCuentaPorCobrar = transaction(
  async ({ id, fecha_vencimiento, comentario }, connection) => {
    await connection.execute(
      `
      UPDATE cuentas_por_cobrar
      SET fecha_vencimiento = COALESCE(?, fecha_vencimiento),
          comentario = COALESCE(?, comentario)
      WHERE id = ?
      `,
      [fecha_vencimiento || null, comentario || null, id]
    );

    // Recalcular estado si se actualizรณ fecha_vencimiento
    if (fecha_vencimiento) {
      const [cxc] = await connection.execute(
        "SELECT estado, saldo FROM cuentas_por_cobrar WHERE id = ?",
        [id]
      );

      let nuevoEstado = cxc[0].estado;
      if (cxc[0].saldo > 0) {
        if (new Date(fecha_vencimiento) < new Date()) {
          nuevoEstado = "vencida";
        } else if (cxc[0].estado === "vencida") {
          // Si ya no estรก vencida, volver a calcular estado
          const [sumResult] = await connection.execute(
            `
            SELECT COALESCE(SUM(monto_en_moneda_cxc), 0) AS total_pagado
            FROM cuentas_por_cobrar_abonos
            WHERE cxc_id = ?
            `,
            [id]
          );
          const totalPagado = Number(sumResult[0].total_pagado);
          nuevoEstado = totalPagado > 0 ? "parcial" : "abierta";
        }

        await connection.execute(
          "UPDATE cuentas_por_cobrar SET estado = ? WHERE id = ?",
          [nuevoEstado, id]
        );
      }
    }

    const [result] = await connection.execute(
      "SELECT * FROM cuentas_por_cobrar WHERE id = ?",
      [id]
    );
    return result[0];
  }
);

// Registrar abono y actualizar saldo/estado
const addAbonoToCuentaPorCobrar = transaction(
  async (
    {
      cxc_id,
      metodo_pago_id,
      moneda_id,
      monto,
      tasa_cambio,
      referencia,
      fecha,
    },
    connection
  ) => {
    // Obtener información de la cuenta por cobrar
    const [cxcRows] = await connection.execute(
      "SELECT id, moneda_id, total, saldo, estado, fecha_vencimiento FROM cuentas_por_cobrar WHERE id = ?",
      [cxc_id]
    );

    if (!cxcRows || cxcRows.length === 0) {
      throw new Error("Cuenta por cobrar no encontrada");
    }

    const cxc = cxcRows[0];

    // Validar que la cuenta no esté cancelada o anulada
    if (cxc.estado === "cancelada" || cxc.estado === "anulada") {
      throw new Error(
        `No se pueden registrar abonos en cuentas con estado '${cxc.estado}'`
      );
    }

    // Validar monto
    if (!monto || Number(monto) <= 0) {
      throw new Error("El monto debe ser mayor a 0");
    }

    // Calcular tasa de cambio
    const tasa =
      moneda_id === cxc.moneda_id
        ? 1
        : tasa_cambio
        ? Number(tasa_cambio)
        : null;

    if (!tasa) {
      throw new Error(
        "Se requiere tasa_cambio cuando la moneda del pago difiere de la moneda de la cuenta por cobrar"
      );
    }

    // Calcular monto en moneda de la CXC
    const montoEnMonedaCxc = Number(monto) * tasa;

    // Validar que el monto no exceda el saldo pendiente
    if (montoEnMonedaCxc > Number(cxc.saldo)) {
      throw new Error(
        `El monto del abono (${montoEnMonedaCxc.toFixed(
          2
        )}) no puede exceder el saldo pendiente (${Number(cxc.saldo).toFixed(
          2
        )})`
      );
    }

    // Verificar si la CXC tiene venta_id para sincronizar con ventas_pagos
    const [cxcVenta] = await connection.execute(
      "SELECT venta_id, moneda_id AS cxc_moneda_id FROM cuentas_por_cobrar WHERE id = ?",
      [cxc_id]
    );
    const venta_id =
      cxcVenta && cxcVenta.length > 0 ? cxcVenta[0].venta_id : null;
    const cxcMonedaId =
      cxcVenta && cxcVenta.length > 0 ? cxcVenta[0].cxc_moneda_id : null;

    // Insertar el abono
    const [abonoResult] = await connection.execute(
      `
      INSERT INTO cuentas_por_cobrar_abonos (
        cxc_id, metodo_pago_id, moneda_id, monto, monto_en_moneda_cxc,
        tasa_cambio, referencia, fecha
      ) VALUES (?, ?, ?, ?, ?, ?, ?, COALESCE(?, CURRENT_TIMESTAMP))
      `,
      [
        cxc_id,
        metodo_pago_id || null,
        moneda_id,
        monto,
        montoEnMonedaCxc,
        tasa === 1 ? null : tasa,
        referencia || null,
        fecha || null,
      ]
    );

    // Si la CXC tiene venta_id, sincronizar con ventas_pagos
    if (venta_id) {
      try {
        // Obtener información de la venta
        const [ventaInfo] = await connection.execute(
          "SELECT moneda_id FROM ventas WHERE id = ?",
          [venta_id]
        );

        if (ventaInfo && ventaInfo.length > 0) {
          // Insertar el pago en ventas_pagos
          // Los triggers de la BD calcularán automáticamente:
          // - tasa_cambio (basado en tasa_vs_base de las monedas)
          // - monto_en_moneda_venta (monto * tasa_cambio)
          // - estado_pago de la venta
          //
          // Nota: El trigger usa tasa_vs_base de las monedas, que puede diferir
          // de la tasa_cambio proporcionada por el usuario. Esto es correcto
          // porque el trigger usa las tasas oficiales del sistema.
          await connection.execute(
            `
            INSERT INTO ventas_pagos (
              venta_id, metodo_pago_id, moneda_id, monto, referencia, fecha
            ) VALUES (?, ?, ?, ?, ?, COALESCE(?, CURRENT_TIMESTAMP))
            `,
            [
              venta_id,
              metodo_pago_id || null,
              moneda_id,
              monto,
              referencia || null,
              fecha || null,
            ]
          );
        }
      } catch (error) {
        console.error("Error al sincronizar abono con ventas_pagos:", error);
        // No lanzar error para no bloquear la creación del abono
        // El error se registra pero no interrumpe el flujo
      }
    }

    // Actualizar saldo y estado de la cuenta
    await updateCuentaPorCobrarSaldoInternal({ cxc_id }, connection);
  }
);

// Eliminar abono y actualizar saldo/estado
const deleteAbonoFromCuentaPorCobrar = transaction(
  async ({ cxc_id, abono_id }, connection) => {
    // Obtener información del abono antes de eliminarlo
    const [abonoRows] = await connection.execute(
      `
      SELECT 
        cxca.id, 
        cxca.cxc_id, 
        cxca.metodo_pago_id,
        cxca.moneda_id,
        cxca.monto,
        cxca.monto_en_moneda_cxc,
        cxca.tasa_cambio,
        cxca.referencia,
        cxca.fecha,
        cxc.venta_id
      FROM cuentas_por_cobrar_abonos cxca
      INNER JOIN cuentas_por_cobrar cxc ON cxc.id = cxca.cxc_id
      WHERE cxca.id = ? AND cxca.cxc_id = ?
      `,
      [abono_id, cxc_id]
    );

    if (!abonoRows || abonoRows.length === 0) {
      throw new Error("Abono no encontrado o no pertenece a esta cuenta");
    }

    const abono = abonoRows[0];
    const venta_id = abono.venta_id;

    // Verificar que la cuenta existe
    const [cxcRows] = await connection.execute(
      "SELECT id, estado FROM cuentas_por_cobrar WHERE id = ?",
      [cxc_id]
    );

    if (!cxcRows || cxcRows.length === 0) {
      throw new Error("Cuenta por cobrar no encontrada");
    }

    // Si la CXC tiene venta_id, sincronizar eliminación con ventas_pagos
    if (venta_id) {
      try {
        // Buscar el pago correspondiente en ventas_pagos
        // Usamos varios criterios para identificar el pago correcto
        const [pagosVenta] = await connection.execute(
          `
          SELECT id 
          FROM ventas_pagos 
          WHERE venta_id = ?
            AND metodo_pago_id <=> ?
            AND moneda_id = ?
            AND ABS(monto - ?) < 0.01
            AND ABS(monto_en_moneda_venta - ?) < 0.01
            AND referencia <=> ?
            AND DATE(fecha) = DATE(?)
          ORDER BY id DESC
          LIMIT 1
          `,
          [
            venta_id,
            abono.metodo_pago_id,
            abono.moneda_id,
            abono.monto,
            abono.monto_en_moneda_cxc, // monto_en_moneda_venta debería ser igual a monto_en_moneda_cxc
            abono.referencia,
            abono.fecha,
          ]
        );

        if (pagosVenta && pagosVenta.length > 0) {
          const pagoId = pagosVenta[0].id;

          // Eliminar el pago de ventas_pagos
          // Los triggers de la BD actualizarán automáticamente el estado_pago
          await connection.execute(
            "DELETE FROM ventas_pagos WHERE id = ? AND venta_id = ?",
            [pagoId, venta_id]
          );
        }
      } catch (error) {
        console.error(
          "Error al sincronizar eliminación de abono con ventas_pagos:",
          error
        );
        // No lanzar error para no bloquear la eliminación del abono
      }
    }

    // Eliminar el abono
    await connection.execute(
      "DELETE FROM cuentas_por_cobrar_abonos WHERE id = ? AND cxc_id = ?",
      [abono_id, cxc_id]
    );

    // Actualizar saldo y estado de la cuenta
    await updateCuentaPorCobrarSaldoInternal({ cxc_id }, connection);
  }
);

module.exports = {
  getCuentasPorCobrar,
  getCuentaPorCobrarById,
  createCuentaPorCobrar,
  updateCuentaPorCobrarSaldo,
  updateCuentaPorCobrarSaldoInternal,
  syncCuentaPorCobrarFromVenta,
  syncCuentaPorCobrarFromVentaInternal,
  syncAbonosFromVentaPagos,
  getAbonosByCxcId,
  updateCuentaPorCobrar,
  addAbonoToCuentaPorCobrar,
  deleteAbonoFromCuentaPorCobrar,
};

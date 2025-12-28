-- clientes: table
CREATE TABLE `clientes` (
  `id` int NOT NULL AUTO_INCREMENT,
  `empresa_id` int DEFAULT NULL,
  `nombre` varchar(255) COLLATE utf8mb4_unicode_ci NOT NULL,
  `tipo` enum('persona','empresa') COLLATE utf8mb4_unicode_ci NOT NULL,
  `nit` varchar(20) COLLATE utf8mb4_unicode_ci NOT NULL,
  `email` varchar(255) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `telefono` varchar(20) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `direccion` text COLLATE utf8mb4_unicode_ci,
  `fecha_registro` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `uq_clientes_empresa_nit` (`empresa_id`,`nit`),
  KEY `idx_clientes_empresa_id` (`empresa_id`),
  CONSTRAINT `fk_clientes_empresa` FOREIGN KEY (`empresa_id`) REFERENCES `empresas` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB AUTO_INCREMENT=15 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- No native definition for element: idx_clientes_empresa_id (index)

-- compras: table
CREATE TABLE `compras` (
  `id` int NOT NULL AUTO_INCREMENT,
  `empresa_id` int NOT NULL,
  `proveedor_id` int NOT NULL,
  `usuario_id` int DEFAULT NULL,
  `fecha` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  `total` decimal(12,2) NOT NULL,
  `estado` enum('registrada','anulada') COLLATE utf8mb4_unicode_ci NOT NULL DEFAULT 'registrada',
  `moneda_id` int NOT NULL,
  `comentario` varchar(255) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  PRIMARY KEY (`id`),
  KEY `fk_compras_empresa` (`empresa_id`),
  KEY `fk_compras_prov` (`proveedor_id`),
  KEY `fk_compras_usuario` (`usuario_id`),
  KEY `fk_compras_moneda` (`moneda_id`),
  CONSTRAINT `fk_compras_empresa` FOREIGN KEY (`empresa_id`) REFERENCES `empresas` (`id`) ON DELETE CASCADE,
  CONSTRAINT `fk_compras_moneda` FOREIGN KEY (`moneda_id`) REFERENCES `monedas` (`id`),
  CONSTRAINT `fk_compras_prov` FOREIGN KEY (`proveedor_id`) REFERENCES `proveedores` (`id`),
  CONSTRAINT `fk_compras_usuario` FOREIGN KEY (`usuario_id`) REFERENCES `usuarios` (`id`) ON DELETE SET NULL,
  CONSTRAINT `compras_chk_1` CHECK ((`total` >= 0))
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- compras_detalles: table
CREATE TABLE `compras_detalles` (
  `id` int NOT NULL AUTO_INCREMENT,
  `compra_id` int NOT NULL,
  `producto_id` int NOT NULL,
  `cantidad` int NOT NULL,
  `costo_unitario` decimal(12,2) NOT NULL,
  `subtotal` decimal(12,2) NOT NULL,
  PRIMARY KEY (`id`),
  KEY `fk_cd_compra` (`compra_id`),
  KEY `fk_cd_producto` (`producto_id`),
  CONSTRAINT `fk_cd_compra` FOREIGN KEY (`compra_id`) REFERENCES `compras` (`id`) ON DELETE CASCADE,
  CONSTRAINT `fk_cd_producto` FOREIGN KEY (`producto_id`) REFERENCES `productos` (`id`) ON DELETE CASCADE,
  CONSTRAINT `compras_detalles_chk_1` CHECK ((`cantidad` > 0)),
  CONSTRAINT `compras_detalles_chk_2` CHECK ((`costo_unitario` >= 0)),
  CONSTRAINT `compras_detalles_chk_3` CHECK ((`subtotal` >= 0))
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- cuentas_por_cobrar: table
CREATE TABLE `cuentas_por_cobrar` (
  `id` int NOT NULL AUTO_INCREMENT,
  `empresa_id` int NOT NULL,
  `cliente_id` int NOT NULL,
  `venta_id` int DEFAULT NULL,
  `moneda_id` int NOT NULL,
  `total` decimal(12,2) NOT NULL,
  `saldo` decimal(12,2) NOT NULL,
  `fecha_emision` date NOT NULL,
  `fecha_vencimiento` date DEFAULT NULL,
  `estado` enum('abierta','parcial','cancelada','vencida','anulada') COLLATE utf8mb4_unicode_ci NOT NULL DEFAULT 'abierta',
  `comentario` varchar(255) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  PRIMARY KEY (`id`),
  KEY `fk_cxc_moneda` (`moneda_id`),
  KEY `idx_cxc_empresa_estado` (`empresa_id`,`estado`),
  KEY `idx_cxc_cliente` (`cliente_id`),
  KEY `fk_cxc_venta` (`venta_id`),
  CONSTRAINT `fk_cxc_cliente` FOREIGN KEY (`cliente_id`) REFERENCES `clientes` (`id`) ON DELETE CASCADE,
  CONSTRAINT `fk_cxc_empresa` FOREIGN KEY (`empresa_id`) REFERENCES `empresas` (`id`) ON DELETE CASCADE,
  CONSTRAINT `fk_cxc_moneda` FOREIGN KEY (`moneda_id`) REFERENCES `monedas` (`id`),
  CONSTRAINT `fk_cxc_venta` FOREIGN KEY (`venta_id`) REFERENCES `ventas` (`id`) ON DELETE CASCADE,
  CONSTRAINT `cuentas_por_cobrar_chk_1` CHECK ((`total` >= 0)),
  CONSTRAINT `cuentas_por_cobrar_chk_2` CHECK ((`saldo` >= 0))
) ENGINE=InnoDB AUTO_INCREMENT=27 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- No native definition for element: idx_cxc_empresa_estado (index)

-- No native definition for element: idx_cxc_cliente (index)

-- cuentas_por_cobrar_abonos: table
CREATE TABLE `cuentas_por_cobrar_abonos` (
  `id` int NOT NULL AUTO_INCREMENT,
  `cxc_id` int NOT NULL,
  `metodo_pago_id` int DEFAULT NULL,
  `moneda_id` int NOT NULL,
  `monto` decimal(12,2) NOT NULL,
  `monto_en_moneda_cxc` decimal(12,2) NOT NULL,
  `tasa_cambio` decimal(18,6) DEFAULT NULL,
  `referencia` varchar(255) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `fecha` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `fk_cxca_cxc` (`cxc_id`),
  KEY `fk_cxca_metodo` (`metodo_pago_id`),
  KEY `fk_cxca_moneda` (`moneda_id`),
  CONSTRAINT `fk_cxca_cxc` FOREIGN KEY (`cxc_id`) REFERENCES `cuentas_por_cobrar` (`id`) ON DELETE CASCADE,
  CONSTRAINT `fk_cxca_metodo` FOREIGN KEY (`metodo_pago_id`) REFERENCES `metodos_pago` (`id`),
  CONSTRAINT `fk_cxca_moneda` FOREIGN KEY (`moneda_id`) REFERENCES `monedas` (`id`),
  CONSTRAINT `cuentas_por_cobrar_abonos_chk_1` CHECK ((`monto` > 0))
) ENGINE=InnoDB AUTO_INCREMENT=38 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- cuentas_por_pagar: table
CREATE TABLE `cuentas_por_pagar` (
  `id` int NOT NULL AUTO_INCREMENT,
  `empresa_id` int NOT NULL,
  `proveedor_id` int NOT NULL,
  `compra_id` int DEFAULT NULL,
  `producto_id` int DEFAULT NULL,
  `producto_descripcion` varchar(255) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `moneda_id` int NOT NULL,
  `total` decimal(12,2) NOT NULL,
  `saldo` decimal(12,2) NOT NULL,
  `fecha_emision` date NOT NULL,
  `fecha_vencimiento` date DEFAULT NULL,
  `estado` enum('abierta','parcial','cancelada','vencida','anulada') COLLATE utf8mb4_unicode_ci NOT NULL DEFAULT 'abierta',
  `comentario` varchar(255) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `uq_cxp_compra_id` (`compra_id`),
  KEY `fk_cxp_moneda` (`moneda_id`),
  KEY `idx_cxp_empresa_estado` (`empresa_id`,`estado`),
  KEY `idx_cxp_proveedor` (`proveedor_id`),
  CONSTRAINT `fk_cxp_compra` FOREIGN KEY (`compra_id`) REFERENCES `compras` (`id`) ON DELETE SET NULL,
  CONSTRAINT `fk_cxp_empresa` FOREIGN KEY (`empresa_id`) REFERENCES `empresas` (`id`) ON DELETE CASCADE,
  CONSTRAINT `fk_cxp_moneda` FOREIGN KEY (`moneda_id`) REFERENCES `monedas` (`id`),
  CONSTRAINT `fk_cxp_prov` FOREIGN KEY (`proveedor_id`) REFERENCES `proveedores` (`id`),
  CONSTRAINT `cuentas_por_pagar_chk_1` CHECK ((`total` >= 0)),
  CONSTRAINT `cuentas_por_pagar_chk_2` CHECK ((`saldo` >= 0))
) ENGINE=InnoDB AUTO_INCREMENT=34 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- No native definition for element: idx_cxp_empresa_estado (index)

-- No native definition for element: idx_cxp_proveedor (index)

-- cuentas_por_pagar_abonos: table
CREATE TABLE `cuentas_por_pagar_abonos` (
  `id` int NOT NULL AUTO_INCREMENT,
  `cxp_id` int NOT NULL,
  `metodo_pago_id` int DEFAULT NULL,
  `moneda_id` int NOT NULL,
  `monto` decimal(12,2) NOT NULL,
  `monto_en_moneda_cxp` decimal(12,2) NOT NULL,
  `tasa_cambio` decimal(18,6) DEFAULT NULL,
  `referencia` varchar(255) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `fecha` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `fk_cxpa_cxp` (`cxp_id`),
  KEY `fk_cxpa_metodo` (`metodo_pago_id`),
  KEY `fk_cxpa_moneda` (`moneda_id`),
  CONSTRAINT `fk_cxpa_cxp` FOREIGN KEY (`cxp_id`) REFERENCES `cuentas_por_pagar` (`id`) ON DELETE CASCADE,
  CONSTRAINT `fk_cxpa_metodo` FOREIGN KEY (`metodo_pago_id`) REFERENCES `metodos_pago` (`id`),
  CONSTRAINT `fk_cxpa_moneda` FOREIGN KEY (`moneda_id`) REFERENCES `monedas` (`id`),
  CONSTRAINT `cuentas_por_pagar_abonos_chk_1` CHECK ((`monto` > 0))
) ENGINE=InnoDB AUTO_INCREMENT=19 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- detalles_ventas: table
CREATE TABLE `detalles_ventas` (
  `id` int NOT NULL AUTO_INCREMENT,
  `venta_id` int NOT NULL,
  `producto_id` int NOT NULL,
  `cantidad` int NOT NULL,
  `precio_unitario` decimal(10,2) NOT NULL,
  `tipo_precio_aplicado` enum('sugerido','mayorista','minorista','distribuidores','especial') COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `subtotal` decimal(10,2) NOT NULL,
  PRIMARY KEY (`id`),
  KEY `idx_dv_venta_id` (`venta_id`),
  KEY `idx_dv_producto_id` (`producto_id`),
  KEY `idx_dv_producto_venta` (`producto_id`,`venta_id`),
  CONSTRAINT `fk_detalles_producto` FOREIGN KEY (`producto_id`) REFERENCES `productos` (`id`) ON DELETE CASCADE,
  CONSTRAINT `fk_detalles_venta` FOREIGN KEY (`venta_id`) REFERENCES `ventas` (`id`) ON DELETE CASCADE,
  CONSTRAINT `detalles_ventas_chk_1` CHECK ((`cantidad` > 0)),
  CONSTRAINT `detalles_ventas_chk_2` CHECK ((`precio_unitario` >= 0)),
  CONSTRAINT `detalles_ventas_chk_3` CHECK ((`subtotal` >= 0))
) ENGINE=InnoDB AUTO_INCREMENT=220 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- No native definition for element: idx_dv_venta_id (index)

-- No native definition for element: idx_dv_producto_venta (index)

-- No native definition for element: idx_dv_producto_id (index)

-- trg_registrar_movimiento_por_venta_ai: trigger
CREATE DEFINER=`administrattorLite`@`%` TRIGGER `trg_registrar_movimiento_por_venta_ai` AFTER INSERT ON `detalles_ventas` FOR EACH ROW BEGIN
  DECLARE v_empresa INT;
  DECLARE v_usuario INT;

  SELECT empresa_id, usuario_id INTO v_empresa, v_usuario
  FROM ventas
  WHERE id = NEW.venta_id;

  INSERT INTO movimientos_inventario (
    empresa_id, producto_id, usuario_id, tipo_movimiento, cantidad, comentario, referencia
  ) VALUES (
    v_empresa, NEW.producto_id, v_usuario, 'venta', NEW.cantidad, 'Venta realizada con exito', NEW.venta_id
  );
END;

-- empresas: table
CREATE TABLE `empresas` (
  `id` int NOT NULL AUTO_INCREMENT,
  `nombre` varchar(255) COLLATE utf8mb4_unicode_ci NOT NULL,
  `nit` varchar(20) COLLATE utf8mb4_unicode_ci NOT NULL,
  `direccion` text COLLATE utf8mb4_unicode_ci,
  `telefono` varchar(20) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `email` varchar(255) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `fecha_creacion` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `nombre` (`nombre`),
  UNIQUE KEY `nit` (`nit`),
  UNIQUE KEY `email` (`email`)
) ENGINE=InnoDB AUTO_INCREMENT=12 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- metodos_pago: table
CREATE TABLE `metodos_pago` (
  `id` int NOT NULL AUTO_INCREMENT,
  `nombre` varchar(100) COLLATE utf8mb4_unicode_ci NOT NULL,
  `activo` tinyint(1) DEFAULT '1',
  PRIMARY KEY (`id`),
  UNIQUE KEY `uq_metodos_pago_nombre` (`nombre`)
) ENGINE=InnoDB AUTO_INCREMENT=10 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- monedas: table
CREATE TABLE `monedas` (
  `id` int NOT NULL AUTO_INCREMENT,
  `codigo` char(3) COLLATE utf8mb4_unicode_ci NOT NULL,
  `nombre` varchar(100) COLLATE utf8mb4_unicode_ci NOT NULL,
  `simbolo` varchar(8) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `decimales` tinyint NOT NULL DEFAULT '2',
  `activo` tinyint(1) DEFAULT '1',
  `es_base` tinyint(1) NOT NULL DEFAULT '0',
  `tasa_vs_base` decimal(18,6) NOT NULL DEFAULT '1.000000',
  `tasa_actualizada` timestamp NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `uq_monedas_codigo` (`codigo`),
  UNIQUE KEY `uq_monedas_nombre` (`nombre`)
) ENGINE=InnoDB AUTO_INCREMENT=10 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- movimientos_inventario: table
CREATE TABLE `movimientos_inventario` (
  `id` int NOT NULL AUTO_INCREMENT,
  `empresa_id` int DEFAULT NULL,
  `producto_id` int NOT NULL,
  `usuario_id` int DEFAULT NULL,
  `tipo_movimiento` enum('entrada','salida','ajuste','venta','devolucion') COLLATE utf8mb4_unicode_ci NOT NULL,
  `cantidad` int NOT NULL,
  `precio_compra` decimal(12,2) DEFAULT NULL,
  `fecha` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  `comentario` text COLLATE utf8mb4_unicode_ci,
  `stock_actual` int DEFAULT NULL,
  `referencia` int DEFAULT NULL,
  `compra_id` int DEFAULT NULL,
  `stock_movimiento` int DEFAULT NULL,
  `transferencia_id` int DEFAULT NULL,
  PRIMARY KEY (`id`),
  KEY `idx_movs_empresa_id` (`empresa_id`),
  KEY `idx_movs_producto_id` (`producto_id`),
  KEY `idx_movs_usuario_id` (`usuario_id`),
  KEY `idx_movs_referencia` (`referencia`),
  KEY `idx_movs_tipo_fecha` (`tipo_movimiento`,`fecha`),
  KEY `idx_movs_producto_id_id` (`producto_id`,`id`),
  KEY `idx_movs_transferencia` (`transferencia_id`),
  KEY `idx_movs_compra_id` (`compra_id`),
  CONSTRAINT `fk_movs_compra` FOREIGN KEY (`compra_id`) REFERENCES `compras` (`id`) ON DELETE SET NULL,
  CONSTRAINT `fk_movs_empresa` FOREIGN KEY (`empresa_id`) REFERENCES `empresas` (`id`) ON DELETE CASCADE,
  CONSTRAINT `fk_movs_producto` FOREIGN KEY (`producto_id`) REFERENCES `productos` (`id`) ON DELETE CASCADE,
  CONSTRAINT `fk_movs_transferencia` FOREIGN KEY (`transferencia_id`) REFERENCES `transferencias_inventario` (`id`) ON DELETE SET NULL,
  CONSTRAINT `fk_movs_usuario` FOREIGN KEY (`usuario_id`) REFERENCES `usuarios` (`id`) ON DELETE SET NULL,
  CONSTRAINT `fk_movs_venta` FOREIGN KEY (`referencia`) REFERENCES `ventas` (`id`) ON DELETE SET NULL,
  CONSTRAINT `movimientos_inventario_chk_1` CHECK ((`cantidad` > 0))
) ENGINE=InnoDB AUTO_INCREMENT=583 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- No native definition for element: idx_movs_empresa_id (index)

-- No native definition for element: idx_movs_producto_id_id (index)

-- No native definition for element: idx_movs_producto_id (index)

-- No native definition for element: idx_movs_usuario_id (index)

-- No native definition for element: idx_movs_tipo_fecha (index)

-- No native definition for element: idx_movs_referencia (index)

-- No native definition for element: idx_movs_compra_id (index)

-- No native definition for element: idx_movs_transferencia (index)

-- trg_aplicar_movimiento_stock_bi: trigger
CREATE DEFINER=`administrattorLite`@`%` TRIGGER `trg_aplicar_movimiento_stock_bi` BEFORE INSERT ON `movimientos_inventario` FOR EACH ROW BEGIN
  DECLARE stock_anterior INT DEFAULT 0;
  DECLARE nuevo_stock INT DEFAULT 0;
  DECLARE empresa_tmp INT DEFAULT NULL;

  /* Resolver empresa automáticamente en transferencias */
  IF NEW.empresa_id IS NULL AND NEW.transferencia_id IS NOT NULL THEN
    IF NEW.tipo_movimiento = 'salida' THEN
      SELECT empresa_origen_id INTO empresa_tmp
      FROM transferencias_inventario
      WHERE id = NEW.transferencia_id;

    ELSEIF NEW.tipo_movimiento = 'entrada' THEN
      SELECT empresa_destino_id INTO empresa_tmp
      FROM transferencias_inventario
      WHERE id = NEW.transferencia_id;
    END IF;

    SET NEW.empresa_id = empresa_tmp;
  END IF;

  IF NEW.empresa_id IS NULL THEN
    SIGNAL SQLSTATE '45000'
      SET MESSAGE_TEXT = 'empresa_id es requerido para movimientos de inventario';
  END IF;

  /* Prohibir ajustes dentro de transferencias */
  IF NEW.transferencia_id IS NOT NULL AND NEW.tipo_movimiento = 'ajuste' THEN
    SIGNAL SQLSTATE '45000'
      SET MESSAGE_TEXT = 'No se permiten ajustes de stock dentro de transferencias';
  END IF;

  /* Crear fila de stock si no existe */
  INSERT INTO productos_stock (empresa_id, producto_id, stock)
  VALUES (NEW.empresa_id, NEW.producto_id, 0)
  ON DUPLICATE KEY UPDATE stock = stock;

  /* Leer stock de ESA empresa */
  SELECT stock INTO stock_anterior
  FROM productos_stock
  WHERE empresa_id = NEW.empresa_id
    AND producto_id = NEW.producto_id
  FOR UPDATE;

  SET NEW.stock_movimiento = stock_anterior;

  /* Calcular nuevo stock */
  IF NEW.tipo_movimiento IN ('entrada','devolucion') THEN
    SET nuevo_stock = stock_anterior + NEW.cantidad;

  ELSEIF NEW.tipo_movimiento IN ('salida','venta') THEN
    IF stock_anterior < NEW.cantidad THEN
      SIGNAL SQLSTATE '45000'
        SET MESSAGE_TEXT = 'No hay suficiente stock para realizar la salida.';
    END IF;
    SET nuevo_stock = stock_anterior - NEW.cantidad;

  ELSEIF NEW.tipo_movimiento = 'ajuste' THEN
    SET nuevo_stock = NEW.cantidad;
  END IF;

  UPDATE productos_stock
  SET stock = nuevo_stock
  WHERE empresa_id = NEW.empresa_id
    AND producto_id = NEW.producto_id;

  SET NEW.stock_actual = nuevo_stock;
END;

-- trg_movs_validar_compra_bi: trigger
CREATE DEFINER=`administrattorLite`@`%` TRIGGER `trg_movs_validar_compra_bi` BEFORE INSERT ON `movimientos_inventario` FOR EACH ROW BEGIN
  -- Solo validar precio_compra para movimientos tipo entrada que NO sean transferencias
  IF NEW.tipo_movimiento = 'entrada' AND NEW.transferencia_id IS NULL THEN
    IF NEW.precio_compra IS NULL OR NEW.precio_compra < 0 THEN
      SIGNAL SQLSTATE '45000'
        SET MESSAGE_TEXT = 'Para movimientos tipo entrada (compra), precio_compra es requerido y debe ser >= 0.';
    END IF;

    /* Si querés obligar a que toda entrada esté ligada a una compra, descomentá:
    IF NEW.compra_id IS NULL THEN
      SIGNAL SQLSTATE '45000'
        SET MESSAGE_TEXT = 'Para movimientos tipo entrada (compra), compra_id es requerido.';
    END IF;
    */
  END IF;
END;

-- trg_movs_crear_cxp_ai: trigger
CREATE DEFINER=`administrattorLite`@`%` TRIGGER `trg_movs_crear_cxp_ai` AFTER INSERT ON `movimientos_inventario` FOR EACH ROW BEGIN
  DECLARE v_empresa_id INT;
  DECLARE v_proveedor_id INT;
  DECLARE v_moneda_id INT;
  DECLARE v_total DECIMAL(12,2);
  DECLARE v_compra_id INT;
  DECLARE v_compra_existe INT DEFAULT 0;
  DECLARE v_moneda_base_id INT;

  -- Solo procesar movimientos tipo entrada con precio_compra
  IF NEW.tipo_movimiento = 'entrada'
     AND NEW.precio_compra IS NOT NULL
     AND NEW.precio_compra >= 0 THEN

    -- Obtener empresa_id del movimiento
    SET v_empresa_id = NEW.empresa_id;

    -- Obtener proveedor_id del producto
    SELECT proveedor_id INTO v_proveedor_id
    FROM productos
    WHERE id = NEW.producto_id;

    -- Obtener moneda base (moneda con es_base = 1)
    SELECT id INTO v_moneda_base_id
    FROM monedas
    WHERE es_base = 1
    LIMIT 1;

    -- Si no hay moneda base, usar la primera moneda activa
    IF v_moneda_base_id IS NULL THEN
      SELECT id INTO v_moneda_base_id
      FROM monedas
      WHERE activo = 1
      ORDER BY id
      LIMIT 1;
    END IF;

    SET v_moneda_id = v_moneda_base_id;
    SET v_total = ROUND(NEW.cantidad * NEW.precio_compra, 2);

    -- ESCENARIO 1: Si compra_id es NULL, crear CxP directamente
    IF NEW.compra_id IS NULL THEN
      -- Verificar si ya existe una CxP para este proveedor con el mismo total y fecha reciente
      -- (para evitar duplicados si se crean múltiples movimientos del mismo proveedor)
      IF NOT EXISTS (
        SELECT 1
        FROM cuentas_por_pagar
        WHERE proveedor_id = v_proveedor_id
          AND empresa_id = v_empresa_id
          AND compra_id IS NULL
          AND total = v_total
          AND DATE(fecha_emision) = CURDATE()
          AND estado != 'anulada'
      ) THEN
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
        ) VALUES (
          v_empresa_id,
          v_proveedor_id,
          NULL,
          NEW.producto_id,
          (SELECT descripcion FROM productos WHERE id = NEW.producto_id LIMIT 1),
          v_moneda_id,
          v_total,
          v_total,
          CURDATE(),
          NULL,
          'abierta',
          CONCAT(
            'Generada automáticamente por movimiento de inventario entrada. Movimiento #',
            NEW.id,
            '. Producto: ',
            (SELECT descripcion FROM productos WHERE id = NEW.producto_id LIMIT 1)
          )
        );
      END IF;

    -- ESCENARIO 2: Si compra_id existe, verificar si la compra existe
    ELSE
      SET v_compra_id = NEW.compra_id;

      -- Verificar si la compra existe
      SELECT COUNT(*) INTO v_compra_existe
      FROM compras
      WHERE id = v_compra_id;

      -- Si la compra no existe, crearla primero
      IF v_compra_existe = 0 THEN
        INSERT INTO compras (
          empresa_id, proveedor_id, usuario_id, total, estado, moneda_id, comentario
        ) VALUES (
          v_empresa_id, v_proveedor_id, NEW.usuario_id, v_total, 'registrada', v_moneda_id,
          CONCAT('Compra generada automáticamente desde movimiento de inventario #', NEW.id)
        );

        SET v_compra_id = LAST_INSERT_ID();

        -- Actualizar el movimiento con el nuevo compra_id
        UPDATE movimientos_inventario
        SET compra_id = v_compra_id
        WHERE id = NEW.id;

        -- Crear detalle de compra
        INSERT INTO compras_detalles (
          compra_id, producto_id, cantidad, costo_unitario, subtotal
        ) VALUES (
          v_compra_id, NEW.producto_id, NEW.cantidad, NEW.precio_compra, v_total
        );
      ELSE
        -- Si la compra existe, obtener moneda_id de la compra
        SELECT moneda_id INTO v_moneda_id
        FROM compras
        WHERE id = v_compra_id;
      END IF;

      -- Crear cuenta por pagar si no existe para esta compra
      IF NOT EXISTS (
        SELECT 1 FROM cuentas_por_pagar WHERE compra_id = v_compra_id
      ) THEN
        -- Obtener empresa_id y proveedor_id de la compra (por si acaso)
        SELECT empresa_id, proveedor_id, moneda_id
          INTO v_empresa_id, v_proveedor_id, v_moneda_id
        FROM compras
        WHERE id = v_compra_id;

        -- Obtener el total de la compra (puede ser diferente si hay múltiples movimientos)
        SELECT COALESCE(SUM(cantidad * costo_unitario), v_total) INTO v_total
        FROM compras_detalles
        WHERE compra_id = v_compra_id;

        -- Si no hay detalles, usar el total del movimiento
        IF v_total IS NULL OR v_total = 0 THEN
          SET v_total = ROUND(NEW.cantidad * NEW.precio_compra, 2);
        END IF;

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
        ) VALUES (
          v_empresa_id,
          v_proveedor_id,
          v_compra_id,
          NEW.producto_id,
          (SELECT descripcion FROM productos WHERE id = NEW.producto_id LIMIT 1),
          v_moneda_id,
          v_total,
          v_total,
          CURDATE(),
          NULL,
          'abierta',
          CONCAT('Generada automáticamente por movimiento de inventario entrada. Movimiento #', NEW.id)
        );
      END IF;
    END IF;
  END IF;
END;

-- trg_aplicar_movimiento_stock_bu: trigger
CREATE DEFINER=`administrattorLite`@`%` TRIGGER `trg_aplicar_movimiento_stock_bu` BEFORE UPDATE ON `movimientos_inventario` FOR EACH ROW BEGIN
  /* Bloquear cambios que afectan stock */
  IF NOT (
       OLD.empresa_id       <=> NEW.empresa_id
   AND OLD.producto_id      =   NEW.producto_id
   AND OLD.tipo_movimiento  <=> NEW.tipo_movimiento
   AND OLD.cantidad         =   NEW.cantidad
   AND OLD.transferencia_id <=> NEW.transferencia_id
  ) THEN
    SIGNAL SQLSTATE '45000'
      SET MESSAGE_TEXT = 'No se permite modificar movimientos de inventario (empresa/producto/tipo/cantidad/transferencia). Cree un nuevo movimiento.';
  END IF;

  /* Permitir updates solo de campos informativos.
     Mantener stock_* intactos para que no se “recalcule” nada */
  SET NEW.stock_movimiento = OLD.stock_movimiento;
  SET NEW.stock_actual     = OLD.stock_actual;
END;

-- productos: table
CREATE TABLE `productos` (
  `id` int NOT NULL AUTO_INCREMENT,
  `empresa_id` int DEFAULT NULL,
  `proveedor_id` int NOT NULL,
  `codigo` varchar(100) COLLATE utf8mb4_unicode_ci NOT NULL,
  `serie` varchar(100) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `descripcion` text COLLATE utf8mb4_unicode_ci,
  `categoria` varchar(100) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `estado` enum('activo','inactivo') COLLATE utf8mb4_unicode_ci NOT NULL,
  `fecha_creacion` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  `precio` decimal(10,2) NOT NULL DEFAULT '0.00',
  `producto_master_id` int DEFAULT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `uq_productos_empresa_master` (`empresa_id`,`producto_master_id`),
  UNIQUE KEY `uq_productos_empresa_codigo` (`empresa_id`,`codigo`),
  UNIQUE KEY `uq_productos_empresa_serie` (`empresa_id`,`serie`),
  KEY `idx_productos_empresa_id` (`empresa_id`),
  KEY `idx_productos_proveedor_id` (`proveedor_id`),
  KEY `idx_productos_master` (`producto_master_id`),
  CONSTRAINT `fk_productos_empresa` FOREIGN KEY (`empresa_id`) REFERENCES `empresas` (`id`) ON DELETE CASCADE,
  CONSTRAINT `fk_productos_proveedor` FOREIGN KEY (`proveedor_id`) REFERENCES `proveedores` (`id`) ON DELETE RESTRICT ON UPDATE CASCADE
) ENGINE=InnoDB AUTO_INCREMENT=129 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- No native definition for element: idx_productos_empresa_id (index)

-- No native definition for element: idx_productos_proveedor_id (index)

-- No native definition for element: idx_productos_master (index)

-- trg_productos_sync_sugerido_au: trigger
CREATE DEFINER=`administrattorLite`@`%` TRIGGER `trg_productos_sync_sugerido_au` AFTER UPDATE ON `productos` FOR EACH ROW BEGIN
  -- Si el cambio viene desde 'productos_precios', no hacer nada (evita el “ya se usa”)
  IF IFNULL(@sync_from_pp, 0) = 0 THEN
    IF NEW.precio <> OLD.precio THEN
      -- Marcar origen: productos
      SET @sync_from_productos := 1;

      UPDATE productos_precios
         SET precio = NEW.precio
       WHERE producto_id = NEW.id
         AND tipo = 'sugerido'
         AND precio <> NEW.precio;

      -- Limpiar marca
      SET @sync_from_productos := 0;
    END IF;
  END IF;
END;

-- productos_precios: table
CREATE TABLE `productos_precios` (
  `id` int NOT NULL AUTO_INCREMENT,
  `producto_id` int NOT NULL,
  `tipo` enum('mayorista','minorista','distribuidores','especial','sugerido') COLLATE utf8mb4_unicode_ci NOT NULL,
  `precio` decimal(20,2) NOT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `uq_pp_producto_tipo` (`producto_id`,`tipo`),
  KEY `idx_pp_producto` (`producto_id`),
  CONSTRAINT `fk_pp_producto` FOREIGN KEY (`producto_id`) REFERENCES `productos` (`id`) ON DELETE CASCADE,
  CONSTRAINT `productos_precios_chk_1` CHECK ((`precio` >= 0))
) ENGINE=InnoDB AUTO_INCREMENT=133 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- No native definition for element: idx_pp_producto (index)

-- trg_pp_sync_precio_au: trigger
CREATE DEFINER=`administrattorLite`@`%` TRIGGER `trg_pp_sync_precio_au` AFTER UPDATE ON `productos_precios` FOR EACH ROW BEGIN
  -- Si el cambio viene desde 'productos', no hacer nada para evitar rebote
  IF IFNULL(@sync_from_productos, 0) = 0 THEN
    IF NEW.tipo = 'sugerido'
       AND (NEW.precio <> OLD.precio
            OR OLD.tipo <> NEW.tipo
            OR NEW.producto_id <> OLD.producto_id) THEN

      -- Marcar origen: productos_precios
      SET @sync_from_pp := 1;

      UPDATE productos
         SET precio = NEW.precio
       WHERE id = NEW.producto_id
         AND precio <> NEW.precio;

      -- Limpiar marca
      SET @sync_from_pp := 0;
    END IF;
  END IF;
END;

-- productos_stock: table
CREATE TABLE `productos_stock` (
  `empresa_id` int NOT NULL,
  `producto_id` int NOT NULL,
  `stock` int NOT NULL DEFAULT '0',
  `updated_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`empresa_id`,`producto_id`),
  KEY `fk_ps_producto` (`producto_id`),
  CONSTRAINT `fk_ps_empresa` FOREIGN KEY (`empresa_id`) REFERENCES `empresas` (`id`) ON DELETE CASCADE,
  CONSTRAINT `fk_ps_producto` FOREIGN KEY (`producto_id`) REFERENCES `productos` (`id`) ON DELETE CASCADE,
  CONSTRAINT `productos_stock_chk_1` CHECK ((`stock` >= 0))
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- proveedores: table
CREATE TABLE `proveedores` (
  `id` int NOT NULL AUTO_INCREMENT,
  `nombre` varchar(255) COLLATE utf8mb4_unicode_ci NOT NULL,
  `nit` varchar(20) COLLATE utf8mb4_unicode_ci NOT NULL,
  `email` varchar(255) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `telefono` varchar(20) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `direccion` text COLLATE utf8mb4_unicode_ci,
  `tipo` enum('nacional','internacional') COLLATE utf8mb4_unicode_ci NOT NULL,
  `fecha_registro` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `nit` (`nit`)
) ENGINE=InnoDB AUTO_INCREMENT=13 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- transferencias_inventario: table
CREATE TABLE `transferencias_inventario` (
  `id` int NOT NULL AUTO_INCREMENT,
  `empresa_origen_id` int NOT NULL,
  `empresa_destino_id` int NOT NULL,
  `usuario_id` int DEFAULT NULL,
  `fecha` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  `estado` enum('borrador','confirmada','cancelada') COLLATE utf8mb4_unicode_ci NOT NULL DEFAULT 'borrador',
  `comentario` varchar(255) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  PRIMARY KEY (`id`),
  KEY `fk_ti_usuario` (`usuario_id`),
  KEY `fk_ti_origen` (`empresa_origen_id`),
  KEY `fk_ti_destino` (`empresa_destino_id`),
  CONSTRAINT `fk_ti_destino` FOREIGN KEY (`empresa_destino_id`) REFERENCES `empresas` (`id`) ON DELETE CASCADE,
  CONSTRAINT `fk_ti_origen` FOREIGN KEY (`empresa_origen_id`) REFERENCES `empresas` (`id`) ON DELETE CASCADE,
  CONSTRAINT `fk_ti_usuario` FOREIGN KEY (`usuario_id`) REFERENCES `usuarios` (`id`) ON DELETE SET NULL,
  CONSTRAINT `transferencias_inventario_chk_1` CHECK ((`empresa_origen_id` <> `empresa_destino_id`))
) ENGINE=InnoDB AUTO_INCREMENT=34 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- trg_confirmar_transferencia_au: trigger
CREATE DEFINER=`administrattorLite`@`%` TRIGGER `trg_confirmar_transferencia_au` AFTER UPDATE ON `transferencias_inventario` FOR EACH ROW BEGIN
  IF OLD.estado <> 'confirmada' AND NEW.estado = 'confirmada' THEN

    /* =========================================
       0) Evitar doble aplicación
       ========================================= */
    IF EXISTS (
      SELECT 1
      FROM movimientos_inventario
      WHERE transferencia_id = NEW.id
    ) THEN
      SIGNAL SQLSTATE '45000'
        SET MESSAGE_TEXT = 'La transferencia ya fue aplicada.';
    END IF;

    /* =========================================
       1) Crear producto en DESTINO si no existe
       Verificar por empresa_id + codigo (constraint único real)
       ========================================= */
    INSERT INTO productos (
      empresa_id,
      proveedor_id,
      codigo,
      serie,
      descripcion,
      categoria,
      estado,
      precio,
      producto_master_id
    )
    SELECT
      NEW.empresa_destino_id,
      p.proveedor_id,
      p.codigo,
      p.serie,
      p.descripcion,
      p.categoria,
      p.estado,
      p.precio,
      IFNULL(p.producto_master_id, p.id)
    FROM transferencias_inventario_detalle d
    JOIN productos p ON p.id = d.producto_id
    WHERE d.transferencia_id = NEW.id
      AND NOT EXISTS (
        SELECT 1
        FROM productos pd
        WHERE pd.empresa_id = NEW.empresa_destino_id
          AND pd.codigo = p.codigo
      );

    /* =========================================
       1.1) MIGRAR PRECIOS del producto origen al producto destino
       Copiar todos los registros de productos_precios
       ========================================= */
    INSERT INTO productos_precios (
      producto_id,
      tipo,
      precio
    )
    SELECT
      pd.id AS producto_id,
      pp_origen.tipo,
      pp_origen.precio
    FROM transferencias_inventario_detalle d
    JOIN productos p_origen ON p_origen.id = d.producto_id
    JOIN productos pd
      ON pd.empresa_id = NEW.empresa_destino_id
     AND pd.codigo = p_origen.codigo
    JOIN productos_precios pp_origen ON pp_origen.producto_id = p_origen.id
    WHERE d.transferencia_id = NEW.id
      AND NOT EXISTS (
        SELECT 1
        FROM productos_precios pp_destino
        WHERE pp_destino.producto_id = pd.id
          AND pp_destino.tipo = pp_origen.tipo
      );

    /* =========================================
       2) CREAR STOCK DESTINO (ANTES DE MOVIMIENTOS)
       ========================================= */
    INSERT INTO productos_stock (empresa_id, producto_id, stock)
    SELECT
      NEW.empresa_destino_id,
      pd.id,
      0
    FROM transferencias_inventario_detalle d
    JOIN productos p ON p.id = d.producto_id
    JOIN productos pd
      ON pd.empresa_id = NEW.empresa_destino_id
     AND pd.codigo = p.codigo
    WHERE d.transferencia_id = NEW.id
    ON DUPLICATE KEY UPDATE stock = stock;

    /* =========================================
       3) CREAR STOCK ORIGEN SI NO EXISTE
       ========================================= */
    INSERT INTO productos_stock (empresa_id, producto_id, stock)
    SELECT
      NEW.empresa_origen_id,
      d.producto_id,
      0
    FROM transferencias_inventario_detalle d
    WHERE d.transferencia_id = NEW.id
    ON DUPLICATE KEY UPDATE stock = stock;

    /* =========================================
       4) SALIDA ORIGEN
       ========================================= */
    INSERT INTO movimientos_inventario (
      empresa_id,
      producto_id,
      usuario_id,
      tipo_movimiento,
      cantidad,
      comentario,
      transferencia_id
    )
    SELECT
      NEW.empresa_origen_id,
      d.producto_id,
      NEW.usuario_id,
      'salida',
      d.cantidad,
      CONCAT('Transferencia salida #', NEW.id),
      NEW.id
    FROM transferencias_inventario_detalle d
    WHERE d.transferencia_id = NEW.id;

    /* =========================================
       5) ENTRADA DESTINO (YA CON STOCK EXISTENTE)
       ========================================= */
    INSERT INTO movimientos_inventario (
      empresa_id,
      producto_id,
      usuario_id,
      tipo_movimiento,
      cantidad,
      comentario,
      transferencia_id
    )
    SELECT
      NEW.empresa_destino_id,
      pd.id,
      NEW.usuario_id,
      'entrada',
      d.cantidad,
      CONCAT('Transferencia entrada #', NEW.id),
      NEW.id
    FROM transferencias_inventario_detalle d
    JOIN productos p ON p.id = d.producto_id
    JOIN productos pd
      ON pd.empresa_id = NEW.empresa_destino_id
     AND pd.codigo = p.codigo
    WHERE d.transferencia_id = NEW.id;

  END IF;
END;

-- transferencias_inventario_detalle: table
CREATE TABLE `transferencias_inventario_detalle` (
  `id` int NOT NULL AUTO_INCREMENT,
  `transferencia_id` int NOT NULL,
  `producto_id` int NOT NULL,
  `cantidad` int NOT NULL,
  PRIMARY KEY (`id`),
  KEY `idx_tid_transferencia` (`transferencia_id`),
  KEY `fk_tid_prod` (`producto_id`),
  CONSTRAINT `fk_tid_prod` FOREIGN KEY (`producto_id`) REFERENCES `productos` (`id`) ON DELETE CASCADE,
  CONSTRAINT `fk_tid_transf` FOREIGN KEY (`transferencia_id`) REFERENCES `transferencias_inventario` (`id`) ON DELETE CASCADE,
  CONSTRAINT `transferencias_inventario_detalle_chk_1` CHECK ((`cantidad` > 0))
) ENGINE=InnoDB AUTO_INCREMENT=34 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- No native definition for element: idx_tid_transferencia (index)

-- usuarios: table
CREATE TABLE `usuarios` (
  `id` int NOT NULL AUTO_INCREMENT,
  `empresa_id` int DEFAULT NULL COMMENT 'Empresa informativa. No define permisos ni procesos.',
  `cognito_id` varchar(255) COLLATE utf8mb4_unicode_ci NOT NULL,
  `nombre` varchar(255) COLLATE utf8mb4_unicode_ci NOT NULL,
  `email` varchar(255) COLLATE utf8mb4_unicode_ci NOT NULL,
  `rol` enum('admin','vendedor','bodega','master') COLLATE utf8mb4_unicode_ci NOT NULL,
  `activo` tinyint(1) DEFAULT '1',
  `fecha_creacion` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `cognito_id` (`cognito_id`),
  UNIQUE KEY `email` (`email`)
) ENGINE=InnoDB AUTO_INCREMENT=8 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ventas: table
CREATE TABLE `ventas` (
  `id` int NOT NULL AUTO_INCREMENT,
  `empresa_id` int DEFAULT NULL,
  `cliente_id` int DEFAULT NULL,
  `usuario_id` int DEFAULT NULL,
  `fecha` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  `total` decimal(10,2) NOT NULL,
  `estado` enum('vendido','cancelado') COLLATE utf8mb4_unicode_ci NOT NULL,
  `estado_pago` enum('pendiente','completa') COLLATE utf8mb4_unicode_ci NOT NULL DEFAULT 'pendiente',
  `moneda_id` int DEFAULT NULL,
  `comentario` varchar(250) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  PRIMARY KEY (`id`),
  KEY `idx_ventas_empresa_id` (`empresa_id`),
  KEY `idx_ventas_cliente_id` (`cliente_id`),
  KEY `idx_ventas_usuario_id` (`usuario_id`),
  KEY `idx_ventas_moneda_id` (`moneda_id`),
  KEY `idx_ventas_estado_fecha` (`estado`,`fecha`),
  KEY `idx_ventas_estado_pago` (`estado_pago`),
  CONSTRAINT `fk_ventas_cliente` FOREIGN KEY (`cliente_id`) REFERENCES `clientes` (`id`) ON DELETE SET NULL,
  CONSTRAINT `fk_ventas_empresa` FOREIGN KEY (`empresa_id`) REFERENCES `empresas` (`id`) ON DELETE CASCADE,
  CONSTRAINT `fk_ventas_moneda` FOREIGN KEY (`moneda_id`) REFERENCES `monedas` (`id`) ON DELETE RESTRICT,
  CONSTRAINT `fk_ventas_usuario` FOREIGN KEY (`usuario_id`) REFERENCES `usuarios` (`id`) ON DELETE SET NULL,
  CONSTRAINT `ventas_chk_1` CHECK ((`total` >= 0))
) ENGINE=InnoDB AUTO_INCREMENT=207 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- No native definition for element: idx_ventas_empresa_id (index)

-- No native definition for element: idx_ventas_cliente_id (index)

-- No native definition for element: idx_ventas_usuario_id (index)

-- No native definition for element: idx_ventas_estado_fecha (index)

-- No native definition for element: idx_ventas_estado_pago (index)

-- No native definition for element: idx_ventas_moneda_id (index)

-- trg_ventas_validar_pagos_bu: trigger
CREATE DEFINER=`administrattorLite`@`%` TRIGGER `trg_ventas_validar_pagos_bu` BEFORE UPDATE ON `ventas` FOR EACH ROW BEGIN
  DECLARE v_cnt INT DEFAULT 0;
  DECLARE v_sum DECIMAL(12,2) DEFAULT 0.00;

  SELECT IFNULL(COUNT(*),0), IFNULL(SUM(monto_en_moneda_venta),0.00)
    INTO v_cnt, v_sum
  FROM ventas_pagos
  WHERE venta_id = OLD.id;

  SET NEW.estado_pago = CASE WHEN v_cnt > 0 AND v_sum = NEW.total THEN 'completa' ELSE 'pendiente' END;

  IF OLD.estado <> 'vendido' AND NEW.estado = 'vendido' THEN
    IF v_cnt = 0 THEN
      SIGNAL SQLSTATE '45000'
        SET MESSAGE_TEXT = 'No se puede marcar como vendido: la venta no tiene pagos registrados.';
    END IF;

    IF v_sum <> NEW.total THEN
      SIGNAL SQLSTATE '45000'
        SET MESSAGE_TEXT = 'No se puede marcar como vendido: la suma (convertida) de pagos no coincide con el total.';
    END IF;

    IF NEW.moneda_id IS NULL THEN
      SIGNAL SQLSTATE '45000'
        SET MESSAGE_TEXT = 'No se puede marcar como vendido: la venta debe tener moneda definida.';
    END IF;
  END IF;

  IF OLD.estado = 'vendido' THEN
    IF NEW.total <> OLD.total THEN
      SIGNAL SQLSTATE '45000'
        SET MESSAGE_TEXT = 'No puede cambiar el total en una venta ya vendida.';
    END IF;
    IF NEW.moneda_id <> OLD.moneda_id THEN
      SIGNAL SQLSTATE '45000'
        SET MESSAGE_TEXT = 'No puede cambiar la moneda en una venta ya vendida.';
    END IF;
  END IF;
END;

-- ventas_pagos: table
CREATE TABLE `ventas_pagos` (
  `id` int NOT NULL AUTO_INCREMENT,
  `venta_id` int NOT NULL,
  `metodo_pago_id` int NOT NULL,
  `moneda_id` int NOT NULL,
  `monto` decimal(10,2) NOT NULL,
  `monto_en_moneda_venta` decimal(12,2) NOT NULL,
  `tasa_cambio` decimal(18,6) DEFAULT NULL,
  `referencia` varchar(255) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `fecha` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `fk_vp_moneda` (`moneda_id`),
  KEY `idx_vp_venta_id` (`venta_id`),
  KEY `idx_vp_metodo_pago_id` (`metodo_pago_id`),
  KEY `idx_vp_fecha` (`fecha`),
  CONSTRAINT `fk_vp_metodo` FOREIGN KEY (`metodo_pago_id`) REFERENCES `metodos_pago` (`id`),
  CONSTRAINT `fk_vp_moneda` FOREIGN KEY (`moneda_id`) REFERENCES `monedas` (`id`),
  CONSTRAINT `fk_vp_venta` FOREIGN KEY (`venta_id`) REFERENCES `ventas` (`id`) ON DELETE CASCADE,
  CONSTRAINT `ventas_pagos_chk_1` CHECK ((`monto` > 0))
) ENGINE=InnoDB AUTO_INCREMENT=187 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- No native definition for element: idx_vp_venta_id (index)

-- No native definition for element: idx_vp_metodo_pago_id (index)

-- No native definition for element: idx_vp_fecha (index)

-- trg_vp_no_cambios_si_completa_bi: trigger
CREATE DEFINER=`administrattorLite`@`%` TRIGGER `trg_vp_no_cambios_si_completa_bi` BEFORE INSERT ON `ventas_pagos` FOR EACH ROW BEGIN
  DECLARE v_moneda_venta INT;
  DECLARE v_estado_pago ENUM('pendiente','completa');
  DECLARE v_decimales TINYINT;
  DECLARE v_tasa_from DECIMAL(18,6);
  DECLARE v_tasa_to   DECIMAL(18,6);
  DECLARE v_tasa DECIMAL(18,6);

  IF IFNULL(@bypass_pago_lock,0) = 0 THEN
    SELECT moneda_id, estado_pago INTO v_moneda_venta, v_estado_pago
    FROM ventas WHERE id = NEW.venta_id;

    IF v_estado_pago = 'completa' THEN
      SIGNAL SQLSTATE '45000'
        SET MESSAGE_TEXT = 'No puede agregar pagos: la venta ya está completamente pagada (estado_pago = completa).';
    END IF;
  ELSE
    SELECT moneda_id INTO v_moneda_venta FROM ventas WHERE id = NEW.venta_id;
  END IF;

  SELECT decimales INTO v_decimales FROM monedas WHERE id = v_moneda_venta;

  IF NEW.moneda_id = v_moneda_venta THEN
    SET v_tasa = 1.0;
  ELSE
    SELECT tasa_vs_base INTO v_tasa_from FROM monedas WHERE id = NEW.moneda_id;
    SELECT tasa_vs_base INTO v_tasa_to   FROM monedas WHERE id = v_moneda_venta;

    IF v_tasa_from IS NULL OR v_tasa_to IS NULL OR v_tasa_from <= 0 OR v_tasa_to <= 0 THEN
      SIGNAL SQLSTATE '45000'
        SET MESSAGE_TEXT = 'Falta tasa_vs_base válida en monedas para convertir el pago.';
    END IF;

    SET v_tasa = v_tasa_from / v_tasa_to;
  END IF;

  SET NEW.tasa_cambio = v_tasa;
  SET NEW.monto_en_moneda_venta = ROUND(NEW.monto * v_tasa, v_decimales);
END;

-- trg_vp_estado_pago_ai: trigger
CREATE DEFINER=`administrattorLite`@`%` TRIGGER `trg_vp_estado_pago_ai` AFTER INSERT ON `ventas_pagos` FOR EACH ROW BEGIN
  DECLARE v_cnt   INT DEFAULT 0;
  DECLARE v_sum   DECIMAL(12,2) DEFAULT 0.00;
  DECLARE v_total DECIMAL(10,2) DEFAULT 0.00;
  DECLARE v_estado_actual ENUM('vendido','cancelado');

  SELECT IFNULL(COUNT(*),0), IFNULL(SUM(monto_en_moneda_venta),0.00)
    INTO v_cnt, v_sum
  FROM ventas_pagos
  WHERE venta_id = NEW.venta_id;

  SELECT total, estado INTO v_total, v_estado_actual
  FROM ventas
  WHERE id = NEW.venta_id;

  UPDATE ventas
  SET estado_pago = CASE WHEN v_cnt > 0 AND v_sum = v_total THEN 'completa' ELSE 'pendiente' END,
      estado      = CASE WHEN v_estado_actual <> 'cancelado' AND v_cnt > 0 AND v_sum = v_total AND estado <> 'vendido'
                         THEN 'vendido' ELSE estado END
  WHERE id = NEW.venta_id;
END;

-- trg_vp_no_cambios_si_completa_bu: trigger
CREATE DEFINER=`administrattorLite`@`%` TRIGGER `trg_vp_no_cambios_si_completa_bu` BEFORE UPDATE ON `ventas_pagos` FOR EACH ROW BEGIN
  DECLARE v_moneda_venta INT;
  DECLARE v_decimales TINYINT;
  DECLARE v_tasa_from DECIMAL(18,6);
  DECLARE v_tasa_to   DECIMAL(18,6);
  DECLARE v_tasa DECIMAL(18,6);

  IF IFNULL(@bypass_pago_lock,0) = 0 AND
     (SELECT estado_pago FROM ventas WHERE id = OLD.venta_id) = 'completa' THEN
    SIGNAL SQLSTATE '45000'
      SET MESSAGE_TEXT = 'No puede modificar pagos: la venta ya está completamente pagada (estado_pago = completa).';
  END IF;

  SELECT moneda_id INTO v_moneda_venta FROM ventas WHERE id = NEW.venta_id;
  SELECT decimales INTO v_decimales FROM monedas WHERE id = v_moneda_venta;

  IF NEW.moneda_id = v_moneda_venta THEN
    SET v_tasa = 1.0;
  ELSE
    SELECT tasa_vs_base INTO v_tasa_from FROM monedas WHERE id = NEW.moneda_id;
    SELECT tasa_vs_base INTO v_tasa_to   FROM monedas WHERE id = v_moneda_venta;

    IF v_tasa_from IS NULL OR v_tasa_to IS NULL OR v_tasa_from <= 0 OR v_tasa_to <= 0 THEN
      SIGNAL SQLSTATE '45000'
        SET MESSAGE_TEXT = 'Falta tasa_vs_base válida en monedas para convertir el pago.';
    END IF;

    SET v_tasa = v_tasa_from / v_tasa_to;
  END IF;

  SET NEW.tasa_cambio = v_tasa;
  SET NEW.monto_en_moneda_venta = ROUND(NEW.monto * v_tasa, v_decimales);
END;

-- trg_vp_estado_pago_au: trigger
CREATE DEFINER=`administrattorLite`@`%` TRIGGER `trg_vp_estado_pago_au` AFTER UPDATE ON `ventas_pagos` FOR EACH ROW BEGIN
  DECLARE v_cnt   INT DEFAULT 0;
  DECLARE v_sum   DECIMAL(12,2) DEFAULT 0.00;
  DECLARE v_total DECIMAL(10,2) DEFAULT 0.00;
  DECLARE v_estado_actual ENUM('vendido','cancelado');

  SELECT IFNULL(COUNT(*),0), IFNULL(SUM(monto_en_moneda_venta),0.00)
    INTO v_cnt, v_sum
  FROM ventas_pagos
  WHERE venta_id = NEW.venta_id;

  SELECT total, estado INTO v_total, v_estado_actual
  FROM ventas
  WHERE id = NEW.venta_id;

  UPDATE ventas
  SET estado_pago = CASE WHEN v_cnt > 0 AND v_sum = v_total THEN 'completa' ELSE 'pendiente' END,
      estado      = CASE WHEN v_estado_actual <> 'cancelado' AND v_cnt > 0 AND v_sum = v_total AND estado <> 'vendido'
                         THEN 'vendido' ELSE estado END
  WHERE id = NEW.venta_id;
END;

-- trg_vp_estado_pago_ad: trigger
CREATE DEFINER=`administrattorLite`@`%` TRIGGER `trg_vp_estado_pago_ad` AFTER DELETE ON `ventas_pagos` FOR EACH ROW BEGIN
  DECLARE v_cnt   INT DEFAULT 0;
  DECLARE v_sum   DECIMAL(12,2) DEFAULT 0.00;
  DECLARE v_total DECIMAL(10,2) DEFAULT 0.00;

  IF IFNULL(@bypass_pago_lock,0) = 0 THEN
    SELECT IFNULL(COUNT(*),0), IFNULL(SUM(monto_en_moneda_venta),0.00)
      INTO v_cnt, v_sum
    FROM ventas_pagos
    WHERE venta_id = OLD.venta_id;

    SELECT total INTO v_total
    FROM ventas
    WHERE id = OLD.venta_id;

    UPDATE ventas
    SET estado_pago = CASE WHEN v_cnt > 0 AND v_sum = v_total THEN 'completa' ELSE 'pendiente' END
    WHERE id = OLD.venta_id;
  END IF;
END;

-- reporte_clientes_riesgo: view
CREATE ALGORITHM=UNDEFINED DEFINER=`administrattorLite`@`%` SQL SECURITY DEFINER VIEW `reporte_clientes_riesgo` AS select `cxc`.`cliente_id` AS `cliente_id`,`c`.`nombre` AS `cliente_nombre`,`c`.`nit` AS `cliente_nit`,`cxc`.`empresa_id` AS `empresa_id`,sum((case when ((to_days(curdate()) - to_days(coalesce(`cxc`.`fecha_vencimiento`,`cxc`.`fecha_emision`))) > 0) then `cxc`.`saldo` else 0 end)) AS `saldo_vencido_total`,avg((case when ((to_days(curdate()) - to_days(coalesce(`cxc`.`fecha_vencimiento`,`cxc`.`fecha_emision`))) > 0) then (to_days(curdate()) - to_days(coalesce(`cxc`.`fecha_vencimiento`,`cxc`.`fecha_emision`))) else NULL end)) AS `dias_atraso_promedio`,count((case when ((to_days(curdate()) - to_days(coalesce(`cxc`.`fecha_vencimiento`,`cxc`.`fecha_emision`))) > 0) then 1 end)) AS `numero_cuentas_vencidas`,(case when (sum((case when ((to_days(curdate()) - to_days(coalesce(`cxc`.`fecha_vencimiento`,`cxc`.`fecha_emision`))) > 90) then `cxc`.`saldo` else 0 end)) > 0) then 'Alto' when (sum((case when ((to_days(curdate()) - to_days(coalesce(`cxc`.`fecha_vencimiento`,`cxc`.`fecha_emision`))) > 60) then `cxc`.`saldo` else 0 end)) > 0) then 'Medio' when (sum((case when ((to_days(curdate()) - to_days(coalesce(`cxc`.`fecha_vencimiento`,`cxc`.`fecha_emision`))) > 0) then `cxc`.`saldo` else 0 end)) > 0) then 'Bajo' else 'Sin riesgo' end) AS `riesgo_nivel` from (`cuentas_por_cobrar` `cxc` left join `clientes` `c` on((`c`.`id` = `cxc`.`cliente_id`))) where ((`cxc`.`saldo` > 0) and (`cxc`.`estado` not in ('cancelada','anulada'))) group by `cxc`.`cliente_id`,`c`.`nombre`,`c`.`nit`,`cxc`.`empresa_id` having (`saldo_vencido_total` > 0);

-- reporte_cxc_aging: view
CREATE ALGORITHM=UNDEFINED DEFINER=`administrattorLite`@`%` SQL SECURITY DEFINER VIEW `reporte_cxc_aging` AS select `cxc`.`cliente_id` AS `cliente_id`,`c`.`nombre` AS `cliente_nombre`,`c`.`nit` AS `cliente_nit`,`cxc`.`empresa_id` AS `empresa_id`,sum(`cxc`.`saldo`) AS `total_saldo`,sum((case when ((to_days(curdate()) - to_days(coalesce(`cxc`.`fecha_vencimiento`,`cxc`.`fecha_emision`))) <= 30) then `cxc`.`saldo` else 0 end)) AS `saldo_0_30`,sum((case when ((to_days(curdate()) - to_days(coalesce(`cxc`.`fecha_vencimiento`,`cxc`.`fecha_emision`))) between 31 and 60) then `cxc`.`saldo` else 0 end)) AS `saldo_31_60`,sum((case when ((to_days(curdate()) - to_days(coalesce(`cxc`.`fecha_vencimiento`,`cxc`.`fecha_emision`))) between 61 and 90) then `cxc`.`saldo` else 0 end)) AS `saldo_61_90`,sum((case when ((to_days(curdate()) - to_days(coalesce(`cxc`.`fecha_vencimiento`,`cxc`.`fecha_emision`))) > 90) then `cxc`.`saldo` else 0 end)) AS `saldo_mas_90`,avg((case when ((to_days(curdate()) - to_days(coalesce(`cxc`.`fecha_vencimiento`,`cxc`.`fecha_emision`))) > 0) then (to_days(curdate()) - to_days(coalesce(`cxc`.`fecha_vencimiento`,`cxc`.`fecha_emision`))) else NULL end)) AS `dias_promedio_atraso` from (`cuentas_por_cobrar` `cxc` left join `clientes` `c` on((`c`.`id` = `cxc`.`cliente_id`))) where ((`cxc`.`saldo` > 0) and (`cxc`.`estado` not in ('cancelada','anulada'))) group by `cxc`.`cliente_id`,`c`.`nombre`,`c`.`nit`,`cxc`.`empresa_id`;

-- reporte_cxp_aging: view
CREATE ALGORITHM=UNDEFINED DEFINER=`administrattorLite`@`%` SQL SECURITY DEFINER VIEW `reporte_cxp_aging` AS select `cxp`.`proveedor_id` AS `proveedor_id`,`p`.`nombre` AS `proveedor_nombre`,`cxp`.`empresa_id` AS `empresa_id`,sum(`cxp`.`saldo`) AS `total_saldo`,sum((case when ((to_days(curdate()) - to_days(coalesce(`cxp`.`fecha_vencimiento`,`cxp`.`fecha_emision`))) <= 30) then `cxp`.`saldo` else 0 end)) AS `saldo_0_30`,sum((case when ((to_days(curdate()) - to_days(coalesce(`cxp`.`fecha_vencimiento`,`cxp`.`fecha_emision`))) between 31 and 60) then `cxp`.`saldo` else 0 end)) AS `saldo_31_60`,sum((case when ((to_days(curdate()) - to_days(coalesce(`cxp`.`fecha_vencimiento`,`cxp`.`fecha_emision`))) between 61 and 90) then `cxp`.`saldo` else 0 end)) AS `saldo_61_90`,sum((case when ((to_days(curdate()) - to_days(coalesce(`cxp`.`fecha_vencimiento`,`cxp`.`fecha_emision`))) > 90) then `cxp`.`saldo` else 0 end)) AS `saldo_mas_90`,avg((case when ((to_days(curdate()) - to_days(coalesce(`cxp`.`fecha_vencimiento`,`cxp`.`fecha_emision`))) > 0) then (to_days(curdate()) - to_days(coalesce(`cxp`.`fecha_vencimiento`,`cxp`.`fecha_emision`))) else NULL end)) AS `dias_promedio_atraso` from (`cuentas_por_pagar` `cxp` left join `proveedores` `p` on((`p`.`id` = `cxp`.`proveedor_id`))) where ((`cxp`.`saldo` > 0) and (`cxp`.`estado` not in ('cancelada','anulada'))) group by `cxp`.`proveedor_id`,`p`.`nombre`,`cxp`.`empresa_id`;

-- reporte_flujo_caja_proyectado: view
CREATE ALGORITHM=UNDEFINED DEFINER=`administrattorLite`@`%` SQL SECURITY DEFINER VIEW `reporte_flujo_caja_proyectado` AS select date_format(coalesce(`cxc`.`fecha_vencimiento`,`cxc`.`fecha_emision`),'%Y-%m') AS `periodo`,'cobro' AS `tipo`,`cxc`.`empresa_id` AS `empresa_id`,sum(`cxc`.`saldo`) AS `monto_estimado` from `cuentas_por_cobrar` `cxc` where ((`cxc`.`saldo` > 0) and (`cxc`.`estado` not in ('cancelada','anulada'))) group by date_format(coalesce(`cxc`.`fecha_vencimiento`,`cxc`.`fecha_emision`),'%Y-%m'),`cxc`.`empresa_id` union all select date_format(coalesce(`cxp`.`fecha_vencimiento`,`cxp`.`fecha_emision`),'%Y-%m') AS `periodo`,'pago' AS `tipo`,`cxp`.`empresa_id` AS `empresa_id`,sum(`cxp`.`saldo`) AS `monto_estimado` from `cuentas_por_pagar` `cxp` where ((`cxp`.`saldo` > 0) and (`cxp`.`estado` not in ('cancelada','anulada'))) group by date_format(coalesce(`cxp`.`fecha_vencimiento`,`cxp`.`fecha_emision`),'%Y-%m'),`cxp`.`empresa_id`;

-- reporte_inventario_baja_rotacion: view
CREATE ALGORITHM=UNDEFINED DEFINER=`administrattorLite`@`%` SQL SECURITY DEFINER VIEW `reporte_inventario_baja_rotacion` AS select `p`.`id` AS `producto_id`,`p`.`empresa_id` AS `empresa_id`,`p`.`codigo` AS `producto_codigo`,`p`.`descripcion` AS `producto_descripcion`,`p`.`categoria` AS `categoria`,coalesce((to_days(curdate()) - to_days(max(`mv`.`fecha`))),999) AS `dias_sin_movimiento`,coalesce(`ps`.`stock`,0) AS `stock_actual`,(coalesce(`ps`.`stock`,0) * `p`.`precio`) AS `valor_inventario`,`p`.`precio` AS `precio_unitario` from ((`productos` `p` left join `productos_stock` `ps` on(((`ps`.`producto_id` = `p`.`id`) and (`ps`.`empresa_id` = `p`.`empresa_id`)))) left join `movimientos_inventario` `mv` on(((`mv`.`producto_id` = `p`.`id`) and (`mv`.`empresa_id` = `p`.`empresa_id`)))) group by `p`.`id`,`p`.`empresa_id`,`p`.`codigo`,`p`.`descripcion`,`p`.`categoria`,`ps`.`stock`,`p`.`precio`;

-- reporte_inventario_rupturas: view
CREATE ALGORITHM=UNDEFINED DEFINER=`administrattorLite`@`%` SQL SECURITY DEFINER VIEW `reporte_inventario_rupturas` AS select `p`.`id` AS `producto_id`,`p`.`empresa_id` AS `empresa_id`,`p`.`codigo` AS `producto_codigo`,`p`.`descripcion` AS `producto_descripcion`,`p`.`categoria` AS `categoria`,coalesce(`ps`.`stock`,0) AS `stock_actual`,0 AS `stock_minimo`,(0 - coalesce(`ps`.`stock`,0)) AS `diferencia`,(case when (coalesce(`ps`.`stock`,0) = 0) then 'Agotado' when (coalesce(`ps`.`stock`,0) <= 5) then 'Bajo' else 'Normal' end) AS `estado`,`p`.`precio` AS `precio_unitario`,(coalesce(`ps`.`stock`,0) * `p`.`precio`) AS `valor_inventario` from (`productos` `p` left join `productos_stock` `ps` on(((`ps`.`producto_id` = `p`.`id`) and (`ps`.`empresa_id` = `p`.`empresa_id`)))) where (coalesce(`ps`.`stock`,0) <= 5);

-- reporte_movimientos_inventario: view
CREATE ALGORITHM=UNDEFINED DEFINER=`administrattorLite`@`%` SQL SECURITY DEFINER VIEW `reporte_movimientos_inventario` AS select `m`.`id` AS `id`,`e`.`id` AS `empresa_id`,`e`.`nombre` AS `empresa`,`p`.`descripcion` AS `producto`,`p`.`id` AS `producto_id`,`p`.`codigo` AS `codigo_producto`,`u`.`nombre` AS `usuario`,`u`.`id` AS `usuario_id`,`m`.`stock_actual` AS `stock_actual`,`m`.`tipo_movimiento` AS `tipo_movimiento`,`m`.`cantidad` AS `cantidad`,`m`.`precio_compra` AS `precio_compra`,(case when (`m`.`tipo_movimiento` = 'entrada') then (`m`.`precio_compra` * `m`.`cantidad`) else 0 end) AS `total_compra`,`m`.`fecha` AS `fecha`,`m`.`comentario` AS `comentario`,`m`.`stock_movimiento` AS `stock_movimiento`,`m`.`referencia` AS `venta_id` from (((`movimientos_inventario` `m` left join `empresas` `e` on((`m`.`empresa_id` = `e`.`id`))) left join `productos` `p` on((`m`.`producto_id` = `p`.`id`))) left join `usuarios` `u` on((`m`.`usuario_id` = `u`.`id`)));

-- reporte_top_clientes_base: view
CREATE ALGORITHM=UNDEFINED DEFINER=`administrattorLite`@`%` SQL SECURITY DEFINER VIEW `reporte_top_clientes_base` AS select `v`.`cliente_id` AS `cliente_id`,`c`.`nombre` AS `cliente_nombre`,`c`.`nit` AS `cliente_nit`,`v`.`empresa_id` AS `empresa_id`,sum(`v`.`total`) AS `total_ventas`,count(distinct `v`.`id`) AS `numero_ventas`,avg(`v`.`total`) AS `ticket_promedio` from (`ventas` `v` left join `clientes` `c` on((`c`.`id` = `v`.`cliente_id`))) where (`v`.`estado` = 'vendido') group by `v`.`cliente_id`,`c`.`nombre`,`c`.`nit`,`v`.`empresa_id`;

-- reporte_top_proveedores_base: view
CREATE ALGORITHM=UNDEFINED DEFINER=`administrattorLite`@`%` SQL SECURITY DEFINER VIEW `reporte_top_proveedores_base` AS select `comp`.`proveedor_id` AS `proveedor_id`,`p`.`nombre` AS `proveedor_nombre`,`comp`.`empresa_id` AS `empresa_id`,sum(`comp`.`total`) AS `total_compras`,count(distinct `comp`.`id`) AS `numero_compras`,avg(`comp`.`total`) AS `promedio_compra` from (`compras` `comp` left join `proveedores` `p` on((`p`.`id` = `comp`.`proveedor_id`))) where (`comp`.`estado` = 'registrada') group by `comp`.`proveedor_id`,`p`.`nombre`,`comp`.`empresa_id`;

-- reporte_ventas_flat: view
CREATE ALGORITHM=UNDEFINED DEFINER=`administrattorLite`@`%` SQL SECURITY DEFINER VIEW `reporte_ventas_flat` AS select `v`.`id` AS `id`,`v`.`empresa_id` AS `empresa_id`,`v`.`cliente_id` AS `cliente_id`,`c`.`nombre` AS `cliente_nombre`,`c`.`nit` AS `cliente_nit`,`v`.`usuario_id` AS `usuario_id`,`u`.`nombre` AS `usuario_nombre`,`v`.`total` AS `total_venta`,coalesce(sum(`vp`.`monto_en_moneda_venta`),0) AS `total_pagado`,(`v`.`total` - coalesce(sum(`vp`.`monto_en_moneda_venta`),0)) AS `saldo_pendiente`,`v`.`estado` AS `estado_venta`,`v`.`fecha` AS `fecha_venta`,`v`.`moneda_id` AS `moneda_id`,`m`.`codigo` AS `moneda_codigo` from ((((`ventas` `v` left join `clientes` `c` on((`c`.`id` = `v`.`cliente_id`))) left join `usuarios` `u` on((`u`.`id` = `v`.`usuario_id`))) left join `ventas_pagos` `vp` on((`vp`.`venta_id` = `v`.`id`))) left join `monedas` `m` on((`m`.`id` = `v`.`moneda_id`))) group by `v`.`id`,`v`.`empresa_id`,`v`.`cliente_id`,`c`.`nombre`,`c`.`nit`,`v`.`usuario_id`,`u`.`nombre`,`v`.`total`,`v`.`estado`,`v`.`fecha`,`v`.`moneda_id`,`m`.`codigo`;

-- vista_metodos_pago_unificado: view
CREATE ALGORITHM=UNDEFINED DEFINER=`administrattorLite`@`%` SQL SECURITY DEFINER VIEW `vista_metodos_pago_unificado` AS select `v`.`empresa_id` AS `empresa_id`,`e`.`nombre` AS `empresa_nombre`,`v`.`id` AS `venta_id`,`v`.`fecha` AS `fecha_venta`,cast(`v`.`fecha` as date) AS `fecha_venta_dia`,`v`.`estado` AS `estado_venta`,`v`.`estado_pago` AS `estado_pago`,`v`.`total` AS `total_venta`,`v`.`moneda_id` AS `moneda_venta_id`,`m_venta`.`codigo` AS `moneda_venta_codigo`,`m_venta`.`nombre` AS `moneda_venta_nombre`,`m_venta`.`simbolo` AS `moneda_venta_simbolo`,`v`.`comentario` AS `comentario_venta`,`c`.`id` AS `cliente_id`,`c`.`nombre` AS `cliente_nombre`,`c`.`email` AS `cliente_email`,`c`.`telefono` AS `cliente_telefono`,`u`.`id` AS `usuario_id`,`u`.`nombre` AS `usuario_nombre`,`vp`.`id` AS `pago_id`,`mp`.`id` AS `metodo_pago_id`,`mp`.`nombre` AS `metodo_pago`,`vp`.`monto` AS `monto_pago`,`vp`.`monto_en_moneda_venta` AS `monto_pago_convertido`,`vp`.`tasa_cambio` AS `tasa_cambio_aplicada`,`vp`.`moneda_id` AS `moneda_pago_id`,`m_pago`.`codigo` AS `moneda_pago_codigo`,`m_pago`.`nombre` AS `moneda_pago_nombre`,`m_pago`.`simbolo` AS `moneda_pago_simbolo`,`vp`.`referencia` AS `referencia_pago`,`vp`.`fecha` AS `fecha_pago`,cast(`vp`.`fecha` as date) AS `fecha_pago_dia`,sum(`vp`.`monto_en_moneda_venta`) OVER (PARTITION BY `v`.`id` )  AS `total_pagado_venta`,count(`vp`.`id`) OVER (PARTITION BY `v`.`id` )  AS `cantidad_pagos_venta`,sum(`vp`.`monto_en_moneda_venta`) OVER (PARTITION BY `v`.`id`,`mp`.`id` )  AS `total_por_metodo_en_venta`,greatest((`v`.`total` - sum(`vp`.`monto_en_moneda_venta`) OVER (PARTITION BY `v`.`id` ) ),0.00) AS `saldo_pendiente_venta`,(`v`.`estado` = 'vendido') AS `venta_es_vendida_bool` from (((((((`ventas` `v` join `empresas` `e` on((`e`.`id` = `v`.`empresa_id`))) left join `clientes` `c` on((`c`.`id` = `v`.`cliente_id`))) left join `usuarios` `u` on((`u`.`id` = `v`.`usuario_id`))) left join `monedas` `m_venta` on((`m_venta`.`id` = `v`.`moneda_id`))) join `ventas_pagos` `vp` on((`vp`.`venta_id` = `v`.`id`))) join `metodos_pago` `mp` on((`mp`.`id` = `vp`.`metodo_pago_id`))) join `monedas` `m_pago` on((`m_pago`.`id` = `vp`.`moneda_id`)));

-- vista_movimientos_por_venta: view
CREATE ALGORITHM=UNDEFINED DEFINER=`administrattorLite`@`%` SQL SECURITY DEFINER VIEW `vista_movimientos_por_venta` AS select `v`.`id` AS `venta_id`,`v`.`fecha` AS `fecha_venta`,`v`.`cliente_id` AS `cliente_id`,`v`.`usuario_id` AS `vendedor_id`,`v`.`empresa_id` AS `empresa_id`,`v`.`total` AS `total`,`v`.`estado` AS `estado`,`mv`.`id` AS `movimiento_id`,`mv`.`producto_id` AS `producto_id`,`mv`.`cantidad` AS `cantidad`,`mv`.`tipo_movimiento` AS `tipo_movimiento`,`mv`.`stock_actual` AS `stock_actual`,`mv`.`fecha` AS `fecha_movimiento`,`mv`.`comentario` AS `comentario` from (`ventas` `v` join `movimientos_inventario` `mv` on((`mv`.`referencia` = `v`.`id`))) where (`mv`.`tipo_movimiento` = 'venta');

-- vista_pagos_por_venta: view
CREATE ALGORITHM=UNDEFINED DEFINER=`administrattorLite`@`%` SQL SECURITY DEFINER VIEW `vista_pagos_por_venta` AS select `v`.`id` AS `venta_id`,`v`.`fecha` AS `fecha_venta`,`v`.`estado` AS `estado_venta`,`v`.`total` AS `total_venta`,`c`.`id` AS `cliente_id`,`c`.`nombre` AS `cliente_nombre`,`vp`.`id` AS `pago_id`,`mp`.`nombre` AS `metodo_pago`,`m_pago`.`codigo` AS `moneda_pago_codigo`,`m_pago`.`simbolo` AS `moneda_pago_simbolo`,`vp`.`monto` AS `monto`,`vp`.`monto_en_moneda_venta` AS `monto_convertido`,`m_venta`.`codigo` AS `moneda_venta_codigo`,`m_venta`.`simbolo` AS `moneda_venta_simbolo`,`vp`.`referencia` AS `referencia`,`vp`.`fecha` AS `fecha_pago` from (((((`ventas` `v` join `clientes` `c` on((`c`.`id` = `v`.`cliente_id`))) join `ventas_pagos` `vp` on((`vp`.`venta_id` = `v`.`id`))) join `metodos_pago` `mp` on((`mp`.`id` = `vp`.`metodo_pago_id`))) join `monedas` `m_pago` on((`m_pago`.`id` = `vp`.`moneda_id`))) join `monedas` `m_venta` on((`m_venta`.`id` = `v`.`moneda_id`)));

-- vista_saldo_venta: view
CREATE ALGORITHM=UNDEFINED DEFINER=`administrattorLite`@`%` SQL SECURITY DEFINER VIEW `vista_saldo_venta` AS select `v`.`id` AS `venta_id`,`v`.`empresa_id` AS `empresa_id`,`v`.`total` AS `total`,ifnull(sum(`vp`.`monto_en_moneda_venta`),0) AS `total_pagado`,greatest((`v`.`total` - ifnull(sum(`vp`.`monto_en_moneda_venta`),0)),0) AS `saldo` from (`ventas` `v` left join `ventas_pagos` `vp` on((`vp`.`venta_id` = `v`.`id`))) group by `v`.`id`,`v`.`empresa_id`,`v`.`total`;

-- vista_ventas_completas: view
CREATE ALGORITHM=UNDEFINED DEFINER=`administrattorLite`@`%` SQL SECURITY DEFINER VIEW `vista_ventas_completas` AS select `dv`.`id` AS `id`,`v`.`id` AS `id_venta`,`v`.`fecha` AS `fecha_venta`,`dv`.`subtotal` AS `total_venta`,`v`.`estado` AS `estado_venta`,`v`.`empresa_id` AS `empresa_id`,`e`.`nombre` AS `empresa_nombre`,`e`.`nit` AS `empresa_nit`,`e`.`email` AS `empresa_email`,`c`.`id` AS `cliente_id`,`c`.`nombre` AS `cliente_nombre`,`c`.`nit` AS `cliente_nit`,`c`.`email` AS `cliente_email`,`c`.`telefono` AS `cliente_telefono`,`c`.`direccion` AS `cliente_direccion`,`c`.`tipo` AS `cliente_tipo`,`u`.`id` AS `usuario_id`,`u`.`nombre` AS `usuario_nombre`,`u`.`email` AS `usuario_email`,`dv`.`id` AS `detalle_id`,`dv`.`producto_id` AS `producto_id`,`dv`.`cantidad` AS `cantidad`,`dv`.`precio_unitario` AS `precio_unitario`,`dv`.`tipo_precio_aplicado` AS `tipo_precio_aplicado`,`p`.`codigo` AS `producto_codigo`,`p`.`serie` AS `producto_serie`,`p`.`descripcion` AS `producto_descripcion`,`p`.`categoria` AS `producto_categoria`,`p`.`estado` AS `producto_estado`,`p`.`precio` AS `producto_precio`,`m_venta`.`codigo` AS `moneda_codigo`,`m_venta`.`simbolo` AS `moneda_simbolo`,`v`.`total` AS `total_venta_suma_lineas`,`v`.`comentario` AS `comentario`,`agg`.`metodos_pago` AS `metodos_pago`,`agg`.`total_pagado` AS `total_pagado`,`agg`.`pagos_json` AS `pagos_json` from (((((((`ventas` `v` join `empresas` `e` on((`v`.`empresa_id` = `e`.`id`))) join `clientes` `c` on((`v`.`cliente_id` = `c`.`id`))) join `usuarios` `u` on((`v`.`usuario_id` = `u`.`id`))) join `detalles_ventas` `dv` on((`dv`.`venta_id` = `v`.`id`))) join `productos` `p` on((`p`.`id` = `dv`.`producto_id`))) left join `monedas` `m_venta` on((`m_venta`.`id` = `v`.`moneda_id`))) left join (select `vp`.`venta_id` AS `venta_id`,group_concat(distinct `mp`.`nombre` order by `mp`.`nombre` ASC separator ', ') AS `metodos_pago`,sum(`vp`.`monto_en_moneda_venta`) AS `total_pagado`,json_arrayagg(json_object('metodo',`mp`.`nombre`,'monto',`vp`.`monto`,'moneda_pago',`m_pago`.`codigo`,'monto_convertido',`vp`.`monto_en_moneda_venta`)) AS `pagos_json` from ((`ventas_pagos` `vp` join `metodos_pago` `mp` on((`mp`.`id` = `vp`.`metodo_pago_id`))) join `monedas` `m_pago` on((`m_pago`.`id` = `vp`.`moneda_id`))) group by `vp`.`venta_id`) `agg` on((`agg`.`venta_id` = `v`.`id`)));

-- vista_ventas_detalle_anidado: view
CREATE ALGORITHM=UNDEFINED DEFINER=`administrattorLite`@`%` SQL SECURITY DEFINER VIEW `vista_ventas_detalle_anidado` AS select `v`.`id` AS `id`,`v`.`fecha` AS `fecha_venta`,`c`.`id` AS `cliente_id`,`c`.`nombre` AS `cliente_nombre`,`c`.`nit` AS `cliente_nit`,`c`.`email` AS `cliente_email`,`c`.`direccion` AS `cliente_direccion`,`c`.`telefono` AS `cliente_telefono`,`u`.`id` AS `usuario_id`,`u`.`nombre` AS `usuario_nombre`,`v`.`empresa_id` AS `empresa_id`,`v`.`estado` AS `estado_venta`,`v`.`comentario` AS `comentario`,`v`.`total` AS `total_venta`,`m_venta`.`codigo` AS `moneda_codigo`,`m_venta`.`simbolo` AS `moneda_simbolo`,json_arrayagg(json_object('detalle_id',`dv`.`id`,'producto_id',`p`.`id`,'codigo',`p`.`codigo`,'descripcion',`p`.`descripcion`,'serie',`p`.`serie`,'categoria',`p`.`categoria`,'estado',`p`.`estado`,'stock',ifnull(`ps`.`stock`,0),'precio_unitario',`dv`.`precio_unitario`,'tipo_precio_aplicado',`dv`.`tipo_precio_aplicado`,'cantidad',`dv`.`cantidad`,'subtotal',`dv`.`subtotal`)) AS `productos`,coalesce(`pag`.`pagos_json`,json_array()) AS `pagos` from (((((((`ventas` `v` join `clientes` `c` on((`v`.`cliente_id` = `c`.`id`))) join `usuarios` `u` on((`v`.`usuario_id` = `u`.`id`))) join `detalles_ventas` `dv` on((`dv`.`venta_id` = `v`.`id`))) join `productos` `p` on((`p`.`id` = `dv`.`producto_id`))) left join `productos_stock` `ps` on(((`ps`.`producto_id` = `p`.`id`) and (`ps`.`empresa_id` = `v`.`empresa_id`)))) left join `monedas` `m_venta` on((`m_venta`.`id` = `v`.`moneda_id`))) left join (select `vp`.`venta_id` AS `venta_id`,json_arrayagg(json_object('metodo',`mp`.`nombre`,'monto',`vp`.`monto`,'moneda_pago',`m_pago`.`codigo`,'monto_convertido',`vp`.`monto_en_moneda_venta`,'referencia',`vp`.`referencia`,'fecha',`vp`.`fecha`)) AS `pagos_json` from ((`ventas_pagos` `vp` join `metodos_pago` `mp` on((`mp`.`id` = `vp`.`metodo_pago_id`))) join `monedas` `m_pago` on((`m_pago`.`id` = `vp`.`moneda_id`))) group by `vp`.`venta_id`) `pag` on((`pag`.`venta_id` = `v`.`id`))) group by `v`.`id`,`v`.`fecha`,`c`.`id`,`c`.`nombre`,`c`.`nit`,`c`.`email`,`c`.`direccion`,`c`.`telefono`,`u`.`id`,`u`.`nombre`,`v`.`empresa_id`,`v`.`estado`,`v`.`comentario`,`v`.`total`,`m_venta`.`codigo`,`m_venta`.`simbolo`;


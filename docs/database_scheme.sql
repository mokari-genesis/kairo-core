create table empresas
(
    id             int auto_increment
        primary key,
    nombre         varchar(255)                        not null,
    nit            varchar(20)                         not null,
    direccion      text                                null,
    telefono       varchar(20)                         null,
    email          varchar(255)                        null,
    fecha_creacion timestamp default CURRENT_TIMESTAMP null,
    constraint email
        unique (email),
    constraint nit
        unique (nit),
    constraint nombre
        unique (nombre)
)
    engine = InnoDB
    collate = utf8mb4_unicode_ci;

create table clientes
(
    id             int auto_increment
        primary key,
    empresa_id     int                                 null,
    nombre         varchar(255)                        not null,
    tipo           enum ('persona', 'empresa')         not null,
    nit            varchar(20)                         not null,
    email          varchar(255)                        null,
    telefono       varchar(20)                         null,
    direccion      text                                null,
    fecha_registro timestamp default CURRENT_TIMESTAMP null,
    constraint nit
        unique (nit),
    constraint fk_clientes_empresa
        foreign key (empresa_id) references empresas (id)
            on delete cascade
)
    engine = InnoDB
    collate = utf8mb4_unicode_ci;

create index idx_clientes_empresa_id
    on clientes (empresa_id);

create table metodos_pago
(
    id     int auto_increment
        primary key,
    nombre varchar(100)         not null,
    activo tinyint(1) default 1 null,
    constraint uq_metodos_pago_nombre
        unique (nombre)
)
    engine = InnoDB
    collate = utf8mb4_unicode_ci;

create table monedas
(
    id               int auto_increment
        primary key,
    codigo           char(3)                                  not null,
    nombre           varchar(100)                             not null,
    simbolo          varchar(8)                               null,
    decimales        tinyint        default 2                 not null,
    activo           tinyint(1)     default 1                 null,
    es_base          tinyint(1)     default 0                 not null,
    tasa_vs_base     decimal(18, 6) default 1.000000          not null,
    tasa_actualizada timestamp      default CURRENT_TIMESTAMP null on update CURRENT_TIMESTAMP,
    constraint uq_monedas_codigo
        unique (codigo),
    constraint uq_monedas_nombre
        unique (nombre)
)
    engine = InnoDB
    collate = utf8mb4_unicode_ci;

create table proveedores
(
    id             int auto_increment
        primary key,
    empresa_id     int                                 null,
    nombre         varchar(255)                        not null,
    nit            varchar(20)                         not null,
    email          varchar(255)                        null,
    telefono       varchar(20)                         null,
    direccion      text                                null,
    tipo           enum ('nacional', 'internacional')  not null,
    fecha_registro timestamp default CURRENT_TIMESTAMP null,
    constraint nit
        unique (nit),
    constraint fk_proveedores_empresa
        foreign key (empresa_id) references empresas (id)
            on delete cascade
)
    engine = InnoDB
    collate = utf8mb4_unicode_ci;

create table productos
(
    id             int auto_increment
        primary key,
    empresa_id     int                                      null,
    proveedor_id   int                                      not null,
    codigo         varchar(100)                             not null,
    serie          varchar(100)                             null,
    descripcion    text                                     null,
    categoria      varchar(100)                             null,
    estado         enum ('activo', 'inactivo')              not null,
    stock          int                                      not null,
    fecha_creacion timestamp      default CURRENT_TIMESTAMP null,
    precio         decimal(10, 2) default 0.00              not null,
    constraint codigo
        unique (codigo),
    constraint serie
        unique (serie),
    constraint fk_productos_empresa
        foreign key (empresa_id) references empresas (id)
            on delete cascade,
    constraint fk_productos_proveedor
        foreign key (proveedor_id) references proveedores (id)
            on update cascade,
    check (`stock` >= 0)
)
    engine = InnoDB
    collate = utf8mb4_unicode_ci;

create index idx_productos_empresa_id
    on productos (empresa_id);

create index idx_productos_proveedor_id
    on productos (proveedor_id);

create table productos_precios
(
    id          int auto_increment
        primary key,
    producto_id int                                                                       not null,
    tipo        enum ('mayorista', 'minorista', 'distribuidores', 'especial', 'sugerido') not null,
    precio      decimal(10, 2)                                                            not null,
    constraint uq_pp_producto_tipo
        unique (producto_id, tipo),
    constraint fk_pp_producto
        foreign key (producto_id) references productos (id)
            on delete cascade,
    check (`precio` >= 0)
)
    engine = InnoDB
    collate = utf8mb4_unicode_ci;

create index idx_pp_producto
    on productos_precios (producto_id);

create index idx_proveedores_empresa_id
    on proveedores (empresa_id);

create table usuarios
(
    id             int auto_increment
        primary key,
    empresa_id     int                                       null,
    cognito_id     varchar(255)                              not null,
    nombre         varchar(255)                              not null,
    email          varchar(255)                              not null,
    rol            enum ('admin', 'vendedor', 'almacenista') not null,
    activo         tinyint(1) default 1                      null,
    fecha_creacion timestamp  default CURRENT_TIMESTAMP      null,
    constraint cognito_id
        unique (cognito_id),
    constraint email
        unique (email),
    constraint fk_usuarios_empresa
        foreign key (empresa_id) references empresas (id)
            on delete cascade
)
    engine = InnoDB
    collate = utf8mb4_unicode_ci;

create index idx_usuarios_empresa_id
    on usuarios (empresa_id);

create table ventas
(
    id          int auto_increment
        primary key,
    empresa_id  int                                                      null,
    cliente_id  int                                                      null,
    usuario_id  int                                                      null,
    fecha       timestamp                      default CURRENT_TIMESTAMP null,
    total       decimal(10, 2)                                           not null,
    estado      enum ('vendido', 'cancelado')                            not null,
    estado_pago enum ('pendiente', 'completa') default 'pendiente'       not null,
    moneda_id   int                                                      null,
    comentario  varchar(250)                                             null,
    constraint fk_ventas_cliente
        foreign key (cliente_id) references clientes (id)
            on delete set null,
    constraint fk_ventas_empresa
        foreign key (empresa_id) references empresas (id)
            on delete cascade,
    constraint fk_ventas_moneda
        foreign key (moneda_id) references monedas (id),
    constraint fk_ventas_usuario
        foreign key (usuario_id) references usuarios (id)
            on delete set null,
    check (`total` >= 0)
)
    engine = InnoDB
    collate = utf8mb4_unicode_ci;

create table detalles_ventas
(
    id                   int auto_increment
        primary key,
    venta_id             int                                                                       not null,
    producto_id          int                                                                       not null,
    cantidad             int                                                                       not null,
    precio_unitario      decimal(10, 2)                                                            not null,
    tipo_precio_aplicado enum ('sugerido', 'mayorista', 'minorista', 'distribuidores', 'especial') null,
    subtotal             decimal(10, 2)                                                            not null,
    constraint fk_detalles_producto
        foreign key (producto_id) references productos (id)
            on delete cascade,
    constraint fk_detalles_venta
        foreign key (venta_id) references ventas (id)
            on delete cascade,
    check (`cantidad` > 0),
    check (`precio_unitario` >= 0),
    check (`subtotal` >= 0)
)
    engine = InnoDB
    collate = utf8mb4_unicode_ci;

create index idx_dv_producto_id
    on detalles_ventas (producto_id);

create index idx_dv_producto_venta
    on detalles_ventas (producto_id, venta_id);

create index idx_dv_venta_id
    on detalles_ventas (venta_id);

create table movimientos_inventario
(
    id               int auto_increment
        primary key,
    empresa_id       int                                                         null,
    producto_id      int                                                         not null,
    usuario_id       int                                                         null,
    tipo_movimiento  enum ('entrada', 'salida', 'ajuste', 'venta', 'devolucion') not null,
    cantidad         int                                                         not null,
    fecha            timestamp default CURRENT_TIMESTAMP                         null,
    comentario       text                                                        null,
    stock_actual     int                                                         null,
    referencia       int                                                         null,
    stock_movimiento int                                                         null,
    constraint fk_movs_empresa
        foreign key (empresa_id) references empresas (id)
            on delete cascade,
    constraint fk_movs_producto
        foreign key (producto_id) references productos (id)
            on delete cascade,
    constraint fk_movs_usuario
        foreign key (usuario_id) references usuarios (id)
            on delete set null,
    constraint fk_movs_venta
        foreign key (referencia) references ventas (id)
            on delete set null,
    check (`cantidad` > 0)
)
    engine = InnoDB
    collate = utf8mb4_unicode_ci;

create index idx_movs_empresa_id
    on movimientos_inventario (empresa_id);

create index idx_movs_producto_id
    on movimientos_inventario (producto_id);

create index idx_movs_producto_id_id
    on movimientos_inventario (producto_id, id);

create index idx_movs_referencia
    on movimientos_inventario (referencia);

create index idx_movs_tipo_fecha
    on movimientos_inventario (tipo_movimiento, fecha);

create index idx_movs_usuario_id
    on movimientos_inventario (usuario_id);

create index idx_ventas_cliente_id
    on ventas (cliente_id);

create index idx_ventas_empresa_id
    on ventas (empresa_id);

create index idx_ventas_estado_fecha
    on ventas (estado, fecha);

create index idx_ventas_estado_pago
    on ventas (estado_pago);

create index idx_ventas_moneda_id
    on ventas (moneda_id);

create index idx_ventas_usuario_id
    on ventas (usuario_id);

create table ventas_pagos
(
    id                    int auto_increment
        primary key,
    venta_id              int                                 not null,
    metodo_pago_id        int                                 not null,
    moneda_id             int                                 not null,
    monto                 decimal(10, 2)                      not null,
    monto_en_moneda_venta decimal(12, 2)                      not null,
    tasa_cambio           decimal(18, 6)                      null,
    referencia            varchar(255)                        null,
    fecha                 timestamp default CURRENT_TIMESTAMP null,
    constraint fk_vp_metodo
        foreign key (metodo_pago_id) references metodos_pago (id),
    constraint fk_vp_moneda
        foreign key (moneda_id) references monedas (id),
    constraint fk_vp_venta
        foreign key (venta_id) references ventas (id)
            on delete cascade,
    check (`monto` > 0)
)
    engine = InnoDB
    collate = utf8mb4_unicode_ci;

create index idx_vp_fecha
    on ventas_pagos (fecha);

create index idx_vp_metodo_pago_id
    on ventas_pagos (metodo_pago_id);

create index idx_vp_venta_id
    on ventas_pagos (venta_id);

create definer = administrattorLite@`%` view reporte_inventario_con_metodo as
select `mv`.`id`               AS `movimiento_id`,
       `mv`.`fecha`            AS `fecha_movimiento`,
       `mv`.`empresa_id`       AS `empresa_id`,
       `e`.`nombre`            AS `empresa`,
       `mv`.`producto_id`      AS `producto_id`,
       `p`.`codigo`            AS `producto_codigo`,
       `p`.`descripcion`       AS `producto_descripcion`,
       `mv`.`tipo_movimiento`  AS `tipo_movimiento`,
       `mv`.`cantidad`         AS `cantidad`,
       `mv`.`stock_movimiento` AS `stock_movimiento`,
       `mv`.`stock_actual`     AS `stock_actual`,
       `v`.`id`                AS `venta_id`,
       `v`.`fecha`             AS `fecha_venta`,
       `v`.`estado`            AS `estado_venta`,
       `v`.`total`             AS `total_venta`,
       `agg`.`metodos_pago`    AS `metodos_pago`,
       `m_venta`.`codigo`      AS `moneda_codigo`,
       `m_venta`.`simbolo`     AS `moneda_simbolo`,
       `agg`.`total_pagado`    AS `total_pagado`,
       `agg`.`pagos_json`      AS `pagos_json`
from (((((`kairo_db_lite`.`movimientos_inventario` `mv` left join `kairo_db_lite`.`ventas` `v`
          on ((`v`.`id` = `mv`.`referencia`))) left join `kairo_db_lite`.`empresas` `e`
         on ((`e`.`id` = `mv`.`empresa_id`))) left join `kairo_db_lite`.`productos` `p`
        on ((`p`.`id` = `mv`.`producto_id`))) left join `kairo_db_lite`.`monedas` `m_venta`
       on ((`m_venta`.`id` = `v`.`moneda_id`))) left join (select `vp`.`venta_id`                                AS `venta_id`,
                                                                  group_concat(distinct `mp`.`nombre` order by
                                                                               `mp`.`nombre` ASC separator
                                                                               ', ')                             AS `metodos_pago`,
                                                                  sum(`vp`.`monto_en_moneda_venta`)              AS `total_pagado`,
                                                                  json_arrayagg(json_object('metodo', `mp`.`nombre`,
                                                                                            'monto', `vp`.`monto`,
                                                                                            'moneda_pago',
                                                                                            `m_pago`.`codigo`,
                                                                                            'monto_convertido',
                                                                                            `vp`.`monto_en_moneda_venta`,
                                                                                            'referencia',
                                                                                            `vp`.`referencia`, 'fecha',
                                                                                            `vp`.`fecha`))       AS `pagos_json`
                                                           from ((`kairo_db_lite`.`ventas_pagos` `vp` join `kairo_db_lite`.`metodos_pago` `mp`
                                                                  on ((`mp`.`id` = `vp`.`metodo_pago_id`))) join `kairo_db_lite`.`monedas` `m_pago`
                                                                 on ((`m_pago`.`id` = `vp`.`moneda_id`)))
                                                           group by `vp`.`venta_id`) `agg`
      on ((`agg`.`venta_id` = `v`.`id`)))
where (`mv`.`tipo_movimiento` in ('venta', 'devolucion'));

create definer = administrattorLite@`%` view reporte_movimientos_inventario as
select `m`.`id`               AS `id`,
       `e`.`id`               AS `empresa_id`,
       `e`.`nombre`           AS `empresa`,
       `p`.`descripcion`      AS `producto`,
       `p`.`id`               AS `producto_id`,
       `p`.`codigo`           AS `codigo_producto`,
       `u`.`nombre`           AS `usuario`,
       `u`.`id`               AS `usuario_id`,
       `m`.`stock_actual`     AS `stock_actual`,
       `m`.`tipo_movimiento`  AS `tipo_movimiento`,
       `m`.`cantidad`         AS `cantidad`,
       `m`.`fecha`            AS `fecha`,
       `m`.`comentario`       AS `comentario`,
       `m`.`stock_movimiento` AS `stock_movimiento`,
       `m`.`referencia`       AS `venta_id`
from (((`kairo_db_lite`.`movimientos_inventario` `m` left join `kairo_db_lite`.`empresas` `e`
        on ((`m`.`empresa_id` = `e`.`id`))) left join `kairo_db_lite`.`productos` `p`
       on ((`m`.`producto_id` = `p`.`id`))) left join `kairo_db_lite`.`usuarios` `u`
      on ((`m`.`usuario_id` = `u`.`id`)));

create definer = administrattorLite@`%` view reporte_stock_actual as
select `p`.`empresa_id`                                                                                           AS `empresa_id`,
       `e`.`nombre`                                                                                               AS `empresa`,
       `p`.`id`                                                                                                   AS `producto_id`,
       `p`.`codigo`                                                                                               AS `codigo`,
       `p`.`serie`                                                                                                AS `serie`,
       `p`.`descripcion`                                                                                          AS `descripcion`,
       `p`.`categoria`                                                                                            AS `categoria`,
       `p`.`estado`                                                                                               AS `estado_producto`,
       `p`.`fecha_creacion`                                                                                       AS `fecha_creacion_producto`,
       `pr`.`id`                                                                                                  AS `proveedor_id`,
       `pr`.`nombre`                                                                                              AS `proveedor_nombre`,
       `pr`.`tipo`                                                                                                AS `proveedor_tipo`,
       `p`.`stock`                                                                                                AS `stock`,
       (`p`.`stock` = 0)                                                                                          AS `agotado`,
       `p`.`precio`                                                                                               AS `precio_sugerido`,
       `pp`.`precio_minorista`                                                                                    AS `precio_minorista`,
       `pp`.`precio_mayorista`                                                                                    AS `precio_mayorista`,
       `pp`.`precio_distribuidores`                                                                               AS `precio_distribuidores`,
       `pp`.`precio_especial`                                                                                     AS `precio_especial`,
       (`p`.`stock` * `p`.`precio`)                                                                               AS `valor_stock_sugerido`,
       (`p`.`stock` * ifnull(`pp`.`precio_minorista`, 0))                                                         AS `valor_stock_minorista`,
       (`p`.`stock` * ifnull(`pp`.`precio_mayorista`, 0))                                                         AS `valor_stock_mayorista`,
       (`p`.`stock` * ifnull(`pp`.`precio_distribuidores`, 0))                                                    AS `valor_stock_distribuidores`,
       (`p`.`stock` * ifnull(`pp`.`precio_especial`, 0))                                                          AS `valor_stock_especial`,
       `lm`.`movimiento_id`                                                                                       AS `ultimo_movimiento_id`,
       `lm`.`fecha_movimiento`                                                                                    AS `ultima_fecha_movimiento`,
       `lm`.`tipo_movimiento`                                                                                     AS `ultimo_tipo_movimiento`,
       `lm`.`cantidad_movimiento`                                                                                 AS `ultima_cantidad_movimiento`,
       `lm`.`stock_actual`                                                                                        AS `stock_despues_ultimo_mov`,
       `lm`.`usuario_id`                                                                                          AS `ultimo_mov_usuario_id`,
       `lm`.`usuario`                                                                                             AS `ultimo_mov_usuario_nombre`,
       `lm`.`comentario`                                                                                          AS `ultimo_mov_comentario`,
       (case
            when (`lm`.`fecha_movimiento` is not null) then (to_days(curdate()) - to_days(`lm`.`fecha_movimiento`))
            else NULL end)                                                                                        AS `dias_desde_ultimo_movimiento`,
       `lv`.`ultima_venta_id`                                                                                     AS `ultima_venta_id`,
       `v_lv`.`fecha`                                                                                             AS `ultima_venta_fecha`,
       `v_lv`.`cliente_id`                                                                                        AS `ultima_venta_cliente_id`,
       `c_lv`.`nombre`                                                                                            AS `ultima_venta_cliente_nombre`,
       (case
            when (`v_lv`.`fecha` is not null) then (to_days(curdate()) - to_days(`v_lv`.`fecha`))
            else NULL end)                                                                                        AS `dias_desde_ultima_venta`
from (((((((`kairo_db_lite`.`productos` `p` left join `kairo_db_lite`.`empresas` `e`
            on ((`e`.`id` = `p`.`empresa_id`))) left join `kairo_db_lite`.`proveedores` `pr`
           on ((`pr`.`id` = `p`.`proveedor_id`))) left join (select `kairo_db_lite`.`productos_precios`.`producto_id`                    AS `producto_id`,
                                                                    max((case
                                                                             when (`kairo_db_lite`.`productos_precios`.`tipo` = 'minorista')
                                                                                 then `kairo_db_lite`.`productos_precios`.`precio` end)) AS `precio_minorista`,
                                                                    max((case
                                                                             when (`kairo_db_lite`.`productos_precios`.`tipo` = 'mayorista')
                                                                                 then `kairo_db_lite`.`productos_precios`.`precio` end)) AS `precio_mayorista`,
                                                                    max((case
                                                                             when (`kairo_db_lite`.`productos_precios`.`tipo` = 'distribuidores')
                                                                                 then `kairo_db_lite`.`productos_precios`.`precio` end)) AS `precio_distribuidores`,
                                                                    max((case
                                                                             when (`kairo_db_lite`.`productos_precios`.`tipo` = 'especial')
                                                                                 then `kairo_db_lite`.`productos_precios`.`precio` end)) AS `precio_especial`
                                                             from `kairo_db_lite`.`productos_precios`
                                                             group by `kairo_db_lite`.`productos_precios`.`producto_id`) `pp`
          on ((`pp`.`producto_id` = `p`.`id`))) left join (select `t`.`producto_id`      AS `producto_id`,
                                                                  `mv`.`id`              AS `movimiento_id`,
                                                                  `mv`.`fecha`           AS `fecha_movimiento`,
                                                                  `mv`.`tipo_movimiento` AS `tipo_movimiento`,
                                                                  `mv`.`cantidad`        AS `cantidad_movimiento`,
                                                                  `mv`.`stock_actual`    AS `stock_actual`,
                                                                  `mv`.`usuario_id`      AS `usuario_id`,
                                                                  `u`.`nombre`           AS `usuario`,
                                                                  `mv`.`comentario`      AS `comentario`
                                                           from (((select `kairo_db_lite`.`movimientos_inventario`.`producto_id` AS `producto_id`,
                                                                          max(`kairo_db_lite`.`movimientos_inventario`.`id`)     AS `max_id`
                                                                   from `kairo_db_lite`.`movimientos_inventario`
                                                                   group by `kairo_db_lite`.`movimientos_inventario`.`producto_id`) `t` join `kairo_db_lite`.`movimientos_inventario` `mv`
                                                                  on (((`mv`.`producto_id` = `t`.`producto_id`) and
                                                                       (`mv`.`id` = `t`.`max_id`)))) left join `kairo_db_lite`.`usuarios` `u`
                                                                 on ((`u`.`id` = `mv`.`usuario_id`)))) `lm`
         on ((`lm`.`producto_id` = `p`.`id`))) left join (select `dv`.`producto_id` AS `producto_id`,
                                                                 max(`v`.`id`)      AS `ultima_venta_id`
                                                          from (`kairo_db_lite`.`ventas` `v` join `kairo_db_lite`.`detalles_ventas` `dv`
                                                                on ((`dv`.`venta_id` = `v`.`id`)))
                                                          where (`v`.`estado` = 'vendido')
                                                          group by `dv`.`producto_id`) `lv`
        on ((`lv`.`producto_id` = `p`.`id`))) left join `kairo_db_lite`.`ventas` `v_lv`
       on ((`v_lv`.`id` = `lv`.`ultima_venta_id`))) left join `kairo_db_lite`.`clientes` `c_lv`
      on ((`c_lv`.`id` = `v_lv`.`cliente_id`)));

create definer = administrattorLite@`%` view vista_metodos_pago_unificado as
select `v`.`empresa_id`                                                                                AS `empresa_id`,
       `e`.`nombre`                                                                                    AS `empresa_nombre`,
       `v`.`id`                                                                                        AS `venta_id`,
       `v`.`fecha`                                                                                     AS `fecha_venta`,
       cast(`v`.`fecha` as date)                                                                       AS `fecha_venta_dia`,
       `v`.`estado`                                                                                    AS `estado_venta`,
       `v`.`estado_pago`                                                                               AS `estado_pago`,
       `v`.`total`                                                                                     AS `total_venta`,
       `v`.`moneda_id`                                                                                 AS `moneda_venta_id`,
       `m_venta`.`codigo`                                                                              AS `moneda_venta_codigo`,
       `m_venta`.`nombre`                                                                              AS `moneda_venta_nombre`,
       `m_venta`.`simbolo`                                                                             AS `moneda_venta_simbolo`,
       `v`.`comentario`                                                                                AS `comentario_venta`,
       `c`.`id`                                                                                        AS `cliente_id`,
       `c`.`nombre`                                                                                    AS `cliente_nombre`,
       `c`.`email`                                                                                     AS `cliente_email`,
       `c`.`telefono`                                                                                  AS `cliente_telefono`,
       `u`.`id`                                                                                        AS `usuario_id`,
       `u`.`nombre`                                                                                    AS `usuario_nombre`,
       `vp`.`id`                                                                                       AS `pago_id`,
       `mp`.`id`                                                                                       AS `metodo_pago_id`,
       `mp`.`nombre`                                                                                   AS `metodo_pago`,
       `vp`.`monto`                                                                                    AS `monto_pago`,
       `vp`.`monto_en_moneda_venta`                                                                    AS `monto_pago_convertido`,
       `vp`.`tasa_cambio`                                                                              AS `tasa_cambio_aplicada`,
       `vp`.`moneda_id`                                                                                AS `moneda_pago_id`,
       `m_pago`.`codigo`                                                                               AS `moneda_pago_codigo`,
       `m_pago`.`nombre`                                                                               AS `moneda_pago_nombre`,
       `m_pago`.`simbolo`                                                                              AS `moneda_pago_simbolo`,
       `vp`.`referencia`                                                                               AS `referencia_pago`,
       `vp`.`fecha`                                                                                    AS `fecha_pago`,
       cast(`vp`.`fecha` as date)                                                                      AS `fecha_pago_dia`,
       sum(`vp`.`monto_en_moneda_venta`) OVER (PARTITION BY `v`.`id` )                                 AS `total_pagado_venta`,
       count(`vp`.`id`) OVER (PARTITION BY `v`.`id` )                                                  AS `cantidad_pagos_venta`,
       sum(`vp`.`monto_en_moneda_venta`)
           OVER (PARTITION BY `v`.`id`,`mp`.`id` )                                                     AS `total_por_metodo_en_venta`,
       greatest((`v`.`total` - sum(`vp`.`monto_en_moneda_venta`) OVER (PARTITION BY `v`.`id` )),
                0.00)                                                                                  AS `saldo_pendiente_venta`,
       (`v`.`estado` = 'vendido')                                                                      AS `venta_es_vendida_bool`
from (((((((`kairo_db_lite`.`ventas` `v` join `kairo_db_lite`.`empresas` `e`
            on ((`e`.`id` = `v`.`empresa_id`))) left join `kairo_db_lite`.`clientes` `c`
           on ((`c`.`id` = `v`.`cliente_id`))) left join `kairo_db_lite`.`usuarios` `u`
          on ((`u`.`id` = `v`.`usuario_id`))) left join `kairo_db_lite`.`monedas` `m_venta`
         on ((`m_venta`.`id` = `v`.`moneda_id`))) join `kairo_db_lite`.`ventas_pagos` `vp`
        on ((`vp`.`venta_id` = `v`.`id`))) join `kairo_db_lite`.`metodos_pago` `mp`
       on ((`mp`.`id` = `vp`.`metodo_pago_id`))) join `kairo_db_lite`.`monedas` `m_pago`
      on ((`m_pago`.`id` = `vp`.`moneda_id`)));

create definer = administrattorLite@`%` view vista_movimientos_por_venta as
select `v`.`id`               AS `venta_id`,
       `v`.`fecha`            AS `fecha_venta`,
       `v`.`cliente_id`       AS `cliente_id`,
       `v`.`usuario_id`       AS `vendedor_id`,
       `v`.`empresa_id`       AS `empresa_id`,
       `v`.`total`            AS `total`,
       `v`.`estado`           AS `estado`,
       `mv`.`id`              AS `movimiento_id`,
       `mv`.`producto_id`     AS `producto_id`,
       `mv`.`cantidad`        AS `cantidad`,
       `mv`.`tipo_movimiento` AS `tipo_movimiento`,
       `mv`.`stock_actual`    AS `stock_actual`,
       `mv`.`fecha`           AS `fecha_movimiento`,
       `mv`.`comentario`      AS `comentario`
from (`kairo_db_lite`.`ventas` `v` join `kairo_db_lite`.`movimientos_inventario` `mv`
      on ((`mv`.`referencia` = `v`.`id`)))
where (`mv`.`tipo_movimiento` = 'venta');

create definer = administrattorLite@`%` view vista_pagos_por_venta as
select `v`.`id`                     AS `venta_id`,
       `v`.`fecha`                  AS `fecha_venta`,
       `v`.`estado`                 AS `estado_venta`,
       `v`.`total`                  AS `total_venta`,
       `c`.`id`                     AS `cliente_id`,
       `c`.`nombre`                 AS `cliente_nombre`,
       `vp`.`id`                    AS `pago_id`,
       `mp`.`nombre`                AS `metodo_pago`,
       `m_pago`.`codigo`            AS `moneda_pago_codigo`,
       `m_pago`.`simbolo`           AS `moneda_pago_simbolo`,
       `vp`.`monto`                 AS `monto`,
       `vp`.`monto_en_moneda_venta` AS `monto_convertido`,
       `m_venta`.`codigo`           AS `moneda_venta_codigo`,
       `m_venta`.`simbolo`          AS `moneda_venta_simbolo`,
       `vp`.`referencia`            AS `referencia`,
       `vp`.`fecha`                 AS `fecha_pago`
from (((((`kairo_db_lite`.`ventas` `v` join `kairo_db_lite`.`clientes` `c`
          on ((`c`.`id` = `v`.`cliente_id`))) join `kairo_db_lite`.`ventas_pagos` `vp`
         on ((`vp`.`venta_id` = `v`.`id`))) join `kairo_db_lite`.`metodos_pago` `mp`
        on ((`mp`.`id` = `vp`.`metodo_pago_id`))) join `kairo_db_lite`.`monedas` `m_pago`
       on ((`m_pago`.`id` = `vp`.`moneda_id`))) join `kairo_db_lite`.`monedas` `m_venta`
      on ((`m_venta`.`id` = `v`.`moneda_id`)));

create definer = administrattorLite@`%` view vista_ventas_completas as
select `dv`.`id`                   AS `id`,
       `v`.`id`                    AS `id_venta`,
       `v`.`fecha`                 AS `fecha_venta`,
       `dv`.`subtotal`             AS `total_venta`,
       `v`.`estado`                AS `estado_venta`,
       `v`.`empresa_id`            AS `empresa_id`,
       `e`.`nombre`                AS `empresa_nombre`,
       `e`.`nit`                   AS `empresa_nit`,
       `e`.`email`                 AS `empresa_email`,
       `c`.`id`                    AS `cliente_id`,
       `c`.`nombre`                AS `cliente_nombre`,
       `c`.`nit`                   AS `cliente_nit`,
       `c`.`email`                 AS `cliente_email`,
       `c`.`telefono`              AS `cliente_telefono`,
       `c`.`direccion`             AS `cliente_direccion`,
       `c`.`tipo`                  AS `cliente_tipo`,
       `u`.`id`                    AS `usuario_id`,
       `u`.`nombre`                AS `usuario_nombre`,
       `u`.`email`                 AS `usuario_email`,
       `dv`.`id`                   AS `detalle_id`,
       `dv`.`producto_id`          AS `producto_id`,
       `dv`.`cantidad`             AS `cantidad`,
       `dv`.`precio_unitario`      AS `precio_unitario`,
       `dv`.`tipo_precio_aplicado` AS `tipo_precio_aplicado`,
       `p`.`codigo`                AS `producto_codigo`,
       `p`.`serie`                 AS `producto_serie`,
       `p`.`descripcion`           AS `producto_descripcion`,
       `p`.`categoria`             AS `producto_categoria`,
       `p`.`estado`                AS `producto_estado`,
       `p`.`precio`                AS `producto_precio`,
       `m_venta`.`codigo`          AS `moneda_codigo`,
       `m_venta`.`simbolo`         AS `moneda_simbolo`,
       `v`.`total`                 AS `total_venta_suma_lineas`,
       `v`.`comentario`            AS `comentario`,
       `agg`.`metodos_pago`        AS `metodos_pago`,
       `agg`.`total_pagado`        AS `total_pagado`,
       `agg`.`pagos_json`          AS `pagos_json`
from (((((((`kairo_db_lite`.`ventas` `v` join `kairo_db_lite`.`empresas` `e`
            on ((`v`.`empresa_id` = `e`.`id`))) join `kairo_db_lite`.`clientes` `c`
           on ((`v`.`cliente_id` = `c`.`id`))) join `kairo_db_lite`.`usuarios` `u`
          on ((`v`.`usuario_id` = `u`.`id`))) join `kairo_db_lite`.`detalles_ventas` `dv`
         on ((`dv`.`venta_id` = `v`.`id`))) join `kairo_db_lite`.`productos` `p`
        on ((`p`.`id` = `dv`.`producto_id`))) left join `kairo_db_lite`.`monedas` `m_venta`
       on ((`m_venta`.`id` = `v`.`moneda_id`))) left join (select `vp`.`venta_id`                                          AS `venta_id`,
                                                                  group_concat(distinct `mp`.`nombre` order by
                                                                               `mp`.`nombre` ASC separator
                                                                               ', ')                                       AS `metodos_pago`,
                                                                  sum(`vp`.`monto_en_moneda_venta`)                        AS `total_pagado`,
                                                                  json_arrayagg(json_object('metodo', `mp`.`nombre`,
                                                                                            'monto', `vp`.`monto`,
                                                                                            'moneda_pago',
                                                                                            `m_pago`.`codigo`,
                                                                                            'monto_convertido',
                                                                                            `vp`.`monto_en_moneda_venta`)) AS `pagos_json`
                                                           from ((`kairo_db_lite`.`ventas_pagos` `vp` join `kairo_db_lite`.`metodos_pago` `mp`
                                                                  on ((`mp`.`id` = `vp`.`metodo_pago_id`))) join `kairo_db_lite`.`monedas` `m_pago`
                                                                 on ((`m_pago`.`id` = `vp`.`moneda_id`)))
                                                           group by `vp`.`venta_id`) `agg`
      on ((`agg`.`venta_id` = `v`.`id`)));

create definer = administrattorLite@`%` view vista_ventas_detalle_anidado as
select `v`.`id`                                                                             AS `id`,
       `v`.`fecha`                                                                          AS `fecha_venta`,
       `c`.`id`                                                                             AS `cliente_id`,
       `c`.`nombre`                                                                         AS `cliente_nombre`,
       `c`.`nit`                                                                            AS `cliente_nit`,
       `c`.`email`                                                                          AS `cliente_email`,
       `c`.`direccion`                                                                      AS `cliente_direccion`,
       `c`.`telefono`                                                                       AS `cliente_telefono`,
       `u`.`id`                                                                             AS `usuario_id`,
       `u`.`nombre`                                                                         AS `usuario_nombre`,
       `v`.`empresa_id`                                                                     AS `empresa_id`,
       `v`.`estado`                                                                         AS `estado_venta`,
       `v`.`comentario`                                                                     AS `comentario`,
       `v`.`total`                                                                          AS `total_venta`,
       `m_venta`.`codigo`                                                                   AS `moneda_codigo`,
       `m_venta`.`simbolo`                                                                  AS `moneda_simbolo`,
       json_arrayagg(json_object('detalle_id', `dv`.`id`, 'producto_id', `p`.`id`, 'codigo', `p`.`codigo`,
                                 'descripcion', `p`.`descripcion`, 'serie', `p`.`serie`, 'categoria', `p`.`categoria`,
                                 'estado', `p`.`estado`, 'stock', `p`.`stock`, 'precio_unitario',
                                 `dv`.`precio_unitario`, 'tipo_precio_aplicado', `dv`.`tipo_precio_aplicado`,
                                 'cantidad', `dv`.`cantidad`, 'subtotal', `dv`.`subtotal`)) AS `productos`,
       coalesce(`pag`.`pagos_json`, json_array())                                           AS `pagos`
from ((((((`kairo_db_lite`.`ventas` `v` join `kairo_db_lite`.`clientes` `c`
           on ((`v`.`cliente_id` = `c`.`id`))) join `kairo_db_lite`.`usuarios` `u`
          on ((`v`.`usuario_id` = `u`.`id`))) join `kairo_db_lite`.`detalles_ventas` `dv`
         on ((`dv`.`venta_id` = `v`.`id`))) join `kairo_db_lite`.`productos` `p`
        on ((`p`.`id` = `dv`.`producto_id`))) left join `kairo_db_lite`.`monedas` `m_venta`
       on ((`m_venta`.`id` = `v`.`moneda_id`))) left join (select `vp`.`venta_id`                          AS `venta_id`,
                                                                  json_arrayagg(json_object('metodo', `mp`.`nombre`,
                                                                                            'monto', `vp`.`monto`,
                                                                                            'moneda_pago',
                                                                                            `m_pago`.`codigo`,
                                                                                            'monto_convertido',
                                                                                            `vp`.`monto_en_moneda_venta`,
                                                                                            'referencia',
                                                                                            `vp`.`referencia`, 'fecha',
                                                                                            `vp`.`fecha`)) AS `pagos_json`
                                                           from ((`kairo_db_lite`.`ventas_pagos` `vp` join `kairo_db_lite`.`metodos_pago` `mp`
                                                                  on ((`mp`.`id` = `vp`.`metodo_pago_id`))) join `kairo_db_lite`.`monedas` `m_pago`
                                                                 on ((`m_pago`.`id` = `vp`.`moneda_id`)))
                                                           group by `vp`.`venta_id`) `pag`
      on ((`pag`.`venta_id` = `v`.`id`)))
group by `v`.`id`, `v`.`fecha`, `c`.`id`, `c`.`nombre`, `c`.`nit`, `c`.`email`, `c`.`direccion`, `c`.`telefono`,
         `u`.`id`, `u`.`nombre`, `v`.`empresa_id`, `v`.`estado`, `v`.`total`, `m_venta`.`codigo`, `m_venta`.`simbolo`;


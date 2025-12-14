# Kairo Core

Proyecto basado en la estructura de Skeletor, migrado desde kairo-api-lite.

## Estructura del Proyecto

```
kairo-core/
├── entityQueries/      # Queries de entidades (actualmente vacío, listo para expansión)
├── layers/             # Capa de dependencias compartidas
│   ├── node/          # Node modules compartidos
│   └── serverless.yml  # Configuración de la capa Lambda
├── libs/               # Librerías compartidas
│   ├── db.js          # Funciones de base de datos (MySQL)
│   ├── fn.js          # Funciones auxiliares (routing, parsing, etc.)
│   ├── jwt.js         # Utilidades JWT
│   ├── logger.js      # Sistema de logging
│   ├── string.js      # Utilidades de strings (camelize, etc.)
│   └── utils.js       # Utilidades generales (response, getBody, etc.)
└── services/          # Servicio Lambda único
    └── api/           # Servicio API unificado
        ├── handler.js  # Punto de entrada único (maneja todas las rutas)
        ├── router.js   # Configuración de todas las rutas
        ├── serverless.yml  # Configuración Serverless Framework
        ├── package.json    # Dependencias del servicio
        ├── clients/        # Módulo de clientes
        │   └── client.js
        ├── enterprise/     # Módulo de empresas
        │   └── client.js
        └── products/       # Módulo de productos
            └── client.js
```

## Estructura Unificada

El proyecto utiliza un **único servicio API** que maneja todas las rutas a través de:
- **Un solo handler.js** - Punto de entrada único para todas las peticiones
- **Un solo router.js** - Centraliza todas las definiciones de rutas
- **Un solo serverless.yml** - Configuración única del servicio Lambda

## Servicios Implementados

### 1. Clients (`/clients/clientes`)
- `GET /clients/clientes` - Obtener clientes
- `POST /clients/clientes` - Crear cliente
- `PUT /clients/clientes` - Actualizar cliente
- `DELETE /clients/clientes` - Eliminar cliente

### 2. Enterprise (`/enterprise/empresas`)
- `GET /enterprise/empresas` - Obtener empresas
- `POST /enterprise/empresas` - Crear empresa
- `PUT /enterprise/empresas` - Actualizar empresa
- `DELETE /enterprise/empresas` - Eliminar empresa

### 3. Products (`/products/productos`)
- `GET /products/productos` - Obtener productos
- `POST /products/productos` - Crear producto
- `PUT /products/productos` - Actualizar producto
- `DELETE /products/productos` - Eliminar productos
- `GET /products/productos/precios` - Obtener precios
- `POST /products/productos/precios` - Crear precio
- `PUT /products/productos/precios` - Actualizar precio
- `DELETE /products/productos/precios` - Eliminar precio

### 4. Inventory Movement (`/inventoryMovement/movimientos`)
- `GET /inventoryMovement/movimientos` - Obtener movimientos de inventario
- `POST /inventoryMovement/movimientos` - Crear movimiento
- `PUT /inventoryMovement/movimientos` - Actualizar movimiento
- `DELETE /inventoryMovement/movimientos` - Eliminar movimiento

### 5. Métodos de Pago (`/metodosPago/metodos-pago`)
- `GET /metodosPago/metodos-pago` - Obtener métodos de pago
- `POST /metodosPago/metodos-pago` - Crear método de pago
- `PUT /metodosPago/metodos-pago` - Actualizar método de pago
- `DELETE /metodosPago/metodos-pago` - Eliminar método de pago

### 6. Monedas (`/monedas/monedas`)
- `GET /monedas/monedas` - Obtener monedas
- `POST /monedas/monedas` - Crear moneda
- `PUT /monedas/monedas` - Actualizar moneda
- `DELETE /monedas/monedas` - Eliminar moneda

### 7. Provider (`/provider/proveedores`)
- `GET /provider/proveedores` - Obtener proveedores
- `POST /provider/proveedores` - Crear proveedor
- `PUT /provider/proveedores` - Actualizar proveedor
- `DELETE /provider/proveedores` - Eliminar proveedor

### 8. Purchase (`/purchase/ventas`)
- `GET /purchase/ventas` - Obtener ventas
- `GET /purchase/ventas/flat` - Obtener ventas (formato plano)
- `POST /purchase/ventas` - Crear venta
- `PUT /purchase/ventas` - Actualizar venta
- `POST /purchase/ventas/cancel` - Cancelar venta
- `PUT /purchase/ventas/status` - Actualizar estado de venta
- `PUT /purchase/ventas/update` - Actualizar venta completa
- `DELETE /purchase/ventas/remove` - Eliminar venta
- `GET /purchase/ventas/:ventaId/pagos` - Listar pagos de venta
- `POST /purchase/ventas/:ventaId/pagos` - Crear pago
- `PUT /purchase/ventas/:ventaId/pagos/:paymentId` - Actualizar pago
- `DELETE /purchase/ventas/:ventaId/pagos/:paymentId` - Eliminar pago

### 9. Reportes (`/reportes/`)
- `GET /reportes/inventario-con-metodo` - Reporte de inventario con método
- `GET /reportes/movimientos-inventario` - Reporte de movimientos de inventario
- `GET /reportes/stock-actual` - Reporte de stock actual
- `GET /reportes/ventas-con-pagos` - Reporte de ventas con pagos

### 10. Métodos de Pago Unificado (`/metodosPagoUnificado/`)
- `GET /metodosPagoUnificado/metodos-pago-unificado` - Obtener reporte unificado
- `GET /metodosPagoUnificado/metodos-pago-unificado/resumen` - Obtener resumen

### 11. Productos Precios (`/productosPrecios/`)
- `GET /productosPrecios/precios` - Obtener precios
- `GET /productosPrecios/precios/:producto_id` - Obtener precios por producto
- `POST /productosPrecios/precios` - Crear precio
- `PUT /productosPrecios/precios` - Actualizar precio
- `DELETE /productosPrecios/precios` - Eliminar precio

## Configuración

### Variables de Entorno

El proyecto utiliza archivos de configuración en `envs/credentials.{stage}.json` con la siguiente estructura:

```json
{
  "BUCKET": "bucket-name",
  "ACCOUNT_ID": "account-id",
  "AWS_POOL_ID": "cognito-pool-id",
  "LAYERS": "arn:aws:lambda:...",
  "DATABASE_HOST": "host",
  "DATABASE_USER": "user",
  "DATABASE_NAME": "database",
  "DATABASE_PASSWORD": "password",
  "DATABASE_PORT": 3306
}
```

### Layers

Las dependencias compartidas se encuentran en `layers/node/`. Para desplegar la capa:

```bash
cd layers
serverless deploy --stage dev
```

### Despliegue del Servicio

Para desplegar el servicio API:

```bash
cd services/api
serverless deploy --stage dev
```

### Desarrollo Local

Para ejecutar el servicio localmente:

```bash
cd services/api
npm run local
```

## Diferencias con kairo-api-lite

1. **Estructura de routing**: Usa router/routes en lugar de handlers individuales por método HTTP
2. **Lógica de negocio**: Separada en `client.js` en lugar de `handler.js`
3. **Librerías compartidas**: Ubicadas en `libs/` en lugar de `services/common/`
4. **Base de datos**: Adaptado para usar MySQL en lugar de múltiples bases de datos
5. **Configuración**: Usa estructura de Skeletor con NODE_PATH y configuración centralizada

## Migración de Servicios Adicionales

Para agregar nuevos servicios al API unificado:

1. Crear directorio en `services/api/[nombre-servicio]`
2. Crear `client.js` con la lógica de `storage.js` original (adaptando las funciones a handlers)
3. Importar el módulo en `services/api/router.js`
4. Agregar las rutas del nuevo servicio en el array de routes del router

## Notas

- El proyecto usa MySQL como base de datos principal
- La autenticación está comentada pero lista para implementar
- **Un solo servicio Lambda** maneja todas las rutas a través de un proxy único
- Las rutas se definen con el prefijo del servicio (ej: `clients/clientes`, `enterprise/empresas`)
- Todas las rutas pasan por el mismo handler y router


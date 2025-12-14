const clients = require("./clients/client");
const enterprise = require("./enterprise/client");
const products = require("./products/client");
const inventoryMovement = require("./inventoryMovement/client");
const metodosPago = require("./metodosPago/client");
const monedas = require("./monedas/client");
const provider = require("./provider/client");
const purchase = require("./purchase/client");
const reportes = require("./reportes/client");
const metodosPagoUnificado = require("./metodosPagoUnificado/client");
const productosPrecios = require("./productosPrecios/client");

module.exports.router = () => {
  const routes = [
    {
      proxy: "clients",
      routes: [
        {
          path: "clientes",
          method: "GET",
          handler: clients.getClient,
          public: false,
        },
        {
          path: "clientes",
          method: "POST",
          handler: clients.postClient,
          public: false,
        },
        {
          path: "clientes",
          method: "PUT",
          handler: clients.putClient,
          public: false,
        },
        {
          path: "clientes",
          method: "DELETE",
          handler: clients.deleteClient,
          public: false,
        },
      ],
    },
    {
      proxy: "enterprise",
      routes: [
        {
          path: "empresas",
          method: "GET",
          handler: enterprise.getEnterprise,
          public: false,
        },
        {
          path: "empresas",
          method: "POST",
          handler: enterprise.postEnterprise,
          public: false,
        },
        {
          path: "empresas",
          method: "PUT",
          handler: enterprise.putEnterprise,
          public: false,
        },
        {
          path: "empresas",
          method: "DELETE",
          handler: enterprise.deleteEnterprise,
          public: false,
        },
      ],
    },
    {
      proxy: "products",
      routes: [
        {
          path: "productos",
          method: "GET",
          handler: products.getProduct,
          public: false,
        },
        {
          path: "productos",
          method: "POST",
          handler: products.postProduct,
          public: false,
        },
        {
          path: "productos",
          method: "PUT",
          handler: products.putProduct,
          public: false,
        },
        {
          path: "productos",
          method: "DELETE",
          handler: products.deleteProduct,
          public: false,
        },
        {
          path: "productos/precios",
          method: "GET",
          handler: products.getPrecio,
          public: false,
        },
        {
          path: "productos/precios",
          method: "POST",
          handler: products.postPrecio,
          public: false,
        },
        {
          path: "productos/precios",
          method: "PUT",
          handler: products.putPrecio,
          public: false,
        },
        {
          path: "productos/precios",
          method: "DELETE",
          handler: products.deletePrecio,
          public: false,
        },
      ],
    },
    {
      proxy: "inventoryMovement",
      routes: [
        {
          path: "movimientos",
          method: "GET",
          handler: inventoryMovement.getInventoryMovement,
          public: false,
        },
        {
          path: "movimientos",
          method: "POST",
          handler: inventoryMovement.postInventoryMovement,
          public: false,
        },
        {
          path: "movimientos",
          method: "PUT",
          handler: inventoryMovement.putInventoryMovement,
          public: false,
        },
        {
          path: "movimientos",
          method: "DELETE",
          handler: inventoryMovement.deleteInventoryMovement,
          public: false,
        },
      ],
    },
    {
      proxy: "metodosPago",
      routes: [
        {
          path: "metodos-pago",
          method: "GET",
          handler: metodosPago.getMetodoPago,
          public: false,
        },
        {
          path: "metodos-pago",
          method: "POST",
          handler: metodosPago.postMetodoPago,
          public: false,
        },
        {
          path: "metodos-pago",
          method: "PUT",
          handler: metodosPago.putMetodoPago,
          public: false,
        },
        {
          path: "metodos-pago",
          method: "DELETE",
          handler: metodosPago.deleteMetodoPago,
          public: false,
        },
      ],
    },
    {
      proxy: "monedas",
      routes: [
        {
          path: "monedas",
          method: "GET",
          handler: monedas.getMoneda,
          public: false,
        },
        {
          path: "monedas",
          method: "POST",
          handler: monedas.postMoneda,
          public: false,
        },
        {
          path: "monedas",
          method: "PUT",
          handler: monedas.putMoneda,
          public: false,
        },
        {
          path: "monedas",
          method: "DELETE",
          handler: monedas.deleteMoneda,
          public: false,
        },
      ],
    },
    {
      proxy: "provider",
      routes: [
        {
          path: "proveedores",
          method: "GET",
          handler: provider.getProvider,
          public: false,
        },
        {
          path: "proveedores",
          method: "POST",
          handler: provider.postProvider,
          public: false,
        },
        {
          path: "proveedores",
          method: "PUT",
          handler: provider.putProvider,
          public: false,
        },
        {
          path: "proveedores",
          method: "DELETE",
          handler: provider.deleteProvider,
          public: false,
        },
      ],
    },
    {
      proxy: "purchase",
      routes: [
        {
          path: "ventas",
          method: "GET",
          handler: purchase.getPurchase,
          public: false,
        },
        {
          path: "ventas/flat",
          method: "GET",
          handler: purchase.getPurchaseFlat,
          public: false,
        },
        {
          path: "ventas",
          method: "POST",
          handler: purchase.postPurchase,
          public: false,
        },
        {
          path: "ventas",
          method: "PUT",
          handler: purchase.putPurchase,
          public: false,
        },
        {
          path: "ventas/cancel",
          method: "POST",
          handler: purchase.cancelPurchase,
          public: false,
        },
        {
          path: "ventas/status",
          method: "PUT",
          handler: purchase.updatePurchaseStatus,
          public: false,
        },
        {
          path: "ventas/update",
          method: "PUT",
          handler: purchase.updateSale,
          public: false,
        },
        {
          path: "ventas/remove",
          method: "DELETE",
          handler: purchase.removeSale,
          public: false,
        },
        {
          path: "ventas/:ventaId/pagos",
          method: "GET",
          handler: purchase.listPayments,
          public: false,
        },
        {
          path: "ventas/:ventaId/pagos",
          method: "POST",
          handler: purchase.createPayment,
          public: false,
        },
        {
          path: "ventas/:ventaId/pagos/:paymentId",
          method: "PUT",
          handler: purchase.updatePayment,
          public: false,
        },
        {
          path: "ventas/:ventaId/pagos/:paymentId",
          method: "DELETE",
          handler: purchase.deletePayment,
          public: false,
        },
      ],
    },
    {
      proxy: "reportes",
      routes: [
        {
          path: "inventario-con-metodo",
          method: "GET",
          handler: reportes.getReporteInventarioConMetodo,
          public: false,
        },
        {
          path: "movimientos-inventario",
          method: "GET",
          handler: reportes.getReporteMovimientosInventario,
          public: false,
        },
        {
          path: "stock-actual",
          method: "GET",
          handler: reportes.getReporteStockActual,
          public: false,
        },
        {
          path: "ventas-con-pagos",
          method: "GET",
          handler: reportes.getReporteVentasConPagos,
          public: false,
        },
      ],
    },
    {
      proxy: "metodosPagoUnificado",
      routes: [
        {
          path: "metodos-pago-unificado",
          method: "GET",
          handler: metodosPagoUnificado.getMetodosPagoUnificado,
          public: false,
        },
        {
          path: "metodos-pago-unificado/resumen",
          method: "GET",
          handler: metodosPagoUnificado.getMetodosPagoUnificadoResumen,
          public: false,
        },
      ],
    },
    {
      proxy: "productosPrecios",
      routes: [
        {
          path: "precios",
          method: "GET",
          handler: productosPrecios.getProductoPrecio,
          public: false,
        },
        {
          path: "precios/:producto_id",
          method: "GET",
          handler: productosPrecios.getProductoPrecioByProducto,
          public: false,
        },
        {
          path: "precios",
          method: "POST",
          handler: productosPrecios.postProductoPrecio,
          public: false,
        },
        {
          path: "precios",
          method: "PUT",
          handler: productosPrecios.putProductoPrecio,
          public: false,
        },
        {
          path: "precios",
          method: "DELETE",
          handler: productosPrecios.deleteProductoPrecio,
          public: false,
        },
      ],
    },
  ];

  return routes;
};

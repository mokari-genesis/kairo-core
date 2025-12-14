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
      proxy: "core",
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
        //empresas
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
        //products // products
        {
          path: "products",
          method: "GET",
          handler: products.getProduct,
          public: false,
        },
        {
          path: "products",
          method: "POST",
          handler: products.postProduct,
          public: false,
        },
        {
          path: "products",
          method: "PUT",
          handler: products.putProduct,
          public: false,
        },
        {
          path: "products",
          method: "DELETE",
          handler: products.deleteProduct,
          public: false,
        },
        //productos-precios
        // {
        //   path: "productos-precios",
        //   method: "GET",
        //   handler: products.getPrecio,
        //   public: false,
        // },
        // {
        //   path: "productos-precios",
        //   method: "POST",
        //   handler: products.postPrecio,
        //   public: false,
        // },
        // {
        //   path: "productos-precios",
        //   method: "PUT",
        //   handler: products.putPrecio,
        //   public: false,
        // },
        // {
        //   path: "productos-precios",
        //   method: "DELETE",
        //   handler: products.deletePrecio,
        //   public: false,
        // },
        //inventoryMovement // inventory movements
        {
          path: "inventory-movement",
          method: "GET",
          handler: inventoryMovement.getInventoryMovement,
          public: false,
        },
        {
          path: "inventory-movement",
          method: "POST",
          handler: inventoryMovement.postInventoryMovement,
          public: false,
        },
        {
          path: "inventory-movement",
          method: "PUT",
          handler: inventoryMovement.putInventoryMovement,
          public: false,
        },
        {
          path: "inventory-movement",
          method: "DELETE",
          handler: inventoryMovement.deleteInventoryMovement,
          public: false,
        },
        //metodos-pago
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
        //monedas
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
        //provider // suppliers
        {
          path: "provider",
          method: "GET",
          handler: provider.getProvider,
          public: false,
        },
        {
          path: "provider",
          method: "POST",
          handler: provider.postProvider,
          public: false,
        },
        {
          path: "provider",
          method: "PUT",
          handler: provider.putProvider,
          public: false,
        },
        {
          path: "provider",
          method: "DELETE",
          handler: provider.deleteProvider,
          public: false,
        },
        //purchase // sales
        {
          path: "purchase",
          method: "GET",
          handler: purchase.getPurchase,
          public: false,
        },
        {
          path: "purchase/flat",
          method: "GET",
          handler: purchase.getPurchaseFlat,
          public: false,
        },
        {
          path: "purchase",
          method: "POST",
          handler: purchase.postPurchase,
          public: false,
        },
        {
          path: "purchase",
          method: "PUT",
          handler: purchase.putPurchase,
          public: false,
        },
        {
          path: "purchase",
          method: "DELETE",
          handler: purchase.cancelPurchase,
          public: false,
        },
        {
          path: "purchase/status",
          method: "PUT",
          handler: purchase.updatePurchaseStatus,
          public: false,
        },
        {
          path: "purchase/sale",
          method: "PUT",
          handler: purchase.updateSale,
          public: false,
        },
        {
          path: "purchase/sale",
          method: "DELETE",
          handler: purchase.removeSale,
          public: false,
        },
        {
          path: "purchase/:ventaId/payments",
          method: "GET",
          handler: purchase.listPayments,
          public: false,
        },
        {
          path: "purchase/:ventaId/payments",
          method: "POST",
          handler: purchase.createPayment,
          public: false,
        },
        {
          path: "purchase/:ventaId/payments/:paymentId",
          method: "PUT",
          handler: purchase.updatePayment,
          public: false,
        },
        {
          path: "purchase/:ventaId/payments/:paymentId",
          method: "DELETE",
          handler: purchase.deletePayment,
          public: false,
        },
        //reportes
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
        // /metodos-pago-unificado
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
        //productos-precios
        {
          path: "productos-precios",
          method: "GET",
          handler: productosPrecios.getProductoPrecio,
          public: false,
        },
        {
          path: "productos-precios/producto/:producto_id",
          method: "GET",
          handler: productosPrecios.getProductoPrecioByProducto,
          public: false,
        },
        {
          path: "productos-precios",
          method: "POST",
          handler: productosPrecios.postProductoPrecio,
          public: false,
        },
        {
          path: "productos-precios",
          method: "PUT",
          handler: productosPrecios.putProductoPrecio,
          public: false,
        },
        {
          path: "productos-precios",
          method: "DELETE",
          handler: productosPrecios.deleteProductoPrecio,
          public: false,
        },
      ],
    },
  ];

  return routes;
};

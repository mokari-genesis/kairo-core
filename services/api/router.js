const clients = require("./clients/client");
const enterprise = require("./enterprise/client");
const products = require("./products/client");
const inventoryMovement = require("./inventoryMovement/client");
const metodosPago = require("./metodosPago/client");
const monedas = require("./monedas/client");
const provider = require("./provider/client");
const purchase = require("./purchase/client");
const reportes2 = require("./reportes2/client");
const metodosPagoUnificado = require("./metodosPagoUnificado/client");
const productosPrecios = require("./productosPrecios/client");
const transferencias = require("./transferencias/client");
const cuentasPorCobrar = require("./cuentasPorCobrar/client");
const cuentasPorPagar = require("./cuentasPorPagar/client");
const usuarios = require("./usuarios/client");

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
        // Reportes - Ventas
        {
          path: "reportes2/ventas-resumen",
          method: "GET",
          handler: reportes2.getReporteVentasResumen,
          public: false,
        },
        {
          path: "reportes2/ventas-por-vendedor",
          method: "GET",
          handler: reportes2.getReporteVentasPorVendedor,
          public: false,
        },
        {
          path: "reportes2/ventas-por-cliente",
          method: "GET",
          handler: reportes2.getReporteVentasPorCliente,
          public: false,
        },
        {
          path: "reportes2/ventas-por-metodo-pago",
          method: "GET",
          handler: reportes2.getReporteVentasPorMetodoPago,
          public: false,
        },
        // Reportes - Cartera
        {
          path: "reportes2/cxc-aging",
          method: "GET",
          handler: reportes2.getReporteCxcAging,
          public: false,
        },
        {
          path: "reportes2/cxp-aging",
          method: "GET",
          handler: reportes2.getReporteCxpAging,
          public: false,
        },
        {
          path: "reportes2/flujo-caja-cartera",
          method: "GET",
          handler: reportes2.getReporteFlujoCaja,
          public: false,
        },
        // Reportes - Inventario
        {
          path: "reportes2/inventario-rotacion",
          method: "GET",
          handler: reportes2.getReporteInventarioRotacion,
          public: false,
        },
        {
          path: "reportes2/inventario-baja-rotacion",
          method: "GET",
          handler: reportes2.getReporteInventarioBajaRotacion,
          public: false,
        },
        {
          path: "reportes2/inventario-rupturas",
          method: "GET",
          handler: reportes2.getReporteInventarioRupturas,
          public: false,
        },
        // Reportes - Relaciones
        {
          path: "reportes2/top-clientes",
          method: "GET",
          handler: reportes2.getReporteTopClientes,
          public: false,
        },
        {
          path: "reportes2/top-proveedores",
          method: "GET",
          handler: reportes2.getReporteTopProveedores,
          public: false,
        },
        {
          path: "reportes2/clientes-riesgo",
          method: "GET",
          handler: reportes2.getReporteClientesRiesgo,
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
        //transferencias
        {
          path: "transferencias",
          method: "GET",
          handler: transferencias.getTransferencias,
          public: false,
        },
        {
          path: "transferencias/:transferencia_id",
          method: "GET",
          handler: transferencias.getTransferencia,
          public: false,
        },
        {
          path: "transferencias",
          method: "POST",
          handler: transferencias.postTransferencia,
          public: false,
        },
        {
          path: "transferencias/:transferencia_id",
          method: "PUT",
          handler: transferencias.putTransferencia,
          public: false,
        },
        {
          path: "transferencias/:transferencia_id/confirmar",
          method: "POST",
          handler: transferencias.confirmarTransferencia,
          public: false,
        },
        {
          path: "transferencias/:transferencia_id/cancelar",
          method: "POST",
          handler: transferencias.cancelarTransferencia,
          public: false,
        },
        {
          path: "transferencias/:transferencia_id",
          method: "DELETE",
          handler: transferencias.deleteTransferencia,
          public: false,
        },
        //cuentas-por-pagar
        {
          path: "cuentas-por-pagar",
          method: "GET",
          handler: cuentasPorPagar.getCuentasPorPagar,
          public: false,
        },
        {
          path: "cuentas-por-pagar/resumen/proveedores",
          method: "GET",
          handler: cuentasPorPagar.getSaldoProveedores,
          public: false,
        },
        {
          path: "cuentas-por-pagar/:id",
          method: "GET",
          handler: cuentasPorPagar.getCuentaPorPagar,
          public: false,
        },
        {
          path: "cuentas-por-pagar",
          method: "POST",
          handler: cuentasPorPagar.postCuentaPorPagar,
          public: false,
        },
        {
          path: "cuentas-por-pagar/:id/abonos",
          method: "POST",
          handler: cuentasPorPagar.postAbono,
          public: false,
        },
        {
          path: "cuentas-por-pagar/:id/abonos/:abono_id",
          method: "DELETE",
          handler: cuentasPorPagar.deleteAbono,
          public: false,
        },
        {
          path: "cuentas-por-pagar/sync-from-compra/:compra_id",
          method: "POST",
          handler: cuentasPorPagar.syncFromCompra,
          public: false,
        },
        //cuentas-por-cobrar
        {
          path: "cuentas-por-cobrar",
          method: "GET",
          handler: cuentasPorCobrar.getCuentasPorCobrar,
          public: false,
        },
        {
          path: "cuentas-por-cobrar/:id",
          method: "GET",
          handler: cuentasPorCobrar.getCuentaPorCobrar,
          public: false,
        },
        {
          path: "cuentas-por-cobrar",
          method: "POST",
          handler: cuentasPorCobrar.postCuentaPorCobrar,
          public: false,
        },
        {
          path: "cuentas-por-cobrar/:id",
          method: "PUT",
          handler: cuentasPorCobrar.putCuentaPorCobrar,
          public: false,
        },
        {
          path: "cuentas-por-cobrar/sync-from-venta/:venta_id",
          method: "POST",
          handler: cuentasPorCobrar.syncFromVenta,
          public: false,
        },
        {
          path: "cuentas-por-cobrar/:id/abonos",
          method: "POST",
          handler: cuentasPorCobrar.postAbono,
          public: false,
        },
        {
          path: "cuentas-por-cobrar/:id/abonos/:abono_id",
          method: "DELETE",
          handler: cuentasPorCobrar.deleteAbono,
          public: false,
        },
        //usuarios
        {
          path: "usuarios",
          method: "GET",
          handler: usuarios.getUsuario,
          public: false,
        },
        {
          path: "usuarios",
          method: "POST",
          handler: usuarios.postUsuario,
          public: false,
        },
        {
          path: "usuarios",
          method: "PUT",
          handler: usuarios.putUsuario,
          public: false,
        },
        {
          path: "usuarios",
          method: "DELETE",
          handler: usuarios.deleteUsuario,
          public: false,
        },
      ],
    },
  ];

  return routes;
};

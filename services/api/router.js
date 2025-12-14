const clients = require("./clients/client");
const enterprise = require("./enterprise/client");
const products = require("./products/client");

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
  ];

  return routes;
};

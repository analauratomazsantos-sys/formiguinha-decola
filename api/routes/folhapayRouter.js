"use strict";

const express = require("express");
const { criarController } = require("../controllers/mercadinhoController");
const { criarControllerFolhaPay } = require("../controllers/folhapayController");

function criarRotasFolhaPay(db) {
    const router = express.Router(), protecao = criarController(db), controller = criarControllerFolhaPay(db);
    router.use(protecao.exigirAdmin);
    router.use((req, res, next) => { res.set("Referrer-Policy", "no-referrer"); next(); });
    router.get("/", controller.listar);
    router.get("/:id/qr.svg", controller.qr);
    router.get("/:id", controller.cartao);
    return router;
}

module.exports = { criarRotasFolhaPay };

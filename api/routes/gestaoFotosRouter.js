"use strict";

const express = require("express");
const { criarController } = require("../controllers/mercadinhoController");
const { criarControllerFotos } = require("../controllers/fotoAlunoController");
const { criarRotasFotos } = require("./fotoAlunoRoutes");

function criarRotasGestaoFotos(db) {
    const router = express.Router(), acesso = criarController(db), controller = criarControllerFotos(db);
    router.use(acesso.exigirAdministrador);
    router.use((req, res, next) => { res.set("Referrer-Policy", "no-referrer"); next(); });
    router.use("/api/fotos", criarRotasFotos(db, { exigirAdmin: acesso.exigirAdministrador, exigirCsrfFoto: controller.exigirCsrfFoto }, { permitirEdicao: true }));
    router.get("/", controller.listar);
    router.get("/:id", controller.editar);
    return router;
}

module.exports = { criarRotasGestaoFotos };

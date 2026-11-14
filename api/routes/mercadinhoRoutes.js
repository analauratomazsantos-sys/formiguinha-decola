"use strict";

const express = require("express");
const db = require("../config/database.js");
const { criarController } = require("../controllers/mercadinhoController");
const controller = criarController(db);
const router = express.Router();

router.use(controller.exigirAdmin);
router.use("/api/fotos", require("./fotoAlunoRoutes").criarRotasFotos(db, controller));
router.get("/", controller.exibir);
router.post("/api/aluno", controller.exigirCsrf, controller.buscar);
router.post("/api/aluno-por-id", controller.exigirCsrf, controller.buscarPorId);
router.post("/api/movimentacoes", controller.exigirCsrf, controller.registrar);
router.get("/api/recibos/:id", controller.recibo);

module.exports = router;

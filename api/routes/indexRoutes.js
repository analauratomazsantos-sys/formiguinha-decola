const express = require("express");
const router = express.Router();
const indexControllers = require("../controllers/indexControllers.js");

router.get("/", indexControllers.exibirLogin);
router.get("/login", indexControllers.exibirLogin);
router.get("/painel", indexControllers.exibirPainel);
router.get("/estudantes/novo", indexControllers.exibirCadastroEstudante);

module.exports = router;
const express = require("express");
const router = express.Router();
const indexControllers = require("../controllers/indexControllers.js");

router.get("/", indexControllers.exibirLogin);
router.get("/login", indexControllers.exibirLogin);
router.get("/painel", indexControllers.exibirPainel);
router.get("/estudantes/novo", indexControllers.exibirCadastroEstudante);
router.get("/estudantes", indexControllers.exibirListaEstudantes);
router.get("/lrcash", indexControllers.exibirLancamentoLRCash);
router.get("/saldo", indexControllers.exibirSaldo);

module.exports = router;
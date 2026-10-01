const express = require("express");
const router = express.Router();

const indexControllers = require("../controllers/indexControllers.js");
const { exigirLogin } = require("../middlewares/authMiddleware.js");

// Acesso
router.get("/", indexControllers.exibirLogin);
router.get("/login", indexControllers.exibirLogin);
router.post("/login", indexControllers.processarLogin);

router.get("/aluno", indexControllers.exibirAcessoAluno);
router.post("/aluno", indexControllers.processarAcessoAluno);
router.get("/aluno/sair", indexControllers.sairAluno);
router.get("/q/:token", indexControllers.acessarPorQr);
router.get("/minha-conta", indexControllers.exibirMinhaConta);

router.get("/sair", indexControllers.sair);

// Ãrea protegida
router.get("/painel", exigirLogin, indexControllers.exibirPainel);

router.get("/estudantes/novo", exigirLogin, indexControllers.exibirCadastroEstudante);
router.post("/estudantes", exigirLogin, indexControllers.criarEstudante);
router.get("/estudantes", exigirLogin, indexControllers.exibirListaEstudantes);
router.get("/estudantes/:ra", exigirLogin, indexControllers.redirecionarConsultaEstudante);

router.get("/lrcash", exigirLogin, indexControllers.exibirLancamentoLRCash);
router.post("/lrcash", exigirLogin, indexControllers.criarLancamentoLRCash);

router.get("/saldo", exigirLogin, indexControllers.exibirSaldo);
router.get("/extrato", exigirLogin, indexControllers.exibirExtrato);

module.exports = router;

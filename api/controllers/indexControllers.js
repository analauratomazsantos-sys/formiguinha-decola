function exibirLogin(req, res) {
    res.render("login");
}

function exibirPainel(req, res) {
    res.render("painel");
}

function exibirCadastroEstudante(req, res) {
    res.render("cadastro-estudante");
}

function exibirListaEstudantes(req, res) {
    res.render("lista-estudantes", { estudantes: [] });
}

function exibirLancamentoLRCash(req, res) {
    res.render("lancamento-lrcash", { estudantes: [] });
}

function exibirSaldo(req, res) {
    res.render("saldo-estudante", {
        estudantes: [],
        estudanteSelecionado: null,
        saldo: null
    });
}

function exibirExtrato(req, res) {
    res.render("extrato-estudante", {
        estudantes: [],
        estudanteSelecionado: null,
        movimentacoes: []
    });
}

function exibirFolhaPay(req, res) {
    res.render("folhapay");
}

function exibirOcorrencias(req, res) {
    res.render("ocorrencias");
}

module.exports = {
    exibirLogin,
    exibirPainel,
    exibirCadastroEstudante,
    exibirListaEstudantes,
    exibirLancamentoLRCash,
    exibirSaldo,
    exibirExtrato,
    exibirFolhaPay,
    exibirOcorrencias
};
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

module.exports = {
    exibirLogin,
    exibirPainel,
    exibirCadastroEstudante,
    exibirListaEstudantes
};
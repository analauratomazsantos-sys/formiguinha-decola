function exibirLogin(req, res) {
    res.render("login");
}

function exibirPainel(req, res) {
    res.render("painel");
}

function exibirCadastroEstudante(req, res) {
    res.render("cadastro-estudante");
}

module.exports = {
    exibirLogin,
    exibirPainel,
    exibirCadastroEstudante
};
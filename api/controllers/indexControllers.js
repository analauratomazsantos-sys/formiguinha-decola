function exibirLogin(req, res) {
    res.render("login");
}

function exibirPainel(req, res) {
    res.render("painel");
}

module.exports = {
    exibirLogin,
    exibirPainel
};
const express = require("express");
const path = require("path");

const app = express();
const port = 3000;

// Permite receber dados enviados pelas telas
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Configura as páginas EJS
app.set("views", path.join(__dirname, "api", "views"));
app.set("view engine", "ejs");

// Disponibiliza CSS, JavaScript e imagens
app.use(express.static(path.join(__dirname, "public")));

// Importa e utiliza as rotas
const indexRoutes = require("./api/routes/indexRoutes.js");
app.use("/", indexRoutes);

// Trata endereços inexistentes
app.use((req, res) => {
    res.status(404).send("Página não encontrada.");
});

// Inicia o servidor
app.listen(port, () => {
    console.log(`Formiguinha Decola rodando em http://localhost:${port}`);
});
const fs = require("fs");
const path = require("path");
const express = require("express");
const session = require("express-session");

function carregarEnv() {
    const arquivo = path.join(__dirname, ".env");

    if (!fs.existsSync(arquivo)) {
        return;
    }

    const linhas = fs.readFileSync(arquivo, "utf8").split(/\r?\n/);

    for (const linha of linhas) {
        const texto = linha.trim();

        if (!texto || texto.startsWith("#")) {
            continue;
        }

        const indice = texto.indexOf("=");

        if (indice === -1) {
            continue;
        }

        const chave = texto.slice(0, indice).trim();
        const valor = texto.slice(indice + 1).trim();

        if (process.env[chave] === undefined) {
            process.env[chave] = valor;
        }
    }
}

carregarEnv();

console.log("DB_HOST:", process.env.DB_HOST);
console.log("DB_PORT:", process.env.DB_PORT);
console.log("DB_USER:", process.env.DB_USER);
console.log("DB_PASSWORD carregada:", !!process.env.DB_PASSWORD);
console.log("DB_NAME:", process.env.DB_NAME);

const app = express();
const port = Number(process.env.PORT || 3000);

app.use(express.json());
app.use(express.urlencoded({ extended: true }));

app.use(session({
    secret: process.env.SESSION_SECRET || "formiguinha-dev-secret",
    resave: false,
    saveUninitialized: false,
    cookie: {
        httpOnly: true,
        sameSite: "lax",
        maxAge: 1000 * 60 * 60 * 4
    }
}));

app.set("views", path.join(__dirname, "api", "views"));
app.set("view engine", "ejs");

app.get("/", (req, res) => {
    res.sendFile(path.join(__dirname, "public", "landing", "index.html"));
});

app.use(express.static(path.join(__dirname, "public")));

const indexRoutes = require("./api/routes/indexRoutes.js");
app.use("/", indexRoutes);

app.use((req, res) => {
    res.status(404).send("Página não encontrada.");
});

app.use((erro, req, res, next) => {
    console.error("Erro não tratado:", erro);
    res.status(500).send("Erro interno do servidor.");
});

app.listen(port, () => {
    console.log(`Formiguinha Decola rodando em http://localhost:${port}`);
});

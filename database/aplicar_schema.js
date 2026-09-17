require("dotenv").config();

const mysql = require("mysql2/promise");
const fs = require("fs");
const path = require("path");

async function aplicarSchema() {
    const dbUrl = new URL(process.env.DATABASE_URL);

    const nomeBanco = decodeURIComponent(
        dbUrl.pathname.replace("/", "")
    );

    const conexao = await mysql.createConnection({
        host: dbUrl.hostname,
        port: Number(dbUrl.port || 3306),
        user: decodeURIComponent(dbUrl.username),
        password: decodeURIComponent(dbUrl.password),
        database: nomeBanco,
        multipleStatements: true
    });

    try {
        console.log("Conectado ao banco de produção.");

        const [tabelasExistentes] = await conexao.query("SHOW TABLES");

        if (tabelasExistentes.length > 0) {
            console.log(
                "Operação interrompida: o banco já possui tabelas."
            );
            console.log(
                "Quantidade encontrada:",
                tabelasExistentes.length
            );
            return;
        }

        const caminhoSchema = path.join(
            __dirname,
            "01_schema_railway.sql"
        );

        const sql = fs.readFileSync(caminhoSchema, "utf8");

        console.log("Aplicando schema...");

        await conexao.query(sql);

        const [tabelasCriadas] = await conexao.query("SHOW TABLES");

        console.log("Schema aplicado com sucesso!");
        console.log(
            "Quantidade de tabelas criadas:",
            tabelasCriadas.length
        );

        console.log("Tabelas:");

        tabelasCriadas.forEach((tabela) => {
            console.log("-", Object.values(tabela)[0]);
        });

    } catch (erro) {
        console.error("Erro ao aplicar o schema:");
        console.error(erro.message);

    } finally {
        await conexao.end();
        console.log("Conexão encerrada.");
    }
}

aplicarSchema();
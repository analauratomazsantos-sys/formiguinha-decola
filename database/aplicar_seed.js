require("dotenv").config();

const mysql = require("mysql2/promise");
const fs = require("fs");
const path = require("path");

async function aplicarSeed() {
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

        // Verificações de segurança
        const [[turmasAntes]] = await conexao.query(
            "SELECT COUNT(*) AS total FROM turma"
        );

        const [[alunosAntes]] = await conexao.query(
            "SELECT COUNT(*) AS total FROM aluno"
        );

        const [[contasAntes]] = await conexao.query(
            "SELECT COUNT(*) AS total FROM conta"
        );

        const [[movimentacoesAntes]] = await conexao.query(
            "SELECT COUNT(*) AS total FROM movimentacao"
        );

        if (
            turmasAntes.total > 0 ||
            alunosAntes.total > 0 ||
            contasAntes.total > 0 ||
            movimentacoesAntes.total > 0
        ) {
            console.log("");
            console.log("Operação interrompida por segurança.");
            console.log("O banco já possui dados.");
            console.log("Turmas:", turmasAntes.total);
            console.log("Alunos:", alunosAntes.total);
            console.log("Contas:", contasAntes.total);
            console.log(
                "Movimentações:",
                movimentacoesAntes.total
            );
            return;
        }

        const caminhoSeed = path.join(
            __dirname,
            "02_seed_railway.sql"
        );

        const seed = fs.readFileSync(caminhoSeed, "utf8");

        console.log("Importando carga inicial...");

        await conexao.beginTransaction();

        try {
            await conexao.query(seed);

            const [[turmas]] = await conexao.query(
                "SELECT COUNT(*) AS total FROM turma"
            );

            const [[alunos]] = await conexao.query(
                "SELECT COUNT(*) AS total FROM aluno"
            );

            const [[contas]] = await conexao.query(
                "SELECT COUNT(*) AS total FROM conta"
            );

            const [[criterios]] = await conexao.query(
                "SELECT COUNT(*) AS total FROM criterio"
            );

            const [[movimentacoes]] = await conexao.query(
                "SELECT COUNT(*) AS total FROM movimentacao"
            );

            if (
                turmas.total !== 6 ||
                alunos.total !== 191 ||
                contas.total !== 191 ||
                criterios.total !== 2 ||
                movimentacoes.total !== 0
            ) {
                throw new Error(
                    "Os dados importados não correspondem às quantidades esperadas."
                );
            }

            await conexao.commit();

            console.log("");
            console.log("Carga inicial aplicada com sucesso!");
            console.log("Turmas:", turmas.total);
            console.log("Alunos:", alunos.total);
            console.log("Contas:", contas.total);
            console.log("Critérios:", criterios.total);
            console.log("Movimentações:", movimentacoes.total);

        } catch (erroImportacao) {
            await conexao.rollback();

            throw erroImportacao;
        }

    } catch (erro) {
        console.error("");
        console.error("Erro ao aplicar a carga inicial:");
        console.error(erro.message);

    } finally {
        await conexao.end();
        console.log("Conexão encerrada.");
    }
}

aplicarSeed();
const crypto = require("crypto");
const bcrypt = require("bcryptjs");
const db = require("../config/database.js");

function normalizarRa(ra) {
    return String(ra || "").trim();
}

async function buscarEstudantes() {
    const [rows] = await db.execute(`
        SELECT
            a.ra AS id,
            a.ra,
            a.nome,
            t.nome_turma AS turma,
            c.saldo
        FROM aluno AS a
        INNER JOIN turma AS t ON t.id_turma = a.id_turma
        LEFT JOIN conta AS c ON c.ra = a.ra
        ORDER BY a.nome
    `);

    return rows;
}

async function buscarEstudantePorRa(ra) {
    const [rows] = await db.execute(`
        SELECT
            a.ra AS id,
            a.ra,
            a.nome,
            t.nome_turma AS turma,
            c.id_conta,
            c.saldo
        FROM aluno AS a
        INNER JOIN turma AS t ON t.id_turma = a.id_turma
        LEFT JOIN conta AS c ON c.ra = a.ra
        WHERE a.ra = ?
        LIMIT 1
    `, [ra]);

    return rows[0] || null;
}

async function buscarCriterio(codigo) {
    const mapa = {
        FREQUENCIA: "Frequência",
        SALA_DO_FUTURO: "Tarefa da Sala do Futuro"
    };

    const nome = mapa[codigo];
    if (!nome) {
        return null;
    }

    const [rows] = await db.execute(`
        SELECT id_criterio, nome_criterio
        FROM criterio
        WHERE nome_criterio = ? AND ativo = TRUE
        LIMIT 1
    `, [nome]);

    return rows[0] || null;
}

function exibirLogin(req, res) {
    if (req.session && req.session.usuario) {
        return res.redirect("/painel");
    }

    res.render("login");
}

async function processarLogin(req, res) {
    try {
        const email = String(req.body.email || "").trim().toLowerCase();
        const senha = String(req.body.senha || "");

        if (!email || !senha) {
            return res.status(400).send("E-mail e senha são obrigatórios.");
        }

        const [rows] = await db.execute(`
            SELECT id_usuario, nome, email, senha_hash, ativo
            FROM usuario
            WHERE email = ?
            LIMIT 1
        `, [email]);

        const usuario = rows[0];

        if (!usuario || !usuario.ativo) {
            return res.status(401).send("E-mail ou senha inválidos.");
        }

        const senhaValida = await bcrypt.compare(senha, usuario.senha_hash);

        if (!senhaValida) {
            return res.status(401).send("E-mail ou senha inválidos.");
        }

        req.session.usuario = {
            id: usuario.id_usuario,
            nome: usuario.nome,
            email: usuario.email
        };

        return res.redirect("/painel");
    } catch (erro) {
        console.error("Erro no login:", erro);
        return res.status(500).send("Erro interno ao realizar login.");
    }
}

function sair(req, res) {
    req.session.destroy((erro) => {
        if (erro) {
            console.error("Erro ao encerrar sessão:", erro);
        }

        res.clearCookie("connect.sid");
        return res.redirect("/login");
    });
}

function exibirPainel(req, res) {
    res.render("painel", { usuario: req.session.usuario });
}

function exibirCadastroEstudante(req, res) {
    res.render("cadastro-estudante");
}

async function criarEstudante(req, res) {
    const connection = await db.getConnection();

    try {
        const nome = String(req.body.nome || "").trim();
        const ra = normalizarRa(req.body.ra);
        const turma = String(req.body.turma || "").trim();

        if (nome.length < 3 || nome.length > 150) {
            return res.status(400).send("Nome inválido.");
        }

        if (!/^\d{12}$/.test(ra)) {
            return res.status(400).send("O RA deve conter exatamente 12 números.");
        }

        if (!turma) {
            return res.status(400).send("A turma é obrigatória.");
        }

        const [turmas] = await connection.execute(`
            SELECT id_turma
            FROM turma
            WHERE nome_turma = ?
            LIMIT 1
        `, [turma]);

        if (turmas.length === 0) {
            return res.status(400).send("Turma não encontrada.");
        }

        const [existentes] = await connection.execute(`
            SELECT ra
            FROM aluno
            WHERE ra = ?
            LIMIT 1
        `, [ra]);

        if (existentes.length > 0) {
            return res.status(409).send("Já existe um estudante com esse RA.");
        }

        const qrCode = crypto.randomBytes(24).toString("hex");

        await connection.beginTransaction();

        await connection.execute(`
            INSERT INTO aluno
                (ra, nome, telefone, data_nascimento, id_turma, qr_code)
            VALUES (?, ?, NULL, NULL, ?, ?)
        `, [ra, nome, turmas[0].id_turma, qrCode]);

        await connection.execute(`
            INSERT INTO conta
                (status, saldo, ra)
            VALUES (TRUE, 0.00, ?)
        `, [ra]);

        await connection.commit();

        return res.redirect("/estudantes");
    } catch (erro) {
        await connection.rollback().catch(() => {});
        console.error("Erro ao cadastrar estudante:", erro);

        if (erro.code === "ER_DUP_ENTRY") {
            return res.status(409).send("Não foi possível cadastrar: RA ou QR Code já cadastrado.");
        }

        return res.status(500).send("Erro interno ao cadastrar estudante.");
    } finally {
        connection.release();
    }
}

async function exibirListaEstudantes(req, res) {
    try {
        const estudantes = await buscarEstudantes();
        res.render("lista-estudantes", { estudantes });
    } catch (erro) {
        console.error("Erro ao listar estudantes:", erro);
        res.status(500).send("Erro ao consultar estudantes.");
    }
}

async function exibirLancamentoLRCash(req, res) {
    try {
        const estudantes = await buscarEstudantes();
        res.render("lancamento-lrcash", { estudantes });
    } catch (erro) {
        console.error("Erro ao preparar lançamento:", erro);
        res.status(500).send("Erro ao carregar estudantes.");
    }
}

async function criarLancamentoLRCash(req, res) {
    const connection = await db.getConnection();

    try {
        const ra = normalizarRa(req.body.estudanteId);
        const codigoCriterio = String(req.body.criterio || "").trim();
        const valor = Number(req.body.valor);
        const observacao = String(req.body.observacao || "").trim();

        if (!/^\d{12}$/.test(ra)) {
            return res.status(400).send("Estudante inválido.");
        }

        if (!Number.isFinite(valor) || valor <= 0) {
            return res.status(400).send("O valor deve ser maior que zero.");
        }

        if (observacao.length > 255) {
            return res.status(400).send("A observação é muito longa.");
        }

        const estudante = await buscarEstudantePorRa(ra);
        if (!estudante || !estudante.id_conta) {
            return res.status(404).send("Conta do estudante não encontrada.");
        }

        const criterio = await buscarCriterio(codigoCriterio);
        if (!criterio) {
            return res.status(400).send("Critério inválido ou inativo.");
        }

        await connection.beginTransaction();

        // Bloqueia a conta durante a operação para evitar inconsistência de saldo.
        const [contas] = await connection.execute(`
            SELECT id_conta, saldo
            FROM conta
            WHERE id_conta = ? AND status = TRUE
            FOR UPDATE
        `, [estudante.id_conta]);

        if (contas.length === 0) {
            await connection.rollback();
            return res.status(400).send("A conta do estudante está inativa ou não existe.");
        }

        await connection.execute(`
            INSERT INTO movimentacao
                (valor, tipo, data_hora, descricao_observacao, id_conta, id_criterio)
            VALUES (?, 'ENTRADA', NOW(), ?, ?, ?)
        `, [valor, observacao || null, estudante.id_conta, criterio.id_criterio]);

        await connection.execute(`
            UPDATE conta
            SET saldo = saldo + ?
            WHERE id_conta = ?
        `, [valor, estudante.id_conta]);

        await connection.commit();

        return res.redirect(`/saldo?estudanteId=${encodeURIComponent(ra)}&sucesso=1`);
    } catch (erro) {
        await connection.rollback().catch(() => {});
        console.error("Erro ao lançar LRCash:", erro);
        return res.status(500).send("Erro interno ao registrar LRCash.");
    } finally {
        connection.release();
    }
}

async function exibirSaldo(req, res) {
    try {
        const estudantes = await buscarEstudantes();
        const ra = normalizarRa(req.query.estudanteId);

        let estudanteSelecionado = null;
        let saldo = null;

        if (ra) {
            estudanteSelecionado = await buscarEstudantePorRa(ra);

            if (!estudanteSelecionado) {
                return res.status(404).send("Estudante não encontrado.");
            }

            saldo = estudanteSelecionado.saldo;
        }

        res.render("saldo-estudante", {
            estudantes,
            estudanteSelecionado,
            saldo,
            sucesso: req.query.sucesso === "1"
        });
    } catch (erro) {
        console.error("Erro ao consultar saldo:", erro);
        res.status(500).send("Erro ao consultar saldo.");
    }
}

async function exibirExtrato(req, res) {
    try {
        const estudantes = await buscarEstudantes();
        const ra = normalizarRa(req.query.estudanteId);

        let estudanteSelecionado = null;
        let movimentacoes = [];

        if (ra) {
            estudanteSelecionado = await buscarEstudantePorRa(ra);

            if (!estudanteSelecionado) {
                return res.status(404).send("Estudante não encontrado.");
            }

            const [rows] = await db.execute(`
                SELECT
                    m.id_movimentacao,
                    DATE_FORMAT(m.data_hora, '%d/%m/%Y %H:%i') AS data,
                    m.tipo,
                    m.valor,
                    c.nome_criterio AS criterio,
                    NULL AS responsavel,
                    m.descricao_observacao AS observacao
                FROM movimentacao AS m
                INNER JOIN conta AS co ON co.id_conta = m.id_conta
                INNER JOIN criterio AS c ON c.id_criterio = m.id_criterio
                WHERE co.ra = ?
                ORDER BY m.data_hora DESC, m.id_movimentacao DESC
            `, [ra]);

            movimentacoes = rows;
        }

        res.render("extrato-estudante", {
            estudantes,
            estudanteSelecionado,
            movimentacoes
        });
    } catch (erro) {
        console.error("Erro ao consultar extrato:", erro);
        res.status(500).send("Erro ao consultar extrato.");
    }
}

async function redirecionarConsultaEstudante(req, res) {
    const ra = normalizarRa(req.params.ra);
    return res.redirect(`/saldo?estudanteId=${encodeURIComponent(ra)}`);
}

module.exports = {
    exibirLogin,
    processarLogin,
    sair,
    exibirPainel,
    exibirCadastroEstudante,
    criarEstudante,
    exibirListaEstudantes,
    exibirLancamentoLRCash,
    criarLancamentoLRCash,
    exibirSaldo,
    exibirExtrato,
    redirecionarConsultaEstudante
};

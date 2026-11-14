-- Formiguinha Decola - Validações
-- 03_validation.sql

USE formiguinha_decola;

-- 1) Quantidade de registros por turma.
SELECT
    t.nome_turma,
    COUNT(a.ra) AS quantidade_alunos
FROM turma t
LEFT JOIN aluno a ON a.id_turma = t.id_turma
GROUP BY t.id_turma, t.nome_turma
ORDER BY t.nome_turma;

-- 2) Conferência de alunos + conta.
SELECT
    a.ra,
    a.nome,
    t.nome_turma,
    c.id_conta,
    c.status,
    c.saldo
FROM aluno a
JOIN turma t ON t.id_turma = a.id_turma
JOIN conta c ON c.ra = a.ra
ORDER BY a.nome
LIMIT 20;

-- 3) Extrato de um aluno de teste.
SELECT
    a.ra,
    a.nome,
    m.data_hora,
    cr.nome_criterio AS criterio,
    m.tipo,
    m.valor,
    m.descricao_observacao
FROM aluno a
JOIN conta c ON c.ra = a.ra
JOIN movimentacao m ON m.id_conta = c.id_conta
JOIN criterio cr ON cr.id_criterio = m.id_criterio
WHERE a.ra = '000120887748'
ORDER BY m.data_hora;

-- 4) Saldo calculado pelas movimentações, para conferir o campo conta.saldo.
SELECT
    a.ra,
    a.nome,
    c.saldo AS saldo_armazenado,
    COALESCE(
        SUM(
            CASE
                WHEN m.tipo = 'ENTRADA' THEN m.valor
                ELSE -m.valor
            END
        ),
        0.00
    ) AS saldo_calculado
FROM aluno a
JOIN conta c ON c.ra = a.ra
LEFT JOIN movimentacao m ON m.id_conta = c.id_conta
GROUP BY a.ra, a.nome, c.saldo
ORDER BY a.nome
LIMIT 20;

-- 5) Teste rápido de integridade.
SELECT
    COUNT(*) AS total_alunos,
    COUNT(DISTINCT ra) AS ras_unicos,
    COUNT(DISTINCT qr_code) AS qrcodes_unicos
FROM aluno;

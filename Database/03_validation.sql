-- Conferencia da base ficticia. Nao altera dados.
USE formiguinha_decola_demo;

SELECT a.nome, t.nome_turma, c.saldo,
       COALESCE(SUM(CASE WHEN m.tipo = 'ENTRADA' THEN m.valor
                         WHEN m.tipo = 'SAIDA' THEN -m.valor
                         ELSE 0 END), 0) AS saldo_calculado
FROM aluno a
JOIN turma t ON t.id_turma = a.id_turma
JOIN conta c ON c.ra = a.ra
LEFT JOIN movimentacao m ON m.id_conta = c.id_conta
WHERE a.ra IN ('000000000001', '000000000002', '000000000003')
GROUP BY a.ra, a.nome, t.nome_turma, c.saldo
ORDER BY a.ra;

-- Formiguinha Decola: dados ficticios para MySQL local.
-- Nao executar no Railway.
USE formiguinha_decola_demo;

START TRANSACTION;

INSERT INTO turma (nome_turma) VALUES ('DEMO-A'), ('DEMO-B');

INSERT INTO aluno (ra, nome, id_turma, qr_code) VALUES
    ('000000000001', 'Estudante Ficticio 01',
        (SELECT id_turma FROM turma WHERE nome_turma = 'DEMO-A'), HEX(RANDOM_BYTES(16))),
    ('000000000002', 'Estudante Ficticio 02',
        (SELECT id_turma FROM turma WHERE nome_turma = 'DEMO-A'), HEX(RANDOM_BYTES(16))),
    ('000000000003', 'Estudante Ficticio 03',
        (SELECT id_turma FROM turma WHERE nome_turma = 'DEMO-B'), HEX(RANDOM_BYTES(16)));

INSERT INTO conta (ra, saldo) VALUES
    ('000000000001', 10.00), ('000000000002', 8.00), ('000000000003', 0.00);

INSERT INTO criterio (nome_criterio) VALUES
    ('Presenca demonstrativa'), ('Compra demonstrativa');

INSERT INTO movimentacao (valor, tipo, id_conta, id_criterio) VALUES
    (15.00, 'ENTRADA', (SELECT id_conta FROM conta WHERE ra = '000000000001'),
        (SELECT id_criterio FROM criterio WHERE nome_criterio = 'Presenca demonstrativa')),
    (5.00, 'SAIDA', (SELECT id_conta FROM conta WHERE ra = '000000000001'),
        (SELECT id_criterio FROM criterio WHERE nome_criterio = 'Compra demonstrativa')),
    (8.00, 'ENTRADA', (SELECT id_conta FROM conta WHERE ra = '000000000002'),
        (SELECT id_criterio FROM criterio WHERE nome_criterio = 'Presenca demonstrativa'));

COMMIT;

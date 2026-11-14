# Formiguinha Decola — Banco de Dados

Bruno e quem vai fazer o front, tem esse readme aqui pra dar uma auxiliada sobre o banco, qualquer coisa chama no zap.

## Arquivos

- `01_schema.sql` — cria o banco e todas as tabelas, chaves, índices e constraints.
- `02_seed.sql` — popula turmas, os 191 alunos da planilha , contas, critérios, um usuário de teste e algumas movimentações.
- `03_validation.sql` — consultas para conferir cardinalidades, contas, extrato e cálculo de saldo.

## Ordem de execução

1. Execute `01_schema.sql`.
2. Execute `02_seed.sql`.
3. Execute `03_validation.sql` para conferir os resultados.

## Decisões principais

- RA: `CHAR(12)` porque os dados fornecidos têm exatamente 12 dígitos e possuem zeros à esquerda.
- QR Code: `VARCHAR(64) UNIQUE NOT NULL`. O banco guarda o token; a imagem do QR deve ser gerada pelo backend/frontend/API posteriormente.
- Valores monetários: `DECIMAL(10,2)` em vez de `FLOAT`, para evitar imprecisão de ponto flutuante.
- Telefone: `VARCHAR(20) NULL`, permitindo diferentes formatos sem armazenar como número.
- `MOVIMENTACAO.tipo`: `ENTRADA` ou `SAIDA`; o valor permanece positivo e o tipo indica a direção.
- `CONTA.saldo`: O backend deve atualizá-lo de forma transacional ao registrar uma movimentação, e o saldo também pode ser conferido pela soma das movimentações.
- Exclusões usam `RESTRICT` nas relações financeiras para não apagar histórico de movimentações acidentalmente.

## Divergências tratadas

 `USUARIO` e `CRITERIO`, embora eles não apareçam nos diagramas atuais enviados. eles foram incluídos no banco, e `CRITERIO` foi ligado a `MOVIMENTACAO` conforme a especificação escrita.

A planilha  contém registros para 6 turmas: 6A, 6B, 7A, 8A, 9A, 9B. As demais abas existentes não tinham alunos e, portanto, não foram cadastradas como turmas com dados de teste.

## Usuário de teste

Email: `teste@formiguinha.local`  
Senha: `Formiguinha@123`

E bruno o valor armazenado no banco é um hash bcrypt de teste; o backend não deve armazenar senha em texto puro.

## Observação sobre os dados dos alunos

A tabela `aluno` recebe os 191 registros presentes na planilha fornecida. Telefone e data de nascimento ficam `NULL` porque esses campos não foram fornecidos ainda.

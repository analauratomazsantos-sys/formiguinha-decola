# Formiguinha Decola

Projeto Integrador — Banco Formigueiro.

## Stack

- Node.js
- Express
- EJS
- MySQL 8
- mysql2
- bcryptjs
- express-session

## 1. Banco de dados

No MySQL, execute na ordem:

1. `01_schema.sql`
2. `02_seed.sql`
3. `03_validation.sql` (opcional, para validação)

O banco utilizado pelo sistema é `formiguinha_decola`.

O `02_seed.sql` já cria um usuário de teste:

- E-mail: `teste@formiguinha.local`
- Senha: `Formiguinha@123`

Use somente os dados fictícios do projeto durante o desenvolvimento.

## 2. Configuração do backend

Abra um terminal dentro da pasta do projeto:

```bash
npm install
```

Copie `.env.example` para `.env` e ajuste principalmente:

```text
DB_HOST=localhost
DB_PORT=3306
DB_USER=root
DB_PASSWORD=sua_senha_do_mysql
DB_NAME=formiguinha_decola
SESSION_SECRET=uma-chave-grande
PORT=3000
```

Se o seu MySQL não tiver senha, deixe `DB_PASSWORD=` vazio.

## 3. Executar

Para desenvolvimento:

```bash
npm run dev
```

Ou:

```bash
npm start
```

Depois abra:

```text
http://localhost:3000
```

## 4. Fluxo implementado

O backend integra as telas existentes com o banco:

- Login com sessão e senha criptografada;
- Listagem de estudantes;
- Cadastro de estudante;
- Criação automática da conta do estudante;
- Geração de QR Code/token;
- Lançamento de LRCash;
- Atualização transacional do saldo;
- Consulta de saldo;
- Extrato de movimentações;
- Logout.

## 5. Observação sobre responsável

A tabela `movimentacao` atualmente não possui uma coluna que relacione a movimentação ao `usuario` responsável. Por isso o extrato não inventa um responsável e exibe `—` para esse campo.

Se o requisito do projeto passar a exigir auditoria por usuário, o banco deverá receber uma chave estrangeira para `usuario` e o backend poderá gravar essa informação.

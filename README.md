# Formiguinha Decola

Projeto Integrador — Banco Formigueiro.

Aplicação Web desenvolvida para apoiar o Banco Formigueiro e o controle das movimentações de LRCash.

## Objetivo

O projeto busca apoiar o acompanhamento e o incentivo à frequência e à realização das atividades escolares por meio de uma moeda virtual chamada LRCash.

## Funcionalidades do primeiro MVP

* Login de acesso ao sistema.
* Painel principal.
* Cadastro de estudantes e vínculo com a turma.
* Consulta da lista de estudantes.
* Registro de créditos de LRCash.
* Consulta do saldo do estudante.
* Consulta do extrato de movimentações.

## Tecnologias utilizadas

* Node.js
* Express
* EJS
* HTML
* CSS
* JavaScript
* MySQL 8
* mysql2
* bcryptjs
* express-session
* Nodemon

## Integrantes e responsabilidades

* **Ana Laura Tomaz Santos:** front-end da aplicação Web.
* **Bianca Silva de Oliveira:** requisitos, regras do MVP e testes.
* **Bruno Josué Alves de Oliveira:** back-end da aplicação Web.
* **Marco Antonio Alves de Amorim:** banco de dados e modelagem.

## Como executar o projeto

### 1. Clonar o repositório

```powershell
git clone https://github.com/analauratomazsantos-sys/formiguinha-decola.git
cd formiguinha-decola
```

### 2. Instalar as dependências

```powershell
npm.cmd install
```

### 3. Configurar o banco de dados

No MySQL, execute os arquivos da pasta `Database` na seguinte ordem:

1. `01_schema.sql`
2. `02_seed.sql`
3. `03_validation.sql` (opcional, para validação)

O banco utilizado pelo sistema é `formiguinha_decola`.

### 4. Configurar o backend

Crie um arquivo `.env` na raiz do projeto com as configurações do seu ambiente:

```text
DB_HOST=localhost
DB_PORT=3306
DB_USER=root
DB_PASSWORD=sua_senha_do_mysql
DB_NAME=formiguinha_decola
SESSION_SECRET=uma-chave-grande
PORT=3000
```

O arquivo `.env` não deve ser enviado ao repositório.

### 5. Iniciar o servidor

```powershell
npm.cmd start
```

Depois abra:

```text
http://localhost:3000
```

## Fluxo implementado

O backend integra as telas existentes com o banco:

* Login com sessão e senha criptografada.
* Listagem de estudantes.
* Cadastro de estudante.
* Criação automática da conta do estudante.
* Geração de QR Code/token.
* Lançamento de LRCash.
* Atualização transacional do saldo.
* Consulta de saldo.
* Extrato de movimentações.
* Logout.

## Integração

A aplicação possui integração entre o front-end, back-end e banco de dados MySQL.

As principais funcionalidades do MVP foram testadas com o banco de dados local, incluindo autenticação, consulta de estudantes, consulta de saldo, lançamento de LRCash e consulta de extrato.

## Estrutura principal

```text
formiguinha-decola/

├── api/
│   ├── config/
│   ├── controllers/
│   ├── middlewares/
│   ├── routes/
│   └── views/
├── public/
│   ├── css/
│   └── js/
├── Database/
├── app.js
├── package.json
└── README.md
```

## Observação sobre responsável

A tabela `movimentacao` atualmente não possui uma coluna

# Formiguinha Decola

Aplicação Web desenvolvida para apoiar o Banco Formigueiro e o controle das movimentações de LRCash.

## Objetivo

O projeto busca apoiar o acompanhamento e o incentivo à frequência e à realização das atividades escolares por meio de uma moeda virtual chamada LRCash.

## Funcionalidades do primeiro MVP

- Login de acesso ao sistema.
- Painel principal.
- Cadastro de estudantes e vínculo com a turma.
- Consulta da lista de estudantes.
- Registro de créditos de LRCash.
- Consulta do saldo do estudante.
- Consulta do extrato de movimentações.

## Situação atual

### Front-end

- [x] Tela de login.
- [x] Painel principal.
- [x] Tela de cadastro de estudantes.
- [x] Tela de listagem de estudantes.
- [x] Tela de lançamento de LRCash.
- [x] Tela de consulta de saldo.
- [x] Tela de consulta de extrato.
- [x] Validações básicas dos formulários.

### Integração

- [ ] Integrar a autenticação com o back-end.
- [ ] Salvar e consultar estudantes no banco de dados.
- [ ] Registrar movimentações de LRCash.
- [ ] Consultar o saldo do estudante.
- [ ] Consultar o extrato de movimentações.
- [ ] Executar os testes integrados do MVP.

## Tecnologias utilizadas

- Node.js
- Express
- EJS
- HTML
- CSS
- JavaScript
- MySQL2
- Nodemon

## Integrantes e responsabilidades

- **Ana Laura Tomaz Santos:** front-end da aplicação Web.
- **Bianca Silva de Oliveira:** requisitos, regras do MVP e testes.
- **Bruno Josué Alves de Oliveira:** back-end da aplicação Web.
- **Marco Antonio Alves de Amorim:** banco de dados e modelagem.

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

### 3. Iniciar o servidor

```powershell
npm.cmd run dev
```

### 4. Abrir no navegador

```text
http://localhost:3000
```

## Estrutura principal

```text
formiguinha-decola/
├── api/
│   ├── controllers/
│   ├── routes/
│   └── views/
├── public/
│   ├── css/
│   └── js/
├── app.js
├── package.json
└── README.md
```

## Proteção de dados

Durante o desenvolvimento e os testes, devem ser utilizados somente dados fictícios. Dados pessoais de estudantes não devem ser publicados no repositório ou inseridos em evidências visuais.

## Status do projeto

Front-end estático concluído. A integração com o back-end e com o banco de dados está em desenvolvimento.
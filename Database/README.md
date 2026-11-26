# Banco de demonstração — Formiguinha Decola

Use **somente uma instância local de MySQL 8**, sem conexão com o Railway. A base de demonstração se chama `formiguinha_decola_demo`.

1. Em uma base local nova, execute `01_schema.sql`, depois `02_seed.sql`.
2. Execute `03_validation.sql` para conferir três alunos fictícios, dois grupos e os saldos de demonstração (10,00; 8,00; 0,00 LRCash).
3. Para usar a aplicação com essa base, aponte o arquivo `.env` local para ela (`DB_HOST=localhost` e `DB_NAME=formiguinha_decola_demo`). Use credenciais locais e uma chave de sessão próprias. Nunca versione o `.env`.

O seed não inclui usuário de acesso, senha reutilizável, dados escolares reais ou credenciais da produção. Para usar o login, cadastre um usuário exclusivo na tabela `usuario` da base de demonstração com um hash bcrypt gerado para uma senha local própria (ver `senha_hash` no esquema).

Esta ramificação é um passo de preparação. O histórico anterior, os pull requests e as outras ramificações ainda não foram higienizados. Não altere a visibilidade do repositório antes de concluir essa revisão.

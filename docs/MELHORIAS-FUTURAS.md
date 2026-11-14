# Formiguinha Decola — melhorias futuras

## Identificação do aluno no Armazém do Formigueiro

Registro da decisão de Ana em 17/10/2026.

Para o evento de 23/10/2026, a orientação definida é solicitar um documento com
foto e conferir presencialmente a identidade do aluno no caixa, comparando o
nome com a conta localizada pelo QR Code.

A implantação de senha individual para autorizar compras foi adiada para uma
melhoria futura. Essa proteção ainda não está implementada.

Requisitos para retomar essa melhoria:

- Definir uma senha individual independente do QR e dos seus seis primeiros caracteres.
- Confirmar a identidade com um professor responsável no primeiro cadastro e na redefinição da senha.
- Armazenar somente um hash da senha e limitar tentativas incorretas.
- Definir uma recuperação de acesso acompanhada pela equipe responsável.
- Validar a acessibilidade do fluxo para os alunos que precisem de apoio.

O QR identifica a conta; sua apresentação, isoladamente, não comprova a
identidade de quem está usando o cartão.

## Organização das fotos e do caixa

Decisão de Ana em 17/10/2026, implementada na atualização v4:

- O título da tela e do acesso no painel é **Caixa do Armazém**.
- O caixa mostra a foto somente para conferir a identidade do estudante.
- O cadastro e a substituição da foto ficam em **Fotos dos estudantes**, no painel administrativo.
- Somente o administrador pode cadastrar ou trocar fotos. O Portal do Aluno não oferece essa edição e suas sessões são recusadas nas rotas administrativas.
- As fotos já cadastradas permanecem no banco, vinculadas a `id_aluno`.

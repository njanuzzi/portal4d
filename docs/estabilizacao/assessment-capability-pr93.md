# PR 93 — Capability token para rascunhos de instrumentos

Data: 17/09/2026

## Problema

Os 8 questionários públicos nativos usavam o próprio `assessment_id` (UUID) como credencial implícita para:

- retomar um rascunho;
- ler respostas parciais;
- salvar/alterar respostas enquanto `status = 'in_progress'`.

O UUID tem boa entropia e não é trivial de adivinhar, mas é um identificador interno. Se vazasse por log, print, suporte ou ferramenta interna, também funcionava como autorização.

## Novo modelo

Separação explícita:

- `assessment_id`: identificador do registro;
- `edit_token`: capability secreta necessária para retomar/salvar.

O navegador armazena ambos no `localStorage`.

## Armazenamento do token

Nova tabela privada:

`app_private.assessment_edit_tokens`

Campos:

- `instrument`;
- `assessment_id`;
- `token_hash`;
- `created_at`.

O token em texto puro nunca é salvo no banco. O backend armazena somente SHA-256.

## RPCs internas

### issue_assessment_edit_token

- gera dois UUIDs aleatórios concatenados;
- remove hífens;
- grava somente SHA-256;
- retorna o token uma única vez para a Edge Function.

### verify_assessment_edit_token

- calcula SHA-256 do token recebido;
- compara com o hash privado;
- retorna boolean.

As duas RPCs:

- são `SECURITY DEFINER`;
- têm `search_path` fixo;
- não podem ser executadas por `PUBLIC`, `anon` ou `authenticated`;
- são executáveis apenas por `service_role`.

## Instrumentos cobertos

- Esquemas / YSQ (`schema`)
- SMI
- BFI
- MARQ
- RBS
- ECR
- ENSRA
- ETAS

Total:

- 8 Edge Functions `*-assessment-start`;
- 8 Edge Functions `*-assessment-save`;
- 8 páginas públicas de questionário.

## Fluxo de criação

1. `*-assessment-start` cria o rascunho.
2. Emite `edit_token`.
3. Banco guarda só o hash.
4. Frontend recebe `assessment_id + edit_token`.
5. Ambos são salvos juntos no `localStorage`.

Se a emissão do token falhar, o rascunho recém-criado é removido para não deixar um registro sem capability.

## Retomada

Para retomar:

- `resume_assessment_id`;
- `resume_token`.

A Edge Function valida a capability antes de buscar/devolver o conteúdo do rascunho.

Token ausente ou inválido retorna `not_found` sem revelar se o UUID existe.

## Salvamento

Cada `*-assessment-save` exige:

- `assessment_id`;
- `edit_token`;
- respostas;
- `finish`.

A capability é validada antes de ler ou alterar o assessment.

Mesmo com token válido, o endpoint continua aceitando apenas registros `in_progress`. Depois de `calculated`, o token não permite novas alterações.

## Rascunhos antigos

Antes desta PR existiam apenas 2 registros `in_progress`, ambos do SMI e ambos com 0 respostas.

Eles não recebem token retroativo e deixam de ser retomáveis. Nenhum conteúdo respondido é perdido. Os registros permanecem no banco como histórico técnico; o frontend cria um novo rascunho quando necessário.

## Teste de infraestrutura já executado

Foi feito smoke test transacional em produção com `ROLLBACK`:

- criação temporária da tabela privada;
- emissão de token;
- validação de token correto;
- rejeição de token incorreto;
- confirmação de que `anon` e `authenticated` não executam as RPCs;
- rollback removeu integralmente a estrutura temporária.

## Deploy

A migration deve ser aplicada antes de publicar as 16 Edge Functions novas, porque elas dependem das RPCs de capability.

Ordem:

1. merge + Vercel verde;
2. aplicar migration;
3. deploy dos 8 `start`;
4. deploy dos 8 `save`;
5. smoke test de um instrumento paginado (SMI ou YSQ);
6. smoke test de um instrumento de página única (BFI);
7. validar que token inválido é rejeitado.

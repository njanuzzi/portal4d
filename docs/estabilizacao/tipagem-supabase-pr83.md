# PR 83 — Tipagem real do Supabase

Data: 2026-09-17

## Objetivo

Substituir o `Database` parcial mantido manualmente pelo contrato TypeScript derivado do schema real do projeto Supabase de produção, sem alterar banco, frontend, Edge Functions, RLS, Auth ou comportamento de runtime.

Projeto usado como fonte: `Portal4D` (`ojmaxsskczukdbxpaull`).

## Estado anterior

`src/lib/database.types.ts` declarava apenas uma parte do banco e alguns RPCs/tabelas recentes não existiam na tipagem. Isso levou a:

- chamadas válidas inferidas como `never`;
- casts para `SupabaseClient` sem schema (`untypedSupabase`);
- comentários no código dizendo que RPCs reais não existiam nos tipos;
- diferença entre o contrato TypeScript e o banco efetivamente usado em produção.

## Fonte de verdade

A tipagem foi reconciliada a partir da geração de tipos do próprio projeto Supabase em 17/09/2026.

O schema retornado possui:

- **57 tabelas** no schema `public`;
- **18 RPCs**;
- PostgREST **14.5**;
- relações/foreign keys representadas no contrato de tipos.

Entre os RPCs agora tipados estão:

- `submit_lead`;
- `validate_instrument_invite`;
- `validate_client_token`;
- `update_client_profile`;
- `get_client_diary_data`;
- `get_client_last_login` / `get_clients_last_login`;
- `record_client_login`;
- funções `record_*_view` e `record_*_acknowledgment`;
- `delete_client`;
- `check_account_role`;
- `is_therapist`.

## Estrutura adotada

### `src/lib/database.generated.types.ts`

Snapshot normalizado do schema real retornado pelo Supabase. Contém:

- `Database`;
- `Json`;
- todas as tabelas públicas;
- `Row`, `Insert`, `Update` e relações;
- RPCs e seus argumentos/retornos;
- helpers `Tables`, `TablesInsert`, `TablesUpdate`, `Enums`, `CompositeTypes` e `Constants`.

O arquivo é deliberadamente somente de tipos e não contém comportamento de runtime.

### `src/lib/database.types.ts`

Passa a funcionar como fachada de compatibilidade:

- reexporta o `Database` real e os helpers do snapshot;
- mantém temporariamente os aliases/interfaces históricos (`Profile`, `Diary`, `DiaryQuestion`, `DiaryEntry`, `EntryAnswer`, `Report`, `Roteiro` etc.) usados por telas e mocks existentes.

Isso permite que `src/lib/supabase.ts` continue importando `Database` do mesmo caminho, mas o cliente Supabase passe a conhecer o schema real sem uma refatoração simultânea de toda a UI.

## Fora do escopo desta PR

Esta PR **não**:

- altera o banco;
- aplica migrations;
- faz deploy de Edge Functions;
- altera RLS/Auth;
- muda consultas ou mutations em runtime;
- remove todos os casts `untypedSupabase` existentes;
- refatora os aliases históricos usados por telas/mocks;
- cria CI.

Os casts antigos podem ser removidos gradualmente depois que o novo contrato estiver em `main`; fazer isso nesta mesma PR aumentaria desnecessariamente o diff e misturaria reconciliação de schema com refatoração de código.

## Validação realizada

- projeto Supabase confirmado como `Portal4D` / `ojmaxsskczukdbxpaull`;
- geração de tipos feita diretamente contra o schema real;
- inventário conferido: 57 tabelas e 18 RPCs;
- `database.types.ts` mantém os exports nominais usados atualmente pelo frontend;
- nenhuma chamada de runtime foi alterada;
- nenhuma operação de escrita foi feita no Supabase.

### Limitação do ambiente

Não foi executado `npm run typecheck`/`npm run build` a partir de um checkout local neste ambiente. O repositório já possuía dívida de typecheck registrada no baseline da estabilização e o container disponível nesta sessão não tinha um checkout/dependências do projeto para executar essa verificação de forma confiável.

Por isso esta PR não declara `typecheck` ou `build` como executados. O objetivo aqui é corrigir a fonte dos tipos; erros antigos revelados pela tipagem real devem ser tratados em lotes pequenos nas etapas seguintes.

## Critério de conclusão

A PR 83 pode ser considerada concluída quando:

- o `Database` usado pelo cliente Supabase vier do snapshot do schema real;
- as 57 tabelas e os 18 RPCs atuais estiverem representados;
- os imports públicos usados pelo frontend continuarem existindo;
- não houver mudança de runtime ou de infraestrutura.

## Próxima etapa sugerida

Com a fonte de tipos corrigida, a próxima PR pode retirar os `untypedSupabase` que ficaram obsoletos e atacar os erros de typecheck por domínio, sem misturar isso com mudanças funcionais.
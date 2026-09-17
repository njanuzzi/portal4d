# PR 89 — Hardening do login / remoção de enumeração pré-login

Data: 17/09/2026

## Problema

A tela de login consultava `check_account_role(email)` antes de validar a senha.

Isso permitia diferenciar:

- e-mail inexistente;
- conta de cliente;
- conta de terapeuta.

Ou seja, um usuário não autenticado conseguia inferir existência e tipo da conta.

## Novo fluxo

1. Usuário escolhe a aba Cliente ou Terapeuta.
2. Informa e-mail e senha.
3. O Supabase valida as credenciais com `signInWithPassword`.
4. Somente após autenticação válida o frontend lê o próprio `profiles`.
5. Se o role da conta não corresponder à aba escolhida:
   - a sessão é encerrada imediatamente;
   - a interface orienta a trocar de aba.
6. Se e-mail/senha forem inválidos, a resposta permanece genérica.

Assim a orientação de UX é preservada sem revelar role ou existência da conta antes da prova de credenciais.

## AuthContext

`signIn()` passa a receber o role esperado.

Durante a autenticação, o evento `SIGNED_IN` automático não publica a sessão imediatamente para a UI. O contexto espera:

- credenciais válidas;
- profile existente;
- role válido;
- role compatível com a aba escolhida.

Só então atualiza `session`, `user` e `profile`.

Isso evita redirecionamento/flicker momentâneo para a área errada.

## check_account_role

A função não é apagada nesta PR para manter uma rota simples de rollback/investigação.

Mudanças:

- `SECURITY DEFINER -> SECURITY INVOKER`;
- remove `EXECUTE` de `PUBLIC`, `anon` e `authenticated`;
- mantém `EXECUTE` apenas para `service_role`.

Depois de um período estável, a função pode ser removida em uma limpeza futura.

## Teste de banco já executado

Antes da PR foi feito teste transacional em produção com rollback:

- a função foi temporariamente convertida para invoker;
- `anon` e `authenticated` perderam execução;
- `service_role` manteve execução;
- `ROLLBACK` restaurou integralmente o estado anterior.

## Efeito esperado no Security Advisor

Após aplicação:

- avisos anon SECURITY DEFINER: 7 -> 6;
- avisos authenticated SECURITY DEFINER: 15 -> 14.

A função deixa de aparecer nos dois grupos.

## Fora do escopo

- mudar recuperação de senha;
- remover as abas Cliente/Terapeuta;
- alterar rotas do app;
- alterar RLS de profiles;
- remover definitivamente `check_account_role`.

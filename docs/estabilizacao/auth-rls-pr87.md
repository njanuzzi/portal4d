# PR 87 — Auth e RLS hardening

Data: 17/09/2026

## Objetivo

Tratar os avisos de segurança restantes após a PR 86 sem misturar mudanças de fluxo de autenticação com mudanças de banco.

## 1. bot_conversations

Estado observado:

- RLS habilitado;
- nenhuma policy;
- 0 linhas;
- nenhuma Edge Function ou frontend atual escreve ou lê essa tabela;
- documentação histórica já a descreve como esboço/desativada;
- apesar do deny-all implícito do RLS, `anon` e `authenticated` ainda possuíam grants amplos de tabela.

Decisão:

- manter a tabela dormente;
- não criar acesso funcional;
- revogar todos os privilégios de tabela de `anon` e `authenticated`;
- criar uma policy deny-all explícita para documentar a intenção e evitar que o estado "RLS sem policy" pareça omissão;
- manter `service_role` disponível para backend/admin confiável.

A migration contém assertions e falha se os privilégios finais não forem os esperados.

## 2. OTP de e-mail

O Security Advisor informa que a expiração atual do OTP de e-mail é superior a 1 hora.

A documentação atual do Supabase recomenda reduzir esse tempo porque uma janela maior aumenta a oportunidade de tentativa/abuso.

### Target operacional

- configurar **Email OTP Expiration = 1800 segundos (30 minutos)**.

Essa configuração é feita no Dashboard do Supabase em Auth > Providers > Email. O conector disponível nesta sessão não expõe mutação das configurações de Auth, portanto esta PR **não finge aplicar essa mudança pelo banco**.

Depois da alteração no Dashboard, rodar novamente o Security Advisor e confirmar que `auth_otp_long_expiry` desapareceu.

## 3. Leaked Password Protection

O Advisor informa que a proteção contra senhas comprometidas está desativada.

O Supabase usa o Pwned Passwords / HaveIBeenPwned para bloquear senhas conhecidas em vazamentos. A documentação informa que esse recurso depende de plano compatível.

### Target operacional

- habilitar **Leaked Password Protection**, se disponível no plano atual;
- não alterar outras regras de senha na mesma etapa.

Depois da alteração, rodar novamente o Security Advisor e confirmar que `auth_leaked_password_protection` desapareceu.

## 4. Fora do escopo

- alterar o fluxo pré-login de `check_account_role`;
- remover `SECURITY DEFINER` das RPCs públicas intencionais;
- alterar políticas de outras tabelas;
- reativar `bot_conversations`;
- alterar requisitos de senha além da proteção contra senhas vazadas.

## Validação

Antes do merge/aplicação:

- TypeScript;
- SQL security guard existente;
- Vercel preview;
- revisão do diff.

Depois da aplicação da migration:

- confirmar ausência de privilégios de `anon` / `authenticated` em `bot_conversations`;
- confirmar policy deny-all;
- rodar Security Advisor;
- confirmar que o aviso `rls_enabled_no_policy` desapareceu.

Os dois itens de Auth só podem ser considerados concluídos depois da alteração explícita no Dashboard e nova leitura do Advisor.

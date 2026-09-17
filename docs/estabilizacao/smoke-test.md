# Smoke test do Portal4D

Este checklist deve ser executado em preview e, após deploy relevante, nos fluxos afetados em produção. Usar contas e dados de teste dedicados — nunca dados clínicos reais para validação técnica.

## 1. Acesso e autenticação

- [ ] Página pública `/` carrega sem erro.
- [ ] `/areamembros` abre a tela de login.
- [ ] Login de terapeuta redireciona para `/dashboard`.
- [ ] Login de cliente redireciona para `/home`.
- [ ] Conta de cliente não acessa rotas da terapeuta.
- [ ] Conta de terapeuta não cai em rotas de cliente por engano.
- [ ] Logout encerra a sessão e volta para área pública/login.
- [ ] Link de redefinição de senha válido funciona.
- [ ] Link expirado mostra erro amigável e não fica em loading infinito.

## 2. Gestão de clientes

- [ ] Lista de clientes abre.
- [ ] Ficha de cliente abre.
- [ ] Cadastro de cliente de teste conclui sem usuário Auth órfão.
- [ ] Edição de dados básicos funciona.
- [ ] Vínculo de diário pode ser visualizado/alterado.
- [ ] Último acesso do cliente continua sendo registrado.

## 3. Diário e metas

- [ ] Cliente visualiza o diário vinculado correto.
- [ ] Diário respeita a janela de disponibilidade configurada.
- [ ] Registro do dia pode ser salvo.
- [ ] Histórico mostra registros anteriores.
- [ ] Um registro salvo permanece após recarregar a página.
- [ ] Meta confirmada é exibida corretamente.
- [ ] Sugestão de meta do bot não vira meta oficial antes da confirmação.
- [ ] Renovação/ciclo de meta mantém a regra atual.

## 4. Relatórios

### Sessão
- [ ] Terapeuta abre lista de relatórios de sessão.
- [ ] Um relatório de teste abre no editor.
- [ ] Marcar como revisado funciona.
- [ ] Publicar torna o relatório visível ao cliente de teste.
- [ ] Cliente não visualiza `qa_notes` ou conteúdo interno da terapeuta.

### Fechamento de ciclo
- [ ] Lista de fechamentos abre.
- [ ] Geração, quando testada, usa somente dados da conta de teste.
- [ ] Publicação torna somente o conteúdo previsto visível ao cliente.

### Esquemas / SMI
- [ ] Relatório técnico continua acessível apenas à terapeuta.
- [ ] Devolutiva publicada aparece ao cliente correto.
- [ ] Status de leitura continua sendo registrado.

## 5. Instrumentos

Para cada instrumento em uso (Esquemas, SMI, BFI, MARQ, RBS, ECR-R, ENSRA-R, ETAS-R):

- [ ] Tela pública abre.
- [ ] Link genérico abre fluxo de identificação quando aplicável.
- [ ] Link individual/token identifica o cliente correto.
- [ ] Resposta fica associada ao cliente correto.
- [ ] Repositório da terapeuta lista a submissão.
- [ ] Tela de detalhe abre e os escores são exibidos.

## 6. Agendamento

- [ ] Página de agendamento do cliente abre.
- [ ] Widget/link do Cal.com carrega.
- [ ] Agendamento de teste aparece na lista após sincronização/webhook.
- [ ] Reagendamento não mantém sessão antiga como confirmada indevidamente.
- [ ] Sessão passada aparece com estado esperado.

## 7. Assistente com IA

- [ ] Cliente sem assinatura ativa recebe comportamento de assinatura exigida.
- [ ] Cliente de teste com assinatura ativa consegue enviar mensagem.
- [ ] Resposta aparece e persiste após recarregar.
- [ ] Conversa do cliente A não aparece ao cliente B.
- [ ] Sugestão de meta permanece pendente até aceite.
- [ ] Fluxo de risco deve ser testado apenas em ambiente/conta controlada, com frase sintética de teste e sem gerar acionamentos externos inesperados.

## 8. Integrações críticas

- [ ] Sincronização com Notion não duplica sessão já importada.
- [ ] E-mail transacional de teste é enviado quando o fluxo exigir.
- [ ] Webhooks relevantes continuam respondendo com status esperado.
- [ ] ManyChat/WhatsApp não são usados em smoke test se isso disparar mensagem real; validar apenas em contato dedicado de teste.

## 9. Páginas públicas

- [ ] `/sobre`
- [ ] `/conteudos`
- [ ] artigo individual em `/conteudos/:slug`
- [ ] `/protocolo4d`
- [ ] `/atendimento`
- [ ] `/sessao-avaliacao`
- [ ] `/produtos`
- [ ] `/quizinstagram`
- [ ] `/manualportalcliente`
- [ ] `/tree`

Todas devem carregar sem erro de console bloqueante e sem redirecionar indevidamente para login.

## 10. Critério de bloqueio de deploy

Interromper o deploy/merge e investigar se ocorrer qualquer um destes casos:

- cliente acessa dado de outro cliente;
- cliente acessa conteúdo técnico/interno da terapeuta;
- login fica impossibilitado para terapeuta ou cliente;
- diário deixa de salvar ou passa a salvar para usuário errado;
- relatório publicado aparece para usuário errado;
- instrumento associa resposta ao cliente errado;
- migration remove/transforma dados sem plano de recuperação;
- webhook crítico passa a falhar de forma sistemática;
- build ou typecheck piora em relação ao baseline aceito da etapa atual.
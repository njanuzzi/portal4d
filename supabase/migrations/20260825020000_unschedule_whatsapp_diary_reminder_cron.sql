-- O lembrete diário via cron (whatsapp-send-reminder) mandava mensagem
-- "normal" pelo Manychat, que só funciona dentro da janela de 24h desde a
-- última mensagem do cliente — a mesma limitação que os templates têm. A
-- terapeuta vai construir esse lembrete nativamente no Manychat (Automação
-- diária + tag diario_optin), então o cron antigo é desativado.
select cron.unschedule(3);

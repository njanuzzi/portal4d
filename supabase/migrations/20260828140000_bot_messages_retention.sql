-- Fase 1 da V3 do bot: retenção de 90 dias pra bot_messages (decisão LGPD-consciente — não guardar
-- conversas indefinidamente, diferente do resto do app que não tem expiração).
select cron.schedule(
  'bot-messages-retention',
  '0 4 * * *', -- todo dia às 4h UTC (1h da manhã em Brasília)
  $$ delete from public.bot_messages where created_at < now() - interval '90 days'; $$
);

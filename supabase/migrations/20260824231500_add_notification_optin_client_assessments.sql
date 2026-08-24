-- Captura a intenção de receber notificação (e-mail/WhatsApp) sobre o
-- resultado do inventário — guardado por enquanto só como dado de opt-in
-- pra uso futuro, o disparo em si ainda não existe.
ALTER TABLE public.client_assessments
  ADD COLUMN wants_email_notification boolean,
  ADD COLUMN wants_whatsapp_notification boolean;

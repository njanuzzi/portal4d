-- Guarda as 3 respostas sim/não da sequência de opt-in do WhatsApp
-- (lembrete de diário, lembrete de agendamento, reflexões/avisos gerais) —
-- ficam permanentes no perfil, não na sessão (que é recriada a cada reenvio
-- de convite).
ALTER TABLE public.profiles
  ADD COLUMN whatsapp_diary_reminder_optin boolean,
  ADD COLUMN whatsapp_appointment_reminder_optin boolean,
  ADD COLUMN whatsapp_general_info_optin boolean;

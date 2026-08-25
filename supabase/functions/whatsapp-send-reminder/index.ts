import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

// Retirado — o lembrete de diário mandava mensagem "normal" pelo Manychat,
// que só funciona dentro da janela de 24h desde a última mensagem do
// cliente (mesma limitação dos templates). Agora é uma Automação diária
// nativa no Manychat, mirando a tag "diario_optin". O cron que chamava
// esta função foi desativado (ver migração unschedule_whatsapp_diary_reminder_cron).
serve(() => new Response("Gone — lembrete de diário agora é uma automação nativa no Manychat", { status: 410 }));

import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

// Retirado — o recebimento de mensagens do WhatsApp agora é feito pelo
// Manychat (função whatsapp-manychat-webhook), não mais direto pela API da
// Meta. Mantido apenas como stub inerte para o endpoint antigo não quebrar
// caso ainda esteja configurado em algum lugar.
serve(() => new Response("Gone — substituído por whatsapp-manychat-webhook", { status: 410 }));

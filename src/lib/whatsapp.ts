// Link de auto-ativação do WhatsApp — leva direto pro gatilho "Clique no
// link" configurado no Manychat, que dispara a automação de opt-in
// (Opt-in Whatsapp). Usado tanto na tela de confirmação do cadastro rápido
// quanto na do inventário de esquemas — as duas levam pro mesmo fluxo, por
// isso compartilham a mesma URL.
export const WHATSAPP_ACTIVATION_LINK = 'https://wa.me/16893360899?text=Formul%C3%A1rio%20enviado!';

// Link de confirmação de diário — mesmo número/gatilho do
// WHATSAPP_ACTIVATION_LINK acima, mas com um texto que a automação de
// "Confirmação de diário" no Manychat reconhece (Keyword "preenchi o
// diário" → External Request com keyword fixo "respondi", ver
// whatsapp-manychat-webhook). Usado tanto pra hoje quanto pra registros
// de dias anteriores vistos no histórico — por isso recebe a data como
// parâmetro em vez de ter o texto fixo.
export function buildDiaryConfirmationLink(dateLabel: string) {
  return `https://wa.me/16893360899?text=${encodeURIComponent(`Preenchi o diário de ${dateLabel}! 📔`)}`;
}

// Número de contato direto (WhatsApp da Núbia) — usado no botão flutuante
// do site e no CTA "Fale com a gente" do manual, pra dúvidas gerais.
const WHATSAPP_NUMBER = '5548988652228';

export function buildWhatsAppLink(message?: string) {
  return message ? `https://wa.me/${WHATSAPP_NUMBER}?text=${encodeURIComponent(message)}` : `https://wa.me/${WHATSAPP_NUMBER}`;
}

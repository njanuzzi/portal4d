// Número do WhatsApp Business conectado ao Manychat — usado para montar os
// links de auto-ativação que aparecem nas telas de confirmação do cadastro
// e do inventário de esquemas. Cada tela usa uma frase-gatilho diferente,
// mas as duas abrem uma conversa com o mesmo número/fluxo no Manychat.
const MANYCHAT_WHATSAPP_NUMBER = '15559457319';

export function buildWhatsAppActivationLink(text: string): string {
  return `https://wa.me/${MANYCHAT_WHATSAPP_NUMBER}?text=${encodeURIComponent(text)}`;
}

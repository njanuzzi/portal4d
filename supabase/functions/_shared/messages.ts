export const MESSAGES = {
  welcome: (name: string) =>
    `Olá, ${name}! 👋\n\nBem-vinda ao protocolo de acompanhamento do seu diário de Desbloqueio Comportamental.\n\nTodos os dias você receberá uma mensagem por aqui lembrando de preencher seu diário. Depois de preencher, é só responder *Respondi* para confirmar.\n\nSe em algum momento não responder, as mensagens pausam automaticamente — e retomam quando você mandar qualquer mensagem por aqui.\n\nVocê entendeu como funciona?\n\n👉 Responda *Entendi* para começar\n👉 Responda *Não entendi* se precisar de ajuda`,

  optinConfirmed:
    `Ótimo! ✅ Seu lembrete diário está ativado.\n\nA partir de agora você receberá uma mensagem todos os dias para preencher seu diário. Qualquer dúvida, sua terapeuta está à disposição.`,

  notUnderstood:
    `Sem problema! 🙂 Sua terapeuta será avisada e entrará em contato para explicar melhor.`,

  reminder: (name: string, appUrl: string) =>
    `Oi, ${name}! 📋\n\nSeu diário de hoje ainda não foi preenchido.\n\nAcesse aqui: ${appUrl}\n\nDepois é só responder *Respondi* para confirmar. 💙`,

  diaryConfirmed:
    `Registrado! ✅ Obrigada por manter seu protocolo em dia. Até amanhã! 💙`,

  invite: (name: string, link: string) =>
    `Olá, ${name}! 👋\n\nSua terapeuta ativou o acompanhamento pelo WhatsApp para o seu Protocolo 4D.\n\nClique no link abaixo para começar:\n${link}\n\nO link já deixa a mensagem pronta — é só enviar! 😊`,
};

export interface Produto {
  nome: string;
  descricao: string;
  link: string;
  slug?: string; // usado como id de âncora, ex: /produtos#sessao-avaliacao
}

// Para adicionar um novo produto, inclua um item aqui com nome, descrição e link.
export const PRODUTOS: Produto[] = [
  {
    nome: 'Sessão de Avaliação',
    descricao:
      'Sessão individual para identificar o padrão que está travando sua execução e definir se o Protocolo 4D faz sentido para o seu caso. É por aqui que o acesso ao protocolo acontece.',
    link: '#', // TODO: [preencher] link de agendamento/pagamento da sessão de avaliação
    slug: 'sessao-avaliacao',
  },
  {
    nome: 'Atendimento Individual — Protocolo 4D',
    descricao:
      'Método comportamental estruturado em 24 sessões ao longo de 6 meses, para quem sabe exatamente o que precisa fazer e mesmo assim não faz. Entrada por sessão de avaliação.',
    link: '/protocolo4d',
    slug: 'atendimento-individual',
  },
  // Comentados até os PDFs serem atualizados (checklist em conteudo-site/textos/produtos.txt) — não apagar.
  // {
  //   nome: 'Vença a Dependência Emocional',
  //   descricao: 'Programa para reconhecer e romper padrões de dependência emocional nos relacionamentos.',
  //   link: '#',
  // },
  // {
  //   nome: 'O Poder das Metas',
  //   descricao:
  //     'Ebook prático para quem define objetivos com clareza e não consegue sustentá-los. Trabalha o método progressivo, os padrões que sabotam a execução e as ferramentas de acompanhamento — em ciclos de 8 semanas.',
  //   link: '#', // TODO: link do Hotmart
  // },
];

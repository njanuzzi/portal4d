import { Link } from 'react-router-dom';
import { Button } from '../components/ui/Button';
import { MarketingLayout } from '../components/marketing/MarketingLayout';
import { Faq } from '../components/marketing/Faq';

const O_QUE_VOCE_SAI_SABENDO = [
  'Qual padrão específico está travando sua execução, nomeado com clareza — não um rótulo genérico como "ansiedade" ou "procrastinação"',
  'Se esse padrão é do tipo que o Protocolo 4D resolve, ou se o seu caso pede outro tipo de cuidado primeiro',
  'Um primeiro esboço de onde esse padrão começou e o que ele está protegendo ou tentando garantir',
  'Se faz sentido seguir para o atendimento individual — e por quê, com clareza suficiente pra você decidir sem pressão',
];

const FAQ_ITEMS = [
  {
    question: 'A sessão de avaliação já resolve alguma coisa, ou é só uma conversa de venda?',
    answer:
      'Não é uma conversa de venda — é uma sessão de trabalho real, com começo, meio e fim. Você sai dela com uma leitura concreta do seu padrão, mesmo que decida não seguir para o atendimento individual depois.',
  },
  {
    question: 'E se não fizer sentido seguir?',
    answer:
      'Então eu te digo isso diretamente, e indico o que buscar em vez disso. O Protocolo 4D não é a resposta certa pra todo padrão, e entrar em um processo de 6 meses sem necessidade não ajuda ninguém.',
  },
  {
    question: 'Preciso decidir na hora?',
    answer:
      'Não. Ao final da sessão você recebe minha leitura e minha recomendação, mas a decisão de seguir ou não é sua, no seu tempo.',
  },
  {
    question: 'Essa sessão substitui uma primeira consulta psicológica?',
    answer:
      'Não. É uma avaliação específica para o Protocolo 4D — um método comportamental estruturado, não atendimento psicológico clínico. Se o seu caso pedir isso, a orientação na sessão é de encaminhamento.',
  },
];

export function SessaoAvaliacao() {
  return (
    <MarketingLayout>
      {/* Hero */}
      <section className="bg-petrol-700 text-white">
        <div className="max-w-3xl mx-auto px-4 py-16 md:py-20">
          <p className="text-gold-300 text-xs font-semibold tracking-widest uppercase mb-4">
            Protocolo 4D · Sessão de Avaliação
          </p>
          <h1 className="font-serif text-4xl md:text-5xl leading-tight text-balance mb-6">
            Antes de decidir por 6 meses, a gente confirma se faz sentido em uma sessão.
          </h1>
          <p className="text-petrol-100 text-base md:text-lg leading-relaxed">
            A sessão de avaliação não é uma amostra grátis do atendimento, nem uma primeira sessão de
            terapia solta. É um espaço específico para mapear o padrão que te trouxe até aqui e decidir,
            os dois, se o Protocolo 4D é o caminho certo — ou se é outro.
          </p>
        </div>
      </section>

      {/* O que acontece */}
      <section className="max-w-3xl mx-auto px-4 py-16 space-y-6">
        <h2 className="font-serif text-2xl mb-2">O que acontece nessa sessão</h2>
        <p className="text-petrol-800/80 leading-relaxed">
          Quatro movimentos, na mesma sessão:
        </p>
        <ol className="space-y-4">
          {[
            {
              titulo: 'Você conta o que te trouxe aqui',
              texto:
                'Não é levantar anos de história — é descrever o padrão específico: onde ele trava, há quanto tempo se repete, o que você já tentou.',
            },
            {
              titulo: 'Eu identifico o mecanismo',
              texto:
                'A que tipo de padrão isso corresponde, e se há sinais de que seu caso precisa de outro tipo de cuidado antes de qualquer protocolo comportamental.',
            },
            {
              titulo: 'Te devolvo uma leitura direta',
              texto:
                'Não um diagnóstico genérico — uma leitura concreta de como esse padrão específico provavelmente está se sustentando na sua vida hoje.',
            },
            {
              titulo: 'Decidimos o próximo passo',
              texto:
                'Seguir para o atendimento individual (24 sessões, 6 meses), ou não seguir agora — com indicação do que buscar em vez disso.',
            },
          ].map((item, i) => (
            <li key={item.titulo} className="flex gap-4">
              <span className="shrink-0 w-8 h-8 rounded-full bg-petrol-700 text-gold-300 flex items-center justify-center font-mono text-sm">
                {i + 1}
              </span>
              <div>
                <h3 className="font-serif text-lg mb-1">{item.titulo}</h3>
                <p className="text-petrol-800/80 leading-relaxed">{item.texto}</p>
              </div>
            </li>
          ))}
        </ol>
      </section>

      {/* O que você sai sabendo */}
      <section className="bg-white border-y border-beige-300">
        <div className="max-w-3xl mx-auto px-4 py-16">
          <h2 className="font-serif text-2xl mb-6">O que você sai sabendo</h2>
          <ul className="space-y-3">
            {O_QUE_VOCE_SAI_SABENDO.map((item) => (
              <li key={item} className="text-petrol-800/80 leading-relaxed pl-4 border-l-2 border-gold-400">
                {item}
              </li>
            ))}
          </ul>
        </div>
      </section>

      {/* Estrutura */}
      <section className="max-w-3xl mx-auto px-4 py-16">
        <h2 className="font-serif text-2xl mb-6">Estrutura</h2>
        <dl className="grid sm:grid-cols-2 gap-4 mb-10">
          {[
            ['Duração', '[a definir]'],
            ['Formato', 'Online, ao vivo'],
            ['Preparo necessário', 'Nenhum — só disposição para descrever o padrão com honestidade'],
            ['Retorno com a decisão', 'Ainda na própria sessão'],
            ['Valor', '[a definir]'],
          ].map(([label, value]) => (
            <div key={label} className="bg-beige-100 border border-beige-300 rounded-xl p-4">
              <dt className="text-petrol-400 text-xs uppercase tracking-wide mb-1">{label}</dt>
              <dd className="text-petrol-900 text-sm">{value}</dd>
            </div>
          ))}
        </dl>

        <p className="text-petrol-800/80 leading-relaxed">
          Se fizer sentido seguir, a sessão de avaliação conta como entrada para o{' '}
          <Link to="/atendimento" className="text-petrol-700 underline hover:text-petrol-800">
            atendimento individual — Protocolo 4D
          </Link>
          . Se não fizer, você sai com a leitura do seu padrão e uma indicação do que buscar em vez
          disso.
        </p>
      </section>

      {/* FAQ */}
      <section className="bg-white border-y border-beige-300">
        <div className="max-w-3xl mx-auto px-4 py-16">
          <h2 className="font-serif text-2xl mb-6">Perguntas frequentes</h2>
          <Faq items={FAQ_ITEMS} />
        </div>
      </section>

      {/* CTA fechamento */}
      <section className="bg-petrol-700 text-white">
        <div className="max-w-3xl mx-auto px-4 py-16 text-center">
          <h2 className="font-serif text-3xl text-balance mb-8">
            Pronta para mapear o seu padrão?
          </h2>
          <a href="https://wa.me/" target="_blank" rel="noopener noreferrer">
            <Button variant="secondary" size="lg">Agendar sessão de avaliação</Button>
          </a>
        </div>
      </section>

      {/* Rodapé legal */}
      <div className="max-w-3xl mx-auto px-4 py-6">
        <p className="text-petrol-800/50 text-xs leading-relaxed">
          O Protocolo 4D é um método comportamental estruturado. Não constitui atendimento psicológico
          clínico, avaliação psicológica ou tratamento médico, e não substitui acompanhamento psicológico
          ou psiquiátrico.
        </p>
      </div>
    </MarketingLayout>
  );
}

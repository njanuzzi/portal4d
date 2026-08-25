import { Link } from 'react-router-dom';
import { Button } from '../components/ui/Button';
import { MarketingLayout } from '../components/marketing/MarketingLayout';
import { Faq } from '../components/marketing/Faq';

const O_QUE_VOCE_SAI_SABENDO = [
  'Qual padrão específico está travando sua execução, nomeado com clareza — não um rótulo genérico como "ansiedade" ou "procrastinação"',
  'De onde esse padrão vem e o que ele está protegendo ou tentando garantir',
  'Quais metas emocionais você precisa perseguir a partir de agora — a direção do seu processo, não só o diagnóstico dele',
  'Se esse padrão é do tipo que o Protocolo 4D resolve, ou se o seu caso pede outro tipo de cuidado primeiro',
  'Se faz sentido seguir para o atendimento individual — e por quê, com clareza suficiente pra você decidir sem pressão',
];

const FAQ_ITEMS = [
  {
    question: 'A sessão de avaliação já resolve alguma coisa, ou é só uma conversa de venda?',
    answer:
      'Não é uma conversa de venda — é uma sessão de trabalho real, com começo, meio e fim. Ela começa antes de nos falarmos, com o Inventário de Esquemas, e termina com você sabendo qual padrão te trava e quais metas emocionais precisa perseguir — mesmo que decida não seguir para o atendimento individual depois.',
  },
  {
    question: 'Preciso preencher alguma coisa antes da sessão?',
    answer:
      'Sim: ao confirmar e pagar, você recebe o Inventário de Esquemas, um questionário estruturado de 20 a 30 minutos. É ele que me permite chegar na sessão já com uma leitura preparada do seu padrão, em vez de gastar o tempo ao vivo levantando sua história do zero.',
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
      <section className="max-w-3xl mx-auto px-4 py-16 space-y-10">
        <div>
          <h2 className="font-serif text-2xl mb-2">O que acontece nessa sessão</h2>
          <p className="text-petrol-800/80 leading-relaxed">
            Não é uma conversa aberta pra ver no que dá. É um processo com começo definido antes de você
            nem me ver ao vivo.
          </p>
        </div>

        <div>
          <p className="text-gold-700 text-xs font-semibold tracking-widest uppercase mb-4">
            Antes da sessão
          </p>
          <ol className="space-y-4">
            {[
              {
                titulo: 'Você recebe o Inventário de Esquemas',
                texto:
                  'Ao confirmar e pagar a sessão, você recebe um questionário completo, baseado na Terapia dos Esquemas de Jeffrey Young, que mapeia com precisão os padrões emocionais que se repetem na sua vida — não é uma ficha de anamnese genérica, é um instrumento estruturado pra rastrear onde o seu travamento nasce.',
              },
              {
                titulo: 'Eu analiso suas respostas',
                texto:
                  'Antes de falarmos ao vivo, eu debruço sobre o que você escreveu e preparo a devolutiva: a que tipo de padrão isso corresponde, de onde ele provavelmente vem, e se há sinais de que seu caso pede outro tipo de cuidado antes de qualquer protocolo comportamental.',
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
        </div>

        <div>
          <p className="text-gold-700 text-xs font-semibold tracking-widest uppercase mb-4">
            Na sessão
          </p>
          <ol className="space-y-4">
            {[
              {
                titulo: 'Eu te devolvo a leitura, ao vivo',
                texto:
                  'Essa sessão não é pra você me contar sua história do zero — é pra eu te devolver o que enxerguei nela: o padrão nomeado com precisão, a função que ele cumpre, e por que ele continua ativo hoje.',
                n: 3,
              },
              {
                titulo: 'Você sai com direção, não só com diagnóstico',
                texto:
                  'Mesmo sendo uma sessão única, você sai dali sabendo qual padrão te trava e quais metas emocionais precisa perseguir a partir de agora. O trabalho de reconstruir o comportamento na prática — repetir, sustentar, consolidar — acontece dentro do Protocolo 4D. Mas a direção, você já leva no mesmo dia.',
                n: 4,
              },
            ].map((item) => (
              <li key={item.titulo} className="flex gap-4">
                <span className="shrink-0 w-8 h-8 rounded-full bg-petrol-700 text-gold-300 flex items-center justify-center font-mono text-sm">
                  {item.n}
                </span>
                <div>
                  <h3 className="font-serif text-lg mb-1">{item.titulo}</h3>
                  <p className="text-petrol-800/80 leading-relaxed">{item.texto}</p>
                </div>
              </li>
            ))}
          </ol>
        </div>
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
            ['Duração da sessão', '[a definir]'],
            ['Formato', 'Online, ao vivo'],
            ['Antes da sessão', 'Inventário de Esquemas (20 a 30 minutos, respondido com calma)'],
            ['Retorno com a direção', 'Ainda na própria sessão'],
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

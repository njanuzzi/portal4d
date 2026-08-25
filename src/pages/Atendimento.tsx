import { Link } from 'react-router-dom';
import { ArrowRight } from 'lucide-react';
import { Button } from '../components/ui/Button';
import { MarketingLayout } from '../components/marketing/MarketingLayout';
import { Faq } from '../components/marketing/Faq';

const ETAPAS = ['Entrevista Inicial', 'Regulação', 'Desbloqueio', 'Execução', 'Consolidação', 'Autonomia'];

const FAQ_ITEMS = [
  {
    question: 'Não dá pra fazer em menos tempo?',
    answer:
      'Dá para entender em menos tempo. A entrevista inicial bem feita acontece nas primeiras semanas. O que não comprime é a repetição: o comportamento novo precisa acontecer várias vezes, em situações reais, com acompanhamento — senão o padrão antigo volta assim que o processo termina. Encurtar o protocolo não acelera o resultado, só antecipa a recaída.',
  },
  {
    question: 'Seis meses não é muito?',
    answer:
      'Comparado a quanto tempo esse padrão já está te custando, não. A pergunta útil não é "quanto tempo dura", é "quando termina". Aqui termina: 6 meses, 24 sessões, data definida. O formato aberto, sem prazo, é o que costuma durar anos.',
  },
  {
    question: 'E se eu resolver antes?',
    answer:
      'As etapas finais não são conteúdo extra — são o que faz o resultado se sustentar sem mim. Resolver antes e sair antes costuma significar voltar ao ponto de partida em alguns meses. O protocolo é fechado justamente para você não precisar dele de novo.',
  },
];

const DIFERENCIAL = [
  { aberto: 'Tempo indeterminado', protocolo: '6 meses, 24 sessões, encerramento previsto' },
  { aberto: 'Pauta definida no dia', protocolo: 'Percurso definido desde a entrevista inicial' },
  { aberto: 'O trabalho acontece na sessão', protocolo: 'O trabalho acontece entre as sessões — a sessão organiza' },
  { aberto: 'Evolução percebida subjetivamente', protocolo: 'Evolução registrada em relatório mensal' },
  { aberto: 'Foco em compreensão', protocolo: 'Foco em execução: entender é a primeira etapa, nunca a última' },
  { aberto: 'Atendimento contínuo e aberto', protocolo: '6 a 8 pessoas simultâneas, entrada por avaliação' },
];

export function Atendimento() {
  return (
    <MarketingLayout>
      {/* Hero */}
      <section className="bg-petrol-700 text-white">
        <div className="max-w-3xl mx-auto px-4 py-16 md:py-20">
          <p className="text-gold-300 text-xs font-semibold tracking-widest uppercase mb-4">
            Protocolo 4D · Atendimento Individual
          </p>
          <h1 className="font-serif text-4xl md:text-5xl leading-tight text-balance mb-6">
            Meu trabalho começa onde o entendimento parou.
          </h1>
          <p className="text-petrol-100 text-base md:text-lg leading-relaxed">
            O Protocolo 4D é um método comportamental estruturado, desenvolvido para um problema
            específico: a distância entre saber o que precisa ser feito e conseguir fazer.
          </p>
        </div>
      </section>

      {/* Como funciona */}
      <section className="max-w-3xl mx-auto px-4 py-16 space-y-5">
        <h2 className="font-serif text-2xl mb-2">Como funciona</h2>
        <p className="text-petrol-800/80 leading-relaxed">
          Não é mentoria e não é conversa aberta sem começo, meio e fim. São 24 sessões, ao longo de 6
          meses, com objetivo definido desde a primeira semana — identificar o padrão que trava a
          execução, reduzir a resposta de ameaça que sustenta esse padrão e reconstruir o comportamento
          na prática.
        </p>

        <p className="text-petrol-800/80 leading-relaxed">O método integra três bases:</p>
        <ul className="space-y-3">
          <li className="text-petrol-800/80 leading-relaxed">
            <strong className="text-petrol-900">Terapia do Esquema</strong> (Jeffrey Young) — explica de
            onde vem o padrão.
          </li>
          <li className="text-petrol-800/80 leading-relaxed">
            <strong className="text-petrol-900">Teoria polivagal</strong> (Stephen Porges) — explica por
            que o corpo entra em resposta de ameaça diante de algo que não oferece risco real.
          </li>
          <li className="text-petrol-800/80 leading-relaxed">
            <strong className="text-petrol-900">Neurociência comportamental aplicada</strong> —
            reconsolidação de memória e neuroplasticidade — explica como esse padrão pode ser reescrito.
          </li>
        </ul>

        <p className="text-petrol-800/80 leading-relaxed">
          A integração dessas três bases em um percurso de seis etapas é o que constitui o método. O
          travamento não acontece em um nível só: o padrão é ativado, o sistema nervoso responde como se
          houvesse perigo, e a ação não sai. Trabalhar apenas um dos três gera entendimento sem mudança,
          regulação sem sustentação, ou disciplina que colapsa na primeira situação difícil.
        </p>

        <div className="py-2">
          <p className="text-gold-700 text-xs font-semibold tracking-widest uppercase mb-3">
            As seis etapas
          </p>
          <div className="flex flex-wrap items-center gap-x-2 gap-y-3">
            {ETAPAS.map((etapa, i) => (
              <div key={etapa} className="flex items-center gap-2">
                <span className="bg-beige-100 border border-beige-300 rounded-full px-4 py-1.5 text-sm text-petrol-900">
                  {etapa}
                </span>
                {i < ETAPAS.length - 1 && <ArrowRight size={14} className="text-petrol-300 shrink-0" />}
              </div>
            ))}
          </div>
        </div>

        <p className="text-petrol-800/80 leading-relaxed">
          Cada sessão é precedida por uma aula em vídeo de 8 a 12 minutos, na área de membros. Entre as
          sessões, o acompanhamento continua por WhatsApp. A cada mês, você recebe um relatório do que
          mudou — em comportamento observável, não em sensação.
        </p>

        <p className="text-petrol-800/80 leading-relaxed">
          O acesso acontece por uma{' '}
          <Link to="/produtos#sessao-avaliacao" className="text-petrol-700 underline hover:text-petrol-800">
            sessão de avaliação
          </Link>
          , contratada separadamente. É nela que se define se o método faz sentido para o seu caso.
        </p>
      </section>

      {/* Para quem é indicado */}
      <section className="bg-white border-y border-beige-300">
        <div className="max-w-3xl mx-auto px-4 py-16">
          <h2 className="font-serif text-2xl mb-4">Para quem é indicado</h2>
          <p className="text-petrol-800/80 leading-relaxed mb-6">
            Este atendimento não é definido por perfil, idade ou profissão. É definido por um padrão de
            comportamento.
          </p>
          <p className="text-petrol-800/80 leading-relaxed mb-3">É indicado para quem:</p>
          <ul className="space-y-2 mb-8">
            {[
              'sabe exatamente o que precisa fazer e mesmo assim não faz',
              'começa projetos com clareza e abandona antes da entrega',
              'entrega com excelência o que os outros cobram, mas trava no que é próprio',
              'adia decisões que já estão tomadas internamente',
              'evita exposição — vender, aparecer, cobrar, se posicionar',
              'tem alta capacidade e execução muito abaixo dessa capacidade',
              'já tentou disciplina, método, organização e produtividade, e o padrão voltou',
            ].map((item) => (
              <li key={item} className="text-petrol-800/80 leading-relaxed pl-4 border-l-2 border-gold-400">
                {item}
              </li>
            ))}
          </ul>
          <h3 className="font-serif text-lg mb-2">Para quem não é indicado</h3>
          <p className="text-petrol-800/80 leading-relaxed">
            Este protocolo não é atendimento psicológico clínico e não substitui acompanhamento
            psicológico ou psiquiátrico. Não é indicado para situações de crise aguda ou quadros que
            exijam cuidado clínico prioritário. Nesses casos, a orientação na sessão de avaliação é de
            encaminhamento.
          </p>
        </div>
      </section>

      {/* Duração e frequência */}
      <section className="max-w-3xl mx-auto px-4 py-16">
        <h2 className="font-serif text-2xl mb-6">Duração e frequência</h2>
        <dl className="grid sm:grid-cols-2 gap-4 mb-10">
          {[
            ['Duração total', '6 meses'],
            ['Sessões', '24, uma por semana'],
            ['Duração de cada sessão', '[a definir]'],
            ['Formato', 'Online, ao vivo'],
            ['Antes de cada sessão', 'Aula em vídeo de 8 a 12 minutos'],
            ['Entre as sessões', 'Acompanhamento por WhatsApp'],
            ['A cada mês', 'Relatório de evolução'],
          ].map(([label, value]) => (
            <div key={label} className="bg-beige-100 border border-beige-300 rounded-xl p-4">
              <dt className="text-petrol-400 text-xs uppercase tracking-wide mb-1">{label}</dt>
              <dd className="text-petrol-900 text-sm">{value}</dd>
            </div>
          ))}
        </dl>

        <h3 className="font-serif text-lg mb-3">Por que 6 meses</h3>
        <div className="space-y-4">
          <p className="text-petrol-800/80 leading-relaxed">
            Porque o padrão não se desfaz no entendimento. Ele se desfaz na repetição.
          </p>
          <p className="text-petrol-800/80 leading-relaxed">
            As etapas são encadeadas: não se regula o que ainda não foi identificado, não se executa com
            o sistema ainda em resposta de ameaça, e não se consolida um comportamento novo sem repetição
            em situações reais — que aparecem no ritmo da sua vida, não no ritmo da agenda.
          </p>
          <p className="text-petrol-800/80 leading-relaxed">
            Seis meses é o tempo necessário para percorrer esse encadeamento inteiro e sair sem depender
            do processo. Não é um prazo aberto. É um prazo fechado, com data de encerramento definida
            desde a primeira sessão. Não há renovação automática.
          </p>
        </div>
      </section>

      {/* Diferencial */}
      <section className="bg-white border-y border-beige-300">
        <div className="max-w-3xl mx-auto px-4 py-16">
          <h2 className="font-serif text-2xl mb-2">Diferencial em relação a uma terapia comum</h2>
          <p className="text-petrol-800/80 leading-relaxed mb-6">Não é melhor nem pior. É outra coisa.</p>

          <div className="overflow-x-auto mb-6">
            <table className="w-full text-sm border-collapse">
              <thead>
                <tr className="border-b border-beige-300">
                  <th className="text-left py-3 pr-4 text-petrol-400 font-medium uppercase text-xs tracking-wide">
                    Formato aberto
                  </th>
                  <th className="text-left py-3 text-gold-700 font-medium uppercase text-xs tracking-wide">
                    Protocolo 4D
                  </th>
                </tr>
              </thead>
              <tbody>
                {DIFERENCIAL.map((row) => (
                  <tr key={row.aberto} className="border-b border-beige-200">
                    <td className="py-3 pr-4 text-petrol-800/70 align-top">{row.aberto}</td>
                    <td className="py-3 text-petrol-900 align-top">{row.protocolo}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <p className="text-petrol-800/80 leading-relaxed mb-4">
            Insight não muda comportamento. Entender de onde vem o padrão é necessário — e insuficiente.
            O que muda o comportamento é técnica aplicada, repetida, com acompanhamento entre uma sessão
            e outra.
          </p>
          <p className="font-serif text-xl text-petrol-900">
            Força de vontade não muda nada. Técnica muda tudo.
          </p>
        </div>
      </section>

      {/* Competência */}
      <section className="max-w-3xl mx-auto px-4 py-16 space-y-14">
        <div>
          <h2 className="font-serif text-2xl mb-4">Sobre atender homens</h2>
          <div className="space-y-4">
            <p className="text-petrol-800/80 leading-relaxed">
              A maior parte da minha prática foi construída atendendo homens. Não foi escolha de nicho —
              foi onde o Protocolo 4D se formou, se corrigiu e se validou.
            </p>
            <p className="text-petrol-800/80 leading-relaxed">
              Isso importa por uma razão prática. O travamento se apresenta de formas diferentes, e em
              homens costuma chegar tarde e disfarçado de outra coisa: não como "estou travado", mas como
              irritação, apatia, sobrecarga de trabalho, distância em casa. Quando chega, já custou caro —
              porque o cálculo prévio foi de que expor a dificuldade seria lido como falha.
            </p>
            <p className="text-petrol-800/80 leading-relaxed">
              Trabalhar com isso exige uma competência específica: descrever o mecanismo sem transformar
              a descrição em correção. Não explico a um homem o que ele deveria sentir. Mostro o que está
              acontecendo no funcionamento dele — e o que fazer com isso.
            </p>
            <p className="text-petrol-800/80 leading-relaxed">
              Uma parte considerável dos homens que atendo já tinha tentado antes e desistido — quase
              sempre porque encontrou um processo que começava corrigindo em vez de descrever. Meu ponto
              de partida não é o que ele deveria ser. É como ele funciona.
            </p>
            <p className="text-petrol-800/80 leading-relaxed">
              Foi essa prática que gerou o método. Ele funciona para qualquer pessoa que trava. Mas foi
              ali que ele nasceu.
            </p>
          </div>
        </div>

        <div>
          <h2 className="font-serif text-2xl mb-4">Sobre atender mulheres</h2>
          <div className="space-y-4">
            <p className="text-petrol-800/80 leading-relaxed">
              A expansão do trabalho para mulheres não exigiu mudar o método. Exigiu reconhecer que o
              mesmo travamento chega por outra porta.
            </p>
            <p className="text-petrol-800/80 leading-relaxed">
              Em mulheres com carreira consolidada, o padrão raramente aparece na competência. Aparece na
              divisão. A mesma pessoa que entrega com precisão no trabalho chega em casa sem margem para
              nada — e a conta não fecha em lugar nenhum. O que se apresenta como problema de tempo quase
              sempre é outra coisa: um padrão de entregar integralmente tudo o que é cobrado por fora, e
              nada do que é próprio.
            </p>
            <p className="text-petrol-800/80 leading-relaxed">
              Isso costuma ser lido como sobrecarga, e tratado com organização — agenda, delegação,
              produtividade. Funciona por algumas semanas. Depois volta, porque o mecanismo não estava na
              logística.
            </p>
            <p className="text-petrol-800/80 leading-relaxed">
              Trabalhar com isso exige a mesma competência específica: mostrar o mecanismo sem
              transformar a descrição em cobrança. Boa parte das mulheres que atendo chega já cansada de
              ouvir o que deveria estar fazendo diferente. Não acrescento mais uma exigência à lista.
              Mostro por que a lista não estava resolvendo.
            </p>
            <p className="text-petrol-800/80 leading-relaxed">
              O critério de entrada não é o gênero. É o padrão. Mas a forma como ele se apresenta muda —
              e isso muda como o trabalho começa.
            </p>
          </div>
        </div>
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
            Quer saber se o atendimento individual faz sentido para você?
          </h2>
          <div className="flex flex-wrap justify-center gap-3">
            <Link to="/produtos#sessao-avaliacao">
              <Button variant="secondary" size="lg">Agendar sessão de avaliação</Button>
            </Link>
            <Link to="/areamembros">
              <Button
                variant="ghost"
                size="lg"
                className="!border-petrol-300 !text-white hover:!bg-petrol-600"
              >
                Já sou cliente
              </Button>
            </Link>
          </div>
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

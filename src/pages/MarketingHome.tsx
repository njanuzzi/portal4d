/** Atlas de Padrões — home autoral: Núbia Januzzi no primeiro plano e Protocolo 4D como produto principal. */
import { ArrowRight, ArrowUpRight } from 'lucide-react';
import { Link } from 'react-router-dom';
import { MarketingLayout } from '../components/marketing/MarketingLayout';
import { AtlasSpiral } from '../components/marketing/AtlasSpiral';
import { AtlasJourney } from '../components/marketing/AtlasJourney';
import { ContentPreview } from '../components/marketing/ContentPreview';
import { SeoHead } from '../components/SeoHead';

const recognitions = [
  'Você sabe qual é a tarefa importante e deixa exatamente ela para depois.',
  'Você entrega para todo mundo, mas paralisa quando a decisão é sua.',
  'Você já entendeu o padrão; o difícil continua sendo agir no meio dele.',
  'Você evita se expor mesmo quando sabe que está pronta para aparecer.',
];

export function MarketingHome() {
  return (
    <MarketingLayout>
      <SeoHead
        title="Núbia Januzzi | Especialista em Desbloqueio Comportamental"
        description="Núbia Januzzi é Especialista em Desbloqueio Comportamental e autora do Protocolo 4D, um produto estruturado para quem reconhece um padrão e quer agir de outro modo."
        canonicalPath="/"
      />
      <main>
        <section className="atlas-hero">
          <div className="atlas-frame atlas-hero__grid">
            <div>
              <span className="atlas-eyebrow text-gold-200">NÚBIA JANUZZI · ESPECIALISTA EM DESBLOQUEIO COMPORTAMENTAL</span>
              <h1>Quando entender não resolve, o próximo passo precisa ser visível.</h1>
              <p>Eu acompanho pessoas que reconhecem o próprio padrão, mas ainda encontram dificuldade para sair dele no cotidiano. O <strong>Protocolo 4D</strong> é o produto que criei para transformar essa leitura em direção prática.</p>
              <div className="atlas-hero__actions">
                <Link to="/sessao-avaliacao" className="atlas-button">Conhecer a sessão de avaliação <ArrowRight size={17} /></Link>
                <Link to="/protocolo4d" className="atlas-link">Conheça o Protocolo 4D <ArrowUpRight size={16} /></Link>
              </div>
              <div className="atlas-hero__facts">
                <span><b>24</b>sessões</span>
                <span><b>6</b>meses</span>
                <span><b>online</b>e ao vivo</span>
              </div>
            </div>
            <figure className="atlas-hero__art">
              <img src="/nubia-foto.jpg" alt="Núbia Januzzi, Especialista em Desbloqueio Comportamental" />
              <figcaption>NÚBIA JANUZZI · AUTORA DO PROTOCOLO 4D</figcaption>
            </figure>
          </div>
          <div className="atlas-strip"><span>PROTOCOLO 4D</span><i /><span>MÉTODO AUTORAL</span><i /><span>OBSERVAR</span><i /><span>PAUSAR</span><i /><span>DECODIFICAR</span><i /><span>DIRECIONAR</span></div>
        </section>

        <section className="atlas-intro atlas-frame">
          <aside className="atlas-margin-note"><strong>02 · RECONHECIMENTO</strong>Um ponto de partida para reconhecer a situação antes de conhecer o produto.</aside>
          <div>
            <h2>Você não precisa se encaixar em um perfil. Precisa reconhecer o padrão.</h2>
            <div className="atlas-recognition-grid">
              <div className="atlas-recognition-cards">{recognitions.map((text, index) => <article className="atlas-recognition-card" key={text}><span>0{index + 1}</span><p>{text}</p></article>)}</div>
              <div className="atlas-recognition-image"><img src="/images/atlas-attendance-human.jpg" alt="Duas pessoas em uma conversa de escuta atenta" /></div>
            </div>
          </div>
        </section>

        <section className="atlas-method">
          <div className="atlas-frame atlas-method__grid">
            <div>
              <aside className="atlas-margin-note"><strong>03 · O PRODUTO PRINCIPAL</strong>O Protocolo 4D é o método autoral criado por Núbia Januzzi para reconhecer, interromper, compreender e escolher uma resposta possível.</aside>
              <h2 className="mt-11">O Protocolo 4D não é uma resposta pronta. É uma forma de enxergar onde o ciclo começa.</h2>
              <p className="atlas-method__intro">A espiral concentra a lógica do método. Ela não é o percurso de atendimento: mostra os quatro movimentos que podem reaparecer em diferentes situações.</p>
            </div>
            <AtlasSpiral />
          </div>
        </section>

        <section className="atlas-journey">
          <div className="atlas-frame">
            <div className="atlas-journey__head">
              <aside className="atlas-margin-note"><strong>04 · COMO EU TRABALHO</strong>O acompanhamento tem começo, meio e encerramento. Ele organiza como o Protocolo 4D acontece ao longo do tempo.</aside>
              <div><h2>Não é uma linha reta. É uma rota que se ajusta sem perder o rumo.</h2><p>Explore as seis etapas do acompanhamento comigo. Elas existem para que o método se transforme em trabalho contínuo, com direção e prazo definidos.</p></div>
            </div>
            <AtlasJourney />
          </div>
        </section>

        <section className="atlas-about-preview atlas-frame">
          <aside className="atlas-margin-note"><strong>05 · SOBRE A NÚBIA</strong>Autoria, percurso profissional e critérios que sustentam a prática.</aside>
          <div className="atlas-about-preview__image"><img src="/nubia-foto.jpg" alt="Retrato de Núbia Januzzi" /></div>
          <div><h2>O método tem autoria, mas o trabalho começa na escuta.</h2><p>Sou Núbia Januzzi, Especialista em Desbloqueio Comportamental. O Protocolo 4D organiza um produto construído a partir de atendimento, observação e correção de rota.</p><div className="atlas-about-preview__facts"><span><b>TRAJETÓRIA</b>Atendimentos desde 2018</span><span><b>FORMAÇÃO</b>Psicoterapia e neurociência</span><span><b>ABORDAGEM</b>Clareza, técnica e presença</span></div><Link to="/sobre" className="atlas-link">Conhecer a Núbia <ArrowUpRight size={16} /></Link></div>
        </section>

        <section className="atlas-library"><div className="atlas-library__image" /><div className="atlas-frame atlas-library__inner"><div className="atlas-library__intro"><span className="atlas-eyebrow text-gold-200">06 · BIBLIOTECA 4D POR NÚBIA JANUZZI</span><h2>Para quando a pergunta ainda não virou uma decisão.</h2><p>Textos de Núbia Januzzi para aprofundar dúvidas reais, sem transformar leitura em diagnóstico e sem repetir o conteúdo das redes.</p><Link to="/conteudos" className="atlas-button atlas-button--line">Explorar todos os conteúdos <ArrowRight size={16} /></Link></div><ContentPreview /></div></section>
        <section className="atlas-evaluation"><div className="atlas-frame atlas-evaluation__card"><div className="atlas-evaluation__copy"><span className="atlas-eyebrow text-gold-200">07 · PRÓXIMA COORDENADA</span><h2>Antes de escolher o Protocolo 4D, você precisa saber se ele é o produto certo para o seu momento.</h2><p>Na sessão de avaliação, eu organizo a entrada e ajudo a entender se este formato faz sentido para você, sem pressão para decidir na hora.</p><Link to="/sessao-avaliacao" className="atlas-button">Conhecer a sessão <ArrowRight size={16} /></Link></div><div className="atlas-evaluation__image"><img src="/images/atlas-evaluation-human.jpg" alt="Pessoa em um momento de escuta e disponibilidade para começar um percurso" /></div></div></section>
      </main>
    </MarketingLayout>
  );
}

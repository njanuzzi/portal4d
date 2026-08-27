/** Atlas de Padrões — página institucional de autoria, trajetória e critérios de trabalho. */
import { ArrowRight } from 'lucide-react';
import { Link } from 'react-router-dom';
import { MarketingLayout } from '../components/marketing/MarketingLayout';
import { SeoHead } from '../components/SeoHead';

export function About() {
  return (
    <MarketingLayout>
      <SeoHead title="Sobre a Núbia" description="Conheça a trajetória, a formação e os critérios que orientam o trabalho de Núbia Januzzi e o Protocolo 4D." canonicalPath="/sobre" />
      <section className="atlas-about-hero"><div className="atlas-frame"><span className="atlas-eyebrow text-gold-200">05 · SOBRE A NÚBIA</span><h1>Antes do método, existe uma escuta que não reduz uma história a uma fórmula.</h1><p>Uma apresentação de autoria, percurso profissional e critérios que sustentam o trabalho.</p></div></section>
      <main className="atlas-about-page"><div className="atlas-frame atlas-about-page__grid"><div className="atlas-about-page__portrait"><img src="/nubia-foto.jpg" alt="Retrato de Núbia Januzzi" /></div><article className="atlas-about-page__copy"><span className="atlas-eyebrow">CAMPO DE AUTORIA</span><h2>O ponto de partida é observar o que acontece entre saber e conseguir fazer.</h2><p>Comecei a atender em 2018. Nos primeiros anos, o padrão que eu via se repetir era claro: a pessoa entendia o próprio funcionamento, saía da sessão organizada e travava de novo quando a vida pedia uma ação.</p><p>Foi daí que o formato do trabalho mudou. O acompanhamento passou a olhar para o momento em que o travamento acontece, não para acrescentar mais exigência, mas para descrever o mecanismo e criar uma saída praticável.</p><p>O Protocolo 4D foi nomeado depois de já estar em funcionamento. Ele organiza uma prática construída, corrigida e estabilizada ao longo do atendimento, com sequência definida, prazo fechado e atenção ao que é observável.</p><div className="atlas-credentials"><h3>Formação e percurso</h3><ul><li>Pós-graduação em Psicoterapia com ênfase em Abordagem Sistêmica Comportamental — 720h</li><li>Pós-graduação em Neurociência do Comportamento Humano — PUCRS</li><li>Formação em Psicoterapia — Instituto Saulo Veríssimo</li></ul><ul><li>Bacharelado em Direito</li><li>Pesquisa continuada em Terapia do Esquema e Logoterapia</li><li>Mais de 3 mil horas de atendimento desde 2018</li></ul></div><Link to="/sessao-avaliacao" className="atlas-link mt-7">Conhecer a sessão de avaliação <ArrowRight size={16} /></Link></article></div></main>
    </MarketingLayout>
  );
}

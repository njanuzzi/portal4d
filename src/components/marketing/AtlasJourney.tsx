/** Atlas de Padrões — seis etapas do atendimento com acordeão no mobile e painel lateral no desktop. */
import { useState } from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';

const stages = [
  { name: 'Diagnóstico', window: 'Entrada do percurso', description: 'A etapa que situa o ponto de partida, dá nome ao padrão e organiza o foco do acompanhamento.', focus: [['LEITURA', 'Padrão observado'], ['CONTEXTO', 'Situações mapeadas'], ['DIREÇÃO', 'Hipótese de trabalho']], question: 'O que se repete antes de você perceber que já entrou no mesmo ciclo?' },
  { name: 'Regulação', window: 'Primeiros encontros', description: 'A fase que cria intervalo suficiente para que a primeira resposta não precise decidir tudo.', focus: [['OBSERVAÇÃO', 'Gatilhos reconhecidos'], ['INTERVALO', 'Pausa praticada'], ['PROTEÇÃO', 'Resposta compreendida']], question: 'Onde um pequeno intervalo já faria diferença na forma como você reage?' },
  { name: 'Desbloqueio', window: 'Meio do percurso', description: 'O ponto em que o padrão deixa de definir sozinho o que é possível fazer em situações reais.', focus: [['FUNÇÃO', 'Mecanismo nomeado'], ['CUSTO', 'Efeito reconhecido'], ['ABERTURA', 'Alternativas possíveis']], question: 'O que este padrão tenta evitar e qual é o custo de continuar evitando?' },
  { name: 'Execução', window: 'Testes no cotidiano', description: 'As escolhas passam a ser testadas onde a vida acontece, com leitura do que funcionou e do que pede ajuste.', focus: [['AÇÃO', 'Escolha concreta'], ['TESTE', 'Realidade observada'], ['AJUSTE', 'Rota recalibrada']], question: 'Qual escolha pequena, mas verificável, pode colocar você em movimento esta semana?' },
  { name: 'Consolidação', window: 'Sustentação', description: 'O novo comportamento ganha forma suficiente para não depender de esforço solitário a cada semana.', focus: [['EVIDÊNCIA', 'Mudanças registradas'], ['ESTRATÉGIA', 'Critério próprio'], ['ATENÇÃO', 'Sinais de recaída']], question: 'O que ajuda esta escolha a continuar existindo quando a semana fica difícil?' },
  { name: 'Autonomia', window: 'Fechamento', description: 'O encerramento devolve direção e critérios próprios, sem dependência do acompanhamento.', focus: [['FERRAMENTAS', 'Recursos integrados'], ['CRITÉRIO', 'Continuidade escolhida'], ['PRÓXIMO CICLO', 'Direção própria']], question: 'Como você vai reconhecer que tem direção mesmo quando não tem certeza?' },
] as const;

type JourneyDetailProps = { index: number; onPrevious: () => void; onNext: () => void; className?: string; };

function JourneyDetail({ index, onPrevious, onNext, className = '' }: JourneyDetailProps) {
  const stage = stages[index];
  return <article className={`atlas-journey__detail ${className}`} aria-live="polite"><span className="atlas-journey__number">ETAPA 0{index + 1} · {stage.window.toUpperCase()}</span><h3>{stage.name}</h3><p>{stage.description}</p><div className="atlas-journey__focus">{stage.focus.map(([label, value]) => <span key={label}><b>{label}</b>{value}</span>)}</div><blockquote>“{stage.question}”</blockquote><div className="atlas-journey__controls"><button type="button" onClick={onPrevious}><ChevronLeft size={16} /> Anterior</button><span>{index + 1} / {stages.length}</span><button type="button" onClick={onNext}>Próxima <ChevronRight size={16} /></button></div></article>;
}

export function AtlasJourney() {
  const [active, setActive] = useState(0);
  const [mobileExpanded, setMobileExpanded] = useState<number | null>(null);
  const previous = () => setActive((current) => (current + stages.length - 1) % stages.length);
  const next = () => setActive((current) => (current + 1) % stages.length);
  const activateStage = (index: number) => { setActive(index); setMobileExpanded((expanded) => expanded === index ? null : index); };

  return <div className="atlas-journey__layout"><div className="atlas-stages" role="tablist" aria-label="Etapas do atendimento individual" aria-describedby="atlas-journey-hint"><div className="atlas-stages__head"><span>6 ETAPAS DO ATENDIMENTO</span><span>TOQUE PARA ABRIR</span></div><p id="atlas-journey-hint" className="atlas-interaction-hint"><span aria-hidden="true">↗</span> Toque em uma etapa para abrir seu foco e sua pergunta-guia.</p><div className="mt-5">{stages.map((item, index) => <div className="atlas-stage__item" key={item.name}><button type="button" role="tab" aria-selected={active === index} aria-expanded={mobileExpanded === index} aria-controls={`mobile-stage-${index}`} onClick={() => activateStage(index)} className={`atlas-stage ${active === index ? 'atlas-stage--active' : ''}`}><span>0{index + 1}</span><div><strong>{item.name}</strong><small>{item.window}</small></div><i /></button>{mobileExpanded === index && <div id={`mobile-stage-${index}`} className="atlas-stage__mobile-detail"><JourneyDetail index={index} onPrevious={() => { previous(); setMobileExpanded((index + stages.length - 1) % stages.length); }} onNext={() => { next(); setMobileExpanded((index + 1) % stages.length); }} /></div>}</div>)}</div></div><JourneyDetail index={active} onPrevious={previous} onNext={next} className="atlas-journey__detail--desktop" /></div>;
}

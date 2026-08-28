/** Atlas de Padrões — espiral do produto 4D com painel imediato no mobile e leitura lateral no desktop. */
import { useEffect, useState } from 'react';
import { X } from 'lucide-react';
import { PILARES } from '../../lib/protocolo4d';

export function AtlasSpiral() {
  const [active, setActive] = useState(0);
  const [isMobilePanelOpen, setIsMobilePanelOpen] = useState(false);
  const step = PILARES[active];
  const Icon = step.icon;

  useEffect(() => {
    const closeOnEscape = (event: KeyboardEvent) => event.key === 'Escape' && setIsMobilePanelOpen(false);
    document.addEventListener('keydown', closeOnEscape);
    return () => document.removeEventListener('keydown', closeOnEscape);
  }, []);

  const selectMovement = (index: number) => {
    setActive(index);
    setIsMobilePanelOpen(true);
  };

  const detail = <>
    <span className="atlas-method__step">0{active + 1} · MOVIMENTO DO MÉTODO</span>
    <Icon size={22} className="mt-4 text-coral-500" />
    <h3>{step.titulo}</h3>
    <p className="atlas-method__micro">{step.texto}</p>
    <p>{step.detalhe}</p>
  </>;

  return (
    <div className="atlas-spiral">
      <div className="atlas-spiral__visual" role="tablist" aria-label="Movimentos do Protocolo 4D" aria-describedby="atlas-spiral-hint">
        <img src="/protocolo4d-espiral.png" alt="Espiral que apresenta os quatro movimentos do Protocolo 4D" />
        <p id="atlas-spiral-hint" className="atlas-interaction-hint atlas-interaction-hint--overlay"><span aria-hidden="true">↗</span> Toque em um movimento para abrir os detalhes.</p>
        {PILARES.map((item, index) => {
          const StepIcon = item.icon;
          return <button key={item.titulo} type="button" role="tab" aria-selected={active === index} aria-haspopup="dialog" onClick={() => selectMovement(index)} className={`atlas-spiral__marker atlas-spiral__marker--${['one', 'two', 'three', 'four'][index]} ${active === index ? 'atlas-spiral__marker--active' : ''}`}>
            <StepIcon size={16} /><span>0{index + 1}</span><strong>{item.titulo}</strong>
          </button>;
        })}
      </div>
      <article className="atlas-method__panel atlas-method__panel--desktop" role="tabpanel" aria-live="polite">{detail}</article>
      <div className={`atlas-sheet ${isMobilePanelOpen ? 'atlas-sheet--open' : ''}`} aria-hidden={!isMobilePanelOpen}>
        <button type="button" className="atlas-sheet__backdrop" aria-label="Fechar detalhes do movimento" onClick={() => setIsMobilePanelOpen(false)} tabIndex={isMobilePanelOpen ? 0 : -1} />
        <article className="atlas-sheet__panel" role="dialog" aria-modal="true" aria-label={`Detalhes: ${step.titulo}`}>
          <div className="atlas-sheet__handle" aria-hidden="true" />
          <button type="button" className="atlas-sheet__close" aria-label="Fechar detalhes" onClick={() => setIsMobilePanelOpen(false)}><X size={18} /></button>
          {detail}
        </article>
      </div>
    </div>
  );
}

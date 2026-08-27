/** Atlas de Padrões — a espiral explica somente os quatro movimentos do Protocolo 4D. */
import { useState } from 'react';
import { PILARES } from '../../lib/protocolo4d';

export function AtlasSpiral() {
  const [active, setActive] = useState(0);
  const step = PILARES[active];
  const Icon = step.icon;

  return (
    <div className="atlas-spiral">
      <div className="atlas-spiral__visual" role="tablist" aria-label="Movimentos do Protocolo 4D">
        <img src="/protocolo4d-espiral.png" alt="Espiral que apresenta os quatro movimentos do Protocolo 4D" />
        {PILARES.map((item, index) => {
          const StepIcon = item.icon;
          return (
            <button
              key={item.titulo}
              type="button"
              role="tab"
              aria-selected={active === index}
              onClick={() => setActive(index)}
              className={`atlas-spiral__marker atlas-spiral__marker--${['one', 'two', 'three', 'four'][index]} ${active === index ? 'atlas-spiral__marker--active' : ''}`}
            >
              <StepIcon size={16} /><span>0{index + 1}</span><strong>{item.titulo}</strong>
            </button>
          );
        })}
      </div>
      <article className="atlas-method__panel" role="tabpanel" aria-live="polite">
        <span className="atlas-method__step">0{active + 1} · MOVIMENTO DO MÉTODO</span>
        <Icon size={22} className="mt-4 text-coral-500" />
        <h3>{step.titulo}</h3>
        <p className="atlas-method__micro">{step.texto}</p>
        <p>{step.detalhe}</p>
      </article>
    </div>
  );
}

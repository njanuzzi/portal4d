import { useState } from 'react';
import { BookOpen, ChevronDown, ChevronRight, MessageCircle, AlertTriangle } from 'lucide-react';
import { Card, CardBody } from './ui/Card';
import { BFI_CONCEPTS } from '../lib/bfiConcepts';

// Quadro fixo com o conceito de cada fator do Big Five, pra terapeuta
// consultar e explicar à cliente. Mesmo conteúdo pra toda resposta.
export function BfiConceptsCard({ averages }: { averages?: Record<string, number> }) {
  const [openKey, setOpenKey] = useState<string | null>(null);

  return (
    <Card>
      <CardBody className="space-y-3">
        <div className="flex items-center gap-2">
          <BookOpen size={16} className="text-petrol-700" />
          <h2 className="font-semibold text-dark font-serif text-base">Os 5 fatores</h2>
        </div>
        <p className="text-xs text-dark/50">Conceitos para consultar e explicar à cliente. Clique em um fator para abrir.</p>

        <div className="divide-y divide-beige-200 border border-beige-200 rounded-lg">
          {BFI_CONCEPTS.map((concept) => {
            const isOpen = openKey === concept.key;
            const average = averages?.[concept.key];
            return (
              <div key={concept.key}>
                <button
                  type="button"
                  onClick={() => setOpenKey(isOpen ? null : concept.key)}
                  className="w-full flex items-center gap-2 px-4 py-3 text-left hover:bg-beige-50 transition-colors"
                >
                  {isOpen ? <ChevronDown size={16} className="text-dark/40 shrink-0" /> : <ChevronRight size={16} className="text-dark/40 shrink-0" />}
                  <span className="text-sm font-medium text-dark flex-1">{concept.label}</span>
                  {average != null && <span className="text-xs text-dark/40">{average.toFixed(2)}/5</span>}
                </button>

                {isOpen && (
                  <div className="px-4 pb-4 space-y-3 text-sm text-dark/75 leading-relaxed">
                    <p>{concept.resumo}</p>

                    <div className="flex flex-wrap gap-1.5">
                      {concept.facetas.map((faceta) => (
                        <span key={faceta} className="text-xs font-medium text-petrol-700 bg-petrol-50 px-2.5 py-1 rounded-full">
                          {faceta}
                        </span>
                      ))}
                    </div>

                    <div className="grid sm:grid-cols-2 gap-3">
                      <div>
                        <p className="text-xs font-semibold text-dark/50 mb-1">Quando está mais presente</p>
                        <ul className="list-disc list-inside space-y-0.5 text-dark/70">
                          {concept.maisPresente.map((item) => <li key={item}>{item}</li>)}
                        </ul>
                      </div>
                      <div>
                        <p className="text-xs font-semibold text-dark/50 mb-1">Quando está menos presente</p>
                        <ul className="list-disc list-inside space-y-0.5 text-dark/70">
                          {concept.menosPresente.map((item) => <li key={item}>{item}</li>)}
                        </ul>
                      </div>
                    </div>

                    <div className="flex items-start gap-2 bg-gold-50 border border-gold-200 rounded-lg px-3 py-2">
                      <MessageCircle size={14} className="text-gold-600 shrink-0 mt-0.5" />
                      <p>
                        <span className="font-semibold text-dark">Como explicar à cliente: </span>
                        {concept.explicarCliente}
                      </p>
                    </div>

                    <div className="flex items-start gap-2 bg-beige-50 border border-beige-200 rounded-lg px-3 py-2">
                      <AlertTriangle size={14} className="text-dark/40 shrink-0 mt-0.5" />
                      <p>
                        <span className="font-semibold text-dark">Cuidados: </span>
                        {concept.cuidados}
                      </p>
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </CardBody>
    </Card>
  );
}

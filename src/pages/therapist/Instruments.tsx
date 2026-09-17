import { Link } from 'react-router-dom';
import { ChevronRight, ClipboardList } from 'lucide-react';
import { Card, CardBody } from '../../components/ui/Card';
import { INSTRUMENTS } from '../../lib/instruments';

export function Instruments() {
  return (
    <div className="p-6 max-w-2xl mx-auto">
      <div className="mb-6">
        <h1 className="text-xl font-semibold text-dark font-serif">Instrumentos</h1>
        <p className="text-dark/50 text-sm mt-1">
          Escolha um instrumento pra gerar um link individual de um cliente específico.
        </p>
      </div>

      <div className="space-y-2">
        {INSTRUMENTS.map((instrument) => (
          <Link key={instrument.key} to={`/instrumentos/${instrument.key}`} className="block">
            <Card className="hover:border-petrol-300 transition-colors cursor-pointer">
              <CardBody className="flex items-center gap-3 py-4">
                <div className="w-9 h-9 rounded-lg bg-petrol-50 flex items-center justify-center shrink-0">
                  <ClipboardList size={18} className="text-petrol-600" />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="text-sm font-medium text-dark">{instrument.label}</div>
                  <div className="text-xs text-dark/40 mt-0.5">{instrument.description}</div>
                </div>
                <ChevronRight size={16} className="text-dark/30 shrink-0" />
              </CardBody>
            </Card>
          </Link>
        ))}
      </div>
    </div>
  );
}

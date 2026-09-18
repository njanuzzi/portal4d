import { useEffect, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { ArrowLeft, ClipboardList, ChevronRight } from 'lucide-react';
import { Card, CardBody } from '../../components/ui/Card';
import { PageSpinner } from '../../components/ui/Spinner';
import { EmptyState } from '../../components/ui/EmptyState';
import { formatDate } from '../../lib/format';
import { supabase } from '../../lib/supabase';
import { INSTRUMENTS, InstrumentConfig } from '../../lib/instruments';
import type { Profile } from '../../lib/database.types';

interface AssessmentRow {
  id: string;
  version: number;
  submitted_at: string;
}

interface InstrumentGroup {
  instrument: InstrumentConfig;
  assessments: AssessmentRow[];
}

// Todas as tabelas de resposta de instrumento seguem o mesmo formato
// (client_id, status, submitted_at, version, raw_answers), então essa busca
// funciona sem hardcode por instrumento — o mesmo código continua servindo
// conforme novos instrumentos forem adicionados a INSTRUMENTS.
async function fetchInstrumentAssessments(table: string, clientId: string): Promise<AssessmentRow[]> {
  const { data } = await supabase
    .from(table as unknown as 'client_assessments')
    .select('id, version, submitted_at')
    .eq('client_id', clientId)
    .neq('status', 'in_progress')
    .order('submitted_at', { ascending: false });
  return (data ?? []) as unknown as AssessmentRow[];
}

export function ClientInstruments() {
  const { id } = useParams<{ id: string }>();
  const [client, setClient] = useState<Profile | null>(null);
  const [groups, setGroups] = useState<InstrumentGroup[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!id) { setLoading(false); return; }
    setLoading(true);

    (async () => {
      const [{ data: clientRow }, results] = await Promise.all([
        supabase.from('profiles').select('*').eq('id', id).eq('role', 'client').maybeSingle(),
        Promise.all(INSTRUMENTS.map((instrument) => fetchInstrumentAssessments(instrument.responsesTable, id))),
      ]);

      setClient((clientRow ?? null) as Profile | null);
      setGroups(
        INSTRUMENTS.map((instrument, i) => ({ instrument, assessments: results[i] })).filter(
          (group) => group.assessments.length > 0
        )
      );
      setLoading(false);
    })();
  }, [id]);

  if (loading) return <PageSpinner />;

  return (
    <div className="p-6 max-w-2xl mx-auto">
      <Link to={`/clients/${id}`} className="flex items-center gap-2 text-sm text-dark/50 hover:text-petrol-700 transition-colors mb-4">
        <ArrowLeft size={16} />
        Voltar pra ficha do cliente
      </Link>

      <div className="mb-6">
        <h1 className="text-xl font-semibold text-dark font-serif">Instrumentos</h1>
        <p className="text-dark/50 text-sm mt-1">
          {client ? `Instrumentos respondidos por ${client.name}` : 'Instrumentos respondidos por este cliente'}
        </p>
      </div>

      {groups.length === 0 ? (
        <EmptyState
          icon={<ClipboardList size={40} />}
          title="Nenhum instrumento respondido"
          description="Assim que o cliente concluir um instrumento, ele aparece aqui."
        />
      ) : (
        <div className="space-y-3">
          {groups.map(({ instrument, assessments }) => (
            <Card key={instrument.key}>
              <CardBody>
                <div className="flex items-center gap-3 mb-1">
                  <div className="w-9 h-9 rounded-lg bg-petrol-50 flex items-center justify-center shrink-0">
                    <ClipboardList size={18} className="text-petrol-600" />
                  </div>
                  <div className="text-sm font-medium text-dark">{instrument.label}</div>
                </div>
                <div className="divide-y divide-beige-100 -mx-1">
                  {assessments.map((a) => (
                    <Link
                      key={a.id}
                      to={`${instrument.responsesPath}/${a.id}`}
                      className="flex items-center justify-between px-1 py-2.5 hover:bg-beige-50 rounded transition-colors"
                    >
                      <span className="text-xs text-dark/50">
                        v{a.version} · {formatDate(a.submitted_at)}
                      </span>
                      <ChevronRight size={14} className="text-dark/30" />
                    </Link>
                  ))}
                </div>
              </CardBody>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}

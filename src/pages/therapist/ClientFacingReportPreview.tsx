import { useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { ArrowLeft, Heart } from 'lucide-react';
import { Card, CardBody } from '../../components/ui/Card';
import { PageSpinner } from '../../components/ui/Spinner';
import { supabase } from '../../lib/supabase';
import type { Profile } from '../../lib/database.types';

interface ClientEsquema {
  nome: string;
  percentual: number;
  descricao: string;
}

interface ClientContent {
  esquemas: ClientEsquema[];
  cruzamento: string;
}

interface ReportRow {
  id: string;
  client_id: string;
  client_content: ClientContent | null;
  updated_at: string;
}

export function ClientFacingReportPreview() {
  const { id: clientId, reportId } = useParams<{ id: string; reportId: string }>();
  const [client, setClient] = useState<Profile | null>(null);
  const [report, setReport] = useState<ReportRow | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    const load = async () => {
      if (!clientId || !reportId) { setLoading(false); return; }
      setLoading(true);
      setError('');

      const [{ data: clientRow }, { data: reportRow, error: reportError }] = await Promise.all([
        supabase.from('profiles').select('*').eq('id', clientId).eq('role', 'client').maybeSingle(),
        supabase
          .from('client_schema_reports')
          .select('id, client_id, client_content, updated_at')
          .eq('id', reportId)
          .maybeSingle(),
      ]);

      setClient((clientRow ?? null) as Profile | null);
      setReport((reportRow ?? null) as ReportRow | null);
      if (reportError) setError(reportError.message);
      setLoading(false);
    };
    load();
  }, [clientId, reportId]);

  if (loading) return <PageSpinner />;

  if (!report || !report.client_content) {
    return (
      <div className="p-6 max-w-3xl mx-auto">
        <Link to={`/clients/${clientId}/schema-analysis`} className="flex items-center gap-2 text-sm text-dark/50 hover:text-petrol-700 transition-colors mb-4">
          <ArrowLeft size={16} />
          Voltar
        </Link>
        <div className="text-sm text-red-600 bg-red-50 border border-red-200 rounded-lg px-3 py-2">
          {error || 'Relatório do cliente ainda não foi gerado.'}
        </div>
      </div>
    );
  }

  const { esquemas, cruzamento } = report.client_content;

  return (
    <div className="p-6 max-w-3xl mx-auto">
      <div className="mb-6">
        <Link to={`/clients/${clientId}/schema-analysis`} className="flex items-center gap-2 text-sm text-dark/50 hover:text-petrol-700 transition-colors mb-4">
          <ArrowLeft size={16} />
          Voltar para Análise de Esquemas
        </Link>
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-lg bg-gold-50 flex items-center justify-center">
            <Heart size={18} className="text-gold-600" />
          </div>
          <div>
            <h1 className="text-2xl font-semibold text-dark font-serif">Relatório do Cliente</h1>
            <p className="text-dark/50 text-sm mt-0.5">{client?.name}</p>
          </div>
        </div>
        <p className="text-xs text-dark/40 mt-2">
          Pré-visualização do conteúdo que vai para o cliente — formatação final ainda será desenhada para a página dele.
        </p>
      </div>

      <div className="space-y-3 mb-4">
        {esquemas?.map((esquema, i) => (
          <Card key={i}>
            <CardBody>
              <div className="flex items-center justify-between gap-4 mb-2">
                <h3 className="font-semibold text-dark font-serif">{esquema.nome}</h3>
                <span className="text-xs font-medium text-gold-700 shrink-0">{esquema.percentual}%</span>
              </div>
              <div className="w-full h-1.5 bg-beige-100 rounded-full overflow-hidden mb-3">
                <div
                  className="h-full bg-gold-500 rounded-full"
                  style={{ width: `${Math.min(100, Math.max(0, esquema.percentual))}%` }}
                />
              </div>
              <p className="text-sm text-dark/70 leading-relaxed">{esquema.descricao}</p>
            </CardBody>
          </Card>
        ))}
      </div>

      <Card>
        <CardBody>
          <h3 className="font-semibold text-dark font-serif mb-2">Como esses padrões conversam entre si</h3>
          <p className="text-sm text-dark/70 leading-relaxed">{cruzamento}</p>
        </CardBody>
      </Card>
    </div>
  );
}

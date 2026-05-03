import { useState, FormEvent, useEffect } from 'react';
import { useNavigate, useParams, Link } from 'react-router-dom';
import { ArrowLeft } from 'lucide-react';
import { Card, CardBody } from '../../components/ui/Card';
import { Button } from '../../components/ui/Button';
import { Input } from '../../components/ui/Input';
import { Textarea } from '../../components/ui/Textarea';
import { PageSpinner } from '../../components/ui/Spinner';
import { MOCK_CLIENTS, MOCK_REPORTS } from '../../lib/mockData';
import type { Profile, Report } from '../../lib/database.types';

export function NewReport() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [client, setClient] = useState<Profile | null>(null);
  const [periodStart, setPeriodStart] = useState('');
  const [periodEnd, setPeriodEnd] = useState('');
  const [content, setContent] = useState('');
  const [publish, setPublish] = useState(false);
  const [loading, setLoading] = useState(false);
  const [initLoading, setInitLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    setClient(MOCK_CLIENTS.find(c => c.id === id) || null);
    setInitLoading(false);
  }, [id]);

  const handleSubmit = (e: FormEvent) => {
    e.preventDefault();
    setError('');

    if (!periodStart || !periodEnd) {
      setError('Preencha o período do relatório.');
      return;
    }
    if (!content.trim()) {
      setError('O conteúdo do relatório não pode estar vazio.');
      return;
    }

    setLoading(true);
    setTimeout(() => {
      const now = new Date().toISOString();
      const newReport: Report & { profile: Profile | null } = {
        id: `dev-report-${Date.now()}`,
        user_id: id!,
        period_start: periodStart,
        period_end: periodEnd,
        content_text: content.trim(),
        published: publish,
        created_at: now,
        updated_at: now,
        profile: client,
      };
      MOCK_REPORTS.push(newReport);
      setLoading(false);
      navigate(`/clients/${id}/reports`);
    }, 500);
  };

  if (initLoading) return <PageSpinner />;

  return (
    <div className="p-6 max-w-2xl mx-auto">
      <div className="mb-6">
        <Link to={`/clients/${id}/reports`} className="flex items-center gap-2 text-sm text-dark/50 hover:text-petrol-700 transition-colors mb-4">
          <ArrowLeft size={16} />
          Voltar para Relatórios
        </Link>
        <h1 className="text-2xl font-semibold text-dark font-serif">Novo Relatório</h1>
        <p className="text-dark/50 text-sm mt-1">Para: {client?.name}</p>
      </div>

      <Card>
        <CardBody>
          <form onSubmit={handleSubmit} className="space-y-5">
            <div className="grid grid-cols-2 gap-4">
              <Input
                label="Período — Início"
                type="date"
                value={periodStart}
                onChange={(e) => setPeriodStart(e.target.value)}
                required
              />
              <Input
                label="Período — Fim"
                type="date"
                value={periodEnd}
                onChange={(e) => setPeriodEnd(e.target.value)}
                required
              />
            </div>

            <Textarea
              label="Conteúdo do Relatório"
              placeholder="Escreva aqui o relatório clínico e observações do período..."
              value={content}
              onChange={(e) => setContent(e.target.value)}
              rows={12}
              required
            />

            <label className="flex items-center gap-3 cursor-pointer">
              <div
                className={`w-10 h-6 rounded-full transition-colors ${publish ? 'bg-petrol-700' : 'bg-beige-300'} relative`}
                onClick={() => setPublish(!publish)}
              >
                <div className={`absolute top-1 w-4 h-4 rounded-full bg-white shadow transition-transform ${publish ? 'translate-x-5' : 'translate-x-1'}`} />
              </div>
              <div>
                <div className="text-sm font-medium text-dark">Publicar imediatamente</div>
                <div className="text-xs text-dark/40">O cliente poderá visualizar este relatório</div>
              </div>
            </label>

            {error && (
              <div className="text-sm text-red-600 bg-red-50 border border-red-200 rounded-lg px-3 py-2">
                {error}
              </div>
            )}

            <div className="flex gap-3 pt-2">
              <Button type="submit" loading={loading} className="flex-1">
                {publish ? 'Salvar e Publicar' : 'Salvar como Rascunho'}
              </Button>
              <Link to={`/clients/${id}/reports`}>
                <Button type="button" variant="ghost">Cancelar</Button>
              </Link>
            </div>
          </form>
        </CardBody>
      </Card>
    </div>
  );
}

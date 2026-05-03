import { useEffect, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { ArrowLeft, BookOpen, FileText, Mail, Calendar, ToggleLeft, ToggleRight } from 'lucide-react';
import { Card, CardBody } from '../../components/ui/Card';
import { Button } from '../../components/ui/Button';
import { Badge } from '../../components/ui/Badge';
import { PageSpinner } from '../../components/ui/Spinner';
import { formatDate } from '../../lib/format';
import { MOCK_CLIENTS, MOCK_ENTRIES, MOCK_REPORTS } from '../../lib/mockData';
import type { Profile } from '../../lib/database.types';

export function ClientDetail() {
  const { id } = useParams<{ id: string }>();
  const [client, setClient] = useState<Profile | null>(null);
  const [entryCount, setEntryCount] = useState(0);
  const [reportCount, setReportCount] = useState(0);
  const [loading, setLoading] = useState(true);
  const [toggling, setToggling] = useState(false);

  useEffect(() => {
    const found = MOCK_CLIENTS.find(c => c.id === id) || null;
    setClient(found);
    setEntryCount(MOCK_ENTRIES.filter(e => e.user_id === id).length);
    setReportCount(MOCK_REPORTS.filter(r => r.user_id === id).length);
    setLoading(false);
  }, [id]);

  const toggleActive = () => {
    if (!client) return;
    setToggling(true);
    setTimeout(() => {
      const updated = { ...client, active: !client.active };
      const idx = MOCK_CLIENTS.findIndex(c => c.id === client.id);
      if (idx !== -1) MOCK_CLIENTS[idx] = updated;
      setClient(updated);
      setToggling(false);
    }, 400);
  };

  if (loading) return <PageSpinner />;
  if (!client) return (
    <div className="p-6">
      <p className="text-dark/50">Cliente não encontrado.</p>
      <Link to="/clients" className="text-petrol-700 hover:underline text-sm">Voltar</Link>
    </div>
  );

  return (
    <div className="p-6 max-w-3xl mx-auto">
      <div className="mb-6">
        <Link to="/clients" className="flex items-center gap-2 text-sm text-dark/50 hover:text-petrol-700 transition-colors mb-4">
          <ArrowLeft size={16} />
          Voltar para Clientes
        </Link>

        <div className="flex items-start justify-between gap-4">
          <div className="flex items-center gap-4">
            <div className="w-14 h-14 rounded-full bg-petrol-100 flex items-center justify-center shrink-0">
              <span className="text-petrol-700 font-semibold text-xl">
                {client.name?.charAt(0)?.toUpperCase() || '?'}
              </span>
            </div>
            <div>
              <h1 className="text-2xl font-semibold text-dark font-serif">{client.name}</h1>
              <div className="flex items-center gap-2 mt-1">
                <Badge variant={client.active ? 'success' : 'neutral'}>
                  {client.active ? 'Ativo' : 'Inativo'}
                </Badge>
              </div>
            </div>
          </div>
          <Button
            variant="ghost"
            size="sm"
            loading={toggling}
            onClick={toggleActive}
            className="shrink-0"
          >
            {client.active ? <ToggleRight size={16} className="text-emerald-500" /> : <ToggleLeft size={16} />}
            {client.active ? 'Desativar' : 'Ativar'}
          </Button>
        </div>
      </div>

      <Card className="mb-6">
        <CardBody className="space-y-3">
          <div className="flex items-center gap-3 text-sm">
            <Mail size={16} className="text-dark/30 shrink-0" />
            <span className="text-dark/70">{client.email}</span>
          </div>
          <div className="flex items-center gap-3 text-sm">
            <Calendar size={16} className="text-dark/30 shrink-0" />
            <span className="text-dark/70">Cadastrado em {formatDate(client.created_at)}</span>
          </div>
        </CardBody>
      </Card>

      <div className="grid grid-cols-2 gap-4 mb-6">
        <Card>
          <CardBody className="text-center py-6">
            <div className="text-3xl font-semibold text-petrol-700 mb-1">{entryCount}</div>
            <div className="text-xs text-dark/40">Registros de diário</div>
          </CardBody>
        </Card>
        <Card>
          <CardBody className="text-center py-6">
            <div className="text-3xl font-semibold text-gold-500 mb-1">{reportCount}</div>
            <div className="text-xs text-dark/40">Relatórios</div>
          </CardBody>
        </Card>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <Link to={`/clients/${id}/entries`}>
          <Card className="hover:border-petrol-300 transition-colors cursor-pointer">
            <CardBody className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-petrol-50 flex items-center justify-center">
                <BookOpen size={18} className="text-petrol-700" />
              </div>
              <div>
                <div className="font-medium text-dark text-sm">Ver Registros</div>
                <div className="text-xs text-dark/40">Respostas do diário</div>
              </div>
            </CardBody>
          </Card>
        </Link>
        <Link to={`/clients/${id}/reports`}>
          <Card className="hover:border-petrol-300 transition-colors cursor-pointer">
            <CardBody className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-gold-50 flex items-center justify-center">
                <FileText size={18} className="text-gold-600" />
              </div>
              <div>
                <div className="font-medium text-dark text-sm">Relatórios</div>
                <div className="text-xs text-dark/40">Ver e criar relatórios</div>
              </div>
            </CardBody>
          </Card>
        </Link>
      </div>
    </div>
  );
}

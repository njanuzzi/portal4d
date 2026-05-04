import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { ChevronRight, FileText, Search, User } from 'lucide-react';
import { Card, CardBody } from '../../components/ui/Card';
import { Badge } from '../../components/ui/Badge';
import { EmptyState } from '../../components/ui/EmptyState';
import { PageSpinner } from '../../components/ui/Spinner';
import { formatDate } from '../../lib/format';
import { supabase } from '../../lib/supabase';
import type { Profile } from '../../lib/database.types';

type ClientProfile = Profile & { diary_id?: string | null };
type ClientFilter = 'all' | 'active' | 'inactive';

export function Reports() {
  const [clients, setClients] = useState<ClientProfile[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [filter, setFilter] = useState<ClientFilter>('active');
  const [error, setError] = useState('');

  useEffect(() => {
    let cancelled = false;

    const loadClients = async () => {
      setLoading(true);
      setError('');

      const { data, error: clientsError } = await supabase
        .from('profiles')
        .select('*')
        .eq('role', 'client')
        .order('name', { ascending: true });

      if (cancelled) return;

      if (clientsError) {
        setError(clientsError.message);
        setClients([]);
      } else {
        setClients((data ?? []) as ClientProfile[]);
      }

      setLoading(false);
    };

    loadClients();

    return () => {
      cancelled = true;
    };
  }, []);

  const filteredClients = clients.filter((client) => {
    const matchesSearch = client.name.toLowerCase().includes(search.toLowerCase()) ||
      client.email.toLowerCase().includes(search.toLowerCase());
    const matchesStatus = filter === 'all' ||
      (filter === 'active' && client.active) ||
      (filter === 'inactive' && !client.active);

    return matchesSearch && matchesStatus;
  });

  if (loading) return <PageSpinner />;

  return (
    <div className="p-6 max-w-4xl mx-auto">
      <div className="mb-8">
        <h1 className="text-2xl font-semibold text-dark font-serif">Relatórios</h1>
        <p className="text-dark/50 text-sm mt-1">Selecione um cliente para visualizar ou criar relatórios</p>
      </div>

      {error && (
        <div className="mb-4 text-sm text-red-600 bg-red-50 border border-red-200 rounded-lg px-3 py-2">
          {error}
        </div>
      )}

      <Card className="mb-5">
        <CardBody className="space-y-4">
          <div className="relative">
            <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-dark/30" />
            <input
              type="text"
              placeholder="Digite o nome do cliente"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full pl-9 pr-4 py-2.5 rounded-lg border border-beige-300 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-petrol-400 text-dark placeholder:text-dark/30"
            />
          </div>

          <div className="flex flex-wrap gap-4">
            {[
              { value: 'active', label: 'Ativo' },
              { value: 'inactive', label: 'Inativo' },
              { value: 'all', label: 'Todos' },
            ].map((option) => (
              <label key={option.value} className="flex items-center gap-2 text-sm text-dark/70 cursor-pointer">
                <input
                  type="radio"
                  name="client-status-filter"
                  value={option.value}
                  checked={filter === option.value}
                  onChange={() => setFilter(option.value as ClientFilter)}
                  className="h-4 w-4 border-beige-300 text-petrol-700 focus:ring-petrol-400"
                />
                {option.label}
              </label>
            ))}
          </div>
        </CardBody>
      </Card>

      {filteredClients.length === 0 ? (
        <EmptyState
          icon={<FileText size={40} />}
          title="Nenhum cliente encontrado"
          description="Ajuste a busca ou o filtro de status"
        />
      ) : (
        <Card>
          <div className="divide-y divide-beige-200">
            {filteredClients.map((client) => {
              const isInactive = !client.active;

              return (
                <Link
                  key={client.id}
                  to={`/reports/${client.id}`}
                  className={`flex items-center gap-4 px-6 py-4 hover:bg-beige-50 transition-colors group ${isInactive ? 'bg-beige-50 opacity-70' : ''}`}
                >
                  <div className={`w-10 h-10 rounded-full flex items-center justify-center shrink-0 ${isInactive ? 'bg-beige-200' : 'bg-petrol-100'}`}>
                    <User size={18} className={isInactive ? 'text-dark/40' : 'text-petrol-700'} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className={`font-medium text-sm ${isInactive ? 'text-dark/50' : 'text-dark'}`}>{client.name}</div>
                    <div className="text-dark/40 text-xs truncate">{client.email}</div>
                  </div>
                  <div className="hidden sm:block text-xs text-dark/30">{formatDate(client.created_at)}</div>
                  <Badge variant={client.active ? 'success' : 'neutral'}>
                    {client.active ? 'Ativo' : 'Inativo'}
                  </Badge>
                  <ChevronRight size={16} className="text-dark/20 group-hover:text-dark/50 transition-colors" />
                </Link>
              );
            })}
          </div>
        </Card>
      )}
    </div>
  );
}

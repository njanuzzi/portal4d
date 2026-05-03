import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { UserPlus, Search, ChevronRight, User } from 'lucide-react';
import { Card } from '../../components/ui/Card';
import { Button } from '../../components/ui/Button';
import { Badge } from '../../components/ui/Badge';
import { EmptyState } from '../../components/ui/EmptyState';
import { PageSpinner } from '../../components/ui/Spinner';
import { formatDate } from '../../lib/format';
import { supabase } from '../../lib/supabase';
import type { Profile } from '../../lib/database.types';

export function Clients() {
  const [clients, setClients] = useState<Profile[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');

  useEffect(() => {
    supabase
      .from('profiles')
      .select('*')
      .eq('role', 'client')
      .order('created_at', { ascending: false })
      .then(({ data }) => {
        setClients(data ?? []);
        setLoading(false);
      });
  }, []);

  const filtered = clients.filter(
    (c) =>
      c.name.toLowerCase().includes(search.toLowerCase()) ||
      c.email.toLowerCase().includes(search.toLowerCase())
  );

  if (loading) return <PageSpinner />;

  return (
    <div className="p-6 max-w-4xl mx-auto">
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-2xl font-semibold text-dark font-serif">Clientes</h1>
          <p className="text-dark/50 text-sm mt-1">{clients.length} cliente{clients.length !== 1 ? 's' : ''} cadastrado{clients.length !== 1 ? 's' : ''}</p>
        </div>
        <Link to="/clients/new">
          <Button>
            <UserPlus size={16} />
            Novo Cliente
          </Button>
        </Link>
      </div>

      {clients.length > 0 && (
        <div className="mb-4 relative">
          <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-dark/30" />
          <input
            type="text"
            placeholder="Buscar por nome ou e-mail..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-9 pr-4 py-2.5 rounded-lg border border-beige-300 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-petrol-400 text-dark placeholder:text-dark/30"
          />
        </div>
      )}

      {filtered.length === 0 ? (
        <EmptyState
          icon={<User size={40} />}
          title={search ? 'Nenhum cliente encontrado' : 'Nenhum cliente cadastrado'}
          description={search ? 'Tente um termo diferente' : 'Cadastre o primeiro cliente para começar'}
          action={
            !search ? (
              <Link to="/clients/new">
                <Button><UserPlus size={16} />Cadastrar Cliente</Button>
              </Link>
            ) : undefined
          }
        />
      ) : (
        <Card>
          <div className="divide-y divide-beige-200">
            {filtered.map((client) => (
              <Link
                key={client.id}
                to={`/clients/${client.id}`}
                className="flex items-center gap-4 px-6 py-4 hover:bg-beige-50 transition-colors group"
              >
                <div className="w-10 h-10 rounded-full bg-petrol-100 flex items-center justify-center shrink-0">
                  <span className="text-petrol-700 font-medium text-sm">
                    {client.name?.charAt(0)?.toUpperCase() || '?'}
                  </span>
                </div>
                <div className="flex-1 min-w-0">
                  <div className="font-medium text-dark text-sm">{client.name}</div>
                  <div className="text-dark/40 text-xs truncate">{client.email}</div>
                </div>
                <div className="flex items-center gap-3">
                  <div className="hidden sm:block text-xs text-dark/30">{formatDate(client.created_at)}</div>
                  <Badge variant={client.active ? 'success' : 'neutral'}>
                    {client.active ? 'Ativo' : 'Inativo'}
                  </Badge>
                  <ChevronRight size={16} className="text-dark/20 group-hover:text-dark/50 transition-colors" />
                </div>
              </Link>
            ))}
          </div>
        </Card>
      )}
    </div>
  );
}

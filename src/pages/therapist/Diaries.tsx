import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { Plus, BookOpen, CheckCircle, Circle, ChevronRight } from 'lucide-react';
import { Card, CardBody } from '../../components/ui/Card';
import { Button } from '../../components/ui/Button';
import { Badge } from '../../components/ui/Badge';
import { EmptyState } from '../../components/ui/EmptyState';
import { PageSpinner } from '../../components/ui/Spinner';
import { formatDate } from '../../lib/format';
import { MOCK_DIARIES } from '../../lib/mockData';
import type { Diary } from '../../lib/database.types';

export function Diaries() {
  const [diaries, setDiaries] = useState<Diary[]>([]);
  const [loading, setLoading] = useState(true);
  const [activating, setActivating] = useState<string | null>(null);

  const load = () => {
    setDiaries([...MOCK_DIARIES]);
    setLoading(false);
  };

  useEffect(() => { load(); }, []);

  const setActive = (diary: Diary) => {
    if (diary.is_active) return;
    setActivating(diary.id);
    setTimeout(() => {
      MOCK_DIARIES.forEach(d => { d.is_active = d.id === diary.id; });
      load();
      setActivating(null);
    }, 400);
  };

  if (loading) return <PageSpinner />;

  return (
    <div className="p-6 max-w-3xl mx-auto">
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-2xl font-semibold text-dark font-serif">Diários</h1>
          <p className="text-dark/50 text-sm mt-1">Apenas um diário pode estar ativo por vez</p>
        </div>
        <Link to="/diaries/new">
          <Button>
            <Plus size={16} />
            Novo Diário
          </Button>
        </Link>
      </div>

      {diaries.length === 0 ? (
        <EmptyState
          icon={<BookOpen size={40} />}
          title="Nenhum diário criado"
          description="Crie um diário estruturado para seus clientes"
          action={
            <Link to="/diaries/new">
              <Button><Plus size={16} />Criar Diário</Button>
            </Link>
          }
        />
      ) : (
        <div className="space-y-3">
          {diaries.map((diary) => (
            <Card key={diary.id} className={diary.is_active ? 'border-petrol-300 ring-1 ring-petrol-200' : ''}>
              <CardBody className="flex items-center gap-4">
                <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${diary.is_active ? 'bg-petrol-100' : 'bg-beige-200'}`}>
                  <BookOpen size={18} className={diary.is_active ? 'text-petrol-700' : 'text-dark/40'} />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="font-medium text-dark text-sm">{diary.name}</span>
                    {diary.is_active && <Badge variant="success">Ativo</Badge>}
                  </div>
                  <div className="text-xs text-dark/40 mt-0.5">Criado em {formatDate(diary.created_at)}</div>
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  {!diary.is_active && (
                    <Button
                      variant="ghost"
                      size="sm"
                      loading={activating === diary.id}
                      onClick={() => setActive(diary)}
                    >
                      <Circle size={14} />
                      Ativar
                    </Button>
                  )}
                  {diary.is_active && (
                    <span className="flex items-center gap-1 text-xs text-emerald-600 font-medium">
                      <CheckCircle size={14} />
                      Ativo
                    </span>
                  )}
                  <Link to={`/diaries/${diary.id}`}>
                    <Button variant="ghost" size="sm">
                      <ChevronRight size={14} />
                    </Button>
                  </Link>
                </div>
              </CardBody>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}

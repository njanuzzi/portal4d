import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { Plus, Wand2, ChevronRight, Trash2, ArrowLeft } from 'lucide-react';
import { Card, CardBody } from '../../components/ui/Card';
import { Button } from '../../components/ui/Button';
import { EmptyState } from '../../components/ui/EmptyState';
import { PageSpinner } from '../../components/ui/Spinner';
import { Modal } from '../../components/ui/Modal';
import { formatDateTime } from '../../lib/format';
import { supabase } from '../../lib/supabase';
import type { Roteiro } from '../../lib/database.types';

export function Roteiros() {
  const [roteiros, setRoteiros] = useState<Roteiro[]>([]);
  const [loading, setLoading] = useState(true);
  const [deleteTarget, setDeleteTarget] = useState<Roteiro | null>(null);
  const [deleteLoading, setDeleteLoading] = useState(false);
  const [deleteError, setDeleteError] = useState('');

  const load = async () => {
    setLoading(true);
    const { data } = await supabase
      .from('roteiros')
      .select('*')
      .order('updated_at', { ascending: false });
    setRoteiros(data ?? []);
    setLoading(false);
  };

  useEffect(() => { load(); }, []);

  const handleDelete = async () => {
    if (!deleteTarget) return;
    setDeleteLoading(true);
    setDeleteError('');
    const { error } = await supabase.from('roteiros').delete().eq('id', deleteTarget.id);
    if (error) {
      setDeleteError(error.message);
      setDeleteLoading(false);
      return;
    }
    setRoteiros((prev) => prev.filter((r) => r.id !== deleteTarget.id));
    setDeleteTarget(null);
    setDeleteLoading(false);
  };

  if (loading) return <PageSpinner />;

  return (
    <div className="p-6 max-w-3xl mx-auto">
      <Link to="/gestao-conteudos" className="flex items-center gap-2 text-sm text-dark/50 hover:text-petrol-700 transition-colors mb-4">
        <ArrowLeft size={16} />
        Voltar para Biblioteca 4D
      </Link>
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-2xl font-semibold text-dark font-serif">Oficina de Roteiro</h1>
          <p className="text-dark/50 text-sm mt-1">Cole um texto bruto e extraia os 6 mecanismos do roteiro automaticamente</p>
        </div>
        <Link to="/roteiros/novo">
          <Button><Plus size={16} />Novo Roteiro</Button>
        </Link>
      </div>

      {roteiros.length === 0 ? (
        <EmptyState
          icon={<Wand2 size={40} />}
          title="Nenhum roteiro criado"
          description="Cole um texto bruto (sessão, rascunho, transcrição) e receba os 6 campos do roteiro pré-preenchidos"
          action={<Link to="/roteiros/novo"><Button><Plus size={16} />Criar Roteiro</Button></Link>}
        />
      ) : (
        <div className="space-y-3">
          {roteiros.map((roteiro) => (
            <Card key={roteiro.id}>
              <CardBody className="flex items-center gap-4">
                <div className="w-10 h-10 rounded-lg bg-beige-200 flex items-center justify-center shrink-0">
                  <Wand2 size={18} className="text-dark/40" />
                </div>
                <div className="flex-1 min-w-0">
                  <span className="font-medium text-dark text-sm">{roteiro.title || 'Sem título'}</span>
                  <div className="text-xs text-dark/40 mt-0.5">
                    Atualizado em {formatDateTime(roteiro.updated_at)}
                  </div>
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  <Button variant="ghost" size="sm" onClick={() => setDeleteTarget(roteiro)}>
                    <Trash2 size={14} className="text-red-400" />
                  </Button>
                  <Link to={`/roteiros/${roteiro.id}`}>
                    <Button variant="ghost" size="sm"><ChevronRight size={14} /></Button>
                  </Link>
                </div>
              </CardBody>
            </Card>
          ))}
        </div>
      )}

      <Modal open={!!deleteTarget} onClose={() => setDeleteTarget(null)} title="Excluir Roteiro" size="sm">
        <div className="space-y-4">
          <p className="text-sm text-dark/70">Tem certeza? Esta ação não pode ser desfeita.</p>
          {deleteError && (
            <div className="text-sm text-red-600 bg-red-50 border border-red-200 rounded-lg px-3 py-2">{deleteError}</div>
          )}
          <div className="flex gap-3">
            <Button variant="danger" loading={deleteLoading} onClick={handleDelete} className="flex-1">Excluir</Button>
            <Button variant="ghost" onClick={() => setDeleteTarget(null)}>Cancelar</Button>
          </div>
        </div>
      </Modal>
    </div>
  );
}

import { useState, FormEvent } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { ArrowLeft } from 'lucide-react';
import { Card, CardBody } from '../../components/ui/Card';
import { Button } from '../../components/ui/Button';
import { Input } from '../../components/ui/Input';
import { MOCK_DIARIES } from '../../lib/mockData';
import type { Diary } from '../../lib/database.types';

export function NewDiary() {
  const navigate = useNavigate();
  const [name, setName] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = (e: FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;
    setLoading(true);
    setTimeout(() => {
      const newDiary: Diary = {
        id: `dev-diary-${Date.now()}`,
        name: name.trim(),
        is_active: false,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      };
      MOCK_DIARIES.push(newDiary);
      setLoading(false);
      navigate(`/diaries/${newDiary.id}`);
    }, 400);
  };

  return (
    <div className="p-6 max-w-xl mx-auto">
      <div className="mb-6">
        <Link to="/diaries" className="flex items-center gap-2 text-sm text-dark/50 hover:text-petrol-700 transition-colors mb-4">
          <ArrowLeft size={16} />
          Voltar para Diários
        </Link>
        <h1 className="text-2xl font-semibold text-dark font-serif">Novo Diário</h1>
        <p className="text-dark/50 text-sm mt-1">Defina o nome e depois adicione as perguntas</p>
      </div>

      <Card>
        <CardBody>
          <form onSubmit={handleSubmit} className="space-y-4">
            <Input
              label="Nome do diário"
              placeholder="Ex: Diário de Acompanhamento Semanal"
              value={name}
              onChange={(e) => setName(e.target.value)}
              required
              autoFocus
            />
            <div className="flex gap-3 pt-2">
              <Button type="submit" loading={loading} className="flex-1">
                Criar Diário
              </Button>
              <Link to="/diaries">
                <Button type="button" variant="ghost">Cancelar</Button>
              </Link>
            </div>
          </form>
        </CardBody>
      </Card>
    </div>
  );
}

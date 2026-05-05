import { useState, FormEvent } from 'react';
import { CheckCircle, Eye, EyeOff } from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { Card, CardBody } from '../../components/ui/Card';
import { Button } from '../../components/ui/Button';
import { Input } from '../../components/ui/Input';

export function ChangePassword() {
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [saving, setSaving] = useState(false);
  const [done, setDone] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setError('');

    if (password.length < 8) {
      setError('A senha deve ter pelo menos 8 caracteres.');
      return;
    }
    if (password !== confirm) {
      setError('As senhas não coincidem.');
      return;
    }

    setSaving(true);
    const { error: updateError } = await supabase.auth.updateUser({ password });

    if (updateError) {
      setError(updateError.message);
      setSaving(false);
      return;
    }

    setDone(true);
    setSaving(false);
  };

  if (done) {
    return (
      <div className="text-center py-16">
        <div className="w-14 h-14 rounded-full bg-emerald-100 flex items-center justify-center mx-auto mb-4">
          <CheckCircle size={28} className="text-emerald-600" />
        </div>
        <h2 className="text-xl font-semibold text-dark font-serif mb-2">Senha atualizada!</h2>
        <p className="text-dark/50 text-sm">Sua senha foi alterada com sucesso.</p>
      </div>
    );
  }

  return (
    <div>
      <div className="mb-6">
        <h1 className="text-xl font-semibold text-dark font-serif">Alterar Senha</h1>
        <p className="text-dark/50 text-sm mt-1">Escolha uma senha segura para sua conta.</p>
      </div>

      <Card className="max-w-sm">
        <CardBody>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="relative">
              <Input
                label="Nova senha"
                type={showPassword ? 'text' : 'password'}
                placeholder="Mínimo 8 caracteres"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                autoFocus
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-3 top-8 text-dark/40 hover:text-dark/70 transition-colors"
              >
                {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
              </button>
            </div>

            <Input
              label="Confirmar nova senha"
              type={showPassword ? 'text' : 'password'}
              placeholder="Repita a senha"
              value={confirm}
              onChange={(e) => setConfirm(e.target.value)}
              required
            />

            {error && (
              <div className="text-sm text-red-600 bg-red-50 border border-red-200 rounded-lg px-3 py-2">
                {error}
              </div>
            )}

            <Button type="submit" loading={saving} className="w-full">
              Salvar nova senha
            </Button>
          </form>
        </CardBody>
      </Card>
    </div>
  );
}

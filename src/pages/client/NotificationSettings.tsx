import { useState } from 'react';
import { Bell, BellOff, CheckCircle } from 'lucide-react';
import { Card, CardBody } from '../../components/ui/Card';
import { Button } from '../../components/ui/Button';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../contexts/AuthContext';
import { requestPushSubscription } from '../../lib/push';

type Preference = 'enabled' | 'declined' | null;

export function NotificationSettings() {
  const { profile, refreshProfile } = useAuth();
  const [saving, setSaving] = useState<'enable' | 'decline' | null>(null);

  const preference = (profile as unknown as { diary_reminder_preference: Preference } | null)?.diary_reminder_preference ?? null;

  const savePreference = async (fields: { diary_reminder_preference: 'enabled' | 'declined'; diary_reminder_next_at: null }) => {
    if (!profile) return;
    await (supabase
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      .from('profiles') as any)
      .update(fields)
      .eq('id', profile.id);
    await refreshProfile();
  };

  const handleEnable = async () => {
    if (!profile) return;
    setSaving('enable');
    await requestPushSubscription(profile.id);
    await savePreference({ diary_reminder_preference: 'enabled', diary_reminder_next_at: null });
    setSaving(null);
  };

  const handleDecline = async () => {
    setSaving('decline');
    await savePreference({ diary_reminder_preference: 'declined', diary_reminder_next_at: null });
    setSaving(null);
  };

  return (
    <div>
      <div className="mb-6">
        <h1 className="text-xl font-semibold text-dark font-serif">Lembretes do diário</h1>
        <p className="text-dark/50 text-sm mt-1">Escolha se quer ser avisado(a) quando ainda não preencheu o diário do dia.</p>
      </div>

      <Card className="max-w-sm">
        <CardBody className="space-y-4">
          <div className="flex items-start gap-3">
            <div className={`w-10 h-10 rounded-full flex items-center justify-center shrink-0 ${preference === 'enabled' ? 'bg-emerald-100' : 'bg-beige-200'}`}>
              {preference === 'enabled' ? (
                <Bell size={18} className="text-emerald-600" />
              ) : (
                <BellOff size={18} className="text-dark/40" />
              )}
            </div>
            <div>
              <p className="text-sm font-medium text-dark">
                {preference === 'enabled' && 'Avisos ativados'}
                {preference === 'declined' && 'Avisos desativados'}
                {!preference && 'Você ainda não escolheu'}
              </p>
              <p className="text-xs text-dark/50 mt-0.5">
                {preference === 'enabled' && 'Você recebe notificação e e-mail quando não preencher o diário do dia.'}
                {preference === 'declined' && 'Você não recebe avisos de diário pendente.'}
                {!preference && 'Ative para receber um aviso quando esquecer de preencher o diário.'}
              </p>
            </div>
          </div>

          <div className="flex flex-col gap-2">
            {preference !== 'enabled' && (
              <Button onClick={handleEnable} loading={saving === 'enable'} disabled={!!saving} className="w-full">
                Ativar avisos
              </Button>
            )}
            {preference !== 'declined' && (
              <Button
                variant="ghost"
                onClick={handleDecline}
                loading={saving === 'decline'}
                disabled={!!saving}
                className="w-full"
              >
                Desativar avisos
              </Button>
            )}
            {preference === 'enabled' && (
              <div className="flex items-center gap-1.5 text-xs text-emerald-600 justify-center">
                <CheckCircle size={13} />
                Tudo certo, você será avisado(a)
              </div>
            )}
          </div>
        </CardBody>
      </Card>
    </div>
  );
}

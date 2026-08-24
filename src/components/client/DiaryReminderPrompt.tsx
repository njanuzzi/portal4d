import { useState } from 'react';
import { Bell } from 'lucide-react';
import { Modal } from '../ui/Modal';
import { Button } from '../ui/Button';
import { supabase } from '../../lib/supabase';
import { requestPushSubscription } from '../../lib/push';

interface DiaryReminderPromptProps {
  clientId: string;
  onResolved: () => void;
}

type Choice = 'enable' | 'decline' | 'later' | null;

export function DiaryReminderPrompt({ clientId, onResolved }: DiaryReminderPromptProps) {
  const [loading, setLoading] = useState<Choice>(null);

  const savePreference = async (fields: { diary_reminder_preference?: 'enabled' | 'declined' | null; diary_reminder_next_at?: string | null }) => {
    await (supabase
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      .from('profiles') as any)
      .update(fields)
      .eq('id', clientId);
  };

  const handleEnable = async () => {
    setLoading('enable');
    await requestPushSubscription(clientId);
    await savePreference({ diary_reminder_preference: 'enabled', diary_reminder_next_at: null });
    setLoading(null);
    onResolved();
  };

  const handleDecline = async () => {
    setLoading('decline');
    await savePreference({ diary_reminder_preference: 'declined', diary_reminder_next_at: null });
    setLoading(null);
    onResolved();
  };

  const handleLater = async () => {
    setLoading('later');
    const nextAt = new Date(Date.now() + 2 * 24 * 60 * 60 * 1000).toISOString();
    await savePreference({ diary_reminder_next_at: nextAt });
    setLoading(null);
    onResolved();
  };

  return (
    <Modal open onClose={handleLater} title="Lembretes do diário" size="sm">
      <div className="space-y-4">
        <div className="flex items-start gap-3">
          <div className="w-10 h-10 rounded-full bg-gold-50 flex items-center justify-center shrink-0">
            <Bell size={18} className="text-gold-600" />
          </div>
          <p className="text-sm text-dark/70 leading-relaxed">
            Quer receber um aviso quando ainda não tiver preenchido o diário do dia? Você pode ser avisado(a) por
            notificação no navegador e por e-mail, com o link de acesso ao portal.
          </p>
        </div>

        <div className="flex flex-col gap-2">
          <Button onClick={handleEnable} loading={loading === 'enable'} disabled={!!loading} className="w-full">
            Sim, quero ser avisado(a)
          </Button>
          <Button
            variant="ghost"
            onClick={handleLater}
            loading={loading === 'later'}
            disabled={!!loading}
            className="w-full"
          >
            Lembrar mais tarde
          </Button>
          <button
            type="button"
            onClick={handleDecline}
            disabled={!!loading}
            className="text-xs text-dark/40 hover:text-dark/60 transition-colors disabled:opacity-50 self-center"
          >
            Não, obrigado(a)
          </button>
        </div>
      </div>
    </Modal>
  );
}

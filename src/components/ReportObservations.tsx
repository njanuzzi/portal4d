import { useEffect, useState } from 'react';
import { Send, Save, MessageCircle } from 'lucide-react';
import { Card, CardBody } from './ui/Card';
import { Button } from './ui/Button';
import { Textarea } from './ui/Textarea';
import { supabase } from '../lib/supabase';

type AuthorRole = 'client' | 'therapist';

interface ObservationRow {
  id: string;
  author_role: AuthorRole;
  message: string;
  created_at: string;
}

interface ReportObservationsProps {
  assessmentId: string;
  clientId: string;
  /** De qual lado esta tela está sendo vista — decide os rótulos "Você" / "Cliente" / "Terapeuta". */
  viewerRole: AuthorRole;
}

const formatDateTime = (iso: string) =>
  new Date(iso).toLocaleString('pt-BR', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' });

export function ReportObservations({ assessmentId, clientId, viewerRole }: ReportObservationsProps) {
  const [thread, setThread] = useState<ObservationRow[]>([]);
  const [draft, setDraft] = useState('');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [sending, setSending] = useState(false);
  const [error, setError] = useState('');
  const [savedHint, setSavedHint] = useState(false);

  const load = async () => {
    setLoading(true);
    const [{ data: thread }, { data: draftRow }] = await Promise.all([
      supabase
        .from('report_observations')
        .select('id, author_role, message, created_at')
        .eq('assessment_id', assessmentId)
        .order('created_at', { ascending: true }),
      (supabase
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        .from('report_draft_comments') as any)
        .select('message')
        .eq('assessment_id', assessmentId)
        .eq('author_role', viewerRole)
        .maybeSingle() as Promise<{ data: { message: string } | null }>,
    ]);
    setThread((thread ?? []) as ObservationRow[]);
    setDraft(draftRow?.message ?? '');
    setLoading(false);
  };

  useEffect(() => { load(); }, [assessmentId, viewerRole]);

  const handleSaveDraft = async () => {
    setSaving(true);
    setError('');
    const { error: saveError } = await (supabase
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      .from('report_draft_comments') as any)
      .upsert(
        { assessment_id: assessmentId, client_id: clientId, author_role: viewerRole, message: draft, updated_at: new Date().toISOString() },
        { onConflict: 'assessment_id,author_role' }
      );
    if (saveError) {
      setError(saveError.message);
      setSaving(false);
      return;
    }
    setSaving(false);
    setSavedHint(true);
    setTimeout(() => setSavedHint(false), 2000);
  };

  const handleSend = async () => {
    if (!draft.trim()) return;
    setSending(true);
    setError('');
    const { error: fnError } = await supabase.functions.invoke('send-report-observation', {
      body: { assessment_id: assessmentId, message: draft.trim() },
    });
    if (fnError) {
      setError(fnError.message || 'Erro ao enviar.');
      setSending(false);
      return;
    }
    setDraft('');
    await load();
    setSending(false);
  };

  const roleLabel = (role: AuthorRole) => {
    if (role === viewerRole) return 'Você';
    return role === 'client' ? 'Cliente' : 'Terapeuta';
  };

  return (
    <Card>
      <CardBody>
        <div className="flex items-center gap-2 mb-1">
          <MessageCircle size={16} className="text-petrol-700" />
          <h2 className="font-semibold text-dark font-serif text-base">Observações</h2>
        </div>
        <p className="text-xs text-dark/40 mb-3">
          {viewerRole === 'client'
            ? 'Deixe suas observações sobre esse relatório para a sua terapeuta.'
            : 'Converse com o cliente sobre esse relatório.'}
        </p>

        {!loading && thread.length > 0 && (
          <div className="space-y-2 mb-4 max-h-60 overflow-y-auto pr-1">
            {thread.map((obs) => (
              <div key={obs.id} className="bg-beige-50 rounded-lg px-3 py-2">
                <div className="flex items-center justify-between gap-2 mb-0.5">
                  <span className="text-xs font-medium text-dark/70">{roleLabel(obs.author_role)}</span>
                  <span className="text-[11px] text-dark/40">{formatDateTime(obs.created_at)}</span>
                </div>
                <p className="text-sm text-dark/80 whitespace-pre-wrap">{obs.message}</p>
              </div>
            ))}
          </div>
        )}

        <Textarea
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          placeholder="Escreva sua observação..."
          rows={3}
          disabled={saving || sending}
        />

        {error && (
          <div className="text-sm text-red-600 bg-red-50 border border-red-200 rounded-lg px-3 py-2 mt-2">
            {error}
          </div>
        )}

        <div className="flex items-center gap-2 mt-3">
          <Button size="sm" variant="ghost" loading={saving} onClick={handleSaveDraft} disabled={sending}>
            <Save size={14} />
            Apenas salvar
          </Button>
          <Button size="sm" loading={sending} onClick={handleSend} disabled={saving || !draft.trim()}>
            <Send size={14} />
            {viewerRole === 'client' ? 'Salvar e enviar para a terapeuta' : 'Salvar e enviar para o cliente'}
          </Button>
          {savedHint && <span className="text-xs text-dark/40">Rascunho salvo</span>}
        </div>
      </CardBody>
    </Card>
  );
}

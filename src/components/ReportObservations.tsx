import { useEffect, useState } from 'react';
import { Send, Save, MessageCircle, Pencil, Trash2, SendHorizontal, X, Reply } from 'lucide-react';
import { Card, CardBody } from './ui/Card';
import { Button } from './ui/Button';
import { Badge } from './ui/Badge';
import { Textarea } from './ui/Textarea';
import { supabase } from '../lib/supabase';

type AuthorRole = 'client' | 'therapist';
type ObservationStatus = 'draft' | 'sent';

interface ObservationRow {
  id: string;
  parent_id: string | null;
  author_role: AuthorRole;
  message: string;
  status: ObservationStatus;
  created_at: string;
  updated_at: string;
}

interface ReportObservationsProps {
  assessmentId: string;
  clientId: string;
  /** De qual lado esta tela está sendo vista — decide os rótulos "Você" / "Cliente" / "Terapeuta" e o que é editável. */
  viewerRole: AuthorRole;
}

const formatDateTime = (iso: string) =>
  new Date(iso).toLocaleString('pt-BR', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' });

export function ReportObservations({ assessmentId, clientId, viewerRole }: ReportObservationsProps) {
  const [items, setItems] = useState<ObservationRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const [newMessage, setNewMessage] = useState('');
  const [composing, setComposing] = useState<'save' | 'send' | null>(null);

  const [editingId, setEditingId] = useState<string | null>(null);
  const [editText, setEditText] = useState('');
  const [editBusy, setEditBusy] = useState<'save' | 'send' | null>(null);

  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [sendingId, setSendingId] = useState<string | null>(null);

  const [replyingToId, setReplyingToId] = useState<string | null>(null);
  const [replyText, setReplyText] = useState('');
  const [replyBusy, setReplyBusy] = useState<'save' | 'send' | null>(null);

  const load = async () => {
    setLoading(true);
    const { data, error: loadError } = await supabase
      .from('report_observations')
      .select('id, parent_id, author_role, message, status, created_at, updated_at')
      .eq('assessment_id', assessmentId)
      .order('created_at', { ascending: true });
    setItems((data ?? []) as ObservationRow[]);
    if (loadError) setError(loadError.message);
    setLoading(false);
  };

  useEffect(() => { load(); }, [assessmentId, viewerRole]);

  const handleCreate = async (mode: 'save' | 'send', parentId: string | null = null) => {
    if (!newMessage.trim()) return;
    setComposing(mode);
    setError('');

    if (mode === 'save') {
      const { error: insertError } = await (supabase
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        .from('report_observations') as any)
        .insert({ assessment_id: assessmentId, client_id: clientId, author_role: viewerRole, message: newMessage.trim(), status: 'draft', parent_id: parentId });
      if (insertError) { setError(insertError.message); setComposing(null); return; }
    } else {
      const { error: fnError } = await supabase.functions.invoke('send-report-observation', {
        body: { assessment_id: assessmentId, message: newMessage.trim(), parent_id: parentId },
      });
      if (fnError) { setError(fnError.message || 'Erro ao enviar.'); setComposing(null); return; }
    }

    setNewMessage('');
    await load();
    setComposing(null);
  };

  const startEdit = (item: ObservationRow) => {
    setEditingId(item.id);
    setEditText(item.message);
    setError('');
  };
  const cancelEdit = () => { setEditingId(null); setEditText(''); };

  const handleEditSave = async (item: ObservationRow) => {
    if (!editText.trim()) return;
    setEditBusy('save');
    const { error: updateError } = await (supabase
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      .from('report_observations') as any)
      .update({ message: editText.trim(), updated_at: new Date().toISOString() })
      .eq('id', item.id);
    if (updateError) { setError(updateError.message); setEditBusy(null); return; }
    setEditingId(null);
    await load();
    setEditBusy(null);
  };

  const handleEditSend = async (item: ObservationRow) => {
    if (!editText.trim()) return;
    setEditBusy('send');
    const { error: fnError } = await supabase.functions.invoke('send-report-observation', {
      body: { assessment_id: assessmentId, message: editText.trim(), observation_id: item.id },
    });
    if (fnError) { setError(fnError.message || 'Erro ao enviar.'); setEditBusy(null); return; }
    setEditingId(null);
    await load();
    setEditBusy(null);
  };

  const handleDelete = async (item: ObservationRow) => {
    if (!window.confirm('Excluir essa observação? Respostas dentro dela também serão excluídas.')) return;
    setDeletingId(item.id);
    const { error: deleteError } = await (supabase
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      .from('report_observations') as any)
      .delete()
      .eq('id', item.id);
    if (deleteError) setError(deleteError.message);
    await load();
    setDeletingId(null);
  };

  const handleSendDraft = async (item: ObservationRow) => {
    setSendingId(item.id);
    const { error: fnError } = await supabase.functions.invoke('send-report-observation', {
      body: { assessment_id: assessmentId, message: item.message, observation_id: item.id },
    });
    if (fnError) setError(fnError.message || 'Erro ao enviar.');
    await load();
    setSendingId(null);
  };

  const startReply = (item: ObservationRow) => {
    setReplyingToId(item.id);
    setReplyText('');
    setError('');
  };
  const cancelReply = () => { setReplyingToId(null); setReplyText(''); };

  const handleReply = async (mode: 'save' | 'send', parentId: string) => {
    if (!replyText.trim()) return;
    setReplyBusy(mode);
    setError('');

    if (mode === 'save') {
      const { error: insertError } = await (supabase
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        .from('report_observations') as any)
        .insert({ assessment_id: assessmentId, client_id: clientId, author_role: viewerRole, message: replyText.trim(), status: 'draft', parent_id: parentId });
      if (insertError) { setError(insertError.message); setReplyBusy(null); return; }
    } else {
      const { error: fnError } = await supabase.functions.invoke('send-report-observation', {
        body: { assessment_id: assessmentId, message: replyText.trim(), parent_id: parentId },
      });
      if (fnError) { setError(fnError.message || 'Erro ao enviar.'); setReplyBusy(null); return; }
    }

    cancelReply();
    await load();
    setReplyBusy(null);
  };

  const roleLabel = (role: AuthorRole) => {
    if (role === viewerRole) return 'Você';
    return role === 'client' ? 'Cliente' : 'Terapeuta';
  };

  const childrenOf = (id: string | null) => items.filter((i) => i.parent_id === id);

  const renderNode = (item: ObservationRow, depth: number): JSX.Element => {
    const isOwn = item.author_role === viewerRole;
    const isEditing = editingId === item.id;
    const isReplying = replyingToId === item.id;
    const wasEdited = item.updated_at && item.updated_at !== item.created_at;
    const kids = childrenOf(item.id);

    return (
      <div key={item.id} style={{ marginLeft: depth * 20 }} className={depth > 0 ? 'border-l-2 border-beige-200 pl-3 mt-2' : ''}>
        <div className="bg-beige-50 rounded-lg px-3 py-2">
          <div className="flex items-center justify-between gap-2 mb-1">
            <div className="flex items-center gap-2">
              <span className="text-xs font-medium text-dark/70">{roleLabel(item.author_role)}</span>
              {item.status === 'draft' && <Badge variant="warning">Rascunho</Badge>}
            </div>
            <span className="text-[11px] text-dark/40">
              {formatDateTime(item.created_at)}
              {wasEdited ? ` · editado ${formatDateTime(item.updated_at)}` : ''}
            </span>
          </div>

          {isEditing ? (
            <div className="space-y-2">
              <Textarea value={editText} onChange={(e) => setEditText(e.target.value)} rows={3} disabled={!!editBusy} />
              <div className="flex items-center gap-2">
                <Button size="sm" variant="ghost" loading={editBusy === 'save'} onClick={() => handleEditSave(item)} disabled={!editText.trim()}>
                  <Save size={13} />
                  Apenas salvar
                </Button>
                <Button size="sm" loading={editBusy === 'send'} onClick={() => handleEditSend(item)} disabled={!editText.trim()}>
                  <Send size={13} />
                  Salvar e enviar
                </Button>
                <Button size="sm" variant="ghost" onClick={cancelEdit} disabled={!!editBusy}>
                  <X size={13} />
                  Cancelar
                </Button>
              </div>
            </div>
          ) : (
            <>
              <p className="text-sm text-dark/80 whitespace-pre-wrap">{item.message}</p>
              <div className="flex items-center gap-3 mt-1.5">
                <button
                  type="button"
                  onClick={() => startReply(item)}
                  className="text-xs text-petrol-700 hover:text-petrol-800 flex items-center gap-1"
                >
                  <Reply size={12} />
                  Responder
                </button>
                {isOwn && (
                  <>
                    <button type="button" onClick={() => startEdit(item)} className="text-xs text-petrol-700 hover:text-petrol-800 flex items-center gap-1">
                      <Pencil size={12} />
                      Editar
                    </button>
                    <button
                      type="button"
                      onClick={() => handleDelete(item)}
                      disabled={deletingId === item.id}
                      className="text-xs text-red-600 hover:text-red-700 flex items-center gap-1 disabled:opacity-50"
                    >
                      <Trash2 size={12} />
                      Excluir
                    </button>
                    {item.status === 'draft' && (
                      <button
                        type="button"
                        onClick={() => handleSendDraft(item)}
                        disabled={sendingId === item.id}
                        className="text-xs text-gold-700 hover:text-gold-800 flex items-center gap-1 disabled:opacity-50"
                      >
                        <SendHorizontal size={12} />
                        Enviar {viewerRole === 'client' ? 'para a terapeuta' : 'para o cliente'}
                      </button>
                    )}
                  </>
                )}
              </div>
            </>
          )}
        </div>

        {isReplying && (
          <div className="mt-2 ml-3 space-y-2">
            <Textarea
              value={replyText}
              onChange={(e) => setReplyText(e.target.value)}
              placeholder="Escreva sua resposta..."
              rows={2}
              disabled={!!replyBusy}
            />
            <div className="flex items-center gap-2">
              <Button size="sm" variant="ghost" loading={replyBusy === 'save'} onClick={() => handleReply('save', item.id)} disabled={!replyText.trim()}>
                <Save size={13} />
                Apenas salvar
              </Button>
              <Button size="sm" loading={replyBusy === 'send'} onClick={() => handleReply('send', item.id)} disabled={!replyText.trim()}>
                <Send size={13} />
                Salvar e enviar
              </Button>
              <Button size="sm" variant="ghost" onClick={cancelReply} disabled={!!replyBusy}>
                <X size={13} />
                Cancelar
              </Button>
            </div>
          </div>
        )}

        {kids.map((kid) => renderNode(kid, depth + 1))}
      </div>
    );
  };

  const topLevel = childrenOf(null);

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

        {!loading && topLevel.length > 0 && (
          <div className="space-y-2 mb-4 max-h-96 overflow-y-auto pr-1">
            {topLevel.map((item) => renderNode(item, 0))}
          </div>
        )}

        <Textarea
          value={newMessage}
          onChange={(e) => setNewMessage(e.target.value)}
          placeholder="Escreva uma nova observação..."
          rows={3}
          disabled={!!composing}
        />

        {error && (
          <div className="text-sm text-red-600 bg-red-50 border border-red-200 rounded-lg px-3 py-2 mt-2">
            {error}
          </div>
        )}

        <div className="flex items-center gap-2 mt-3">
          <Button size="sm" variant="ghost" loading={composing === 'save'} onClick={() => handleCreate('save')} disabled={!newMessage.trim()}>
            <Save size={14} />
            Apenas salvar
          </Button>
          <Button size="sm" loading={composing === 'send'} onClick={() => handleCreate('send')} disabled={!newMessage.trim()}>
            <Send size={14} />
            {viewerRole === 'client' ? 'Salvar e enviar para a terapeuta' : 'Salvar e enviar para o cliente'}
          </Button>
        </div>
      </CardBody>
    </Card>
  );
}

import { FormEvent, useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { ArrowLeft, Send, Sparkles, History, CheckCircle2 } from 'lucide-react';
import { Card, CardBody } from '../../components/ui/Card';
import { Button } from '../../components/ui/Button';
import { Badge } from '../../components/ui/Badge';
import { Textarea } from '../../components/ui/Textarea';
import { PageSpinner } from '../../components/ui/Spinner';
import { supabase } from '../../lib/supabase';
import type { Profile } from '../../lib/database.types';
import { diffWords } from '../../lib/diff';

interface ReportRow {
  id: string;
  client_id: string;
  technical_content: string | null;
  previous_content: string | null;
  status: 'draft' | 'reviewed' | 'published';
  generated_with: string | null;
  updated_at: string;
}

const statusLabel: Record<string, string> = {
  draft: 'Rascunho',
  reviewed: 'Revisado',
  published: 'Publicado',
};
const statusVariant: Record<string, 'warning' | 'success' | 'neutral'> = {
  draft: 'warning',
  reviewed: 'success',
  published: 'success',
};

export function SchemaReportDetail() {
  const { id: clientId, reportId } = useParams<{ id: string; reportId: string }>();
  const [client, setClient] = useState<Profile | null>(null);
  const [report, setReport] = useState<ReportRow | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const [instruction, setInstruction] = useState('');
  const [revising, setRevising] = useState(false);
  const [revisionError, setRevisionError] = useState('');
  const [showDiff, setShowDiff] = useState(false);
  const [statusBusy, setStatusBusy] = useState(false);

  const load = async () => {
    if (!clientId || !reportId) { setLoading(false); return; }
    setLoading(true);
    setError('');

    const [{ data: clientRow }, { data: reportRow, error: reportError }] = await Promise.all([
      supabase.from('profiles').select('*').eq('id', clientId).eq('role', 'client').maybeSingle(),
      supabase
        .from('client_schema_reports')
        .select('id, client_id, technical_content, previous_content, status, generated_with, updated_at')
        .eq('id', reportId)
        .maybeSingle(),
    ]);

    setClient((clientRow ?? null) as Profile | null);
    setReport((reportRow ?? null) as ReportRow | null);
    if (reportError) setError(reportError.message);
    setLoading(false);
  };

  useEffect(() => { load(); }, [clientId, reportId]);

  const handleRevise = async (e: FormEvent) => {
    e.preventDefault();
    if (!reportId || !instruction.trim()) return;

    setRevising(true);
    setRevisionError('');

    const { error: fnError } = await supabase.functions.invoke('revise-technical-report', {
      body: { report_id: reportId, instruction: instruction.trim() },
    });

    if (fnError) {
      setRevisionError(fnError.message || 'Erro ao pedir a alteração.');
      setRevising(false);
      return;
    }

    setInstruction('');
    setShowDiff(false);
    await load();
    setRevising(false);
  };

  const markReviewed = async () => {
    if (!reportId) return;
    setStatusBusy(true);
    const { error: updateError } = await supabase
      .from('client_schema_reports')
      .update({ status: 'reviewed', updated_at: new Date().toISOString() })
      .eq('id', reportId);
    setStatusBusy(false);
    if (updateError) { setError(updateError.message); return; }
    await load();
  };

  const formatDateTime = (iso: string) =>
    new Date(iso).toLocaleString('pt-BR', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' });

  if (loading) return <PageSpinner />;

  if (!report) {
    return (
      <div className="p-6 max-w-3xl mx-auto">
        <Link to={`/clients/${clientId}/schema-analysis`} className="flex items-center gap-2 text-sm text-dark/50 hover:text-petrol-700 transition-colors mb-4">
          <ArrowLeft size={16} />
          Voltar
        </Link>
        <div className="text-sm text-red-600 bg-red-50 border border-red-200 rounded-lg px-3 py-2">
          {error || 'Relatório não encontrado.'}
        </div>
      </div>
    );
  }

  return (
    <div className="p-6 max-w-3xl mx-auto">
      <div className="mb-6">
        <Link to={`/clients/${clientId}/schema-analysis`} className="flex items-center gap-2 text-sm text-dark/50 hover:text-petrol-700 transition-colors mb-4">
          <ArrowLeft size={16} />
          Voltar para Análise de Esquemas
        </Link>
        <div className="flex items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl font-semibold text-dark font-serif">Relatório Técnico</h1>
            <p className="text-dark/50 text-sm mt-0.5">{client?.name}</p>
          </div>
          <div className="flex items-center gap-2 shrink-0">
            <Badge variant={statusVariant[report.status] ?? 'neutral'}>
              {statusLabel[report.status] ?? report.status}
            </Badge>
            {report.status === 'draft' && (
              <Button size="sm" variant="ghost" loading={statusBusy} onClick={markReviewed}>
                <CheckCircle2 size={14} />
                Marcar como revisado
              </Button>
            )}
          </div>
        </div>
        <p className="text-xs text-dark/40 mt-2">
          Última atualização em {formatDateTime(report.updated_at)}
          {report.generated_with ? ` · gerado com ${report.generated_with}` : ''}
        </p>
        {report.status === 'draft' && (
          <p className="text-xs text-gold-700 bg-gold-50 border border-gold-200 rounded-lg px-3 py-2 mt-2">
            Enquanto estiver em rascunho, esse relatório não fica disponível para incluir no Fechamento de Ciclo — marque como revisado quando conferir o conteúdo.
          </p>
        )}
      </div>

      {/* Conteúdo do relatório */}
      <Card className="mb-4">
        <CardBody>
          {report.previous_content && (
            <div className="flex justify-end mb-2">
              <button
                type="button"
                onClick={() => setShowDiff((v) => !v)}
                className="flex items-center gap-1.5 text-xs text-petrol-700 hover:text-petrol-800 transition-colors"
              >
                <History size={13} />
                {showDiff ? 'Ver texto final' : 'Ver o que mudou na última revisão'}
              </button>
            </div>
          )}

          {showDiff && report.previous_content ? (
            <div className="text-sm text-dark/80 whitespace-pre-wrap leading-relaxed">
              {diffWords(report.previous_content, report.technical_content || '').map((op, i) => {
                if (op.type === 'equal') return <span key={i}>{op.value}</span>;
                if (op.type === 'insert') {
                  return (
                    <span key={i} className="bg-green-100 text-green-800 rounded-sm">
                      {op.value}
                    </span>
                  );
                }
                return (
                  <span key={i} className="bg-red-100 text-red-700 line-through rounded-sm">
                    {op.value}
                  </span>
                );
              })}
            </div>
          ) : (
            <div className="text-sm text-dark/80 whitespace-pre-wrap leading-relaxed">
              {report.technical_content || 'Relatório ainda não foi gerado.'}
            </div>
          )}
        </CardBody>
      </Card>

      {/* Pedir alterações à IA */}
      <Card>
        <CardBody>
          <div className="flex items-center gap-2 mb-1">
            <Sparkles size={16} className="text-gold-600" />
            <h2 className="font-semibold text-dark font-serif text-base">Pedir alterações</h2>
          </div>
          <p className="text-xs text-dark/40 mb-3">
            Descreva o que você quer mudar no relatório acima — a IA reescreve mantendo o resto fiel ao original.
          </p>

          <form onSubmit={handleRevise} className="space-y-3">
            <Textarea
              value={instruction}
              onChange={(e) => setInstruction(e.target.value)}
              placeholder="Ex: aprofunde mais a hipótese clínica do esquema de Abandono, considerando que o cliente já está em terapia há 2 anos."
              rows={4}
              disabled={revising}
            />
            {revisionError && (
              <div className="text-sm text-red-600 bg-red-50 border border-red-200 rounded-lg px-3 py-2">
                {revisionError}
              </div>
            )}
            <Button type="submit" size="sm" loading={revising} disabled={!instruction.trim()}>
              <Send size={14} />
              Enviar pedido
            </Button>
          </form>
        </CardBody>
      </Card>
    </div>
  );
}

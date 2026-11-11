import { useCallback, useEffect, useState } from 'react';
import { SupabaseClient } from '@supabase/supabase-js';
import { Sparkles, Wand2, Undo2, Copy, Check, Lock } from 'lucide-react';
import { Card, CardBody } from './ui/Card';
import { Button } from './ui/Button';
import { Badge } from './ui/Badge';
import { Textarea } from './ui/Textarea';
import { supabase } from '../lib/supabase';
import { SimpleMarkdown } from './SimpleMarkdown';

// client_bfi_reports é tabela nova, fora dos tipos gerados.
const untypedSupabase = supabase as unknown as SupabaseClient;

interface BfiReport {
  technical_content: string | null;
  previous_content: string | null;
  status: 'generating' | 'ready' | 'error';
  error_message: string | null;
  generated_with: string | null;
  updated_at: string;
}

function formatDateTime(iso: string) {
  return new Date(iso).toLocaleString('pt-BR', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' });
}

// Relatório técnico do Big Five (só a terapeuta vê). É gerado sozinho pelo
// bfi-assessment-save quando a cliente conclui — aqui a tela acompanha a
// geração, permite gerar de novo e ajustar com um pedido livre.
export function BfiTechnicalReportCard({ assessmentId }: { assessmentId: string }) {
  const [report, setReport] = useState<BfiReport | null>(null);
  const [loaded, setLoaded] = useState(false);
  const [generating, setGenerating] = useState(false);
  const [instruction, setInstruction] = useState('');
  const [revising, setRevising] = useState(false);
  const [undoing, setUndoing] = useState(false);
  const [copied, setCopied] = useState(false);
  const [error, setError] = useState('');

  const load = useCallback(async () => {
    const { data } = await untypedSupabase
      .from('client_bfi_reports')
      .select('technical_content, previous_content, status, error_message, generated_with, updated_at')
      .eq('assessment_id', assessmentId)
      .maybeSingle();
    setReport((data ?? null) as BfiReport | null);
    setLoaded(true);
  }, [assessmentId]);

  useEffect(() => { void load(); }, [load]);

  // Enquanto o Claude escreve, atualiza sozinho a cada 5s.
  const isGenerating = generating || report?.status === 'generating';
  useEffect(() => {
    if (!isGenerating) return;
    const timer = setInterval(() => { void load(); }, 5000);
    return () => clearInterval(timer);
  }, [isGenerating, load]);

  const handleGenerate = async () => {
    setGenerating(true);
    setError('');
    setReport((prev) => (prev ? { ...prev, status: 'generating' } : prev));
    const { data, error: fnError } = await supabase.functions.invoke('bfi-technical-report', {
      body: { assessment_id: assessmentId },
    });
    if (fnError || data?.error) setError('Não foi possível gerar o relatório agora. Tente novamente.');
    await load();
    setGenerating(false);
  };

  const handleRevise = async () => {
    if (!instruction.trim()) return;
    setRevising(true);
    setError('');
    const { data, error: fnError } = await supabase.functions.invoke('bfi-technical-report', {
      body: { assessment_id: assessmentId, instruction: instruction.trim() },
    });
    if (fnError || data?.error) {
      setError('Não foi possível aplicar o ajuste agora. Tente novamente.');
    } else {
      setInstruction('');
    }
    await load();
    setRevising(false);
  };

  // Troca o texto atual pelo anterior (e vice-versa), então dá pra desfazer
  // o desfazer.
  const handleUndo = async () => {
    if (!report?.previous_content) return;
    setUndoing(true);
    setError('');
    const { error: updateError } = await untypedSupabase
      .from('client_bfi_reports')
      .update({
        technical_content: report.previous_content,
        previous_content: report.technical_content,
        updated_at: new Date().toISOString(),
      })
      .eq('assessment_id', assessmentId);
    if (updateError) setError(updateError.message);
    await load();
    setUndoing(false);
  };

  const handleCopy = async () => {
    if (!report?.technical_content) return;
    await navigator.clipboard.writeText(report.technical_content);
    setCopied(true);
    setTimeout(() => setCopied(false), 2500);
  };

  if (!loaded) return null;

  const hasContent = !!report?.technical_content;

  return (
    <Card>
      <CardBody className="space-y-4">
        <div className="flex items-center justify-between gap-3 flex-wrap">
          <h2 className="font-semibold text-dark font-serif text-base">Relatório técnico</h2>
          <Badge variant="neutral">
            <Lock size={11} className="mr-1" />
            Só você vê
          </Badge>
        </div>

        {isGenerating && (
          <div className="flex items-center gap-2 text-sm text-petrol-700 bg-petrol-50 border border-petrol-100 rounded-lg px-3 py-2">
            <Sparkles size={14} className="animate-pulse" />
            {hasContent ? 'Gerando uma nova versão…' : 'Gerando o relatório…'} Isso leva de 1 a 3 minutos; a tela atualiza sozinha.
          </div>
        )}

        {!isGenerating && report?.error_message && (
          <div className="text-sm text-red-600 bg-red-50 border border-red-200 rounded-lg px-3 py-2">
            A última geração falhou. {hasContent ? 'O texto abaixo é a versão anterior.' : ''} Clique em "Gerar novamente".
          </div>
        )}

        {error && (
          <div className="text-sm text-red-600 bg-red-50 border border-red-200 rounded-lg px-3 py-2">{error}</div>
        )}

        {!report && !isGenerating && (
          <>
            <p className="text-xs text-dark/50">
              Este resultado ainda não tem relatório (as respostas são de antes da geração automática).
            </p>
            <Button size="sm" onClick={handleGenerate}>
              <Sparkles size={14} />
              Gerar relatório com IA
            </Button>
          </>
        )}

        {hasContent && (
          <>
            <p className="text-xs text-dark/40">
              Atualizado em {formatDateTime(report!.updated_at)}
              {report!.generated_with ? ` · gerado com ${report!.generated_with}` : ''}
            </p>
            <div className="max-h-[40rem] overflow-y-auto bg-beige-50 border border-beige-200 rounded-lg px-4 py-2">
              <SimpleMarkdown content={report!.technical_content!} />
            </div>

            <div className="flex items-center gap-2 flex-wrap">
              <Button size="sm" variant="ghost" onClick={handleCopy}>
                {copied ? <Check size={14} /> : <Copy size={14} />}
                {copied ? 'Copiado!' : 'Copiar'}
              </Button>
              <Button size="sm" variant="ghost" loading={generating} disabled={isGenerating || revising} onClick={handleGenerate}>
                <Sparkles size={14} />
                Gerar novamente
              </Button>
              {report!.previous_content && (
                <Button size="sm" variant="ghost" loading={undoing} disabled={isGenerating || revising} onClick={handleUndo}>
                  <Undo2 size={14} />
                  Voltar à versão anterior
                </Button>
              )}
            </div>

            <div className="border-t border-beige-200 pt-4 space-y-2">
              <Textarea
                label="Pedir ajuste à IA"
                rows={3}
                placeholder='Ex.: "Aprofunde a seção de Neuroticismo pensando em ansiedade no trabalho" ou "Deixe o texto mais curto e em tópicos"'
                value={instruction}
                onChange={(e) => setInstruction(e.target.value)}
                disabled={revising || isGenerating}
              />
              <Button size="sm" loading={revising} disabled={!instruction.trim() || isGenerating} onClick={handleRevise}>
                <Wand2 size={14} />
                Ajustar relatório
              </Button>
            </div>
          </>
        )}

        {!hasContent && !isGenerating && report?.status === 'error' && (
          <Button size="sm" onClick={handleGenerate}>
            <Sparkles size={14} />
            Gerar novamente
          </Button>
        )}
      </CardBody>
    </Card>
  );
}

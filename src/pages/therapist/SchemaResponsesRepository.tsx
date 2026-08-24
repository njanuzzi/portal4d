import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { Brain, Download } from 'lucide-react';
import { Card } from '../../components/ui/Card';
import { Button } from '../../components/ui/Button';
import { Input } from '../../components/ui/Input';
import { Badge } from '../../components/ui/Badge';
import { PageSpinner } from '../../components/ui/Spinner';
import { EmptyState } from '../../components/ui/EmptyState';
import { supabase } from '../../lib/supabase';

interface Domain {
  id: string;
  code: string;
  friendly_name: string;
}

interface AssessmentRow {
  id: string;
  client_id: string;
  version: number;
  submitted_at: string;
  status: string;
  client_name: string;
  client_email: string;
}

interface ScoreCell {
  percentual: number;
  classification: string;
}

const classificationVariant: Record<string, 'success' | 'warning' | 'error'> = {
  'Básico': 'success',
  'Atenção': 'warning',
  'Crítico': 'error',
};

function csvEscape(value: string | number): string {
  const str = String(value);
  if (/[",\n]/.test(str)) return `"${str.replace(/"/g, '""')}"`;
  return str;
}

function formatDateTime(iso: string) {
  return new Date(iso).toLocaleString('pt-BR', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' });
}

export function SchemaResponsesRepository() {
  const [domains, setDomains] = useState<Domain[]>([]);
  const [assessments, setAssessments] = useState<AssessmentRow[]>([]);
  const [scoresByAssessment, setScoresByAssessment] = useState<Record<string, Record<string, ScoreCell>>>({});
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');

  useEffect(() => {
    const load = async () => {
      setLoading(true);

      const { data: domainRows } = await supabase
        .from('schema_domains')
        .select('id, code, friendly_name')
        .order('code');
      const loadedDomains = (domainRows ?? []) as Domain[];
      setDomains(loadedDomains);

      const { data: assessmentRows } = await supabase
        .from('client_assessments')
        .select('id, client_id, version, submitted_at, status, profiles(name, email)')
        .neq('status', 'in_progress')
        .order('submitted_at', { ascending: false });

      const rows: AssessmentRow[] = ((assessmentRows ?? []) as unknown as Array<{
        id: string; client_id: string; version: number; submitted_at: string; status: string;
        profiles: { name: string; email: string } | { name: string; email: string }[] | null;
      }>).map((a) => {
        const profile = Array.isArray(a.profiles) ? a.profiles[0] : a.profiles;
        return {
          id: a.id,
          client_id: a.client_id,
          version: a.version,
          submitted_at: a.submitted_at,
          status: a.status,
          client_name: profile?.name ?? '—',
          client_email: profile?.email ?? '—',
        };
      });
      setAssessments(rows);

      if (rows.length > 0) {
        const { data: scoreRows } = await supabase
          .from('client_schema_scores')
          .select('assessment_id, domain_id, percentual, classification')
          .in('assessment_id', rows.map((r) => r.id));

        const map: Record<string, Record<string, ScoreCell>> = {};
        for (const s of (scoreRows ?? []) as { assessment_id: string; domain_id: string; percentual: number; classification: string }[]) {
          if (!map[s.assessment_id]) map[s.assessment_id] = {};
          map[s.assessment_id][s.domain_id] = { percentual: s.percentual, classification: s.classification };
        }
        setScoresByAssessment(map);
      }

      setLoading(false);
    };
    load();
  }, []);

  const filteredAssessments = useMemo(() => {
    const term = search.trim().toLowerCase();
    if (!term) return assessments;
    return assessments.filter((a) => a.client_name.toLowerCase().includes(term) || a.client_email.toLowerCase().includes(term));
  }, [assessments, search]);

  const handleExportCsv = () => {
    const header = [
      'Cliente', 'Email', 'Versão', 'Data', 'Origem',
      ...domains.flatMap((d) => [`${d.friendly_name} (%)`, `${d.friendly_name} (classificação)`]),
    ];

    const rows = filteredAssessments.map((a) => {
      const scores = scoresByAssessment[a.id] ?? {};
      return [
        a.client_name, a.client_email, a.version, formatDateTime(a.submitted_at), a.status,
        ...domains.flatMap((d) => [scores[d.id]?.percentual ?? '', scores[d.id]?.classification ?? '']),
      ];
    });

    const csv = [header, ...rows].map((row) => row.map(csvEscape).join(',')).join('\n');
    const blob = new Blob(['﻿' + csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `respostas-esquemas-${new Date().toISOString().split('T')[0]}.csv`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  if (loading) return <PageSpinner />;

  return (
    <div className="p-6 max-w-6xl mx-auto">
      <div className="mb-6 flex items-center justify-between gap-4 flex-wrap">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-lg bg-petrol-50 flex items-center justify-center">
            <Brain size={18} className="text-petrol-700" />
          </div>
          <div>
            <h1 className="text-2xl font-semibold text-dark font-serif">Respostas do Inventário</h1>
            <p className="text-dark/50 text-sm mt-0.5">Todas as submissões do Inventário de Esquemas, de todos os clientes</p>
          </div>
        </div>
        <Button onClick={handleExportCsv} disabled={filteredAssessments.length === 0}>
          <Download size={16} />
          Exportar CSV
        </Button>
      </div>

      <div className="mb-4 max-w-sm">
        <Input
          placeholder="Buscar por cliente ou e-mail..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
      </div>

      {filteredAssessments.length === 0 ? (
        <EmptyState
          icon={<Brain size={40} />}
          title="Nenhuma resposta ainda"
          description="As submissões do Inventário de Esquemas vão aparecer aqui"
        />
      ) : (
        <Card className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-beige-300 text-left">
                <th className="px-4 py-3 font-medium text-dark/50 whitespace-nowrap">Cliente</th>
                <th className="px-4 py-3 font-medium text-dark/50 whitespace-nowrap">Versão</th>
                <th className="px-4 py-3 font-medium text-dark/50 whitespace-nowrap">Data</th>
                {domains.map((d) => (
                  <th key={d.id} className="px-4 py-3 font-medium text-dark/50 whitespace-nowrap" title={d.friendly_name}>
                    {d.friendly_name.length > 24 ? `${d.friendly_name.slice(0, 24)}…` : d.friendly_name}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-beige-100">
              {filteredAssessments.map((a) => {
                const scores = scoresByAssessment[a.id] ?? {};
                return (
                  <tr key={a.id} className="hover:bg-beige-50 transition-colors">
                    <td className="px-4 py-3 whitespace-nowrap">
                      <Link to={`/clients/${a.client_id}/schema-analysis`} className="text-petrol-700 hover:underline font-medium">
                        {a.client_name}
                      </Link>
                    </td>
                    <td className="px-4 py-3 text-dark/60 whitespace-nowrap">v{a.version}</td>
                    <td className="px-4 py-3 text-dark/60 whitespace-nowrap">{formatDateTime(a.submitted_at)}</td>
                    {domains.map((d) => {
                      const cell = scores[d.id];
                      return (
                        <td key={d.id} className="px-4 py-3 whitespace-nowrap">
                          {cell ? (
                            <div className="flex items-center gap-1.5">
                              <span className="text-dark/70">{cell.percentual}%</span>
                              <Badge variant={classificationVariant[cell.classification] ?? 'neutral'} className="text-[10px] px-1.5 py-0">
                                {cell.classification}
                              </Badge>
                            </div>
                          ) : (
                            <span className="text-dark/30">—</span>
                          )}
                        </td>
                      );
                    })}
                  </tr>
                );
              })}
            </tbody>
          </table>
        </Card>
      )}
    </div>
  );
}

import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

// === Sincroniza a sessão DE HOJE do Notion pra Relatórios de Sessão ===
//
// Recebe { client_id }, casa o cliente no Notion pelo NOME (a terapeuta se
// comprometeu a manter o nome do cadastro do Notion igual ao nome do
// cliente no portal) e busca só a(s) sessão(ões) de HOJE dele em
// "🗓️ Todas as Sessões" — não varre o histórico inteiro. Carga histórica
// (cliente novo, sessões de dias atrás que ainda não entraram) é
// responsabilidade do script rodado localmente (backfill-client.js), não
// desse botão.
//
// Pra cada sessão de hoje, resolve o conteúdo em 4 níveis de prioridade
// (do mais pronto pro mais bruto):
//
//   1. "Resumos de Sessão" tem uma linha pra essa sessão com o campo
//      "Resumo Clínico" preenchido -> usa direto, já é texto revisado pela
//      terapeuta no Notion (status entra como "revisado", falta só publicar).
//   2. "Resumo Clínico" vazio, mas o CORPO da própria linha de "Resumos de
//      Sessão" tem um relatório escrito -> usa esse.
//   3. Nível 2 também vazio, mas a linha tem "Resumo" (texto bruto do
//      Zoom/clínico) -> usa esse com a limpeza mais pesada.
//   4. Não existe nenhuma linha em "Resumos de Sessão" pra essa sessão ->
//      usa a própria página de "🗓️ Todas as Sessões" e limpa.
//
// Níveis 2/3/4 entram como "rascunho" (não foram revisados, precisam de
// conferência antes de publicar).
//
// Nunca sobrescreve nada que a terapeuta já tocou: uma sessão já
// sincronizada antes (mesmo notion_session_id) é pulada; um relatório
// manual em branco pro mesmo dia é "adotado" (preenchido), mas só se
// ainda estiver vazio e em rascunho.

const supabase = createClient(
  Deno.env.get("SUPABASE_URL")!,
  Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
);

const NOTION_API_KEY = Deno.env.get("NOTION_API_KEY_Sync");
const NOTION_VERSION = "2025-09-03";
const NOTION_VERSION_LEGACY = "2022-06-28";

// IDs fixos das data sources no workspace da terapeuta no Notion — não são
// segredo (só identificam ONDE buscar), por isso ficam hardcoded aqui.
const CADASTRO_CLIENTES_DATA_SOURCE_ID = "45e1889e-d3c7-41e0-a59a-f83eb366c807";
const RESUMOS_SESSAO_DATA_SOURCE_ID = "0b0382f3-fd05-48f9-b980-69cd632b0ec1";
const TODAS_SESSOES_DATA_SOURCE_ID = "d0c16b95-7ab8-4ed1-90ec-b16872e41318";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), { status, headers: { ...corsHeaders, "Content-Type": "application/json" } });
}

function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

// GET autenticado no Notion com retry em 429 (rate limit).
async function notionGet(url: string, version = NOTION_VERSION_LEGACY): Promise<Response> {
  for (let attempt = 0; attempt < 4; attempt++) {
    const res = await fetch(url, {
      headers: { "Authorization": `Bearer ${NOTION_API_KEY}`, "Notion-Version": version },
    });
    if (res.status === 429) {
      const retryAfter = Number(res.headers.get("retry-after") || "1");
      await sleep((retryAfter + 1) * 1000);
      continue;
    }
    return res;
  }
  throw new Error("Muitas tentativas de rate limit no Notion");
}

// Consulta uma data source, com fallback pro endpoint legado de database
// (o workspace usa o modelo novo de "data sources" do Notion, mas a API
// pública pode não aceitar o mesmo id nos dois formatos em todo tenant).
async function queryDataSource(dataSourceId: string, body: Record<string, unknown>): Promise<NotionQueryResponse> {
  const attempts: Array<{ url: string; version: string }> = [
    { url: `https://api.notion.com/v1/data_sources/${dataSourceId}/query`, version: NOTION_VERSION },
    { url: `https://api.notion.com/v1/databases/${dataSourceId}/query`, version: NOTION_VERSION_LEGACY },
  ];

  let lastError = "";
  for (const attempt of attempts) {
    for (let retry = 0; retry < 3; retry++) {
      const res = await fetch(attempt.url, {
        method: "POST",
        headers: {
          "Authorization": `Bearer ${NOTION_API_KEY}`,
          "Notion-Version": attempt.version,
          "Content-Type": "application/json",
        },
        body: JSON.stringify(body),
      });
      if (res.ok) return res.json();
      if (res.status === 429) {
        const retryAfter = Number(res.headers.get("retry-after") || "1");
        await sleep((retryAfter + 1) * 1000);
        continue;
      }
      lastError = `${res.status} ${await res.text()}`;
      break;
    }
  }
  throw new Error(`Notion query falhou: ${lastError}`);
}

async function getPageText(pageId: string): Promise<string> {
  let cursor: string | undefined;
  const parts: string[] = [];
  let pages = 0;

  do {
    const url = new URL(`https://api.notion.com/v1/blocks/${pageId}/children`);
    url.searchParams.set("page_size", "100");
    if (cursor) url.searchParams.set("start_cursor", cursor);

    const res = await notionGet(url.toString());
    if (!res.ok) throw new Error(`Notion getBlocks falhou: ${res.status} ${await res.text()}`);
    const data = await res.json() as NotionBlocksResponse;

    for (const block of data.results ?? []) {
      const richText = block[block.type] as { rich_text?: NotionRichText[] } | undefined;
      if (Array.isArray(richText?.rich_text)) {
        const text = richText.rich_text.map((t) => t.plain_text).join("");
        if (text) parts.push(text);
      }
    }

    cursor = data.has_more ? (data.next_cursor ?? undefined) : undefined;
    pages += 1;
  } while (cursor && pages < 10);

  return parts.join("\n\n");
}

function richTextToPlain(prop?: { rich_text?: NotionRichText[]; title?: NotionRichText[] }): string {
  if (!prop) return "";
  const arr = prop.rich_text ?? prop.title ?? [];
  return arr.map((t) => t.plain_text).join("");
}

function isPlaceholder(text: string): boolean {
  if (!text) return true;
  const t = text.trim();
  if (t.length < 40) return true;
  if (/não há resumos disponíveis/i.test(t)) return true;
  if (/você não enviou o conteúdo/i.test(t)) return true;
  return false;
}

function findReportStart(text: string): number {
  const markers = [
    /RELATÓRIO CLÍNICO:/i,
    /#{1,2}\s*Resumo de Sessão Terapêutica/i,
    /#{1,2}\s*Resumo de toda a sessão/i,
    /#{1,2}\s*Resumo do relatório/i,
    /RESUMO DE SESSÃO/,
  ];
  let best = -1;
  for (const marker of markers) {
    const m = text.match(marker);
    if (m && m.index !== undefined) {
      if (best === -1 || m.index < best) best = m.index;
    }
  }
  return best;
}

// O texto bruto que sai do Notion vem de um pipeline que gera markdown com
// asteriscos escapados (\*\*negrito\*\*), títulos "#"/"##"/"###" em
// qualquer posição do texto, listas com "-" e alguns artefatos de
// montagem (ex: "RELATÓRIO CLÍNICO:<br>split(" no início e "; \"\\n\\n\")"
// no fim) — limpa tudo isso e converte pro HTML simples que o editor usa.
function cleanAll(rawInput: string): string {
  if (!rawInput) return "";
  let text = rawInput;

  text = text.replace(/<br\s*\/?>/gi, "\n");

  // Reverte headings HTML de uma limpeza anterior de volta pra markdown
  // (proteção contra reprocessar conteúdo já parcialmente convertido).
  text = text.replace(/<h2>([^<]*)<\/h2>/gi, "# $1");
  text = text.replace(/<h3>([^<]*)<\/h3>/gi, "## $1");
  text = text.replace(/<h4>([^<]*)<\/h4>/gi, "### $1");
  text = text.replace(/<h2>([^\n<]*)\n/gi, "# $1\n");
  text = text.replace(/<h3>([^\n<]*)\n/gi, "## $1\n");
  text = text.replace(/<h4>([^\n<]*)\n/gi, "### $1\n");
  text = text.replace(/<\/h[234]>/gi, "");

  text = text.replace(/\n*https:\/\/docs\.zoom\.us\/doc\/\S+\s*$/i, "");

  const startIdx = findReportStart(text);
  if (startIdx > 0) text = text.slice(startIdx);

  text = text.replace(/^RELATÓRIO CLÍNICO:\s*split\(/i, "");
  text = text.replace(/;\s*"\\n\\n"\)\s*$/, "");
  text = text.replace(/;\s*"\n\n"\)\s*$/, "");

  text = text.trim();

  text = text.replace(/\\\*/g, "*");
  text = text.replace(/\*\*(.+?)\*\*/g, "<strong>$1</strong>");

  // Títulos com emoji em negrito precisam de quebra de linha garantida
  // antes e depois, mesmo que o original só tivesse uma quebra simples.
  text = text.replace(/\n(<strong>)/g, "\n\n$1");
  text = text.replace(/(<\/strong>)\n/g, "$1\n\n");

  text = text.replace(/(^|\n)(#{1,3})[ \t]+([^\n]+)/g, (_m, prefix, hashes, title) => {
    const tag = hashes.length === 1 ? "h2" : hashes.length === 2 ? "h3" : "h4";
    return `${prefix}<${tag}>${title.trim()}</${tag}>`;
  });

  text = text.replace(/(^|\n)-[ \t]+([^\n]+)/g, (_m, prefix, item) => `${prefix}• ${item.trim()}`);

  text = text.replace(/\n\n+/g, "<br><br>");
  text = text.replace(/\n/g, "<br>");

  return text.trim();
}

// Limpeza leve pro texto já curado da propriedade "Resumo Clínico" (nível
// 1) — só precisa virar HTML, não precisa achar onde o relatório começa
// nem remover prefixo de automação, já vem pronto.
function cleanCurated(rawInput: string): string {
  if (!rawInput) return "";
  let text = rawInput.trim();
  text = text.replace(/^RESUMO DE SESSÃO\n+👤[^\n]*\n📅[^\n]*\n+/i, "");
  text = text.replace(/\n\n+/g, "<br><br>");
  text = text.replace(/\n/g, "<br>");
  return text.trim();
}

interface SyncResult {
  synced: number;
  adopted: number;
  skipped: number;
  errors: string[];
}

interface NotionProperty {
  title?: NotionRichText[];
  rich_text?: NotionRichText[];
  date?: { start: string } | null;
  relation?: { id: string }[];
}

interface NotionPage {
  id: string;
  properties: Record<string, NotionProperty>;
}

interface NotionQueryResponse {
  results: NotionPage[];
}

interface NotionRichText {
  plain_text: string;
}

interface NotionBlock {
  type: string;
  [key: string]: unknown;
}

interface NotionBlocksResponse {
  results: NotionBlock[];
  has_more: boolean;
  next_cursor: string | null;
}

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  if (req.method !== "POST") return json({ error: "Method not allowed" }, 405);

  try {
    if (!NOTION_API_KEY) {
      return json({ error: "NOTION_API_KEY_Sync não configurada nos secrets do Supabase" }, 500);
    }

    const authHeader = req.headers.get("Authorization");
    const jwt = authHeader?.replace(/^Bearer\s+/i, "");
    if (!jwt) return json({ error: "Não autenticado" }, 401);

    const { data: { user }, error: userError } = await supabase.auth.getUser(jwt);
    if (userError || !user) return json({ error: "Sessão inválida" }, 401);

    const { data: callerProfile } = await supabase.from("profiles").select("role").eq("id", user.id).single();
    if (callerProfile?.role !== "therapist") return json({ error: "Só a terapeuta pode sincronizar" }, 403);

    const { client_id } = await req.json();
    if (!client_id) return json({ error: "client_id é obrigatório" }, 400);

    const { data: client, error: clientError } = await supabase
      .from("profiles")
      .select("id, name")
      .eq("id", client_id)
      .eq("role", "client")
      .single();
    if (clientError || !client) return json({ error: "Cliente não encontrado" }, 404);

    // 1. Acha o cliente no Notion pelo nome (exato primeiro, depois "contém").
    let clienteRows: NotionPage[] = [];
    const exactMatch = await queryDataSource(CADASTRO_CLIENTES_DATA_SOURCE_ID, {
      filter: { property: "Nome do Cliente", title: { equals: client.name } },
    });
    clienteRows = exactMatch.results ?? [];

    if (clienteRows.length === 0) {
      const looseMatch = await queryDataSource(CADASTRO_CLIENTES_DATA_SOURCE_ID, {
        filter: { property: "Nome do Cliente", title: { contains: client.name.split(" ")[0] } },
      });
      clienteRows = looseMatch.results ?? [];
    }

    if (clienteRows.length === 0) {
      return json({ error: `Nenhum cliente chamado "${client.name}" encontrado no Notion. Confira se o nome está igual nos dois lugares.` }, 404);
    }
    if (clienteRows.length > 1) {
      return json({ error: `Mais de um cliente chamado "${client.name}" encontrado no Notion — não dá pra saber qual é o certo.` }, 409);
    }

    const clienteRow = clienteRows[0];

    // 2. Busca só a(s) sessão(ões) de HOJE desse cliente — não o histórico.
    // Carga histórica é feita pelo script (backfill-client.js), não por
    // esse botão, então não precisamos paginar a relação inteira aqui.
    const todayStr = new Date().toLocaleDateString("en-CA", { timeZone: "America/Sao_Paulo" });
    const todaysSessions = await queryDataSource(TODAS_SESSOES_DATA_SOURCE_ID, {
      filter: {
        and: [
          { property: "Cliente", relation: { contains: clienteRow.id } },
          { property: "Data da Sessão", date: { equals: todayStr } },
        ],
      },
    });
    const sessionPages = todaysSessions.results ?? [];

    if (sessionPages.length === 0) {
      return json({ synced: 0, adopted: 0, skipped: 0, errors: [], message: "Nenhuma sessão de hoje encontrada pra esse cliente no Notion." });
    }

    const result: SyncResult = { synced: 0, adopted: 0, skipped: 0, errors: [] };

    for (const sessionPage of sessionPages) {
      const sessionId = sessionPage.id;
      try {
        // Já sincronizada antes — nunca sobrescreve.
        const { data: alreadySynced } = await supabase
          .from("session_reports")
          .select("id")
          .eq("notion_session_id", sessionId)
          .maybeSingle();
        if (alreadySynced) { result.skipped++; continue; }

        let contentHtml = "";
        let status: "revisado" | "rascunho" = "rascunho";
        let sessionDate: string | null = sessionPage.properties?.["Data da Sessão"]?.date?.start ?? null;

        // Acha a linha de "Resumos de Sessão" que cobre essa sessão (se
        // já existir — normalmente ainda não existe pra sessão do dia,
        // já que essa tabela costuma ser preenchida depois por outra
        // automação, mas checamos assim mesmo pra aproveitar quando já
        // estiver pronta).
        const resumoQuery = await queryDataSource(RESUMOS_SESSAO_DATA_SOURCE_ID, {
          filter: { property: "Sessão", relation: { contains: sessionId } },
        });
        const resumoRow = resumoQuery.results?.[0];

        if (resumoRow) {
          sessionDate = resumoRow.properties["Data da sessão"]?.date?.start ?? sessionDate;
          const resumoClinico = richTextToPlain(resumoRow.properties["Resumo Clínico"]);

          if (!isPlaceholder(resumoClinico)) {
            contentHtml = cleanCurated(resumoClinico);
            status = "revisado";
          } else {
            const bodyText = await getPageText(resumoRow.id);
            await sleep(150);
            if (!isPlaceholder(bodyText) && /RESUMO DE SESSÃO/i.test(bodyText)) {
              contentHtml = cleanAll(bodyText);
            } else {
              const resumoBruto = richTextToPlain(resumoRow.properties["Resumo"]);
              if (!isPlaceholder(resumoBruto)) contentHtml = cleanAll(resumoBruto);
            }
          }
        }

        if (!contentHtml) {
          const rawText = await getPageText(sessionId);
          await sleep(150);
          contentHtml = rawText ? cleanAll(rawText) : "";
        }

        if (!sessionDate) { result.errors.push(`Sessão ${sessionId} sem data em nenhuma fonte — pulada.`); continue; }

        const title = new Date(`${sessionDate}T00:00:00`).toLocaleDateString("pt-BR", { day: "2-digit", month: "2-digit", year: "numeric" });
        const notionUrl = `https://notion.so/${sessionId.replace(/-/g, "")}`;

        // Rascunho manual em branco pro mesmo dia — adota em vez de duplicar.
        const { data: manualDraft } = await supabase
          .from("session_reports")
          .select("id, content_html, status")
          .eq("client_id", client_id)
          .eq("session_date", sessionDate.slice(0, 10))
          .is("notion_session_id", null)
          .maybeSingle();

        if (manualDraft && manualDraft.status === "rascunho" && !manualDraft.content_html?.trim()) {
          const { error: updateError } = await supabase
            .from("session_reports")
            .update({ notion_session_id: sessionId, notion_session_url: notionUrl, content_html: contentHtml, status, updated_at: new Date().toISOString() })
            .eq("id", manualDraft.id);
          if (updateError) throw updateError;
          result.adopted++;
        } else {
          const { error: insertError } = await supabase.from("session_reports").insert({
            client_id,
            session_date: sessionDate.slice(0, 10),
            title,
            content_html: contentHtml,
            status,
            notion_session_id: sessionId,
            notion_session_url: notionUrl,
          });
          if (insertError) throw insertError;
          result.synced++;
        }
      } catch (err) {
        result.errors.push(`Sessão ${sessionId}: ${String(err)}`);
      }
    }

    console.log(`[sync-notion-sessions] Cliente ${client_id}: ${JSON.stringify(result)}`);
    return json(result);
  } catch (err) {
    console.error("[sync-notion-sessions] Erro inesperado:", err);
    return json({ error: String(err) }, 500);
  }
});

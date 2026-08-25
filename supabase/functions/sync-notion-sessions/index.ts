import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

// === Sincroniza sessões do Notion pra Relatórios de Sessão do cliente ===
//
// Recebe { client_id }, casa o cliente no Notion pelo NOME (a terapeuta se
// comprometeu a manter o nome do cadastro do Notion igual ao nome do
// cliente no portal), lê a lista de sessões vinculadas a ele e traz cada
// uma como uma linha em session_reports — com o relatório já gerado quando
// existir, ou em branco quando ainda não foi processado no Notion.
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

// ID fixo do "Cadastro de Clientes" no workspace da terapeuta no Notion —
// não é segredo (só identifica ONDE buscar), por isso fica hardcoded aqui
// em vez de configurável. As sessões de cada cliente vêm da relação
// "🗓️ Todas as Sessões" na própria linha do cliente, então não precisamos
// do id da data source de sessões separadamente.
const CADASTRO_CLIENTES_DATA_SOURCE_ID = "45e1889e-d3c7-41e0-a59a-f83eb366c807";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), { status, headers: { ...corsHeaders, "Content-Type": "application/json" } });
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
    lastError = `${res.status} ${await res.text()}`;
  }
  throw new Error(`Notion query falhou: ${lastError}`);
}

async function getPage(pageId: string): Promise<NotionPage> {
  const res = await fetch(`https://api.notion.com/v1/pages/${pageId}`, {
    headers: { "Authorization": `Bearer ${NOTION_API_KEY}`, "Notion-Version": NOTION_VERSION_LEGACY },
  });
  if (!res.ok) throw new Error(`Notion getPage falhou: ${res.status} ${await res.text()}`);
  return res.json();
}

async function getPageText(pageId: string): Promise<string> {
  let cursor: string | undefined;
  const parts: string[] = [];
  let pages = 0;

  do {
    const url = new URL(`https://api.notion.com/v1/blocks/${pageId}/children`);
    url.searchParams.set("page_size", "100");
    if (cursor) url.searchParams.set("start_cursor", cursor);

    const res = await fetch(url, {
      headers: { "Authorization": `Bearer ${NOTION_API_KEY}`, "Notion-Version": NOTION_VERSION_LEGACY },
    });
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

// O texto bruto que sai do Notion vem de um pipeline que gera markdown com
// asteriscos escapados (\*\*negrito\*\*) e alguns artefatos de montagem do
// texto (ex: "RELATÓRIO CLÍNICO:<br>split(" no início e "; \"\\n\\n\")" no
// fim) — limpa isso e converte pro HTML simples que o editor usa.
function cleanReportText(raw: string): string {
  let text = raw.trim();
  text = text.replace(/^RELATÓRIO CLÍNICO:\s*<br>\s*split\(/i, "");
  text = text.replace(/;\s*"\\n\\n"\)\s*$/, "");
  text = text.replace(/\\\*/g, "*");
  text = text.replace(/\*\*(.+?)\*\*/g, "<strong>$1</strong>");
  return text.trim();
}

interface SyncResult {
  synced: number;
  adopted: number;
  skipped: number;
  errors: string[];
}

interface NotionPage {
  id: string;
  properties: Record<string, {
    title?: { plain_text: string }[];
    date?: { start: string } | null;
    relation?: { id: string }[];
  }>;
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
    const sessionRelations = clienteRow.properties?.["🗓️ Todas as Sessões"]?.relation ?? [];

    if (sessionRelations.length === 0) {
      return json({ synced: 0, adopted: 0, skipped: 0, errors: [], message: "Cliente encontrado no Notion, mas sem sessões vinculadas ainda." });
    }

    const result: SyncResult = { synced: 0, adopted: 0, skipped: 0, errors: [] };

    for (const relation of sessionRelations) {
      const sessionId: string = relation.id;
      try {
        // Já sincronizada antes — nunca sobrescreve.
        const { data: alreadySynced } = await supabase
          .from("session_reports")
          .select("id")
          .eq("notion_session_id", sessionId)
          .maybeSingle();
        if (alreadySynced) { result.skipped++; continue; }

        const page = await getPage(sessionId);
        const sessionDate: string | null = page.properties?.["Data da Sessão"]?.date?.start ?? null;
        if (!sessionDate) { result.errors.push(`Sessão ${sessionId} sem "Data da Sessão" preenchida — pulada.`); continue; }

        const rawText = await getPageText(sessionId);
        const contentHtml = rawText ? cleanReportText(rawText) : "";
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
            .update({ notion_session_id: sessionId, notion_session_url: notionUrl, content_html: contentHtml, updated_at: new Date().toISOString() })
            .eq("id", manualDraft.id);
          if (updateError) throw updateError;
          result.adopted++;
        } else {
          const { error: insertError } = await supabase.from("session_reports").insert({
            client_id,
            session_date: sessionDate.slice(0, 10),
            title,
            content_html: contentHtml,
            status: "rascunho",
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

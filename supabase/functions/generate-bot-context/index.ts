import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import Anthropic from "https://esm.sh/@anthropic-ai/sdk";

// === Gera o resumo de contexto que alimenta o bot de chat do portal (Fase 2 da V3) ===
//
// Roda todo dia via pg_cron pra cada cliente com assinatura ativa do bot. Lê as sessões e o perfil de
// esquemas mais recentes (mesma fonte que generate-monthly-report já usa) e pede pro Claude resumir tudo
// num pano de fundo curto, sem jargão técnico e sem citação literal — é isso que api/chat.ts injeta no
// system prompt pra o bot "lembrar" da cliente sem nunca recitar sessão.
//
// Idempotente: upsert por client_id, sempre substitui o resumo anterior.

const supabase = createClient(
  Deno.env.get("SUPABASE_URL")!,
  Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
);

const anthropic = new Anthropic({
  apiKey: Deno.env.get("BOT_ANTHROPIC_API_KEY")!,
});

const MODEL = "claude-sonnet-5";

const SYSTEM_PROMPT = `Você resume o histórico clínico de uma cliente em terapia pra alimentar um
assistente de apoio entre sessões. O assistente NUNCA deve citar sessões ou jargão técnico literalmente
— seu resumo é só pano de fundo pra ele "lembrar" da pessoa, não uma ficha pra recitar.

Escreva 4-8 frases, em terceira pessoa, sempre se referindo à cliente como "ela"/"a cliente" — NUNCA use
nenhum nome pra ela, mesmo que apareça um nome ou apelido nas sessões (às vezes a terapeuta usa um nome
fictício ou codinome nas próprias anotações, mas isso não deve aparecer aqui de jeito nenhum). Sem nomes
técnicos de esquemas/modos, sem citar datas de sessão específicas, sem citar nomes de terceiros
mencionados nas sessões. Foque em: temas recorrentes, como a pessoa costuma se sentir/reagir, e o que tem
mostrado progresso. Nunca inclua conteúdo sensível ao pé da letra — sempre parafraseado e genérico o
suficiente pra não expor detalhe de sessão numa conversa casual.`;

function stripHtml(html: string): string {
  return html.replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").trim();
}

serve(async (req) => {
  if (req.method !== "POST") {
    return new Response("Method not allowed", { status: 405 });
  }

  try {
    const { data: subs, error: subsError } = await supabase
      .from("bot_subscriptions")
      .select("client_id")
      .eq("status", "active");
    if (subsError) throw subsError;

    let processed = 0;
    let skipped = 0;

    for (const sub of subs ?? []) {
      const { data: sessions } = await supabase
        .from("session_reports")
        .select("content_html")
        .eq("client_id", sub.client_id)
        .in("status", ["revisado", "publicado"])
        .order("session_date", { ascending: false })
        .limit(8);

      const { data: schemaReport } = await supabase
        .from("client_schema_reports")
        .select("technical_content")
        .eq("client_id", sub.client_id)
        .in("status", ["reviewed", "published"])
        .order("created_at", { ascending: false })
        .limit(1)
        .maybeSingle();

      if (!sessions?.length && !schemaReport?.technical_content) {
        skipped++;
        continue; // nada pra resumir ainda
      }

      const sessionsText = (sessions ?? [])
        .map((s: { content_html: string }) => stripHtml(s.content_html))
        .join("\n---\n");
      const schemaText = schemaReport?.technical_content
        ? `\n\nPerfil de esquemas:\n${stripHtml(schemaReport.technical_content)}`
        : "";

      const response = await anthropic.messages.create({
        model: MODEL,
        max_tokens: 800,
        system: SYSTEM_PROMPT,
        messages: [{ role: "user", content: `Sessões recentes:\n${sessionsText}${schemaText}` }],
      });

      if (response.stop_reason === "max_tokens") {
        // Melhor não salvar nada do que salvar um resumo cortado no meio da frase — isso vai direto
        // pro system prompt do bot, um resumo truncado é pior que nenhum.
        console.error(`[generate-bot-context] Resposta cortada por max_tokens pro cliente ${sub.client_id} — pulando`);
        continue;
      }

      const summary = response.content
        .filter((b): b is Anthropic.TextBlock => b.type === "text")
        .map((b) => b.text)
        .join("\n")
        .trim();

      if (!summary) {
        console.error(`[generate-bot-context] Claude não retornou texto pro cliente ${sub.client_id}`);
        continue;
      }

      const { error: upsertError } = await supabase.from("client_bot_context").upsert(
        {
          client_id: sub.client_id,
          summary_text: summary,
          sessions_considered: sessions?.length ?? 0,
          generated_at: new Date().toISOString(),
        },
        { onConflict: "client_id" }
      );
      if (upsertError) {
        console.error(`[generate-bot-context] Falha ao salvar resumo do cliente ${sub.client_id}:`, upsertError);
        continue;
      }

      processed++;
    }

    console.log(`[generate-bot-context] ${processed} resumo(s) gerado(s), ${skipped} cliente(s) sem dado suficiente`);
    return new Response(JSON.stringify({ processed, skipped }), {
      status: 200,
      headers: { "Content-Type": "application/json" },
    });
  } catch (err) {
    console.error("[generate-bot-context] Erro inesperado:", err);
    return new Response(JSON.stringify({ error: String(err) }), {
      status: 500,
      headers: { "Content-Type": "application/json" },
    });
  }
});

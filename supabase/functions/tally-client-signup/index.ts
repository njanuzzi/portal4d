import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

// Snapshot reconciliado da função em produção.
// Diferença intencional: o token do webhook não é versionado no repositório público.
// A produção continua inalterada até uma rotação coordenada do webhook do Tally.

const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const supabase = createClient(supabaseUrl, serviceRoleKey);

const APP_URL = Deno.env.get("APP_URL") ?? "https://sistema.nubiajanuzzi.com";
const WEBHOOK_TOKEN = Deno.env.get("TALLY_CLIENT_SIGNUP_TOKEN")!;

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

interface TallyField {
  key: string;
  label: string;
  type: string;
  value: unknown;
}

function normalize(text: string) {
  return text.normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase().trim();
}

function fieldValue(field: TallyField): string {
  if (typeof field.value === "string") return field.value.trim();
  if (Array.isArray(field.value)) return String(field.value[0] ?? "").trim();
  return "";
}

function extractContact(fields: TallyField[]) {
  let email: string | null = null;
  let whatsapp: string | null = null;
  let name: string | null = null;

  for (const field of fields) {
    const value = fieldValue(field);
    if (!value) continue;
    const label = normalize(field.label ?? "");

    if (!email && (field.type === "INPUT_EMAIL" || label.includes("email") || label.includes("e-mail"))) {
      email = value;
      continue;
    }
    if (!whatsapp && (field.type === "INPUT_PHONE_NUMBER" || label.includes("whatsapp") || label.includes("telefone") || label.includes("celular"))) {
      whatsapp = value;
      continue;
    }
    if (!name && (label.includes("nome") || field.type === "INPUT_TEXT")) name = value;
  }

  return { email, whatsapp, name };
}

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  const url = new URL(req.url);
  if (!WEBHOOK_TOKEN || url.searchParams.get("token") !== WEBHOOK_TOKEN) {
    return new Response(JSON.stringify({ error: "Token inválido" }), {
      status: 401,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  try {
    const payload = await req.json();
    const fields: TallyField[] = payload?.data?.fields ?? [];
    const { email, whatsapp, name } = extractContact(fields);

    if (!email || !name) {
      console.error("[tally-client-signup] Campos obrigatórios ausentes no envio:", { email, name, whatsapp });
      return new Response(JSON.stringify({ error: "Nome e e-mail são obrigatórios" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const { data: existing } = await supabase.from("profiles").select("id").eq("email", email).maybeSingle();
    if (existing) {
      console.log(`[tally-client-signup] Cliente já cadastrado, ignorando: ${email}`);
      return new Response(JSON.stringify({ ok: true, skipped: "already_exists" }), {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const { data: activeDiary } = await supabase.from("diaries").select("id").eq("is_active", true).maybeSingle();

    const tempPassword = `PortalNJ@${crypto.randomUUID().slice(0, 8)}`;
    const { data: created, error: createError } = await supabase.auth.admin.createUser({
      email,
      password: tempPassword,
      email_confirm: true,
      user_metadata: { name, role: "client" },
    });
    if (createError || !created.user) throw createError ?? new Error("Falha ao criar usuário");

    const { error: profileError } = await supabase.from("profiles").upsert({
      id: created.user.id,
      email,
      name,
      role: "client",
      active: true,
      whatsapp: whatsapp || null,
      diary_id: activeDiary?.id ?? null,
    });
    if (profileError) throw profileError;

    await supabase.auth.resetPasswordForEmail(email, { redirectTo: `${APP_URL}/reset-password` });
    await supabase.from("client_invites").insert({ client_id: created.user.id, email });

    console.log(`[tally-client-signup] Cliente cadastrado via Tally: ${email}`);
    return new Response(JSON.stringify({ ok: true, client_id: created.user.id }), {
      status: 200,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err) {
    console.error("[tally-client-signup] Erro inesperado:", err);
    return new Response(JSON.stringify({ error: String(err) }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});

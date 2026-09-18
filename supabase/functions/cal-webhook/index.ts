import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

// === Webhook do Cal.com — agendamentos com link do Zoom ===
//
// A assinatura HMAC é validada no banco por uma RPC service-role-only.
// O segredo fica no Supabase Vault e nunca entra no bundle da Edge Function
// nem no repositório.

const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const supabase = createClient(supabaseUrl, serviceRoleKey);

async function verifySignature(rawBody: string, signatureHeader: string | null): Promise<boolean> {
  if (!signatureHeader) return false;

  const { data, error } = await supabase.rpc("verify_cal_webhook_signature", {
    p_raw_body: rawBody,
    p_signature: signatureHeader,
  });

  if (error) {
    console.error("[cal-webhook] Falha ao validar assinatura:", error.message);
    return false;
  }

  return data === true;
}

function extractZoomLink(payload: any): string | null {
  const candidates = [
    payload?.videoCallData?.url,
    payload?.metadata?.videoCallUrl,
    Array.isArray(payload?.location) ? null : payload?.location,
    ...(Array.isArray(payload?.attendees) ? payload.attendees.map((a: any) => a?.videoCallUrl) : []),
  ];
  for (const c of candidates) {
    if (typeof c === "string" && /^https?:\/\//.test(c) && c.includes("zoom")) return c;
  }
  for (const c of candidates) {
    if (typeof c === "string" && /^https?:\/\//.test(c)) return c;
  }
  return null;
}

async function cancelBooking(uid: string) {
  await supabase
    .from("appointments")
    .update({ status: "cancelled", updated_at: new Date().toISOString() })
    .eq("cal_booking_uid", uid);
}

serve(async (req) => {
  if (req.method !== "POST") {
    return new Response("Method not allowed", { status: 405 });
  }

  const rawBody = await req.text();
  const signature = req.headers.get("x-cal-signature-256");

  const valid = await verifySignature(rawBody, signature);
  if (!valid) {
    console.error("[cal-webhook] Assinatura inválida");
    return new Response("Assinatura inválida", { status: 401 });
  }

  try {
    const body = JSON.parse(rawBody);
    const triggerEvent: string = body?.triggerEvent ?? "";
    const p = body?.payload ?? {};

    console.log("[cal-webhook] Evento recebido:", triggerEvent, "uid:", p?.uid);

    const uid: string | undefined = p?.uid;
    if (!uid) {
      return new Response(JSON.stringify({ error: "payload sem uid" }), { status: 400 });
    }

    if (triggerEvent === "BOOKING_CANCELLED") {
      await cancelBooking(uid);
      return new Response(JSON.stringify({ ok: true }), { status: 200 });
    }

    if (triggerEvent === "BOOKING_RESCHEDULED" && p?.rescheduleUid) {
      await cancelBooking(p.rescheduleUid);
    }

    const attendee = Array.isArray(p?.attendees) ? p.attendees[0] : null;
    const attendeeEmail: string | null = attendee?.email ?? p?.attendee?.email ?? null;

    let clientId: string | null = null;
    if (attendeeEmail) {
      const { data: matchedProfile } = await supabase
        .from("profiles")
        .select("id")
        .eq("role", "client")
        .ilike("email", attendeeEmail)
        .maybeSingle();
      clientId = matchedProfile?.id ?? null;
    }

    const { error: upsertError } = await supabase.from("appointments").upsert(
      {
        cal_booking_uid: uid,
        client_id: clientId,
        title: p?.title ?? null,
        start_time: p?.startTime ?? null,
        end_time: p?.endTime ?? null,
        zoom_join_url: extractZoomLink(p),
        status: "scheduled",
        attendee_name: attendee?.name ?? null,
        attendee_email: attendeeEmail,
        raw_payload: body,
        updated_at: new Date().toISOString(),
      },
      { onConflict: "cal_booking_uid" }
    );

    if (upsertError) {
      console.error("[cal-webhook] Erro ao gravar agendamento:", upsertError);
      return new Response(JSON.stringify({ error: "Falha ao gravar agendamento" }), { status: 500 });
    }

    console.log(`[cal-webhook] Agendamento gravado: ${uid}, cliente casado: ${!!clientId}`);
    return new Response(JSON.stringify({ ok: true, client_matched: !!clientId }), { status: 200 });
  } catch (err) {
    console.error("[cal-webhook] Erro inesperado:", err);
    return new Response(JSON.stringify({ error: "Erro interno" }), { status: 500 });
  }
});

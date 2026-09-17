// Function de uso único desativada — não pôde ser invocada a partir da sessão
// que a criou (bloqueio de rede de saída pra chamadas HTTP diretas), o import
import "jsr:@supabase/functions-js/edge-runtime.d.ts";

Deno.serve(() => new Response(JSON.stringify({ error: "Desativada — sem uso." }), { status: 410, headers: { "Content-Type": "application/json" } }));

import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const headers = {
  "Content-Type": "application/json",
  "Cache-Control": "no-store",
};

serve((_req) => {
  return new Response(
    JSON.stringify({
      error: "integration_retired",
      message: "This Tally integration has been retired.",
    }),
    { status: 410, headers },
  );
});

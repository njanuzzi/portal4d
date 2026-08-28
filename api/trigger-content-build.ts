import { createClient } from '@supabase/supabase-js';

export const config = { runtime: 'nodejs' };

export async function POST(request: Request): Promise<Response> {
  const deployHook = process.env.VERCEL_CONTENT_DEPLOY_HOOK_URL;
  const url = process.env.VITE_SUPABASE_URL;
  const anonKey = process.env.VITE_SUPABASE_ANON_KEY;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  const token = request.headers.get('authorization')?.replace(/^Bearer\s+/i, '');

  if (!token || !url || !anonKey || !serviceRoleKey) return Response.json({ message: 'Publicação automática ainda não foi configurada.' }, { status: 503 });

  const authClient = createClient(url, anonKey);
  const { data: userData } = await authClient.auth.getUser(token);
  if (!userData.user) return Response.json({ message: 'Sessão inválida.' }, { status: 401 });

  const adminClient = createClient(url, serviceRoleKey);
  const { data: profile } = await adminClient.from('profiles').select('role').eq('id', userData.user.id).maybeSingle();
  if (profile?.role !== 'therapist') return Response.json({ message: 'Permissão insuficiente.' }, { status: 403 });

  if (!deployHook) return Response.json({ message: 'Artigo salvo. Configure o hook de publicação da Vercel para atualizar a página pública automaticamente.' }, { status: 202 });

  const deployResponse = await fetch(deployHook, { method: 'POST' });
  if (!deployResponse.ok) return Response.json({ message: 'O artigo foi salvo, mas a atualização pública não pôde ser iniciada.' }, { status: 502 });
  return Response.json({ message: 'Artigo publicado. A versão pública está sendo atualizada na Vercel.' }, { status: 202 });
}

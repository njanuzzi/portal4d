import { supabase } from './supabase';

const VAPID_PUBLIC_KEY = import.meta.env.VITE_VAPID_PUBLIC_KEY as string;

function urlBase64ToUint8Array(base64String: string) {
  const padding = '='.repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/-/g, '+').replace(/_/g, '/');
  const rawData = atob(base64);
  return Uint8Array.from([...rawData].map((c) => c.charCodeAt(0)));
}

// Chamada só a partir de um clique real do usuário (o popup de lembrete do
// diário) — navegadores tratam Notification.requestPermission() com muito
// mais confiança quando vem de um gesto do que quando é disparado sozinho
// no carregamento da página (que é como funcionava antes, e por isso
// ninguém tinha uma subscription de push registrada).
export async function requestPushSubscription(clientId: string): Promise<boolean> {
  if (!VAPID_PUBLIC_KEY) return false;
  if (!('serviceWorker' in navigator) || !('PushManager' in window)) return false;

  try {
    const reg = await navigator.serviceWorker.register('/sw.js');
    await navigator.serviceWorker.ready;

    const permission = await Notification.requestPermission();
    if (permission !== 'granted') return false;

    const existing = await reg.pushManager.getSubscription();
    const subscription = existing ?? await reg.pushManager.subscribe({
      userVisibleOnly: true,
      applicationServerKey: urlBase64ToUint8Array(VAPID_PUBLIC_KEY),
    });

    const { error } = await (supabase
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      .from('push_subscriptions') as any)
      .upsert({
        client_id: clientId,
        endpoint: subscription.endpoint,
        p256dh: btoa(String.fromCharCode(...new Uint8Array(subscription.getKey('p256dh')!))),
        auth: btoa(String.fromCharCode(...new Uint8Array(subscription.getKey('auth')!))),
      }, { onConflict: 'endpoint' });

    return !error;
  } catch (err) {
    console.warn('[push] erro ao registrar:', err);
    return false;
  }
}

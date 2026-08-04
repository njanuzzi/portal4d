import { useEffect } from 'react';
import { supabase } from '../lib/supabase';

const VAPID_PUBLIC_KEY = import.meta.env.VITE_VAPID_PUBLIC_KEY as string;

function urlBase64ToUint8Array(base64String: string) {
  const padding = '='.repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/-/g, '+').replace(/_/g, '/');
  const rawData = atob(base64);
  return Uint8Array.from([...rawData].map((c) => c.charCodeAt(0)));
}

export function usePushNotifications(clientId: string | undefined) {
  useEffect(() => {
    if (!clientId || !VAPID_PUBLIC_KEY) return;
    if (!('serviceWorker' in navigator) || !('PushManager' in window)) return;

    const resolvedClientId: string = clientId;

    async function subscribe() {
      try {
        const { data: { session } } = await supabase.auth.getSession();
        if (!session) return;

        const reg = await navigator.serviceWorker.register('/sw.js');
        await navigator.serviceWorker.ready;

        const permission = await Notification.requestPermission();
        if (permission !== 'granted') return;

        const existing = await reg.pushManager.getSubscription();
        const subscription = existing ?? await reg.pushManager.subscribe({
          userVisibleOnly: true,
          applicationServerKey: urlBase64ToUint8Array(VAPID_PUBLIC_KEY),
        });

        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        await (supabase.from('push_subscriptions') as any).upsert({
          client_id: resolvedClientId,
          endpoint: subscription.endpoint,
          p256dh: btoa(String.fromCharCode(...new Uint8Array(subscription.getKey('p256dh')!))),
          auth: btoa(String.fromCharCode(...new Uint8Array(subscription.getKey('auth')!))),
        }, { onConflict: 'endpoint' });
      } catch (err) {
        console.warn('[push] erro ao registrar:', err);
      }
    }

    void subscribe();
  }, [clientId]);
}

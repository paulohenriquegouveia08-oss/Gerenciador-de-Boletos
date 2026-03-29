import { useEffect } from 'react';
import { supabase } from '../services/supabase';
import { useAuth } from '../context/AuthContext';
import { requestNotificationPermission, onForegroundMessage } from '../services/firebase';

async function showLocalNotification(title: string, body: string) {
    if (Notification.permission !== 'granted') return;

    try {
        if ('serviceWorker' in navigator) {
            const registration = await navigator.serviceWorker.ready;
            await registration.showNotification(title, {
                body,
                icon: '/icons/icon-192.png',
                badge: '/icons/icon-192.png',
                tag: title, // avoid duplicate notifications with same tag
            } as NotificationOptions);
        } else {
            new Notification(title, {
                body,
                icon: '/icons/icon-192.png',
            });
        }
    } catch (err) {
        console.error('Erro ao exibir notificação:', err);
    }
}

export function useNotifications() {
    const { user } = useAuth();

    useEffect(() => {
        if (!user) return;

        const setup = async () => {
            const token = await requestNotificationPermission();
            if (token) {
                // Salvar token no Supabase
                await supabase
                    .from('fcm_tokens')
                    .upsert(
                        { user_id: user.id, token },
                        { onConflict: 'user_id,token' }
                    );
            }

            // Verificar boletos vencendo hoje e notificar localmente
            if (Notification.permission === 'granted') {
                const todayStr = new Date().toISOString().split('T')[0];
                const lastNotified = localStorage.getItem('last_notified_date');

                if (lastNotified !== todayStr) {
                    const { data } = await supabase
                        .from('boletos')
                        .select('recebedor, valor')
                        .eq('user_id', user.id)
                        .eq('status', 'pendente')
                        .eq('vencimento', todayStr);

                    if (data && data.length > 0) {
                        await showLocalNotification(
                            'Boletos Vencendo Hoje',
                            `Você tem ${data.length} boleto(s) vencendo hoje! Não esqueça de pagar.`
                        );
                        localStorage.setItem('last_notified_date', todayStr);
                    }
                }
            }
        };

        setup();

        // Escutar mensagens em primeiro plano
        onForegroundMessage((payload: unknown) => {
            const data = payload as { notification?: { title?: string; body?: string } };
            if (data.notification) {
                showLocalNotification(
                    data.notification.title || 'Boletos',
                    data.notification.body || ''
                );
            }
        });
    }, [user]);
}

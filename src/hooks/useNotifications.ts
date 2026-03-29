import { useEffect } from 'react';
import { supabase } from '../services/supabase';
import { useAuth } from '../context/AuthContext';
import { requestNotificationPermission, onForegroundMessage } from '../services/firebase';

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
                        new Notification('Boletos Vencendo Hoje', {
                            body: `Você tem ${data.length} boleto(s) vencendo hoje! Não esqueça de pagar.`,
                            icon: '/icons/icon-192.png',
                        });
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
                // Mostrar notificação nativa se app estiver em primeiro plano
                if (Notification.permission === 'granted') {
                    new Notification(data.notification.title || 'Boletos', {
                        body: data.notification.body,
                        icon: '/icons/icon-192.png',
                    });
                }
            }
        });
    }, [user]);
}
// ignore git
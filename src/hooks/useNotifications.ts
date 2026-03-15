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

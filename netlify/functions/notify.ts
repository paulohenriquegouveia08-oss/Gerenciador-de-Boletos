import { createClient } from '@supabase/supabase-js';
import * as admin from 'firebase-admin';

// Reusing firebase-admin initialization to avoid multiple apps error
if (!admin.apps.length) {
    if (process.env.FIREBASE_PRIVATE_KEY && process.env.FIREBASE_CLIENT_EMAIL && process.env.FIREBASE_PROJECT_ID) {
        // Handle escaped newlines from environment variables
        const privateKey = process.env.FIREBASE_PRIVATE_KEY.replace(/\\n/g, '\n');

        admin.initializeApp({
            credential: admin.credential.cert({
                projectId: process.env.FIREBASE_PROJECT_ID,
                clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
                privateKey: privateKey,
            }),
        });
    }
}

export const handler = async (event: any, context: any) => {
    try {
        const supabaseUrl = process.env.VITE_SUPABASE_URL;
        const supabaseServiceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

        if (!supabaseUrl || !supabaseServiceRoleKey) {
            return {
                statusCode: 500,
                body: JSON.stringify({ error: 'Faltam variaveis de ambiente do Supabase (VITE_SUPABASE_URL ou SUPABASE_SERVICE_ROLE_KEY).' })
            };
        }

        const supabase = createClient(supabaseUrl, supabaseServiceRoleKey);

        // Data atual (ex: 2026-04-02)
        const todayStr = new Date().toISOString().split('T')[0];

        // 1. Pegar todos os tokens FCM (para notificar todo mundo)
        const { data: tokens, error: tokensError } = await supabase
            .from('fcm_tokens')
            .select('user_id, token');

        if (tokensError || !tokens) {
            return { statusCode: 500, body: JSON.stringify({ error: tokensError || 'Erro ao buscar tokens FCM' }) };
        }

        if (tokens.length === 0) {
            return { statusCode: 200, body: JSON.stringify({ message: 'Nenhum dispositivo registrado.' }) };
        }

        // 2. Pegar boletos pendentes que vencem hoje
        const { data: boletos, error: boletosError } = await supabase
            .from('boletos')
            .select('user_id, recebedor, valor')
            .eq('status', 'pendente')
            .eq('vencimento', todayStr);

        if (boletosError) {
            return { statusCode: 500, body: JSON.stringify({ error: boletosError || 'Erro ao buscar boletos' }) };
        }

        // 3. Agrupar estatísticas por user_id
        const usersWithBoletos: Record<string, { count: number, totalAmount: number }> = {};
        for (const b of (boletos || [])) {
            if (!usersWithBoletos[b.user_id]) {
                usersWithBoletos[b.user_id] = { count: 0, totalAmount: 0 };
            }
            usersWithBoletos[b.user_id].count++;
            usersWithBoletos[b.user_id].totalAmount += Number(b.valor);
        }

        if (!admin.apps.length) {
            return { statusCode: 500, body: JSON.stringify({ error: 'Configuração do Firebase admin ausente nas variáveis de ambiente do Netlify.' }) };
        }

        // 4. Enviar as notificações Push para TODOS os tokens
        const sendPromises = tokens.map(async (fcm) => {
            const userStats = usersWithBoletos[fcm.user_id];

            let title = '';
            let body = '';

            if (userStats) {
                title = 'Boletos Vencendo Hoje 🔔';
                body = `Você tem ${userStats.count} boleto(s) vencendo hoje, somando R$${userStats.totalAmount.toFixed(2)}. Não esqueça de pagar!`;
            } else {
                title = 'Tudo limpo!';
                body = 'Obaa hoje não temos boletos para pagar 🎉';
            }

            try {
                await admin.messaging().send({
                    token: fcm.token,
                    notification: { title, body },
                });
                return { success: true, token: fcm.token, type: userStats ? 'has_boleto' : 'clear' };
            } catch (err: any) {
                console.error(`Error sending to token ${fcm.token}:`, err);
                return { success: false, token: fcm.token, error: err.message };
            }
        });

        const results = await Promise.all(sendPromises);

        return {
            statusCode: 200,
            body: JSON.stringify({
                message: 'Notificações enviadas',
                notifiedCount: results.length,
                results
            }, null, 2)
        };
    } catch (e: any) {
        console.error('Unhandled error:', e);
        return { statusCode: 500, body: JSON.stringify({ error: e.message }) };
    }
};

import { createClient } from '@supabase/supabase-js';
import crypto from 'crypto';

// ---- JWT para Google OAuth (usando Node.js crypto nativo) ----

function base64url(data: string): string {
    return Buffer.from(data).toString('base64url');
}

function createJWT(serviceEmail: string, privateKeyPem: string): string {
    const header = JSON.stringify({ alg: 'RS256', typ: 'JWT' });
    const now = Math.floor(Date.now() / 1000);
    const payload = JSON.stringify({
        iss: serviceEmail,
        scope: 'https://www.googleapis.com/auth/firebase.messaging',
        aud: 'https://oauth2.googleapis.com/token',
        iat: now,
        exp: now + 3600,
    });

    const unsignedToken = `${base64url(header)}.${base64url(payload)}`;

    const sign = crypto.createSign('RSA-SHA256');
    sign.update(unsignedToken);
    const signature = sign.sign(privateKeyPem, 'base64url');

    return `${unsignedToken}.${signature}`;
}

async function getAccessToken(serviceEmail: string, privateKey: string): Promise<string> {
    const jwt = createJWT(serviceEmail, privateKey);

    const resp = await fetch('https://oauth2.googleapis.com/token', {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body: `grant_type=urn%3Aietf%3Aparams%3Aoauth%3Agrant-type%3Ajwt-bearer&assertion=${jwt}`,
    });

    if (!resp.ok) {
        const errText = await resp.text();
        throw new Error(`Token error: ${resp.status} - ${errText}`);
    }

    const data = await resp.json();
    return data.access_token;
}

async function sendFCM(
    projectId: string,
    accessToken: string,
    fcmToken: string,
    title: string,
    body: string
): Promise<{ success: boolean; error?: string }> {
    const resp = await fetch(
        `https://fcm.googleapis.com/v1/projects/${projectId}/messages:send`,
        {
            method: 'POST',
            headers: {
                Authorization: `Bearer ${accessToken}`,
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                message: {
                    token: fcmToken,
                    notification: { title, body },
                },
            }),
        }
    );

    if (!resp.ok) {
        const errText = await resp.text();
        return { success: false, error: `${resp.status}: ${errText}` };
    }

    return { success: true };
}

// ---- Handler ----

export const handler = async (event: any) => {
    // CORS
    if (event.httpMethod === 'OPTIONS') {
        return { statusCode: 200, headers: { 'Access-Control-Allow-Origin': '*' }, body: '' };
    }

    try {
        const supabaseUrl = process.env.VITE_SUPABASE_URL;
        const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
        const fbProjectId = process.env.FIREBASE_PROJECT_ID;
        const fbEmail = process.env.FIREBASE_CLIENT_EMAIL;
        const fbKey = process.env.FIREBASE_PRIVATE_KEY?.replace(/\\n/g, '\n');

        if (!supabaseUrl || !supabaseKey) {
            return { statusCode: 200, body: JSON.stringify({ error: 'Faltam vars Supabase' }) };
        }
        if (!fbProjectId || !fbEmail || !fbKey) {
            return { statusCode: 200, body: JSON.stringify({ error: 'Faltam vars Firebase' }) };
        }

        // Access token do Google
        const accessToken = await getAccessToken(fbEmail, fbKey);

        const supabase = createClient(supabaseUrl, supabaseKey);

        // Data de hoje em São Paulo
        const now = new Date();
        const fmt = new Intl.DateTimeFormat('pt-BR', {
            timeZone: 'America/Sao_Paulo',
            year: 'numeric', month: '2-digit', day: '2-digit',
        });
        const [day, month, year] = fmt.format(now).split('/');
        const todayStr = `${year}-${month}-${day}`;

        // Tokens FCM
        const { data: tokens, error: tokensErr } = await supabase
            .from('fcm_tokens')
            .select('user_id, token');

        if (tokensErr || !tokens) {
            return { statusCode: 200, body: JSON.stringify({ error: 'Erro tokens', detail: tokensErr }) };
        }
        if (tokens.length === 0) {
            return { statusCode: 200, body: JSON.stringify({ message: 'Nenhum dispositivo registrado.' }) };
        }

        // Boletos vencendo hoje
        const { data: boletos, error: boletosErr } = await supabase
            .from('boletos')
            .select('user_id, recebedor, valor')
            .eq('status', 'pendente')
            .eq('vencimento', todayStr);

        if (boletosErr) {
            return { statusCode: 200, body: JSON.stringify({ error: 'Erro boletos', detail: boletosErr }) };
        }

        // Agrupar por user
        const userMap: Record<string, { count: number; total: number }> = {};
        for (const b of boletos || []) {
            if (!userMap[b.user_id]) userMap[b.user_id] = { count: 0, total: 0 };
            userMap[b.user_id].count++;
            userMap[b.user_id].total += Number(b.valor);
        }

        // Enviar notificações
        const results = await Promise.all(
            tokens.map(async (fcm) => {
                const stats = userMap[fcm.user_id];
                const title = stats ? 'Boletos Vencendo Hoje 🔔' : 'Tudo limpo!';
                const body = stats
                    ? `Você tem ${stats.count} boleto(s) vencendo hoje, somando R$${stats.total.toFixed(2)}. Não esqueça de pagar!`
                    : 'Obaa hoje não temos boletos para pagar 🎉';

                const r = await sendFCM(fbProjectId, accessToken, fcm.token, title, body);
                return { ...r, type: stats ? 'has_boleto' : 'clear' };
            })
        );

        return {
            statusCode: 200,
            body: JSON.stringify({
                ok: true,
                date: todayStr,
                sent: results.filter((r) => r.success).length,
                total: results.length,
                results,
            }, null, 2),
        };
    } catch (e: any) {
        return {
            statusCode: 200,
            body: JSON.stringify({ error: e.message }),
        };
    }
};

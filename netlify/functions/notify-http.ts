import { createClient } from '@supabase/supabase-js';
import type { Handler } from '@netlify/functions';

// ---- JWT / Google OAuth helpers (sem firebase-admin) ----

function base64url(input: string | Uint8Array): string {
    let str: string;
    if (typeof input === 'string') {
        str = btoa(input);
    } else {
        str = btoa(String.fromCharCode(...input));
    }
    return str.replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}

async function createJWT(serviceEmail: string, privateKeyPem: string): Promise<string> {
    const header = { alg: 'RS256', typ: 'JWT' };
    const now = Math.floor(Date.now() / 1000);
    const payload = {
        iss: serviceEmail,
        scope: 'https://www.googleapis.com/auth/firebase.messaging',
        aud: 'https://oauth2.googleapis.com/token',
        iat: now,
        exp: now + 3600,
    };

    const headerB64 = base64url(JSON.stringify(header));
    const payloadB64 = base64url(JSON.stringify(payload));
    const unsignedToken = `${headerB64}.${payloadB64}`;

    // Import the PEM private key
    const pemBody = privateKeyPem
        .replace(/-----BEGIN PRIVATE KEY-----/, '')
        .replace(/-----END PRIVATE KEY-----/, '')
        .replace(/\s/g, '');

    const binaryKey = Uint8Array.from(atob(pemBody), (c) => c.charCodeAt(0));

    const cryptoKey = await crypto.subtle.importKey(
        'pkcs8',
        binaryKey.buffer,
        { name: 'RSASSA-PKCS1-v1_5', hash: 'SHA-256' },
        false,
        ['sign']
    );

    const signature = await crypto.subtle.sign(
        'RSASSA-PKCS1-v1_5',
        cryptoKey,
        new TextEncoder().encode(unsignedToken)
    );

    const signatureB64 = base64url(new Uint8Array(signature));
    return `${unsignedToken}.${signatureB64}`;
}

async function getAccessToken(serviceEmail: string, privateKey: string): Promise<string> {
    const jwt = await createJWT(serviceEmail, privateKey);

    const resp = await fetch('https://oauth2.googleapis.com/token', {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body: `grant_type=urn%3Aietf%3Aparams%3Aoauth%3Agrant-type%3Ajwt-bearer&assertion=${jwt}`,
    });

    if (!resp.ok) {
        const errText = await resp.text();
        throw new Error(`Failed to get access token: ${resp.status} - ${errText}`);
    }

    const data = await resp.json();
    return data.access_token;
}

async function sendFCMMessage(
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
                'Authorization': `Bearer ${accessToken}`,
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

// ---- Handler principal ----

const handler: Handler = async (event) => {
    if (event.httpMethod === 'OPTIONS') {
        return {
            statusCode: 200,
            headers: {
                'Access-Control-Allow-Origin': '*',
                'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
            },
            body: '',
        };
    }

    try {
        const supabaseUrl = process.env.VITE_SUPABASE_URL;
        const supabaseServiceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
        const firebaseProjectId = process.env.FIREBASE_PROJECT_ID;
        const firebaseClientEmail = process.env.FIREBASE_CLIENT_EMAIL;
        const firebasePrivateKey = process.env.FIREBASE_PRIVATE_KEY?.replace(/\\n/g, '\n');

        if (!supabaseUrl || !supabaseServiceRoleKey) {
            return {
                statusCode: 200,
                body: JSON.stringify({ error: 'Faltam variaveis de ambiente do Supabase.' })
            };
        }

        if (!firebaseProjectId || !firebaseClientEmail || !firebasePrivateKey) {
            return {
                statusCode: 200,
                body: JSON.stringify({ error: 'Faltam variaveis de ambiente do Firebase.' })
            };
        }

        // Obter access token do Google OAuth
        const accessToken = await getAccessToken(firebaseClientEmail, firebasePrivateKey);

        const supabase = createClient(supabaseUrl, supabaseServiceRoleKey);

        // Data atual no fuso horário do Brasil
        const now = new Date();
        const formatter = new Intl.DateTimeFormat('pt-BR', {
            timeZone: 'America/Sao_Paulo',
            year: 'numeric',
            month: '2-digit',
            day: '2-digit',
        });
        const [day, month, year] = formatter.format(now).split('/');
        const todayStr = `${year}-${month}-${day}`;

        // 1. Pegar todos os tokens FCM
        const { data: tokens, error: tokensError } = await supabase
            .from('fcm_tokens')
            .select('user_id, token');

        if (tokensError || !tokens) {
            return { statusCode: 200, body: JSON.stringify({ error: tokensError || 'Erro ao buscar tokens FCM' }) };
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
            return { statusCode: 200, body: JSON.stringify({ error: boletosError || 'Erro ao buscar boletos' }) };
        }

        // 3. Agrupar estatísticas por user_id
        const usersWithBoletos: Record<string, { count: number; totalAmount: number }> = {};
        for (const b of boletos || []) {
            if (!usersWithBoletos[b.user_id]) {
                usersWithBoletos[b.user_id] = { count: 0, totalAmount: 0 };
            }
            usersWithBoletos[b.user_id].count++;
            usersWithBoletos[b.user_id].totalAmount += Number(b.valor);
        }

        // 4. Enviar notificações Push via FCM HTTP v1 API
        const sendPromises = tokens.map(async (fcm) => {
            const userStats = usersWithBoletos[fcm.user_id];

            let title = '';
            let msgBody = '';

            if (userStats) {
                title = 'Boletos Vencendo Hoje 🔔';
                msgBody = `Você tem ${userStats.count} boleto(s) vencendo hoje, somando R$${userStats.totalAmount.toFixed(2)}. Não esqueça de pagar!`;
            } else {
                title = 'Tudo limpo!';
                msgBody = 'Obaa hoje não temos boletos para pagar 🎉';
            }

            const result = await sendFCMMessage(firebaseProjectId, accessToken, fcm.token, title, msgBody);
            return { ...result, token: fcm.token.substring(0, 10) + '...', type: userStats ? 'has_boleto' : 'clear' };
        });

        const results = await Promise.all(sendPromises);

        return {
            statusCode: 200,
            body: JSON.stringify({
                message: 'Notificações processadas',
                date: todayStr,
                notifiedCount: results.length,
                successCount: results.filter((r) => r.success).length,
                results,
            }, null, 2),
        };
    } catch (e: any) {
        console.error('Unhandled error:', e);
        return {
            statusCode: 200,
            body: JSON.stringify({ error: e.message, stack: e.stack }),
        };
    }
};

export { handler };

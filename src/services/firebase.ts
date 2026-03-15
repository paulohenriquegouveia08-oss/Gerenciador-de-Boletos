import { initializeApp, type FirebaseApp } from 'firebase/app';
import { getMessaging, getToken, onMessage, type Messaging } from 'firebase/messaging';

const firebaseConfig = {
    apiKey: import.meta.env.VITE_FIREBASE_API_KEY,
    authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
    projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID,
    storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET,
    messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
    appId: import.meta.env.VITE_FIREBASE_APP_ID,
};

let app: FirebaseApp | null = null;
let messaging: Messaging | null = null;

try {
    if (firebaseConfig.apiKey && firebaseConfig.apiKey !== 'your-firebase-api-key') {
        app = initializeApp(firebaseConfig);
        if ('Notification' in window) {
            messaging = getMessaging(app);
        }
    }
} catch (error) {
    console.warn('Firebase initialization failed:', error);
}

export async function requestNotificationPermission(): Promise<string | null> {
    if (!messaging) {
        console.warn('Firebase messaging not available');
        return null;
    }

    try {
        const permission = await Notification.requestPermission();
        if (permission === 'granted') {
            const vapidKey = import.meta.env.VITE_FIREBASE_VAPID_KEY;
            const token = await getToken(messaging, { vapidKey });
            return token;
        }
        return null;
    } catch (error) {
        console.error('Error getting notification token:', error);
        return null;
    }
}

export function onForegroundMessage(callback: (payload: unknown) => void) {
    if (!messaging) return;
    onMessage(messaging, callback);
}

export { app, messaging };

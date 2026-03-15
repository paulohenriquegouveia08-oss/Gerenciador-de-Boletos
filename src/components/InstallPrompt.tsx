import { useState, useEffect } from 'react';
import './InstallPrompt.css';

interface BeforeInstallPromptEvent extends Event {
    readonly platforms: string[];
    readonly userChoice: Promise<{
        outcome: 'accepted' | 'dismissed';
        platform: string;
    }>;
    prompt(): Promise<void>;
}

export default function InstallPrompt() {
    const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(null);
    const [isVisible, setIsVisible] = useState(false);

    useEffect(() => {
        // Check if already installed or dismissed recently
        const isDismissed = localStorage.getItem('pwa_prompt_dismissed') === 'true';
        const isStandalone = window.matchMedia('(display-mode: standalone)').matches
            || (window.navigator as any).standalone === true;

        if (isStandalone || isDismissed) {
            return;
        }

        const handler = (e: Event) => {
            // Prevent the mini-infobar from appearing on mobile
            e.preventDefault();
            // Stash the event so it can be triggered later.
            setDeferredPrompt(e as BeforeInstallPromptEvent);
            // Update UI notify the user they can install the PWA
            setIsVisible(true);
        };

        window.addEventListener('beforeinstallprompt', handler);

        return () => {
            window.removeEventListener('beforeinstallprompt', handler);
        };
    }, []);

    const handleInstallClick = async () => {
        if (!deferredPrompt) {
            return;
        }

        // Show the install prompt
        deferredPrompt.prompt();

        // Wait for the user to respond to the prompt
        const { outcome } = await deferredPrompt.userChoice;

        if (outcome === 'accepted') {
            console.log('User accepted the install prompt');
            setIsVisible(false);
        } else {
            console.log('User dismissed the install prompt');
        }

        // We've used the prompt, and can't use it again, throw it away
        setDeferredPrompt(null);
    };

    const handleDismiss = () => {
        setIsVisible(false);
        localStorage.setItem('pwa_prompt_dismissed', 'true');
    };

    if (!isVisible) {
        return null;
    }

    return (
        <div className="install-prompt-overlay" onClick={handleDismiss}>
            <div className="install-prompt-modal" onClick={e => e.stopPropagation()}>
                <button className="install-prompt-close" onClick={handleDismiss}>×</button>
                <div className="install-prompt-icon">📱</div>
                <h3 className="install-prompt-title">Instalar App</h3>
                <p className="install-prompt-text">
                    Instale o <strong>Gerenciador de Boletos</strong> na sua tela inicial para acesso rápido e offline.
                </p>
                <div className="install-prompt-actions">
                    <button className="btn-secondary" onClick={handleDismiss}>Agora não</button>
                    <button className="btn-primary" onClick={handleInstallClick}>Instalar</button>
                </div>
            </div>
        </div>
    );
}

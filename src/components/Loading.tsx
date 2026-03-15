import { type ReactNode } from 'react';
import './Loading.css';

interface LoadingProps {
    message?: string;
    fullScreen?: boolean;
    children?: ReactNode;
}

export default function Loading({ message = 'Carregando...', fullScreen = false }: LoadingProps) {
    if (fullScreen) {
        return (
            <div className="loading-fullscreen">
                <div className="loading-spinner" />
                <p className="loading-message">{message}</p>
            </div>
        );
    }

    return (
        <div className="loading-inline">
            <div className="loading-spinner small" />
            <p className="loading-message">{message}</p>
        </div>
    );
}

import { useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useBoletos } from '../hooks/useBoletos';
import { formatCurrency, formatDate, isOverdue, daysUntilDue, copyToClipboard } from '../utils/format';
import StatusBadge from '../components/StatusBadge';
import Loading from '../components/Loading';
import './BoletoDetails.css';

export default function BoletoDetails() {
    const navigate = useNavigate();
    const { id } = useParams<{ id: string }>();
    const { boletos, markAsPaid, deleteBoleto, loading } = useBoletos();
    const [copied, setCopied] = useState(false);
    const [confirming, setConfirming] = useState(false);
    const [actionLoading, setActionLoading] = useState(false);

    const boleto = boletos.find((b) => b.id === id);

    if (loading) {
        return <Loading fullScreen message="Carregando..." />;
    }

    if (!boleto) {
        return (
            <div className="details-page">
                <header className="details-header">
                    <button className="btn-back" onClick={() => navigate('/')}>←</button>
                    <h1>Boleto não encontrado</h1>
                </header>
            </div>
        );
    }

    const overdue = boleto.status === 'pendente' && isOverdue(boleto.vencimento);
    const days = daysUntilDue(boleto.vencimento);

    const handleCopy = async () => {
        const success = await copyToClipboard(boleto.linha_digitavel);
        if (success) {
            setCopied(true);
            setTimeout(() => setCopied(false), 2000);
        }
    };

    const handleMarkAsPaid = async () => {
        setActionLoading(true);
        await markAsPaid(boleto.id);
        setActionLoading(false);
    };

    const handleDelete = async () => {
        if (!confirming) {
            setConfirming(true);
            return;
        }
        setActionLoading(true);
        await deleteBoleto(boleto.id);
        navigate('/');
    };

    return (
        <div className="details-page">
            <header className="details-header">
                <button className="btn-back" onClick={() => navigate(-1)}>←</button>
                <h1>Detalhes</h1>
            </header>

            <div className="details-content">
                <div className="details-top">
                    <div className="details-amount">{formatCurrency(boleto.valor)}</div>
                    <StatusBadge status={boleto.status} isOverdue={overdue} />
                    {boleto.status === 'pendente' && (
                        <p className="details-due-info">
                            {overdue
                                ? `Vencido há ${Math.abs(days)} dia${Math.abs(days) !== 1 ? 's' : ''}`
                                : days === 0
                                    ? 'Vence hoje!'
                                    : `Vence em ${days} dia${days !== 1 ? 's' : ''}`}
                        </p>
                    )}
                </div>

                <div className="details-info-list">
                    <div className="info-item">
                        <span className="info-label">Recebedor</span>
                        <span className="info-value">{boleto.recebedor}</span>
                    </div>
                    <div className="info-item">
                        <span className="info-label">Vencimento</span>
                        <span className="info-value">{formatDate(boleto.vencimento)}</span>
                    </div>
                    {boleto.data_pagamento && (
                        <div className="info-item">
                            <span className="info-label">Pagamento</span>
                            <span className="info-value">{formatDate(boleto.data_pagamento)}</span>
                        </div>
                    )}
                </div>

                <div className="details-linha">
                    <span className="info-label">Linha Digitável</span>
                    <div className="linha-box">
                        <span className="linha-text">{boleto.linha_digitavel}</span>
                    </div>
                    <button className="btn-secondary copy-btn" onClick={handleCopy} id="copy-linha-button">
                        {copied ? '✅ Copiado!' : '📋 Copiar linha digitável'}
                    </button>
                </div>

                <div className="details-actions">
                    {boleto.documento_url && (
                        <div className="document-actions" style={{ display: 'flex', gap: '0.5rem', marginBottom: '1rem', width: '100%' }}>
                            <a
                                href={boleto.documento_url}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="btn-secondary"
                                style={{ flex: 1, textAlign: 'center', textDecoration: 'none', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
                            >
                                📄 Ver Documento
                            </a>
                            {navigator.share && (
                                <button
                                    className="btn-secondary"
                                    style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center' }}
                                    onClick={() => {
                                        navigator.share({
                                            title: `Boleto - ${boleto.recebedor}`,
                                            url: boleto.documento_url!
                                        }).catch(console.error);
                                    }}
                                >
                                    ↗️ Compartilhar
                                </button>
                            )}
                        </div>
                    )}

                    {boleto.status === 'pendente' && (
                        <button
                            className="btn-success"
                            onClick={handleMarkAsPaid}
                            disabled={actionLoading}
                            id="mark-paid-button"
                        >
                            {actionLoading ? 'Atualizando...' : '✅ Marcar como Pago'}
                        </button>
                    )}

                    <button
                        className="btn-secondary"
                        onClick={() => navigate(`/boleto/editar/${boleto.id}`)}
                        id="edit-boleto-button"
                    >
                        ✏️ Editar Boleto
                    </button>

                    <button
                        className="btn-danger"
                        onClick={handleDelete}
                        disabled={actionLoading}
                        id="delete-boleto-button"
                    >
                        {confirming ? '⚠️ Confirmar Exclusão?' : '🗑️ Excluir Boleto'}
                    </button>
                </div>
            </div>
        </div>
    );
}

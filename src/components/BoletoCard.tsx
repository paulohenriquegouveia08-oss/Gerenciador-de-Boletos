import { useNavigate } from 'react-router-dom';
import { formatCurrency, formatDate, isOverdue } from '../utils/format';
import StatusBadge from './StatusBadge';
import type { Boleto } from '../types';
import './BoletoCard.css';

interface BoletoCardProps {
    boleto: Boleto;
}

export default function BoletoCard({ boleto }: BoletoCardProps) {
    const navigate = useNavigate();
    const overdue = boleto.status === 'pendente' && isOverdue(boleto.vencimento);

    return (
        <div
            className={`boleto-card ${overdue ? 'overdue' : ''} ${boleto.status === 'pago' ? 'paid' : ''}`}
            onClick={() => navigate(`/boleto/${boleto.id}`)}
            id={`boleto-card-${boleto.id}`}
        >
            <div className="boleto-card-left">
                <div className="boleto-card-icon">
                    {boleto.status === 'pago' ? '✅' : overdue ? '⚠️' : '📄'}
                </div>
            </div>
            <div className="boleto-card-content">
                <h3 className="boleto-card-recebedor">{boleto.recebedor}</h3>
                <p className="boleto-card-date">Vence: {formatDate(boleto.vencimento)}</p>
            </div>
            <div className="boleto-card-right">
                <span className="boleto-card-valor">{formatCurrency(boleto.valor)}</span>
                <StatusBadge status={boleto.status} isOverdue={overdue} />
            </div>
        </div>
    );
}

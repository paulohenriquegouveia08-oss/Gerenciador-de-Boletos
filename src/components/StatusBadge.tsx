import './StatusBadge.css';

interface StatusBadgeProps {
    status: 'pendente' | 'pago';
    isOverdue?: boolean;
}

export default function StatusBadge({ status, isOverdue }: StatusBadgeProps) {
    const getLabel = () => {
        if (status === 'pago') return 'Pago';
        if (isOverdue) return 'Vencido';
        return 'Pendente';
    };

    const getClass = () => {
        if (status === 'pago') return 'badge-paid';
        if (isOverdue) return 'badge-overdue';
        return 'badge-pending';
    };

    return (
        <span className={`status-badge ${getClass()}`}>
            {getLabel()}
        </span>
    );
}

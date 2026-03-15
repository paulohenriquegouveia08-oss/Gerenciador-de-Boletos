import './SummaryCard.css';

interface SummaryCardProps {
    icon: string;
    label: string;
    value: string | number;
    color?: string;
}

export default function SummaryCard({ icon, label, value, color }: SummaryCardProps) {
    return (
        <div className="summary-card" style={color ? { borderColor: color } : undefined}>
            <span className="summary-card-icon">{icon}</span>
            <div className="summary-card-info">
                <span className="summary-card-value">{value}</span>
                <span className="summary-card-label">{label}</span>
            </div>
        </div>
    );
}

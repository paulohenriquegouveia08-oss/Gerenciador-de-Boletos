import { useMemo } from 'react';
import { useAuth } from '../context/AuthContext';
import { useBoletos } from '../hooks/useBoletos';
import { formatCurrency } from '../utils/format';
import BoletoCard from '../components/BoletoCard';
import SummaryCard from '../components/SummaryCard';
import Loading from '../components/Loading';
import BottomNav from '../components/BottomNav';
import './Dashboard.css';

export default function Dashboard() {
    const { signOut } = useAuth();
    const { boletos, loading } = useBoletos();

    const stats = useMemo(() => {
        const now = new Date();
        const currentMonth = now.getMonth();
        const currentYear = now.getFullYear();

        const monthBoletos = boletos.filter((b) => {
            const d = new Date(b.vencimento + 'T12:00:00');
            return d.getMonth() === currentMonth && d.getFullYear() === currentYear;
        });

        const pendentes = monthBoletos.filter((b) => b.status === 'pendente');
        const pagos = monthBoletos.filter((b) => b.status === 'pago');

        return {
            total: monthBoletos.length,
            pendentes: pendentes.length,
            pagos: pagos.length,
            valorPendente: pendentes.reduce((sum, b) => sum + Number(b.valor), 0),
            valorPago: pagos.reduce((sum, b) => sum + Number(b.valor), 0),
        };
    }, [boletos]);

    // Show all boletos ordered by vencimento, pendentes first
    const sortedBoletos = useMemo(() => {
        return [...boletos].sort((a, b) => {
            if (a.status !== b.status) {
                return a.status === 'pendente' ? -1 : 1;
            }
            return new Date(a.vencimento).getTime() - new Date(b.vencimento).getTime();
        });
    }, [boletos]);

    return (
        <div className="dashboard-page">
            <header className="dashboard-header">
                <div>
                    <p className="dashboard-greeting">Olá 👋</p>
                    <h1 className="dashboard-title">Meus Boletos</h1>
                </div>
                <button className="btn-icon" onClick={signOut} title="Sair" id="logout-button">
                    🚪
                </button>
            </header>

            <section className="summary-grid">
                <SummaryCard
                    icon="📄"
                    label="Total do mês"
                    value={stats.total}
                    color="#6366f1"
                />
                <SummaryCard
                    icon="⏳"
                    label="Em aberto"
                    value={formatCurrency(stats.valorPendente)}
                    color="#facc15"
                />
                <SummaryCard
                    icon="✅"
                    label="Pagos"
                    value={formatCurrency(stats.valorPago)}
                    color="#22c55e"
                />
            </section>

            <section className="boletos-section">
                <h2 className="section-title">
                    Todos os boletos
                    <span className="section-count">{boletos.length}</span>
                </h2>

                {loading ? (
                    <Loading message="Carregando boletos..." />
                ) : sortedBoletos.length === 0 ? (
                    <div className="empty-state">
                        <span className="empty-icon">📭</span>
                        <p>Nenhum boleto cadastrado</p>
                        <p className="empty-hint">Use o scanner ou adicione manualmente</p>
                    </div>
                ) : (
                    <div className="boletos-list">
                        {sortedBoletos.map((boleto) => (
                            <BoletoCard key={boleto.id} boleto={boleto} />
                        ))}
                    </div>
                )}
            </section>

            <BottomNav />
        </div>
    );
}

import { useMemo, useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { useBoletos } from '../hooks/useBoletos';
import { formatCurrency, getMonthName } from '../utils/format';
import BoletoCard from '../components/BoletoCard';
import SummaryCard from '../components/SummaryCard';
import Loading from '../components/Loading';
import BottomNav from '../components/BottomNav';
import './Dashboard.css';

export default function Dashboard() {
    const { signOut } = useAuth();
    const { boletos, loading } = useBoletos();

    const now = new Date();
    const [selectedMonth, setSelectedMonth] = useState(now.getMonth());
    const [selectedYear, setSelectedYear] = useState(now.getFullYear());

    const stats = useMemo(() => {
        const monthBoletos = boletos.filter((b) => {
            const d = new Date(b.vencimento + 'T12:00:00');
            return d.getMonth() === selectedMonth && d.getFullYear() === selectedYear;
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
        const monthBoletos = boletos.filter((b) => {
            const d = new Date(b.vencimento + 'T12:00:00');
            return d.getMonth() === selectedMonth && d.getFullYear() === selectedYear;
        });

        return monthBoletos.sort((a, b) => {
            if (a.status !== b.status) {
                return a.status === 'pendente' ? -1 : 1;
            }
            return new Date(a.vencimento).getTime() - new Date(b.vencimento).getTime();
        });
    }, [boletos, selectedMonth, selectedYear]);

    const handleTestNotification = async () => {
        if (!('Notification' in window)) {
            alert('Seu navegador não suporta notificações.');
            return;
        }

        let permission = Notification.permission;
        if (permission === 'default') {
            permission = await Notification.requestPermission();
        }

        if (permission === 'granted') {
            try {
                // Usar Service Worker para notificações (funciona em mobile/PWA)
                if ('serviceWorker' in navigator) {
                    const registration = await navigator.serviceWorker.ready;
                    await registration.showNotification('Notificação de Teste 🔔', {
                        body: 'Funcionando! O sistema está pronto para avisar sobre seus boletos.',
                        icon: '/icons/icon-192.png',
                        badge: '/icons/icon-192.png',
                        tag: 'test-notification',
                    } as NotificationOptions);
                } else {
                    // Fallback para desktop sem SW
                    new Notification('Notificação de Teste 🔔', {
                        body: 'Funcionando! O sistema está pronto para avisar sobre seus boletos.',
                        icon: '/icons/icon-192.png',
                    });
                }
            } catch (err) {
                console.error('Erro ao enviar notificação:', err);
                alert('Erro ao enviar notificação. Verifique o console para mais detalhes.');
            }
        } else {
            alert('Permissão de notificação negada. Ative nas configurações do seu navegador para receber avisos de boletos vencendo.');
        }
    };

    return (
        <div className="dashboard-page">
            <header className="dashboard-header">
                <div>
                    <p className="dashboard-greeting">Olá 👋</p>
                    <h1 className="dashboard-title">Meus Boletos</h1>
                </div>
                <div style={{ display: 'flex', gap: '8px' }}>
                    <button className="btn-icon" onClick={handleTestNotification} title="Testar Notificações" id="test-notification-button" style={{ background: '#4bc0c0', color: '#fff' }}>
                        🔔
                    </button>
                    <button className="btn-icon" onClick={signOut} title="Sair" id="logout-button">
                        🚪
                    </button>
                </div>
            </header>

            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', margin: '0 1.2rem 1rem 1.2rem', background: 'var(--surface)', padding: '0.8rem 1rem', borderRadius: '16px', boxShadow: '0 4px 20px rgba(0,0,0,0.05)' }}>
                <button
                    style={{ background: 'var(--surface-2)', border: 'none', borderRadius: '8px', width: '36px', height: '36px', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--text-primary)', cursor: 'pointer' }}
                    onClick={() => {
                        if (selectedMonth === 0) {
                            setSelectedMonth(11);
                            setSelectedYear((y) => y - 1);
                        } else {
                            setSelectedMonth((m) => m - 1);
                        }
                    }}
                >
                    ◀
                </button>
                <span style={{ fontWeight: 600, fontSize: '1.05rem', color: 'var(--text-primary)', textTransform: 'capitalize' }}>
                    {getMonthName(selectedMonth)} {selectedYear}
                </span>
                <button
                    style={{ background: 'var(--surface-2)', border: 'none', borderRadius: '8px', width: '36px', height: '36px', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--text-primary)', cursor: 'pointer' }}
                    onClick={() => {
                        if (selectedMonth === 11) {
                            setSelectedMonth(0);
                            setSelectedYear((y) => y + 1);
                        } else {
                            setSelectedMonth((m) => m + 1);
                        }
                    }}
                >
                    ▶
                </button>
            </div>

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
                    Boletos do mês
                    <span className="section-count">{sortedBoletos.length}</span>
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

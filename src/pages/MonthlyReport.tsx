import { useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { BarChart, Bar, XAxis, YAxis, ResponsiveContainer, Tooltip, Cell } from 'recharts';
import { useBoletos } from '../hooks/useBoletos';
import { formatCurrency, getMonthName } from '../utils/format';
import SummaryCard from '../components/SummaryCard';
import BottomNav from '../components/BottomNav';
import Loading from '../components/Loading';
import './MonthlyReport.css';

export default function MonthlyReport() {
    const navigate = useNavigate();
    const { boletos, loading } = useBoletos();
    const now = new Date();
    const [selectedMonth, setSelectedMonth] = useState(now.getMonth());
    const [selectedYear, setSelectedYear] = useState(now.getFullYear());

    const monthStats = useMemo(() => {
        const filtered = boletos.filter((b) => {
            const d = new Date(b.vencimento + 'T12:00:00');
            return d.getMonth() === selectedMonth && d.getFullYear() === selectedYear;
        });

        const pagos = filtered.filter((b) => b.status === 'pago');
        const pendentes = filtered.filter((b) => b.status === 'pendente');

        return {
            total: filtered.length,
            pagos: pagos.length,
            pendentes: pendentes.length,
            valorTotal: filtered.reduce((s, b) => s + Number(b.valor), 0),
            valorPago: pagos.reduce((s, b) => s + Number(b.valor), 0),
            valorPendente: pendentes.reduce((s, b) => s + Number(b.valor), 0),
        };
    }, [boletos, selectedMonth, selectedYear]);

    const chartData = useMemo(() => {
        const data: { month: string; valor: number; monthIndex: number }[] = [];

        for (let i = 5; i >= 0; i--) {
            const d = new Date(selectedYear, selectedMonth - i, 1);
            const m = d.getMonth();
            const y = d.getFullYear();
            const monthBoletos = boletos.filter((b) => {
                const bd = new Date(b.vencimento + 'T12:00:00');
                return bd.getMonth() === m && bd.getFullYear() === y;
            });
            const total = monthBoletos.reduce((s, b) => s + Number(b.valor), 0);
            data.push({
                month: getMonthName(m).substring(0, 3),
                valor: total,
                monthIndex: m,
            });
        }

        return data;
    }, [boletos, selectedMonth, selectedYear]);

    if (loading) {
        return <Loading fullScreen message="Carregando..." />;
    }

    return (
        <div className="report-page">
            <header className="report-header">
                <button className="btn-back" onClick={() => navigate(-1)}>←</button>
                <h1>Resumo Mensal</h1>
            </header>

            <div className="month-selector">
                <button
                    className="month-nav-btn"
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
                <span className="month-display">
                    {getMonthName(selectedMonth)} {selectedYear}
                </span>
                <button
                    className="month-nav-btn"
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

            <section className="report-summary">
                <SummaryCard icon="📄" label="Total de boletos" value={monthStats.total} color="#6366f1" />
                <SummaryCard icon="✅" label="Total pago" value={formatCurrency(monthStats.valorPago)} color="#22c55e" />
                <SummaryCard icon="⏳" label="Total pendente" value={formatCurrency(monthStats.valorPendente)} color="#facc15" />
            </section>

            <section className="chart-section">
                <h2 className="section-title">Despesas por mês</h2>
                <div className="chart-container">
                    <ResponsiveContainer width="100%" height={220}>
                        <BarChart data={chartData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                            <XAxis
                                dataKey="month"
                                tick={{ fill: '#94a3b8', fontSize: 12 }}
                                axisLine={false}
                                tickLine={false}
                            />
                            <YAxis
                                tick={{ fill: '#94a3b8', fontSize: 11 }}
                                axisLine={false}
                                tickLine={false}
                                tickFormatter={(v: number) => `R$${v}`}
                            />
                            <Tooltip
                                formatter={(value) => [formatCurrency(Number(value)), 'Valor']}
                                contentStyle={{
                                    background: '#1e293b',
                                    border: '1px solid #334155',
                                    borderRadius: '12px',
                                    color: '#f1f5f9',
                                }}
                            />
                            <Bar dataKey="valor" radius={[6, 6, 0, 0]}>
                                {chartData.map((entry, index) => (
                                    <Cell
                                        key={`cell-${index}`}
                                        fill={entry.monthIndex === selectedMonth ? '#6366f1' : '#334155'}
                                    />
                                ))}
                            </Bar>
                        </BarChart>
                    </ResponsiveContainer>
                </div>
            </section>

            <div className="report-total-box">
                <span className="report-total-label">Total do mês</span>
                <span className="report-total-value">{formatCurrency(monthStats.valorTotal)}</span>
            </div>

            <BottomNav />
        </div>
    );
}

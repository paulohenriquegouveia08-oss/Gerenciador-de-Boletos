import { useNavigate, useLocation } from 'react-router-dom';
import './BottomNav.css';

const navItems = [
    { path: '/', label: 'Início', icon: '🏠' },
    { path: '/scanner', label: 'Scanner', icon: '📷' },
    { path: '/boleto/novo', label: 'Adicionar', icon: '➕' },
    { path: '/resumo', label: 'Resumo', icon: '📊' },
];

export default function BottomNav() {
    const navigate = useNavigate();
    const location = useLocation();

    return (
        <nav className="bottom-nav" id="bottom-navigation">
            {navItems.map((item) => (
                <button
                    key={item.path}
                    className={`bottom-nav-item ${location.pathname === item.path ? 'active' : ''}`}
                    onClick={() => navigate(item.path)}
                    id={`nav-${item.label.toLowerCase()}`}
                >
                    <span className="bottom-nav-icon">{item.icon}</span>
                    <span className="bottom-nav-label">{item.label}</span>
                </button>
            ))}
        </nav>
    );
}

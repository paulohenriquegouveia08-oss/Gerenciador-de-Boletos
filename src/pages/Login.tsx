import { useState, type FormEvent } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import './Auth.css';

export default function Login() {
    const [username, setUsername] = useState('');
    const [password, setPassword] = useState('');
    const [error, setError] = useState('');
    const [loading, setLoading] = useState(false);
    const { signIn } = useAuth();
    const navigate = useNavigate();

    const handleSubmit = async (e: FormEvent) => {
        e.preventDefault();
        setError('');
        setLoading(true);

        const { error: err } = await signIn(username, password);
        if (err) {
            setError(err.message || 'Usuário ou senha inválidos.');
            setLoading(false);
        } else {
            navigate('/');
        }
    };

    return (
        <div className="auth-container">
            <div className="auth-header">
                <div className="auth-logo">📋</div>
                <h1 className="auth-title">Boletos</h1>
                <p className="auth-subtitle">Gerencie seus boletos com facilidade</p>
            </div>

            <form className="auth-form" onSubmit={handleSubmit} id="login-form">
                {error && <div className="auth-error">{error}</div>}

                <div className="form-group">
                    <label htmlFor="username">Usuário</label>
                    <input
                        id="username"
                        type="text"
                        value={username}
                        onChange={(e) => setUsername(e.target.value)}
                        placeholder="Seu nome de usuário"
                        required
                        autoComplete="username"
                    />
                </div>

                <div className="form-group">
                    <label htmlFor="password">Senha</label>
                    <input
                        id="password"
                        type="password"
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        placeholder="Sua senha"
                        required
                        autoComplete="current-password"
                    />
                </div>

                <button type="submit" className="btn-primary" disabled={loading} id="login-button">
                    {loading ? 'Entrando...' : 'Entrar'}
                </button>
            </form>

            <p className="auth-link">
                Não tem conta? <Link to="/register">Criar conta</Link>
            </p>
        </div>
    );
}

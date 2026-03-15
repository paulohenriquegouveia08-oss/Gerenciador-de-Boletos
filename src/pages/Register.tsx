import { useState, type FormEvent } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import './Auth.css';

export default function Register() {
    const [username, setUsername] = useState('');
    const [password, setPassword] = useState('');
    const [confirmPassword, setConfirmPassword] = useState('');
    const [error, setError] = useState('');
    const [loading, setLoading] = useState(false);
    const { signUp } = useAuth();
    const navigate = useNavigate();

    const handleSubmit = async (e: FormEvent) => {
        e.preventDefault();
        setError('');

        if (username.trim().length < 3) {
            setError('O usuário deve ter no mínimo 3 caracteres.');
            return;
        }

        if (/[^a-zA-Z0-9._-]/.test(username.trim())) {
            setError('O usuário pode conter apenas letras, números, ponto, hífen e underline.');
            return;
        }

        if (password !== confirmPassword) {
            setError('As senhas não coincidem.');
            return;
        }

        if (password.length < 6) {
            setError('A senha deve ter no mínimo 6 caracteres.');
            return;
        }

        setLoading(true);
        const { error: err } = await signUp(username, password);
        if (err) {
            setError(err.message || 'Erro ao criar conta. Tente novamente.');
            setLoading(false);
        } else {
            navigate('/');
        }
    };

    return (
        <div className="auth-container">
            <div className="auth-header">
                <div className="auth-logo">📋</div>
                <h1 className="auth-title">Criar Conta</h1>
                <p className="auth-subtitle">Comece a gerenciar seus boletos</p>
            </div>

            <form className="auth-form" onSubmit={handleSubmit} id="register-form">
                {error && <div className="auth-error">{error}</div>}

                <div className="form-group">
                    <label htmlFor="username">Usuário</label>
                    <input
                        id="username"
                        type="text"
                        value={username}
                        onChange={(e) => setUsername(e.target.value)}
                        placeholder="Escolha um nome de usuário"
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
                        placeholder="Mínimo 6 caracteres"
                        required
                        autoComplete="new-password"
                    />
                </div>

                <div className="form-group">
                    <label htmlFor="confirm-password">Confirmar Senha</label>
                    <input
                        id="confirm-password"
                        type="password"
                        value={confirmPassword}
                        onChange={(e) => setConfirmPassword(e.target.value)}
                        placeholder="Repita a senha"
                        required
                        autoComplete="new-password"
                    />
                </div>

                <button type="submit" className="btn-primary" disabled={loading} id="register-button">
                    {loading ? 'Criando...' : 'Criar Conta'}
                </button>
            </form>

            <p className="auth-link">
                Já tem conta? <Link to="/login">Entrar</Link>
            </p>
        </div>
    );
}

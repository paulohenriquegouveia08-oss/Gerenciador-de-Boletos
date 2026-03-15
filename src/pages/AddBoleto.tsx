import { useState, useEffect, type FormEvent } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useBoletos } from '../hooks/useBoletos';
import BottomNav from '../components/BottomNav';
import './BoletoForm.css';

export default function AddBoleto() {
    const navigate = useNavigate();
    const [searchParams] = useSearchParams();
    const { addBoleto } = useBoletos();

    const [recebedor, setRecebedor] = useState('');
    const [valor, setValor] = useState('');
    const [vencimento, setVencimento] = useState('');
    const [linhaDigitavel, setLinhaDigitavel] = useState('');
    const [codigoBarras, setCodigoBarras] = useState('');
    const [error, setError] = useState('');
    const [loading, setLoading] = useState(false);

    // Pre-fill from scanner
    useEffect(() => {
        const linha = searchParams.get('linha_digitavel');
        const cod = searchParams.get('codigo_barras');
        const val = searchParams.get('valor');
        const venc = searchParams.get('vencimento');

        if (linha) setLinhaDigitavel(linha);
        if (cod) setCodigoBarras(cod);
        if (val) setValor(val);
        if (venc) setVencimento(venc);
    }, [searchParams]);

    const handleSubmit = async (e: FormEvent) => {
        e.preventDefault();
        setError('');

        if (!recebedor.trim() || !valor || !vencimento || !linhaDigitavel.trim()) {
            setError('Preencha todos os campos obrigatórios.');
            return;
        }

        setLoading(true);
        const result = await addBoleto({
            recebedor: recebedor.trim(),
            valor: parseFloat(valor),
            vencimento,
            linha_digitavel: linhaDigitavel.trim(),
            codigo_barras: codigoBarras || undefined,
        });

        if (result.success) {
            navigate('/');
        } else {
            setError(result.error || 'Erro ao salvar boleto.');
            setLoading(false);
        }
    };

    return (
        <div className="form-page">
            <header className="form-header">
                <button className="btn-back" onClick={() => navigate(-1)}>←</button>
                <h1>Novo Boleto</h1>
            </header>

            <form className="boleto-form" onSubmit={handleSubmit} id="add-boleto-form">
                {error && <div className="form-error">{error}</div>}

                <div className="form-group">
                    <label htmlFor="recebedor">Recebedor *</label>
                    <input
                        id="recebedor"
                        type="text"
                        value={recebedor}
                        onChange={(e) => setRecebedor(e.target.value)}
                        placeholder="Ex: Internet, Luz, Água"
                        required
                    />
                </div>

                <div className="form-row">
                    <div className="form-group">
                        <label htmlFor="valor">Valor (R$) *</label>
                        <input
                            id="valor"
                            type="number"
                            step="0.01"
                            min="0"
                            value={valor}
                            onChange={(e) => setValor(e.target.value)}
                            placeholder="0,00"
                            required
                        />
                    </div>

                    <div className="form-group">
                        <label htmlFor="vencimento">Vencimento *</label>
                        <input
                            id="vencimento"
                            type="date"
                            value={vencimento}
                            onChange={(e) => setVencimento(e.target.value)}
                            required
                        />
                    </div>
                </div>

                <div className="form-group">
                    <label htmlFor="linha-digitavel">Linha Digitável *</label>
                    <textarea
                        id="linha-digitavel"
                        value={linhaDigitavel}
                        onChange={(e) => setLinhaDigitavel(e.target.value)}
                        placeholder="Cole ou digite a linha digitável"
                        rows={3}
                        required
                    />
                </div>

                <div className="form-group">
                    <label htmlFor="codigo-barras">Código de Barras</label>
                    <input
                        id="codigo-barras"
                        type="text"
                        value={codigoBarras}
                        onChange={(e) => setCodigoBarras(e.target.value)}
                        placeholder="Opcional"
                    />
                </div>

                <button type="submit" className="btn-primary" disabled={loading} id="save-boleto-button">
                    {loading ? 'Salvando...' : '💾 Salvar Boleto'}
                </button>
            </form>

            <BottomNav />
        </div>
    );
}

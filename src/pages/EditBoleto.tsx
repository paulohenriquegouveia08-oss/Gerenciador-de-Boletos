import { useState, useEffect, type FormEvent } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useBoletos } from '../hooks/useBoletos';
import { extractValor, extractVencimento, linhaDigitavelToBarcode } from '../services/barcode';
import Loading from '../components/Loading';
import './BoletoForm.css';

export default function EditBoleto() {
    const navigate = useNavigate();
    const { id } = useParams<{ id: string }>();
    const { boletos, updateBoleto, loading: boletosLoading } = useBoletos();

    const [recebedor, setRecebedor] = useState('');
    const [valor, setValor] = useState('');
    const [vencimento, setVencimento] = useState('');
    const [linhaDigitavel, setLinhaDigitavel] = useState('');
    const [codigoBarras, setCodigoBarras] = useState('');
    const [error, setError] = useState('');
    const [loading, setLoading] = useState(false);

    useEffect(() => {
        const boleto = boletos.find((b) => b.id === id);
        if (boleto) {
            setRecebedor(boleto.recebedor);
            setValor(boleto.valor.toString());
            setVencimento(boleto.vencimento);
            setLinhaDigitavel(boleto.linha_digitavel);
            setCodigoBarras(boleto.codigo_barras || '');
        }
    }, [boletos, id]);

    const handleAutoFill = () => {
        if (!linhaDigitavel) return;
        const code = linhaDigitavel.replace(/\D/g, '');
        if (code.length < 47) {
            setError('A linha digitável deve ter pelo menos 47 dígitos para o preenchimento automático.');
            return;
        }

        const valorExtracted = extractValor(linhaDigitavel);
        const vencimentoExtracted = extractVencimento(linhaDigitavel);
        const barcodeExtracted = linhaDigitavelToBarcode(linhaDigitavel);

        if (valorExtracted > 0) setValor(valorExtracted.toFixed(2));
        if (vencimentoExtracted) setVencimento(vencimentoExtracted);
        if (barcodeExtracted && barcodeExtracted !== code) setCodigoBarras(barcodeExtracted);

        setError('');
    };

    const digitsCount = linhaDigitavel.replace(/\D/g, '').length;
    const isBoletoTributo = linhaDigitavel.trim().startsWith('8');
    const targetDigits = isBoletoTributo ? 48 : 47;

    const handleSubmit = async (e: FormEvent) => {
        e.preventDefault();
        if (!id) return;
        setError('');

        if (!recebedor.trim() || !valor || !vencimento || !linhaDigitavel.trim()) {
            setError('Preencha todos os campos obrigatórios.');
            return;
        }

        setLoading(true);
        const result = await updateBoleto(id, {
            recebedor: recebedor.trim(),
            valor: parseFloat(valor),
            vencimento,
            linha_digitavel: linhaDigitavel.trim(),
            codigo_barras: codigoBarras || undefined,
        });

        if (result.success) {
            navigate(`/boleto/${id}`);
        } else {
            setError(result.error || 'Erro ao atualizar boleto.');
            setLoading(false);
        }
    };

    if (boletosLoading) {
        return <Loading fullScreen message="Carregando boleto..." />;
    }

    return (
        <div className="form-page">
            <header className="form-header">
                <button className="btn-back" onClick={() => navigate(-1)}>←</button>
                <h1>Editar Boleto</h1>
            </header>

            <form className="boleto-form" onSubmit={handleSubmit} id="edit-boleto-form">
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

                <div className="form-group linha-digitavel-container">
                    <div className="linha-digitavel-header">
                        <label htmlFor="linha-digitavel">Linha Digitável *</label>
                        <button type="button" className="btn-autofill" onClick={handleAutoFill}>
                            ✨ Auto-preencher
                        </button>
                    </div>
                    <textarea
                        id="linha-digitavel"
                        value={linhaDigitavel}
                        onChange={(e) => setLinhaDigitavel(e.target.value)}
                        placeholder="Linha digitável do boleto"
                        rows={3}
                        required
                    />
                    <div className={`char-counter ${digitsCount === targetDigits ? 'complete' : digitsCount > targetDigits ? 'error' : ''}`}>
                        {digitsCount} / {targetDigits} dígitos
                    </div>
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

                <button type="submit" className="btn-primary" disabled={loading} id="update-boleto-button">
                    {loading ? 'Atualizando...' : '✏️ Atualizar Boleto'}
                </button>
            </form>
        </div>
    );
}

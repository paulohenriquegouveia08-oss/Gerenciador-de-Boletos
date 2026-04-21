import { useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import Quagga from '@ericblade/quagga2';
import { barcodeToLinhaDigitavel, extractValor, extractVencimento, isValidBarcode } from '../services/barcode';
import './Scanner.css';

export default function Scanner() {
    const navigate = useNavigate();
    const scannerRef = useRef<HTMLDivElement>(null);
    const [error, setError] = useState('');
    const [scanning, setScanning] = useState(true);
    const [scannedCode, setScannedCode] = useState('');

    useEffect(() => {
        if (!scanning) return;

        let isQuaggaStarted = false;

        const initScanner = async () => {
            Quagga.init({
                inputStream: {
                    type: "LiveStream",
                    target: scannerRef.current!,
                    constraints: {
                        width: { min: 640 },
                        height: { min: 480 },
                        facingMode: "environment",
                        aspectRatio: { min: 1, max: 2 }
                    },
                },
                locator: {
                    patchSize: "medium",
                    halfSample: true
                },
                numOfWorkers: navigator.hardwareConcurrency ? navigator.hardwareConcurrency : 4,
                decoder: {
                    readers: [
                        "i2of5_reader",
                        "code_128_reader",
                        "ean_reader",
                        "ean_8_reader",
                        "code_39_reader"
                    ]
                },
                locate: true
            }, function (err) {
                if (err) {
                    console.error('Quagga init failed:', err);
                    setError('Não foi possível acessar a câmera ou inicializar o scanner.');
                    return;
                }
                Quagga.start();
                isQuaggaStarted = true;
            });

            Quagga.onDetected((result) => {
                const code = result.codeResult.code;
                if (code && isValidBarcode(code)) {
                    setScannedCode(code);
                    setScanning(false);
                    Quagga.stop();
                    isQuaggaStarted = false;
                }
            });
        }

        initScanner();

        return () => {
            if (isQuaggaStarted) {
                Quagga.stop();
            }
            Quagga.offDetected();
        };
    }, [scanning]);

    const handleConfirm = () => {
        const linhaDigitavel = barcodeToLinhaDigitavel(scannedCode);
        const valor = extractValor(scannedCode);
        const vencimento = extractVencimento(scannedCode);

        const params = new URLSearchParams();
        params.set('linha_digitavel', linhaDigitavel);
        params.set('codigo_barras', scannedCode);
        if (valor > 0) params.set('valor', valor.toString());
        if (vencimento) params.set('vencimento', vencimento);

        navigate(`/boleto/novo?${params.toString()}`);
    };

    const handleRescan = () => {
        setScannedCode('');
        setError('');
        setScanning(true);
    };

    return (
        <div className="scanner-page">
            <header className="scanner-header">
                <button className="btn-back" onClick={() => navigate(-1)}>←</button>
                <h1>Scanner de Boleto</h1>
            </header>

            {error ? (
                <div className="scanner-error">
                    <p>⚠️ {error}</p>
                    <button className="btn-primary" onClick={() => navigate('/boleto/novo')}>
                        Digitar manualmente
                    </button>
                </div>
            ) : scanning ? (
                <div className="scanner-viewport" ref={scannerRef}>
                    <div className="scanner-overlay">
                        <div className="scanner-frame">
                            <div className="corner top-left" />
                            <div className="corner top-right" />
                            <div className="corner bottom-left" />
                            <div className="corner bottom-right" />
                            <div className="scan-line" />
                        </div>
                    </div>
                    <p className="scanner-hint">Aponte a câmera para o código de barras</p>
                </div>
            ) : (
                <div className="scanner-result">
                    <div className="result-icon">✅</div>
                    <h2>Código detectado!</h2>
                    <p className="result-code">{barcodeToLinhaDigitavel(scannedCode)}</p>

                    <div className="result-actions">
                        <button className="btn-primary" onClick={handleConfirm} id="confirm-scan-button">
                            Confirmar e Continuar
                        </button>
                        <button className="btn-secondary" onClick={handleRescan}>
                            Escanear novamente
                        </button>
                    </div>
                </div>
            )}

            <button
                className="btn-text scanner-manual-btn"
                onClick={() => navigate('/boleto/novo')}
            >
                Digitar código manualmente
            </button>
        </div>
    );
}

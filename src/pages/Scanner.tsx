import { useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { BrowserMultiFormatReader, BarcodeFormat, DecodeHintType } from '@zxing/library';
import { barcodeToLinhaDigitavel, extractValor, extractVencimento, isValidBarcode } from '../services/barcode';
import './Scanner.css';

export default function Scanner() {
    const navigate = useNavigate();
    const videoRef = useRef<HTMLVideoElement>(null);
    const readerRef = useRef<BrowserMultiFormatReader | null>(null);
    const [error, setError] = useState('');
    const [scanning, setScanning] = useState(true);
    const [scannedCode, setScannedCode] = useState('');

    useEffect(() => {
        const hints = new Map();
        hints.set(DecodeHintType.POSSIBLE_FORMATS, [
            BarcodeFormat.ITF,
            BarcodeFormat.CODE_128,
            BarcodeFormat.CODE_39,
            BarcodeFormat.EAN_13,
        ]);
        hints.set(DecodeHintType.TRY_HARDER, true);

        const reader = new BrowserMultiFormatReader(hints);
        readerRef.current = reader;

        const startScan = async () => {
            try {
                const devices = await reader.listVideoInputDevices();
                if (devices.length === 0) {
                    setError('Nenhuma câmera encontrada.');
                    return;
                }

                // Prefer back camera
                const backCamera = devices.find(
                    (d) => d.label.toLowerCase().includes('back') || d.label.toLowerCase().includes('traseira')
                );
                const deviceId = backCamera?.deviceId || devices[devices.length - 1].deviceId;

                await reader.decodeFromConstraints(
                    { video: { deviceId: { exact: deviceId }, width: { min: 1280, ideal: 1920 }, height: { min: 720, ideal: 1080 } } },
                    videoRef.current!,
                    (result, err) => {
                        if (result) {
                            const code = result.getText();
                            if (isValidBarcode(code)) {
                                setScannedCode(code);
                                setScanning(false);
                                reader.reset();
                            }
                        }
                        if (err && !(err instanceof Error && err.name === 'NotFoundException')) {
                            // ignore NotFoundException (normal when no code in view)
                        }
                    });
            } catch (err) {
                console.error('Scanner error:', err);
                setError('Não foi possível acessar a câmera. Verifique as permissões.');
            }
        };

        startScan();

        return () => {
            reader.reset();
        };
    }, []);

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
        setScanning(true);
        setError('');

        const hints = new Map();
        hints.set(DecodeHintType.POSSIBLE_FORMATS, [
            BarcodeFormat.ITF,
            BarcodeFormat.CODE_128,
        ]);

        const reader = new BrowserMultiFormatReader(hints);
        readerRef.current = reader;

        reader.listVideoInputDevices().then((devices) => {
            const backCamera = devices.find(
                (d) => d.label.toLowerCase().includes('back') || d.label.toLowerCase().includes('traseira')
            );
            const deviceId = backCamera?.deviceId || devices[devices.length - 1].deviceId;

            reader.decodeFromConstraints(
                { video: { deviceId: { exact: deviceId }, width: { min: 1280, ideal: 1920 }, height: { min: 720, ideal: 1080 } } },
                videoRef.current!,
                (result) => {
                    if (result) {
                        const code = result.getText();
                        if (isValidBarcode(code)) {
                            setScannedCode(code);
                            setScanning(false);
                            reader.reset();
                        }
                    }
                });
        });
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
                <div className="scanner-viewport">
                    <video ref={videoRef} className="scanner-video" />
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

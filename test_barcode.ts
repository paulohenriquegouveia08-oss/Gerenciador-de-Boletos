import { barcodeToLinhaDigitavel, linhaDigitavelToBarcode, isValidBarcode } from './src/services/barcode';

// Let's test with a valid barcode
// 3419183400000000000109240428913903102434000
const testCode = '34191834000000000001092404289139031024340000'; // 44 chars
console.log('Barcode:', testCode);
console.log('IsValid Barcode:', isValidBarcode(testCode));

const linha = barcodeToLinhaDigitavel(testCode);
console.log('Linha Digitavel:', linha);
console.log('Length:', linha.length);

const backToBarcode = linhaDigitavelToBarcode(linha);
console.log('Back to barcode:', backToBarcode);
console.log('Match?', testCode === backToBarcode);

/**
 * Serviço de conversão de código de barras de boletos brasileiros.
 *
 * Boletos de cobrança (começam com dígitos de 1 a 8) seguem o padrão Febraban:
 * - Código de barras: 44 dígitos
 * - Linha digitável: 47 dígitos (com dígitos verificadores)
 *
 * Boletos de concessionárias/tributos (começam com 8) seguem padrão diferente.
 */

/**
 * Converte código de barras (44 dígitos) para linha digitável (47 dígitos)
 * para boletos de cobrança bancária
 */
export function barcodeToLinhaDigitavel(barcode: string): string {
    const code = barcode.replace(/\D/g, '');

    if (code.length !== 44) {
        return code;
    }

    // Boleto de concessionária (começa com 8)
    if (code.startsWith('8')) {
        return convertConvenioBarcodeToLinhaDigitavel(code);
    }

    // Boleto bancário - campo 1: posições 1-4 do código + posições 20-24
    const campo1Sem = code.substring(0, 4) + code.substring(19, 24);
    const dv1 = modulo10(campo1Sem);
    const campo1 = formatCampo(campo1Sem + dv1);

    // Campo 2: posições 25-34
    const campo2Sem = code.substring(24, 34);
    const dv2 = modulo10(campo2Sem);
    const campo2 = formatCampo(campo2Sem + dv2);

    // Campo 3: posições 35-44
    const campo3Sem = code.substring(34, 44);
    const dv3 = modulo10(campo3Sem);
    const campo3 = formatCampo(campo3Sem + dv3);

    // Campo 4: dígito verificador geral (posição 5)
    const campo4 = code.substring(4, 5);

    // Campo 5: fator de vencimento (posições 6-9) + valor (posições 10-19)
    const campo5 = code.substring(5, 19);

    return `${campo1} ${campo2} ${campo3} ${campo4} ${campo5}`;
}

/**
 * Converte código de barras de convênio para linha digitável
 */
function convertConvenioBarcodeToLinhaDigitavel(code: string): string {
    const bloco1 = code.substring(0, 11);
    const dv1 = modulo10(bloco1);
    const bloco2 = code.substring(11, 22);
    const dv2 = modulo10(bloco2);
    const bloco3 = code.substring(22, 33);
    const dv3 = modulo10(bloco3);
    const bloco4 = code.substring(33, 44);
    const dv4 = modulo10(bloco4);

    return `${bloco1}${dv1} ${bloco2}${dv2} ${bloco3}${dv3} ${bloco4}${dv4}`;
}

/**
 * Converte linha digitável (47 dígitos) para código de barras (44 dígitos)
 */
export function linhaDigitavelToBarcode(linha: string): string {
    const code = linha.replace(/\D/g, '');

    if (code.length === 44) return code;

    if (code.length === 47) {
        // Boleto bancário
        const banco = code.substring(0, 3);
        const moeda = code.substring(3, 4);
        const dvGeral = code.substring(32, 33);
        const fatorVencimento = code.substring(33, 37);
        const valor = code.substring(37, 47);
        const campo1 = code.substring(4, 9);
        const campo2 = code.substring(10, 20);
        const campo3 = code.substring(21, 31);

        return `${banco}${moeda}${dvGeral}${fatorVencimento}${valor}${campo1}${campo2}${campo3}`;
    }

    if (code.length === 48) {
        // Boleto de convênio
        const bloco1 = code.substring(0, 11);
        const bloco2 = code.substring(12, 23);
        const bloco3 = code.substring(24, 35);
        const bloco4 = code.substring(36, 47);
        return `${bloco1}${bloco2}${bloco3}${bloco4}`;
    }

    return code;
}

/**
 * Extrai o valor do código de barras
 */
export function extractValor(barcode: string): number {
    const code = barcode.replace(/\D/g, '');

    if (code.length === 44) {
        if (code.startsWith('8')) {
            // Boleto de convênio - valor nas posições 5-15
            const valorStr = code.substring(4, 15);
            return parseInt(valorStr, 10) / 100;
        }
        // Boleto bancário - valor nas posições 10-19
        const valorStr = code.substring(9, 19);
        return parseInt(valorStr, 10) / 100;
    }

    if (code.length === 47) {
        // Linha digitável bancária
        const barcodeFromLinha = linhaDigitavelToBarcode(code);
        return extractValor(barcodeFromLinha);
    }

    return 0;
}

/**
 * Extrai a data de vencimento do código de barras
 * Base: 07/10/1997 + fator de vencimento
 */
export function extractVencimento(barcode: string): string | null {
    const code = barcode.replace(/\D/g, '');

    if (code.length === 44 && !code.startsWith('8')) {
        const fator = parseInt(code.substring(5, 9), 10);
        if (fator === 0) return null;

        const baseDate = new Date(Date.UTC(1997, 9, 7)); // 1997-10-07 in UTC
        baseDate.setUTCDate(baseDate.getUTCDate() + fator);

        // O fator do boleto zera e recomeça a conta de 1000 em 22/02/2025.
        // A diferença exata entre os ciclos é de 9000 dias.
        // Se a data calculada for muito antiga (-10 anos), pulamos para o ciclo atual/novo.
        const limitDate = new Date();
        limitDate.setFullYear(limitDate.getFullYear() - 10);

        while (baseDate < limitDate) {
            baseDate.setUTCDate(baseDate.getUTCDate() + 9000);
        }

        return baseDate.toISOString().split('T')[0]; // YYYY-MM-DD
    }

    if (code.length === 47) {
        return extractVencimento(linhaDigitavelToBarcode(code));
    }

    return null;
}

/**
 * Módulo 10 - cálculo do dígito verificador
 */
function modulo10(value: string): number {
    let sum = 0;
    let weight = 2;

    for (let i = value.length - 1; i >= 0; i--) {
        let product = parseInt(value[i], 10) * weight;
        if (product >= 10) {
            product = Math.floor(product / 10) + (product % 10);
        }
        sum += product;
        weight = weight === 2 ? 1 : 2;
    }

    const remainder = sum % 10;
    return remainder === 0 ? 0 : 10 - remainder;
}

/**
 * Formata um campo da linha digitável (insere ponto separador)
 */
function formatCampo(campo: string): string {
    return `${campo.substring(0, 5)}.${campo.substring(5)}`;
}

/**
 * Verifica se é um código de barras válido de boleto
 */
export function isValidBarcode(code: string): boolean {
    const clean = code.replace(/\D/g, '');
    return clean.length === 44 || clean.length === 47 || clean.length === 48;
}

/**
 * Formata linha digitável para exibição
 */
export function formatLinhaDigitavel(linha: string): string {
    const code = linha.replace(/\D/g, '');

    if (code.length === 47) {
        return `${code.substring(0, 5)}.${code.substring(5, 10)} ${code.substring(10, 15)}.${code.substring(15, 21)} ${code.substring(21, 26)}.${code.substring(26, 32)} ${code.substring(32, 33)} ${code.substring(33)}`;
    }

    return linha;
}

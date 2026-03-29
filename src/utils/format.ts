/**
 * Formata um número como moeda BRL
 */
export function formatCurrency(value: number): string {
    return new Intl.NumberFormat('pt-BR', {
        style: 'currency',
        currency: 'BRL',
    }).format(value);
}

/**
 * Formata uma data ISO para o formato brasileiro
 */
export function formatDate(dateStr: string): string {
    if (!dateStr) return '';
    const date = new Date(dateStr + 'T12:00:00');
    return new Intl.DateTimeFormat('pt-BR', {
        day: '2-digit',
        month: '2-digit',
        year: 'numeric',
    }).format(date);
}

/**
 * Formata uma data como nome do mês abreviado
 */
export function formatMonthShort(dateStr: string): string {
    const date = new Date(dateStr + 'T12:00:00');
    return new Intl.DateTimeFormat('pt-BR', {
        month: 'short',
    }).format(date);
}

/**
 * Retorna o nome do mês
 */
export function getMonthName(month: number): string {
    const months = [
        'Janeiro', 'Fevereiro', 'Março', 'Abril',
        'Maio', 'Junho', 'Julho', 'Agosto',
        'Setembro', 'Outubro', 'Novembro', 'Dezembro',
    ];
    return months[month] || '';
}

/**
 * Verifica se um boleto está vencido
 */
export function isOverdue(vencimento: string): boolean {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const dueDate = new Date(vencimento + 'T12:00:00');
    dueDate.setHours(0, 0, 0, 0);
    return dueDate < today;
}

/**
 * Verifica se vence hoje
 */
export function isDueToday(vencimento: string): boolean {
    const today = new Date();
    const dueDate = new Date(vencimento + 'T12:00:00');
    return (
        today.getFullYear() === dueDate.getFullYear() &&
        today.getMonth() === dueDate.getMonth() &&
        today.getDate() === dueDate.getDate()
    );
}

/**
 * Dias até o vencimento (negativo se vencido)
 */
export function daysUntilDue(vencimento: string): number {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const dueDate = new Date(vencimento + 'T12:00:00');
    dueDate.setHours(0, 0, 0, 0);
    const diff = dueDate.getTime() - today.getTime();
    return Math.ceil(diff / (1000 * 60 * 60 * 24));
}

export async function copyToClipboard(text: string): Promise<boolean> {
    const cleanText = text.trim();
    try {
        if (navigator.clipboard && navigator.clipboard.writeText) {
            await navigator.clipboard.writeText(cleanText);
            return true;
        }
        throw new Error('Clipboard API not available');
    } catch {
        // Fallback para browsers mais antigos ou sem HTTPS
        const textarea = document.createElement('textarea');
        textarea.value = cleanText;
        textarea.contentEditable = 'true';
        textarea.readOnly = false;
        textarea.style.position = 'fixed';
        textarea.style.left = '-9999px';
        textarea.style.top = '0';
        document.body.appendChild(textarea);

        textarea.select();
        textarea.setSelectionRange(0, 999999); // Mobile Safari/Android WebKit coverage

        try {
            document.execCommand('copy');
            document.body.removeChild(textarea);
            return true;
        } catch {
            document.body.removeChild(textarea);
            return false;
        }
    }
}
//ignore git
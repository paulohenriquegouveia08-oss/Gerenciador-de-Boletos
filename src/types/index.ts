export interface Boleto {
    id: string;
    user_id: string;
    recebedor: string;
    valor: number;
    vencimento: string;
    linha_digitavel: string;
    codigo_barras: string | null;
    status: 'pendente' | 'pago';
    data_pagamento: string | null;
    created_at: string;
}

export interface BoletoInsert {
    recebedor: string;
    valor: number;
    vencimento: string;
    linha_digitavel: string;
    codigo_barras?: string;
}

export interface BoletoUpdate {
    recebedor?: string;
    valor?: number;
    vencimento?: string;
    linha_digitavel?: string;
    codigo_barras?: string;
    status?: 'pendente' | 'pago';
    data_pagamento?: string | null;
}

export interface MonthlyStats {
    total: number;
    totalPago: number;
    totalPendente: number;
    valorTotal: number;
    valorPago: number;
    valorPendente: number;
}

export interface MonthlyChartData {
    month: string;
    valor: number;
}

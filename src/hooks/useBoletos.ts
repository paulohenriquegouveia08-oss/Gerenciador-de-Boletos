import { useEffect, useState, useCallback } from 'react';
import { supabase } from '../services/supabase';
import { useAuth } from '../context/AuthContext';
import type { Boleto, BoletoInsert, BoletoUpdate } from '../types';

export function useBoletos() {
    const { user } = useAuth();
    const [boletos, setBoletos] = useState<Boleto[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    const fetchBoletos = useCallback(async () => {
        if (!user) return;
        setLoading(true);
        setError(null);

        const { data, error: err } = await supabase
            .from('boletos')
            .select('*')
            .eq('user_id', user.id)
            .order('vencimento', { ascending: true });

        if (err) {
            setError(err.message);
        } else {
            setBoletos(data as Boleto[]);
        }
        setLoading(false);
    }, [user]);

    useEffect(() => {
        fetchBoletos();
    }, [fetchBoletos]);

    const addBoleto = async (boleto: BoletoInsert): Promise<{ success: boolean; error?: string }> => {
        if (!user) return { success: false, error: 'Usuário não autenticado' };

        const { error: err } = await supabase
            .from('boletos')
            .insert({ ...boleto, user_id: user.id });

        if (err) return { success: false, error: err.message };
        await fetchBoletos();
        return { success: true };
    };

    const updateBoleto = async (id: string, updates: BoletoUpdate): Promise<{ success: boolean; error?: string }> => {
        const { error: err } = await supabase
            .from('boletos')
            .update(updates)
            .eq('id', id);

        if (err) return { success: false, error: err.message };
        await fetchBoletos();
        return { success: true };
    };

    const deleteBoleto = async (id: string): Promise<{ success: boolean; error?: string }> => {
        const { error: err } = await supabase
            .from('boletos')
            .delete()
            .eq('id', id);

        if (err) return { success: false, error: err.message };
        await fetchBoletos();
        return { success: true };
    };

    const markAsPaid = async (id: string): Promise<{ success: boolean; error?: string }> => {
        return updateBoleto(id, {
            status: 'pago',
            data_pagamento: new Date().toISOString().split('T')[0],
        });
    };

    return {
        boletos,
        loading,
        error,
        fetchBoletos,
        addBoleto,
        updateBoleto,
        deleteBoleto,
        markAsPaid,
    };
}

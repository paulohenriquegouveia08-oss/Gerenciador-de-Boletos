-- ============================================
-- Tabela: boletos
-- ============================================
CREATE TABLE IF NOT EXISTS boletos (
    id UUID DEFAULT gen_random_uuid () PRIMARY KEY,
    user_id UUID REFERENCES auth.users (id) ON DELETE CASCADE NOT NULL,
    recebedor TEXT NOT NULL,
    valor NUMERIC(10, 2) NOT NULL,
    vencimento DATE NOT NULL,
    linha_digitavel TEXT NOT NULL,
    codigo_barras TEXT,
    status TEXT DEFAULT 'pendente' CHECK (
        status IN ('pendente', 'pago')
    ),
    data_pagamento DATE,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================
-- Índices
-- ============================================
CREATE INDEX idx_boletos_user_id ON boletos (user_id);

CREATE INDEX idx_boletos_vencimento ON boletos (vencimento);

CREATE INDEX idx_boletos_status ON boletos (status);

-- ============================================
-- Row Level Security
-- ============================================
ALTER TABLE boletos ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own boletos" ON boletos FOR
SELECT USING (auth.uid () = user_id);

CREATE POLICY "Users can insert own boletos" ON boletos FOR
INSERT
WITH
    CHECK (auth.uid () = user_id);

CREATE POLICY "Users can update own boletos" ON boletos FOR
UPDATE USING (auth.uid () = user_id);

CREATE POLICY "Users can delete own boletos" ON boletos FOR DELETE USING (auth.uid () = user_id);

-- ============================================
-- Tabela: fcm_tokens (para notificações push)
-- ============================================
CREATE TABLE IF NOT EXISTS fcm_tokens (
    id UUID DEFAULT gen_random_uuid () PRIMARY KEY,
    user_id UUID REFERENCES auth.users (id) ON DELETE CASCADE NOT NULL,
    token TEXT NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE (user_id, token)
);

ALTER TABLE fcm_tokens ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can manage own tokens" ON fcm_tokens FOR ALL USING (auth.uid () = user_id);
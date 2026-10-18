-- ==============================================================================
-- SPAN LOOP - SUPABASE POSTGRESQL SCHEMA & AUTOMATION
-- ==============================================================================

-- 1. EXTENSIONS
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pg_cron";

-- 2. DEADLINES TABLE (Radar des obligations récurrentes)
CREATE TABLE IF NOT EXISTS public.deadlines (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    title TEXT NOT NULL,
    category TEXT NOT NULL CHECK (category IN ('finance', 'subscription', 'admin', 'health', 'rituals', 'other')),
    amount NUMERIC(10, 2) DEFAULT 0,
    frequency TEXT NOT NULL CHECK (frequency IN ('once', 'weekly', 'monthly', 'quarterly', 'biannual', 'annual', 'custom')),
    custom_days INTEGER DEFAULT 30,
    next_due_date DATE NOT NULL,
    reminder_rules INTEGER[] DEFAULT '{14, 7, 1, 0}', -- Jours avant l'échéance (ex: J-14, J-7, J-1, Jour J)
    notification_email TEXT,
    notes TEXT,
    link TEXT,
    is_active BOOLEAN DEFAULT TRUE,
    validation_token TEXT DEFAULT encode(gen_random_bytes(24), 'hex'),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Index for daily cron lookups
CREATE INDEX IF NOT EXISTS idx_deadlines_due_date ON public.deadlines (next_due_date, is_active);
CREATE INDEX IF NOT EXISTS idx_deadlines_user ON public.deadlines (user_id);
CREATE INDEX IF NOT EXISTS idx_deadlines_token ON public.deadlines (validation_token);

-- 3. DEADLINE HISTORY (Accomplissements & Consistance)
CREATE TABLE IF NOT EXISTS public.deadline_history (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    deadline_id UUID REFERENCES public.deadlines(id) ON DELETE SET NULL,
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    title TEXT NOT NULL,
    category TEXT NOT NULL,
    amount NUMERIC(10, 2) DEFAULT 0,
    due_date DATE NOT NULL,
    completed_at TIMESTAMPTZ DEFAULT NOW(),
    was_on_time BOOLEAN NOT NULL DEFAULT TRUE
);

CREATE INDEX IF NOT EXISTS idx_history_user ON public.deadline_history (user_id);

-- 4. EMAIL LOGS (Historique des alertes et anti-doublon)
CREATE TABLE IF NOT EXISTS public.email_logs (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    deadline_id UUID REFERENCES public.deadlines(id) ON DELETE CASCADE,
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    recipient_email TEXT NOT NULL,
    reminder_day INTEGER NOT NULL, -- e.g. 14, 7, 1, 0
    target_due_date DATE NOT NULL,
    sent_at TIMESTAMPTZ DEFAULT NOW(),
    clicked_at TIMESTAMPTZ,
    UNIQUE (deadline_id, reminder_day, target_due_date)
);

-- 5. ROW LEVEL SECURITY (RLS)
ALTER TABLE public.deadlines ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.deadline_history ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.email_logs ENABLE ROW LEVEL SECURITY;

-- Deadlines policies
CREATE POLICY "Users can view own deadlines" ON public.deadlines
    FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own deadlines" ON public.deadlines
    FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own deadlines" ON public.deadlines
    FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own deadlines" ON public.deadlines
    FOR DELETE USING (auth.uid() = user_id);

-- History policies
CREATE POLICY "Users can view own history" ON public.deadline_history
    FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own history" ON public.deadline_history
    FOR INSERT WITH CHECK (auth.uid() = user_id);

-- Email logs policies
CREATE POLICY "Users can view own email logs" ON public.email_logs
    FOR SELECT USING (auth.uid() = user_id);

-- 6. STORED PROCEDURE: 1-CLICK VALIDATION & DATE ADVANCEMENT
CREATE OR REPLACE FUNCTION public.validate_deadline(p_deadline_id UUID)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_item RECORD;
    v_next_date DATE;
    v_was_on_time BOOLEAN;
BEGIN
    SELECT * INTO v_item FROM public.deadlines WHERE id = p_deadline_id;
    IF NOT FOUND THEN
        RETURN jsonb_build_object('success', false, 'error', 'Deadline not found');
    END IF;

    -- Check if on time
    v_was_on_time := (v_item.next_due_date >= CURRENT_DATE);

    -- Insert into history
    INSERT INTO public.deadline_history (
        deadline_id, user_id, title, category, amount, due_date, completed_at, was_on_time
    ) VALUES (
        v_item.id, v_item.user_id, v_item.title, v_item.category, v_item.amount, v_item.next_due_date, NOW(), v_was_on_time
    );

    -- Calculate next occurrence
    IF v_item.frequency = 'once' THEN
        UPDATE public.deadlines
        SET is_active = FALSE,
            updated_at = NOW()
        WHERE id = v_item.id;
        v_next_date := NULL;
    ELSE
        CASE v_item.frequency
            WHEN 'weekly' THEN v_next_date := v_item.next_due_date + INTERVAL '7 days';
            WHEN 'monthly' THEN v_next_date := v_item.next_due_date + INTERVAL '1 month';
            WHEN 'quarterly' THEN v_next_date := v_item.next_due_date + INTERVAL '3 months';
            WHEN 'biannual' THEN v_next_date := v_item.next_due_date + INTERVAL '6 months';
            WHEN 'annual' THEN v_next_date := v_item.next_due_date + INTERVAL '1 year';
            WHEN 'custom' THEN v_next_date := v_item.next_due_date + (v_item.custom_days || ' days')::INTERVAL;
            ELSE v_next_date := v_item.next_due_date + INTERVAL '1 month';
        END CASE;

        -- Update deadline with new date and renew token
        UPDATE public.deadlines
        SET next_due_date = v_next_date,
            validation_token = encode(gen_random_bytes(24), 'hex'),
            updated_at = NOW()
        WHERE id = v_item.id;
    END IF;

    RETURN jsonb_build_object(
        'success', true,
        'deadline_id', v_item.id,
        'next_due_date', v_next_date,
        'was_on_time', v_was_on_time
    );
END;
$$;

-- 7. PG_CRON DAILY DISPATCH (Exécuté chaque matin à 08h00 UTC)
-- Déclenche l'Edge Function Supabase 'daily-email-alerts'
/*
SELECT cron.schedule(
    'span-loop-daily-alerts',
    '0 8 * * *',
    $$
    SELECT
      net.http_post(
          url:='https://<VOTRE-PROJET-SUPABASE>.supabase.co/functions/v1/daily-email-alerts',
          headers:='{"Content-Type": "application/json", "Authorization": "Bearer <SERVICE_ROLE_KEY>"}'::jsonb,
          body:='{}'::jsonb
      ) as request_id;
    $$
);
*/

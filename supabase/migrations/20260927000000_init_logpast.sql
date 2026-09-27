-- Migration: Initial schema for LogPast (Ledgr)
-- Implements core tables, CHECK constraints (past date enforcement), RLS policies, indexes, and audit triggers.

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- 1. TITLES TABLE
CREATE TABLE IF NOT EXISTS public.titles (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    name VARCHAR(255) NOT NULL,
    color VARCHAR(32) DEFAULT '#3b82f6',
    icon VARCHAR(64) DEFAULT 'folder',
    is_archived BOOLEAN NOT NULL DEFAULT FALSE,
    sort_order INTEGER NOT NULL DEFAULT 0,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    deleted_at TIMESTAMPTZ NULL
);

-- 2. SUBTASKS TABLE (Past-Only Work Ledger)
CREATE TABLE IF NOT EXISTS public.subtasks (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    title_id UUID NOT NULL REFERENCES public.titles(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    description TEXT NOT NULL,
    entry_date DATE NOT NULL,
    status VARCHAR(32) NOT NULL DEFAULT 'done' CHECK (status IN ('done', 'in_progress', 'cancelled')),
    tags TEXT[] NOT NULL DEFAULT '{}',
    cost NUMERIC(12, 2) NULL,
    time_spent_minutes INTEGER NULL,
    sort_order INTEGER NOT NULL DEFAULT 0,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    deleted_at TIMESTAMPTZ NULL,

    -- Hard constraint at DB layer: dates must be today or in the past
    CONSTRAINT check_past_or_today_date CHECK (entry_date <= CURRENT_DATE)
);

-- 3. AUDIT LOG TABLE
CREATE TABLE IF NOT EXISTS public.audit_logs (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    action VARCHAR(64) NOT NULL,
    entity_type VARCHAR(64) NOT NULL,
    entity_id VARCHAR(128) NULL,
    details JSONB NOT NULL DEFAULT '{}'::jsonb,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 4. PERFORMANCE INDEXES (Optimized for p99 multi-filter & search queries)
CREATE INDEX IF NOT EXISTS idx_titles_user_id ON public.titles(user_id) WHERE deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_titles_user_archived ON public.titles(user_id, is_archived) WHERE deleted_at IS NULL;

CREATE INDEX IF NOT EXISTS idx_subtasks_user_date ON public.subtasks(user_id, entry_date DESC) WHERE deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_subtasks_title_date ON public.subtasks(title_id, entry_date DESC) WHERE deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_subtasks_user_title_date ON public.subtasks(user_id, title_id, entry_date DESC) WHERE deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_subtasks_updated_at ON public.subtasks(user_id, updated_at DESC);
CREATE INDEX IF NOT EXISTS idx_subtasks_search ON public.subtasks USING gin(to_tsvector('english', description));

CREATE INDEX IF NOT EXISTS idx_audit_logs_user_date ON public.audit_logs(user_id, created_at DESC);

-- 5. ROW LEVEL SECURITY (RLS) POLICIES
ALTER TABLE public.titles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.subtasks ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.audit_logs ENABLE ROW LEVEL SECURITY;

-- Titles RLS Policies
CREATE POLICY "Users can view their own titles"
    ON public.titles FOR SELECT
    USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own titles"
    ON public.titles FOR INSERT
    WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own titles"
    ON public.titles FOR UPDATE
    USING (auth.uid() = user_id)
    WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete their own titles"
    ON public.titles FOR DELETE
    USING (auth.uid() = user_id);

-- Subtasks RLS Policies
CREATE POLICY "Users can view their own subtasks"
    ON public.subtasks FOR SELECT
    USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own subtasks"
    ON public.subtasks FOR INSERT
    WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own subtasks"
    ON public.subtasks FOR UPDATE
    USING (auth.uid() = user_id)
    WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete their own subtasks"
    ON public.subtasks FOR DELETE
    USING (auth.uid() = user_id);

-- Audit Logs RLS Policies
CREATE POLICY "Users can view their own audit logs"
    ON public.audit_logs FOR SELECT
    USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own audit logs"
    ON public.audit_logs FOR INSERT
    WITH CHECK (auth.uid() = user_id);

-- 6. AUTOMATIC UPDATED_AT TRIGGER
CREATE OR REPLACE FUNCTION public.handle_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS set_titles_updated_at ON public.titles;
CREATE TRIGGER set_titles_updated_at
    BEFORE UPDATE ON public.titles
    FOR EACH ROW
    EXECUTE FUNCTION public.handle_updated_at();

DROP TRIGGER IF EXISTS set_subtasks_updated_at ON public.subtasks;
CREATE TRIGGER set_subtasks_updated_at
    BEFORE UPDATE ON public.subtasks
    FOR EACH ROW
    EXECUTE FUNCTION public.handle_updated_at();

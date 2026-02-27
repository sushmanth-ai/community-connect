
-- Add 'cancelled' to issue_status enum
ALTER TYPE public.issue_status ADD VALUE IF NOT EXISTS 'cancelled';

-- Add cancellation_reason column to issues
ALTER TABLE public.issues ADD COLUMN IF NOT EXISTS cancellation_reason text;

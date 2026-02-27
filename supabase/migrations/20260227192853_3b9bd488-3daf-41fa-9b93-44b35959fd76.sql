
-- Add new enum values to issue_status
ALTER TYPE public.issue_status ADD VALUE IF NOT EXISTS 'accepted';
ALTER TYPE public.issue_status ADD VALUE IF NOT EXISTS 'declined';
ALTER TYPE public.issue_status ADD VALUE IF NOT EXISTS 'work_started';
ALTER TYPE public.issue_status ADD VALUE IF NOT EXISTS 'completed';

-- Create issue_work_details table
CREATE TABLE public.issue_work_details (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  issue_id UUID NOT NULL REFERENCES public.issues(id) ON DELETE CASCADE,
  budget_allocated NUMERIC DEFAULT 0,
  estimated_days INTEGER,
  work_start_date DATE,
  decline_reason TEXT,
  decline_category TEXT,
  progress_percentage INTEGER DEFAULT 0,
  amount_used NUMERIC DEFAULT 0,
  extension_reason TEXT,
  extended_date DATE,
  accepted_at TIMESTAMPTZ,
  accepted_by UUID,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT unique_issue_work_details UNIQUE (issue_id)
);

-- Enable RLS
ALTER TABLE public.issue_work_details ENABLE ROW LEVEL SECURITY;

-- Authenticated users can read
CREATE POLICY "Authenticated can view work details"
ON public.issue_work_details
FOR SELECT
TO authenticated
USING (true);

-- Authorities and admins can insert
CREATE POLICY "Authority or admin can insert work details"
ON public.issue_work_details
FOR INSERT
TO authenticated
WITH CHECK (
  public.has_role(auth.uid(), 'authority') OR public.has_role(auth.uid(), 'admin')
);

-- Authorities and admins can update
CREATE POLICY "Authority or admin can update work details"
ON public.issue_work_details
FOR UPDATE
TO authenticated
USING (
  public.has_role(auth.uid(), 'authority') OR public.has_role(auth.uid(), 'admin')
);

-- Trigger for updated_at
CREATE TRIGGER update_issue_work_details_updated_at
BEFORE UPDATE ON public.issue_work_details
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at();

-- Enable realtime
ALTER PUBLICATION supabase_realtime ADD TABLE public.issue_work_details;

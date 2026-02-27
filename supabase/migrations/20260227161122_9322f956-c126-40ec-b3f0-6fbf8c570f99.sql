
-- Allow citizens to delete their own open issues
CREATE POLICY "Citizens can delete own open issues"
ON public.issues
FOR DELETE
USING (reporter_id = auth.uid() AND status = 'open');

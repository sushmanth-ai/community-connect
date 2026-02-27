
-- Create mandals table
CREATE TABLE public.mandals (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  district text NOT NULL DEFAULT 'Nellore',
  state text NOT NULL DEFAULT 'Andhra Pradesh',
  status text NOT NULL DEFAULT 'active',
  created_at timestamp with time zone NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.mandals ENABLE ROW LEVEL SECURITY;

-- Public read
CREATE POLICY "Anyone can read mandals"
ON public.mandals FOR SELECT
USING (true);

-- Admin manage
CREATE POLICY "Admins manage mandals"
ON public.mandals FOR ALL
USING (has_role(auth.uid(), 'admin'::app_role));

-- Seed 40 Nellore mandals
INSERT INTO public.mandals (name) VALUES
  ('Allur'), ('Ananthasagaram'), ('Atmakur'), ('Bogole'), ('Butchireddypalem'),
  ('Chejerla'), ('Chillakur'), ('Dakkili'), ('Dagadarthi'), ('Duttalur'),
  ('Gudur'), ('Indukurpet'), ('Jaladanki'), ('Kaligiri'), ('Kaluvoya'),
  ('Kavali'), ('Kodavalur'), ('Kondapuram'), ('Kota'), ('Manubolu'),
  ('Marripadu'), ('Muthukur'), ('Naidupet'), ('Nellore Rural'), ('Nellore Urban'),
  ('Ojili'), ('Pellakur'), ('Podalakur'), ('Rapur'), ('Sangam'),
  ('Seetharamapuram'), ('Sullurpet'), ('Sydapuram'), ('Tada'), ('Udayagiri'),
  ('Vakadu'), ('Varikuntapadu'), ('Venkatachalam'), ('Venkatagiri'), ('Vidavalur');

-- Add mandal_id to issues
ALTER TABLE public.issues ADD COLUMN mandal_id uuid REFERENCES public.mandals(id);

-- Add columns to profiles
ALTER TABLE public.profiles ADD COLUMN mandal_id uuid REFERENCES public.mandals(id);
ALTER TABLE public.profiles ADD COLUMN gov_id text;
ALTER TABLE public.profiles ADD COLUMN first_login boolean NOT NULL DEFAULT true;
ALTER TABLE public.profiles ADD COLUMN active_status boolean NOT NULL DEFAULT true;
ALTER TABLE public.profiles ADD COLUMN last_login timestamp with time zone;

-- Unique constraint: one active authority per mandal+department
-- We use a partial unique index on user_roles for active authorities
CREATE UNIQUE INDEX idx_unique_authority_per_mandal_dept
ON public.profiles (mandal_id, department_id)
WHERE active_status = true AND mandal_id IS NOT NULL AND department_id IS NOT NULL;

-- Allow admin to update any profile (for setting mandal_id, gov_id, etc.)
CREATE POLICY "Admins can update any profile"
ON public.profiles FOR UPDATE
USING (has_role(auth.uid(), 'admin'::app_role));

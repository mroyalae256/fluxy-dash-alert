
-- Extend events and alarms with substation telemetry fields
ALTER TABLE public.events
  ADD COLUMN IF NOT EXISTS substation text,
  ADD COLUMN IF NOT EXISTS voltage_kv integer,
  ADD COLUMN IF NOT EXISTS bay text,
  ADD COLUMN IF NOT EXISTS data_type text,
  ADD COLUMN IF NOT EXISTS signal_text text,
  ADD COLUMN IF NOT EXISTS description text,
  ADD COLUMN IF NOT EXISTS ioa_number integer;

ALTER TABLE public.alarms
  ADD COLUMN IF NOT EXISTS substation text,
  ADD COLUMN IF NOT EXISTS voltage_kv integer,
  ADD COLUMN IF NOT EXISTS bay text,
  ADD COLUMN IF NOT EXISTS data_type text,
  ADD COLUMN IF NOT EXISTS signal_text text,
  ADD COLUMN IF NOT EXISTS description text,
  ADD COLUMN IF NOT EXISTS ioa_number integer,
  ADD COLUMN IF NOT EXISTS acknowledged_at timestamptz,
  ADD COLUMN IF NOT EXISTS acknowledged_by text;

-- Reference table for critical alarm types (from screenshot)
CREATE TABLE IF NOT EXISTS public.critical_alarm_types (
  id uuid primary key default gen_random_uuid(),
  name text not null unique,
  description text,
  created_at timestamptz not null default now()
);
GRANT SELECT ON public.critical_alarm_types TO anon, authenticated;
GRANT ALL ON public.critical_alarm_types TO service_role;
ALTER TABLE public.critical_alarm_types ENABLE ROW LEVEL SECURITY;
CREATE POLICY "crit types public read" ON public.critical_alarm_types FOR SELECT USING (true);

INSERT INTO public.critical_alarm_types (name, description) VALUES
  ('Device Fail', 'Main device failure'),
  ('Diff Comm Fail', 'Differential communication failure'),
  ('110 VDC Fault', '110 VDC supply fault'),
  ('Main Prot OPTD', 'Main protection operated'),
  ('Mechanical Protection', 'Mechanical protection trip'),
  ('SF6 Lock', 'SF6 lock condition'),
  ('Prot VT MCB Trip', 'Protection VT MCB trip'),
  ('Metering VT MCB Trip', 'Metering VT MCB trip'),
  ('TCS Fail', 'Trip circuit supervision fail'),
  ('Transformer Fan Fail', 'Transformer fan failure')
ON CONFLICT (name) DO NOTHING;

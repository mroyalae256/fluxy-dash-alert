
-- EVENTS
CREATE TABLE public.events (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  type TEXT NOT NULL,
  source TEXT NOT NULL,
  severity TEXT NOT NULL CHECK (severity IN ('info','warning','error')),
  message TEXT NOT NULL,
  raw JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX events_created_at_idx ON public.events (created_at DESC);
CREATE INDEX events_severity_idx ON public.events (severity);
GRANT SELECT ON public.events TO anon, authenticated;
GRANT ALL ON public.events TO service_role;
ALTER TABLE public.events ENABLE ROW LEVEL SECURITY;
CREATE POLICY "events public read" ON public.events FOR SELECT USING (true);

-- ALARMS
CREATE TABLE public.alarms (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  source TEXT NOT NULL,
  severity TEXT NOT NULL CHECK (severity IN ('low','medium','high','critical')),
  message TEXT NOT NULL,
  is_critical BOOLEAN NOT NULL DEFAULT false,
  acknowledged BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  resolved_at TIMESTAMPTZ
);
CREATE INDEX alarms_created_at_idx ON public.alarms (created_at DESC);
CREATE INDEX alarms_critical_idx ON public.alarms (is_critical);
GRANT SELECT ON public.alarms TO anon, authenticated;
GRANT ALL ON public.alarms TO service_role;
ALTER TABLE public.alarms ENABLE ROW LEVEL SECURITY;
CREATE POLICY "alarms public read" ON public.alarms FOR SELECT USING (true);

-- NOTIFICATION LOG
CREATE TABLE public.notification_log (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  alarm_id UUID REFERENCES public.alarms(id) ON DELETE CASCADE,
  recipients TEXT[] NOT NULL,
  channel TEXT NOT NULL DEFAULT 'email',
  status TEXT NOT NULL DEFAULT 'stubbed',
  sent_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT ON public.notification_log TO anon, authenticated;
GRANT ALL ON public.notification_log TO service_role;
ALTER TABLE public.notification_log ENABLE ROW LEVEL SECURITY;
CREATE POLICY "notif public read" ON public.notification_log FOR SELECT USING (true);

-- Enable realtime so critical alarms can trigger sound + email instantly
ALTER PUBLICATION supabase_realtime ADD TABLE public.alarms;

-- SEED DATA: spread across last 7 days
INSERT INTO public.events (type, source, severity, message, created_at)
SELECT
  (ARRAY['login','config_change','heartbeat','data_sync','sensor_read','breaker_trip','load_shift'])[1 + floor(random()*7)::int],
  (ARRAY['Substation-A','Substation-B','Substation-C','Line-32kV','Line-132kV','Transformer-T1','Transformer-T2','Grid-Control'])[1 + floor(random()*8)::int],
  (ARRAY['info','info','info','warning','warning','error'])[1 + floor(random()*6)::int],
  (ARRAY[
    'Heartbeat received',
    'Configuration updated by operator',
    'Sensor reading nominal',
    'Voltage fluctuation detected',
    'Load shift recorded',
    'Breaker auto-reclose engaged',
    'Telemetry sync complete',
    'Temperature within range'
  ])[1 + floor(random()*8)::int],
  now() - (random() * interval '7 days')
FROM generate_series(1, 500);

INSERT INTO public.alarms (source, severity, message, is_critical, acknowledged, created_at, resolved_at)
SELECT
  (ARRAY['Substation-A','Substation-B','Substation-C','Line-32kV','Line-132kV','Transformer-T1','Transformer-T2'])[1 + floor(random()*7)::int],
  (ARRAY['low','medium','high'])[1 + floor(random()*3)::int],
  (ARRAY[
    'Overcurrent threshold exceeded',
    'Transformer temperature high',
    'Voltage sag detected',
    'Communications timeout',
    'Battery backup low',
    'Frequency deviation'
  ])[1 + floor(random()*6)::int],
  false,
  random() > 0.5,
  now() - (random() * interval '7 days'),
  CASE WHEN random() > 0.4 THEN now() - (random() * interval '6 days') ELSE NULL END
FROM generate_series(1, 70);

INSERT INTO public.alarms (source, severity, message, is_critical, acknowledged, created_at, resolved_at)
SELECT
  (ARRAY['Substation-A','Transformer-T1','Line-132kV','Grid-Control'])[1 + floor(random()*4)::int],
  'critical',
  (ARRAY[
    'CRITICAL: Transformer T1 oil temperature exceeded safe limit',
    'CRITICAL: 132kV line earth fault detected',
    'CRITICAL: Substation-A total power loss',
    'CRITICAL: Grid frequency outside safety band'
  ])[1 + floor(random()*4)::int],
  true,
  random() > 0.6,
  now() - (random() * interval '7 days'),
  CASE WHEN random() > 0.5 THEN now() - (random() * interval '6 days') ELSE NULL END
FROM generate_series(1, 12);

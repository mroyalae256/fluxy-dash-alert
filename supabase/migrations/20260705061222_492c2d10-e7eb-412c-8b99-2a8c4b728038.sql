
DROP POLICY IF EXISTS "alarms public read" ON public.alarms;
DROP POLICY IF EXISTS "events public read" ON public.events;
DROP POLICY IF EXISTS "notif public read" ON public.notification_log;

REVOKE SELECT ON public.alarms FROM anon;
REVOKE SELECT ON public.events FROM anon;
REVOKE SELECT ON public.notification_log FROM anon;

GRANT SELECT ON public.alarms TO authenticated;
GRANT SELECT ON public.events TO authenticated;
GRANT SELECT ON public.notification_log TO authenticated;

CREATE POLICY "alarms authenticated read" ON public.alarms FOR SELECT TO authenticated USING (true);
CREATE POLICY "events authenticated read" ON public.events FOR SELECT TO authenticated USING (true);
CREATE POLICY "notif authenticated read" ON public.notification_log FOR SELECT TO authenticated USING (true);

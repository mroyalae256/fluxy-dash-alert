-- Explicitly revoke write privileges on notification_log from client roles.
-- Writes are only performed via server functions using the service role,
-- which bypasses RLS. This makes the intent explicit for scanners.
REVOKE INSERT, UPDATE, DELETE ON public.notification_log FROM anon, authenticated;

-- Same treatment for alarms and events: only server functions (service role) mutate them.
REVOKE INSERT, UPDATE, DELETE ON public.alarms FROM anon, authenticated;
REVOKE INSERT, UPDATE, DELETE ON public.events FROM anon, authenticated;
-- Allow an explicit "expired" state for abandoned checkouts
ALTER TABLE public.orders DROP CONSTRAINT orders_status_check;
ALTER TABLE public.orders ADD CONSTRAINT orders_status_check
  CHECK (status = ANY (ARRAY['pending'::text, 'paid'::text, 'generating'::text, 'completed'::text, 'failed'::text, 'expired'::text]));

-- 1) Purge automated-test rows that pollute production metrics
DELETE FROM public.email_send_log WHERE recipient_email LIKE '%@e2e.becksdigitalpro.org';

-- 2) Cleanup routine for abandoned checkouts and stuck delivery emails
CREATE OR REPLACE FUNCTION public.expire_stale_orders()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  UPDATE public.orders
  SET status = 'expired',
      error_message = COALESCE(error_message, 'Checkout was not completed within 24 hours.')
  WHERE status = 'pending'
    AND created_at < now() - interval '24 hours';

  UPDATE public.email_send_log l
  SET status = 'failed',
      error_message = COALESCE(l.error_message, 'Marked failed: stuck in pending > 15 min (cleanup)')
  WHERE l.status = 'pending'
    AND l.created_at < now() - interval '15 minutes'
    AND NOT EXISTS (
      SELECT 1 FROM public.email_send_log l2
      WHERE l2.message_id IS NOT NULL
        AND l2.message_id = l.message_id
        AND l2.status <> 'pending'
    );
END;
$$;

REVOKE ALL ON FUNCTION public.expire_stale_orders() FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.expire_stale_orders() TO service_role;

SELECT public.expire_stale_orders();

SELECT cron.schedule('expire-stale-orders', '*/30 * * * *', $cron$ SELECT public.expire_stale_orders(); $cron$)
WHERE NOT EXISTS (SELECT 1 FROM cron.job WHERE jobname = 'expire-stale-orders');
UPDATE public.orders SET status = 'failed', updated_at = now() WHERE id = 'af4e4975-373a-4ca2-8e0f-89b07843f07d' AND status = 'pending';

INSERT INTO public.email_send_log (message_id, template_name, recipient_email, status, error_message, metadata)
SELECT message_id, template_name, recipient_email, 'failed', 'Marked failed: stuck in pending > 5 min (cleanup)', metadata
FROM public.email_send_log
WHERE status = 'pending'
  AND created_at < now() - interval '5 minutes'
  AND message_id IN ('a3339715-463a-405a-8401-e9a61e852027','6187883c-18fc-43d6-917b-60ceba54d10a','8599584e-6ceb-45c0-bb2d-84181ca09b63');
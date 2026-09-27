ALTER TABLE public.orders 
ADD COLUMN IF NOT EXISTS test_mode boolean NOT NULL DEFAULT false;

CREATE INDEX IF NOT EXISTS idx_orders_stripe_session_id ON public.orders(stripe_session_id);
CREATE INDEX IF NOT EXISTS idx_orders_test_mode ON public.orders(test_mode);

-- Allow service role (webhook + backend) to update orders
DROP POLICY IF EXISTS "Service role can update orders" ON public.orders;
CREATE POLICY "Service role can update orders"
ON public.orders
FOR UPDATE
USING (auth.role() = 'service_role'::text)
WITH CHECK (auth.role() = 'service_role'::text);
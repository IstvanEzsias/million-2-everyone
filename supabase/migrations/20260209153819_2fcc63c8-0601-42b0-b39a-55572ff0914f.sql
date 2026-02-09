
CREATE TABLE public.failed_transactions (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  walletid TEXT NOT NULL,
  amount NUMERIC NOT NULL,
  status TEXT NOT NULL DEFAULT 'failed',
  error_message TEXT,
  difficulty_level TEXT,
  player_id UUID REFERENCES public.players(id),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.failed_transactions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Service role can manage failed transactions"
ON public.failed_transactions
FOR ALL
USING (true)
WITH CHECK (true);

CREATE POLICY "Anyone can view failed transactions"
ON public.failed_transactions
FOR SELECT
USING (true);

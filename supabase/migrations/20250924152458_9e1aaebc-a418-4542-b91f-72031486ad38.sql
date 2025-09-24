-- Remove email column from players table since we're no longer storing emails
ALTER TABLE public.players DROP COLUMN IF EXISTS email;

-- Remove send_email_after_payment column as it's no longer needed without email storage
ALTER TABLE public.players DROP COLUMN IF EXISTS send_email_after_payment;
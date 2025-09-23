-- Add send_email_after_payment field to players table
ALTER TABLE public.players 
ADD COLUMN send_email_after_payment BOOLEAN NOT NULL DEFAULT false;
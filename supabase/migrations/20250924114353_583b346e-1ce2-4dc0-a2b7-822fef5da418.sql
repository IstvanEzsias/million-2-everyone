-- Add played_the_game column to players table
ALTER TABLE public.players 
ADD COLUMN played_the_game boolean NOT NULL DEFAULT false;
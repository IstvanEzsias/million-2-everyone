-- Create Nostr_relays table
CREATE TABLE public.nostr_relays (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  url TEXT NOT NULL UNIQUE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable Row Level Security
ALTER TABLE public.nostr_relays ENABLE ROW LEVEL SECURITY;

-- Create policy for public read access to relays
CREATE POLICY "Relays are viewable by everyone" 
ON public.nostr_relays 
FOR SELECT 
USING (true);

-- Insert the three relay URLs
INSERT INTO public.nostr_relays (url) VALUES 
('wss://relay.lanacoin-eternity.com'),
('wss://relay.lanaheartvoice.com'),
('wss://relay.lanavault.space');

-- Create Players table
CREATE TABLE public.players (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  walletid TEXT,
  nostrhex TEXT,
  received_lana BOOLEAN NOT NULL DEFAULT FALSE,
  transactionid TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable Row Level Security
ALTER TABLE public.players ENABLE ROW LEVEL SECURITY;

-- Create policies for players (assuming user-specific access)
CREATE POLICY "Users can view all players" 
ON public.players 
FOR SELECT 
USING (true);

CREATE POLICY "Users can create players" 
ON public.players 
FOR INSERT 
WITH CHECK (true);

CREATE POLICY "Users can update players" 
ON public.players 
FOR UPDATE 
USING (true);

-- Create function to update timestamps
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SET search_path = public;

-- Create trigger for automatic timestamp updates
CREATE TRIGGER update_players_updated_at
BEFORE UPDATE ON public.players
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();
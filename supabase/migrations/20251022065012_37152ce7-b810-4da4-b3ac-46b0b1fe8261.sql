-- Create difficulty levels table
CREATE TABLE public.difficulty_levels (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL UNIQUE,
  display_name_en TEXT NOT NULL,
  display_name_sl TEXT NOT NULL,
  description_en TEXT NOT NULL,
  description_sl TEXT NOT NULL,
  base_speed NUMERIC NOT NULL,
  obstacle_min_gap INTEGER NOT NULL,
  obstacle_max_gap INTEGER NOT NULL,
  reward_amount NUMERIC NOT NULL,
  reward_type TEXT NOT NULL,
  sort_order INTEGER NOT NULL,
  speed_progression TEXT DEFAULT 'linear',
  speed_multiplier_max NUMERIC DEFAULT 1.0,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.difficulty_levels ENABLE ROW LEVEL SECURITY;

-- RLS policy: Everyone can read difficulty levels
CREATE POLICY "Anyone can read difficulty levels"
  ON public.difficulty_levels
  FOR SELECT
  USING (true);

-- Insert the three difficulty levels
INSERT INTO public.difficulty_levels (
  name, 
  display_name_en, 
  display_name_sl, 
  description_en, 
  description_sl, 
  base_speed, 
  obstacle_min_gap, 
  obstacle_max_gap, 
  reward_amount, 
  reward_type, 
  sort_order,
  speed_progression,
  speed_multiplier_max
) VALUES
  (
    'easy', 
    'Beginner', 
    'Začetnik', 
    'Slower pace, perfect for learning! Wider gaps for comfortable jumps.', 
    'Počasnejše tempo, popolno za učenje! Širše razdalje za udobne skoke.', 
    3.5, 
    400, 
    550, 
    1, 
    'registered_lana', 
    1,
    'linear',
    0.2
  ),
  (
    'intermediate', 
    'Intermediate', 
    'Vmesni', 
    'Balanced challenge - the classic experience!', 
    'Uravnotežen izziv - klasična izkušnja!', 
    5.0, 
    320, 
    480, 
    3, 
    'registered_lana', 
    2,
    'linear',
    0.2
  ),
  (
    'impossible', 
    'Legendary', 
    'Legendarni', 
    '🔥 Starts manageable, ends INSANE! Speed ramps from normal to impossible. Only legends survive! Win Lana8Wonder registration!', 
    '🔥 Začne zmerno, konča NORO! Hitrost se povečuje od normalne do nemogoče. Le legende preživijo! Zmaga prinese registracijo Lana8Wonder!', 
    5.0, 
    280, 
    400, 
    1, 
    'lana8wonder', 
    3,
    'exponential',
    1.8
  );

-- Update players table to track difficulty
ALTER TABLE public.players 
  ADD COLUMN difficulty_level TEXT,
  ADD COLUMN completed_difficulties TEXT[] DEFAULT '{}';
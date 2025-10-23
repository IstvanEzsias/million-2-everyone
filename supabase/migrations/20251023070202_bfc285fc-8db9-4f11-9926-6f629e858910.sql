-- Update difficulty_levels: Set all rewards to 1 LANA
UPDATE difficulty_levels
SET reward_amount = 1
WHERE name IN ('intermediate', 'impossible');

-- Update Legendary (impossible) descriptions
UPDATE difficulty_levels
SET 
  description_en = '🏆 Only legends survive! You might get a surprise 😉',
  description_sl = '🏆 Samo legende preživijo! Mogoče te čaka presenečenje 😉'
WHERE name = 'impossible';

-- Create legendary_winners table
CREATE TABLE IF NOT EXISTS legendary_winners (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  player_id uuid REFERENCES players(id) ON DELETE CASCADE NOT NULL,
  walletid text NOT NULL,
  nostrhex text,
  completed_at timestamp with time zone DEFAULT now(),
  draw_eligible boolean DEFAULT true,
  prize_awarded boolean DEFAULT false,
  prize_details jsonb,
  created_at timestamp with time zone DEFAULT now(),
  UNIQUE(player_id)
);

-- Enable RLS on legendary_winners
ALTER TABLE legendary_winners ENABLE ROW LEVEL SECURITY;

-- RLS Policies for legendary_winners
CREATE POLICY "Anyone can view legendary winners"
ON legendary_winners
FOR SELECT
USING (true);

CREATE POLICY "Service role can manage legendary winners"
ON legendary_winners
FOR ALL
USING (true)
WITH CHECK (true);
-- Update difficulty level names and descriptions
-- Chill Mode (easy)
UPDATE difficulty_levels
SET 
  display_name_en = 'Chill Mode',
  display_name_sl = 'Mirni način',
  description_en = '🧘 Perfect for relaxing! Take your time, enjoy the vibe.',
  description_sl = '🧘 Popolno za sprostitev! Vzemi si čas, uživaj v vzdušju.'
WHERE name = 'easy';

-- Heat Mode (intermediate)
UPDATE difficulty_levels
SET 
  display_name_en = 'Heat Mode',
  display_name_sl = 'Vroč način',
  description_en = '🔥 Bring the fire! Fast-paced action for thrill seekers.',
  description_sl = '🔥 Prinesi ogenj! Hitra akcija za ljubitelje adrenalina.'
WHERE name = 'intermediate';

-- Legendary (impossible) - 8 LANA + draw entry
UPDATE difficulty_levels
SET 
  display_name_en = 'Legendary',
  display_name_sl = 'Legendarni',
  description_en = '🏆 Only legends survive! Win 8 LANA + entry into prize draw. Prizes are a surprise!',
  description_sl = '🏆 Samo legende preživijo! Zmaga prinese 8 LANA + vstop v nagradni žreb. Nagrade so presenečenje!',
  reward_amount = 8,
  reward_type = 'draw_entry'
WHERE name = 'impossible';
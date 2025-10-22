-- Reduce all difficulty speeds for better gameplay experience
UPDATE difficulty_levels 
SET base_speed = 0.8
WHERE name = 'easy';

UPDATE difficulty_levels 
SET base_speed = 1.75
WHERE name = 'intermediate';

UPDATE difficulty_levels 
SET base_speed = 2.0,
    speed_multiplier_max = 4.0
WHERE name = 'impossible';
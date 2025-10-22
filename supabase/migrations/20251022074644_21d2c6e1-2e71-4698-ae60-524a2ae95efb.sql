-- Halve the beginner speed for even more forgiving gameplay
UPDATE difficulty_levels 
SET base_speed = 0.4
WHERE name = 'easy';
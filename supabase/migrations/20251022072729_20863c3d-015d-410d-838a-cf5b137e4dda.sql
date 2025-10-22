-- Reduce intermediate difficulty speed from 5.0 to 4.0
UPDATE difficulty_levels 
SET base_speed = 4.0
WHERE name = 'intermediate';
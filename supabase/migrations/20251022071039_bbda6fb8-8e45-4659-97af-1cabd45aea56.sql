-- Reduce beginner difficulty speed by half
UPDATE difficulty_levels 
SET base_speed = 1.75
WHERE name = 'easy';
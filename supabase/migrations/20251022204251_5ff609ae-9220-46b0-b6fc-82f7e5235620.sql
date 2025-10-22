-- Update beginner difficulty to be more playable
UPDATE difficulty_levels
SET base_speed = 3.0
WHERE name = 'easy';
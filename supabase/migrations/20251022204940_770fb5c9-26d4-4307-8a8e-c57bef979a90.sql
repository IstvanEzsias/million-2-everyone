-- Restore intermediate difficulty to original game speed
UPDATE difficulty_levels
SET base_speed = 5.0
WHERE name = 'intermediate';
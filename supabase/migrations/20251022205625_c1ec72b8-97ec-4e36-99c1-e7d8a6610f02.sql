-- Update legendary/impossible difficulty to have more dramatic speed increase (5.0 → 13.0)
UPDATE difficulty_levels
SET 
  base_speed = 5.0,
  speed_multiplier_max = 1.6
WHERE name = 'impossible';
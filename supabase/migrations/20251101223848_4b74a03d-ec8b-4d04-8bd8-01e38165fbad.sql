-- Add Hungarian columns to difficulty_levels table
ALTER TABLE difficulty_levels 
ADD COLUMN IF NOT EXISTS display_name_hu TEXT,
ADD COLUMN IF NOT EXISTS description_hu TEXT;

-- Update difficulty levels with Hungarian display names and descriptions
UPDATE difficulty_levels 
SET 
  display_name_hu = 'Nyugi Mód',
  description_hu = 'Tökéletes pihenéshez! Vedd nyugodtan, élvezd a hangulatot.'
WHERE name = 'easy';

UPDATE difficulty_levels 
SET 
  display_name_hu = 'Intenzív Mód',
  description_hu = 'Gyújtsd fel! Pörgős akció izgalomkereső játékosoknak.'
WHERE name = 'intermediate';

UPDATE difficulty_levels 
SET 
  display_name_hu = 'Legendás',
  description_hu = 'Csak a legendák élik túl! Meglepetés várhat rád 😳'
WHERE name = 'impossible';
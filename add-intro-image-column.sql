-- Add intro_image_url column to custom_surveys table
-- Run this in your Supabase SQL Editor

-- Add the intro_image_url column
ALTER TABLE custom_surveys
ADD COLUMN IF NOT EXISTS intro_image_url TEXT;

-- Verify the column was added
SELECT column_name, data_type, is_nullable
FROM information_schema.columns
WHERE table_name = 'custom_surveys'
AND table_schema = 'public'
ORDER BY ordinal_position;

-- Success message
DO $$
BEGIN
    RAISE NOTICE 'Successfully added intro_image_url column to custom_surveys table!';
    RAISE NOTICE 'You can now upload intro images for surveys.';
END $$;
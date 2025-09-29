-- Create storage policies only (buckets already exist)
-- Run this if you get "duplicate key" errors

-- Drop existing policies if they exist
DROP POLICY IF EXISTS "Survey images are publicly viewable" ON storage.objects;
DROP POLICY IF EXISTS "Authenticated users can upload survey images" ON storage.objects;
DROP POLICY IF EXISTS "Users can update their own survey images" ON storage.objects;
DROP POLICY IF EXISTS "Users can delete their own survey images" ON storage.objects;
DROP POLICY IF EXISTS "Survey videos are publicly viewable" ON storage.objects;
DROP POLICY IF EXISTS "Authenticated users can upload survey videos" ON storage.objects;
DROP POLICY IF EXISTS "Users can update their own survey videos" ON storage.objects;
DROP POLICY IF EXISTS "Users can delete their own survey videos" ON storage.objects;

-- Storage policies for survey images
CREATE POLICY "Survey images are publicly viewable"
ON storage.objects FOR SELECT
USING (bucket_id = 'survey-images');

CREATE POLICY "Authenticated users can upload survey images"
ON storage.objects FOR INSERT
WITH CHECK (
  bucket_id = 'survey-images' 
  AND auth.role() = 'authenticated'
);

CREATE POLICY "Users can update their own survey images"
ON storage.objects FOR UPDATE
USING (
  bucket_id = 'survey-images'
  AND auth.uid()::text = (storage.foldername(name))[4] -- Extract user ID from path
);

CREATE POLICY "Users can delete their own survey images"
ON storage.objects FOR DELETE
USING (
  bucket_id = 'survey-images'
  AND auth.uid()::text = (storage.foldername(name))[4] -- Extract user ID from path
);

-- Storage policies for survey videos
CREATE POLICY "Survey videos are publicly viewable"
ON storage.objects FOR SELECT
USING (bucket_id = 'survey-videos');

CREATE POLICY "Authenticated users can upload survey videos"
ON storage.objects FOR INSERT
WITH CHECK (
  bucket_id = 'survey-videos' 
  AND auth.role() = 'authenticated'
);

CREATE POLICY "Users can update their own survey videos"
ON storage.objects FOR UPDATE
USING (
  bucket_id = 'survey-videos'
  AND auth.uid()::text = (storage.foldername(name))[4] -- Extract user ID from path
);

CREATE POLICY "Users can delete their own survey videos"
ON storage.objects FOR DELETE
USING (
  bucket_id = 'survey-videos'
  AND auth.uid()::text = (storage.foldername(name))[4] -- Extract user ID from path
);
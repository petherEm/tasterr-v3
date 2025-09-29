-- Supabase Storage Setup for Tasterr Survey System

-- Create storage buckets
INSERT INTO storage.buckets (id, name, public)
VALUES 
  ('survey-images', 'survey-images', true),
  ('survey-videos', 'survey-videos', true);

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

-- Update survey_uploads table to use Supabase storage
ALTER TABLE survey_uploads 
DROP COLUMN upload_key,
ADD COLUMN storage_path TEXT NOT NULL DEFAULT '',
ADD COLUMN bucket_name TEXT NOT NULL DEFAULT 'survey-images';

-- Create index on storage path for faster lookups
CREATE INDEX idx_survey_uploads_storage_path ON survey_uploads(storage_path);
CREATE INDEX idx_survey_uploads_bucket ON survey_uploads(bucket_name);
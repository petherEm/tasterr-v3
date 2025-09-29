-- Complete Survey System Migration
-- This script updates the database with all recent question type additions
-- Run this in your Supabase SQL Editor

-- =============================================================================
-- 1. UPDATE QUESTION TYPES CONSTRAINT
-- =============================================================================

-- Drop the existing constraint to allow new question types
ALTER TABLE survey_questions
DROP CONSTRAINT IF EXISTS survey_questions_question_type_check;

-- Add the updated constraint with ALL new question types
ALTER TABLE survey_questions
ADD CONSTRAINT survey_questions_question_type_check
CHECK (question_type IN (
  'input', 'select', 'radio', 'textarea', 'number',
  'image_sort', 'image_select', 'image_comment', 'image_upload_comment',
  'video_upload', 'video_question', 'range'
));

-- =============================================================================
-- 2. CREATE UPLOADS TRACKING TABLE (if it doesn't exist)
-- =============================================================================

-- Check if survey_uploads table exists, create if not
DO $$
BEGIN
    IF NOT EXISTS (SELECT FROM pg_tables WHERE schemaname = 'public' AND tablename = 'survey_uploads') THEN
        CREATE TABLE survey_uploads (
          id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
          survey_id UUID REFERENCES custom_surveys(id) ON DELETE CASCADE,
          question_id UUID REFERENCES survey_questions(id) ON DELETE CASCADE,
          user_id TEXT, -- NULL for admin uploads, populated for user response uploads
          upload_key TEXT NOT NULL, -- Supabase storage key
          file_url TEXT NOT NULL,
          file_name TEXT NOT NULL,
          file_size INTEGER NOT NULL,
          file_type TEXT NOT NULL,
          upload_type TEXT NOT NULL CHECK (upload_type IN ('survey_image', 'survey_video', 'video_response', 'user_image')),
          metadata JSONB, -- Additional file metadata (dimensions, duration, etc.)
          created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
          UNIQUE(upload_key)
        );

        -- Enable RLS
        ALTER TABLE survey_uploads ENABLE ROW LEVEL SECURITY;

        RAISE NOTICE 'Created survey_uploads table';
    ELSE
        RAISE NOTICE 'survey_uploads table already exists';
    END IF;
END $$;

-- =============================================================================
-- 3. UPDATE/CREATE RLS POLICIES FOR SURVEY_UPLOADS
-- =============================================================================

-- Drop existing policies if they exist
DROP POLICY IF EXISTS "Users can view survey uploads" ON survey_uploads;
DROP POLICY IF EXISTS "Users can insert own video uploads" ON survey_uploads;
DROP POLICY IF EXISTS "Users can view own video uploads" ON survey_uploads;
DROP POLICY IF EXISTS "Users can insert own image uploads" ON survey_uploads;
DROP POLICY IF EXISTS "Users can view own image uploads" ON survey_uploads;

-- Policy: Users can view uploads for published surveys (for images/videos in questions)
CREATE POLICY "Users can view survey media" ON survey_uploads
  FOR SELECT USING (
    upload_type IN ('survey_image', 'survey_video') AND
    EXISTS (
      SELECT 1 FROM custom_surveys cs
      WHERE cs.id = survey_uploads.survey_id
      AND cs.status = 'published'
      AND (cs.expires_at IS NULL OR cs.expires_at > now())
    )
  );

-- Policy: Users can insert their own response uploads (videos and images)
CREATE POLICY "Users can insert own response uploads" ON survey_uploads
  FOR INSERT WITH CHECK (
    upload_type IN ('video_response', 'user_image') AND
    auth.jwt() ->> 'sub' = user_id
  );

-- Policy: Users can view their own response uploads
CREATE POLICY "Users can view own response uploads" ON survey_uploads
  FOR SELECT USING (
    upload_type IN ('video_response', 'user_image') AND
    auth.jwt() ->> 'sub' = user_id
  );

-- Policy: Users can delete their own response uploads
CREATE POLICY "Users can delete own response uploads" ON survey_uploads
  FOR DELETE USING (
    upload_type IN ('video_response', 'user_image') AND
    auth.jwt() ->> 'sub' = user_id
  );

-- =============================================================================
-- 4. CREATE/UPDATE INDEXES FOR BETTER PERFORMANCE
-- =============================================================================

-- Create indexes if they don't exist
CREATE INDEX IF NOT EXISTS idx_survey_uploads_survey_id ON survey_uploads(survey_id);
CREATE INDEX IF NOT EXISTS idx_survey_uploads_question_id ON survey_uploads(question_id);
CREATE INDEX IF NOT EXISTS idx_survey_uploads_user_id ON survey_uploads(user_id);
CREATE INDEX IF NOT EXISTS idx_survey_uploads_type ON survey_uploads(upload_type);
CREATE INDEX IF NOT EXISTS idx_survey_uploads_key ON survey_uploads(upload_key);
CREATE INDEX IF NOT EXISTS idx_survey_uploads_created_at ON survey_uploads(created_at);

-- =============================================================================
-- 5. UPDATE STORAGE BUCKET POLICIES (if needed)
-- =============================================================================

-- Ensure survey-images bucket exists with proper policies
DO $$
BEGIN
    -- Insert bucket if it doesn't exist
    INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
    VALUES (
        'survey-images',
        'survey-images',
        true,
        10485760, -- 10MB limit
        ARRAY['image/jpeg', 'image/png', 'image/webp', 'image/gif']::text[]
    )
    ON CONFLICT (id) DO NOTHING;

    -- Insert bucket if it doesn't exist
    INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
    VALUES (
        'survey-videos',
        'survey-videos',
        true,
        104857600, -- 100MB limit
        ARRAY['video/mp4', 'video/webm', 'video/quicktime']::text[]
    )
    ON CONFLICT (id) DO NOTHING;

    RAISE NOTICE 'Storage buckets verified/created';
END $$;

-- =============================================================================
-- 6. STORAGE POLICIES FOR SURVEY MEDIA
-- =============================================================================

-- Drop existing policies
DROP POLICY IF EXISTS "Users can view survey images" ON storage.objects;
DROP POLICY IF EXISTS "Authenticated users can upload survey images" ON storage.objects;
DROP POLICY IF EXISTS "Users can delete own survey images" ON storage.objects;
DROP POLICY IF EXISTS "Users can view survey videos" ON storage.objects;
DROP POLICY IF EXISTS "Authenticated users can upload survey videos" ON storage.objects;
DROP POLICY IF EXISTS "Users can delete own survey videos" ON storage.objects;

-- Survey Images Policies
CREATE POLICY "Users can view survey images" ON storage.objects
  FOR SELECT USING (bucket_id = 'survey-images');

CREATE POLICY "Authenticated users can upload survey images" ON storage.objects
  FOR INSERT WITH CHECK (
    bucket_id = 'survey-images' AND
    auth.role() = 'authenticated'
  );

CREATE POLICY "Users can delete own survey images" ON storage.objects
  FOR DELETE USING (
    bucket_id = 'survey-images' AND
    auth.uid()::text = (storage.foldername(name))[1]
  );

-- Survey Videos Policies
CREATE POLICY "Users can view survey videos" ON storage.objects
  FOR SELECT USING (bucket_id = 'survey-videos');

CREATE POLICY "Authenticated users can upload survey videos" ON storage.objects
  FOR INSERT WITH CHECK (
    bucket_id = 'survey-videos' AND
    auth.role() = 'authenticated'
  );

CREATE POLICY "Users can delete own survey videos" ON storage.objects
  FOR DELETE USING (
    bucket_id = 'survey-videos' AND
    auth.uid()::text = (storage.foldername(name))[1]
  );

-- =============================================================================
-- 7. VERIFY MIGRATION SUCCESS
-- =============================================================================

-- Check that the constraint was updated correctly
SELECT
  conname as constraint_name,
  pg_get_constraintdef(oid) as constraint_definition
FROM pg_constraint
WHERE conrelid = 'survey_questions'::regclass
AND conname = 'survey_questions_question_type_check';

-- Check tables exist
SELECT
  tablename,
  schemaname
FROM pg_tables
WHERE tablename IN ('custom_surveys', 'survey_questions', 'survey_responses', 'survey_uploads')
AND schemaname = 'public';

-- Check storage buckets
SELECT
  id,
  name,
  public,
  file_size_limit,
  allowed_mime_types
FROM storage.buckets
WHERE id IN ('survey-images', 'survey-videos');

-- Show success message
DO $$
BEGIN
    RAISE NOTICE '=============================================================================';
    RAISE NOTICE 'MIGRATION COMPLETED SUCCESSFULLY!';
    RAISE NOTICE '=============================================================================';
    RAISE NOTICE 'New question types available:';
    RAISE NOTICE '- image_comment (admin uploads images, users comment)';
    RAISE NOTICE '- image_upload_comment (users upload images and comment)';
    RAISE NOTICE '- video_question (admin uploads video, users respond)';
    RAISE NOTICE '';
    RAISE NOTICE 'Storage buckets configured for:';
    RAISE NOTICE '- survey-images (10MB limit, image formats)';
    RAISE NOTICE '- survey-videos (100MB limit, video formats)';
    RAISE NOTICE '';
    RAISE NOTICE 'You can now create surveys with all new question types!';
    RAISE NOTICE '=============================================================================';
END $$;
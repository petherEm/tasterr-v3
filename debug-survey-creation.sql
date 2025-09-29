-- Debug script to check survey creation setup
-- Run this in Supabase SQL Editor to diagnose issues

-- Check if survey_categories table exists
SELECT
  table_name,
  column_name,
  data_type,
  is_nullable
FROM information_schema.columns
WHERE table_name = 'survey_categories'
ORDER BY ordinal_position;

-- Check if new columns exist in survey_questions
SELECT
  table_name,
  column_name,
  data_type,
  is_nullable
FROM information_schema.columns
WHERE table_name = 'survey_questions'
  AND column_name IN ('category_id', 'ai_assistance_enabled', 'ai_assistance_config')
ORDER BY ordinal_position;

-- Check RLS policies on custom_surveys
SELECT
  schemaname,
  tablename,
  policyname,
  permissive,
  roles,
  cmd,
  qual
FROM pg_policies
WHERE tablename IN ('custom_surveys', 'survey_questions', 'survey_categories');

-- Test basic survey insertion (without categories)
-- This will show the exact error if there is one
-- (Remove the -- to run this test)
-- INSERT INTO custom_surveys (
--   title,
--   description,
--   introduction,
--   created_by,
--   target_audience,
--   status
-- ) VALUES (
--   'Test Survey',
--   'Test Description',
--   'Test Introduction',
--   'test-user-id',
--   'all',
--   'draft'
-- );
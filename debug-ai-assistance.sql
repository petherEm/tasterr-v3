-- Debug AI Assistance Setup
-- Run this in Supabase SQL Editor to check if AI assistance is properly set up

-- 1. Check if AI assistance columns exist in survey_questions
SELECT
  column_name,
  data_type,
  is_nullable,
  column_default
FROM information_schema.columns
WHERE table_name = 'survey_questions'
  AND column_name IN ('ai_assistance_enabled', 'ai_assistance_config')
ORDER BY column_name;

-- 2. Check existing survey questions and their AI settings
SELECT
  id,
  question_text,
  question_type,
  ai_assistance_enabled,
  ai_assistance_config,
  created_at
FROM survey_questions
ORDER BY created_at DESC
LIMIT 10;

-- 3. Test: Enable AI assistance on all existing questions (OPTIONAL - remove the -- to run)
-- UPDATE survey_questions
-- SET
--   ai_assistance_enabled = true,
--   ai_assistance_config = '{
--     "enabled": true,
--     "assistance_type": "all",
--     "maxRetries": 2,
--     "confidence_threshold": 0.5,
--     "triggers": {
--       "short_answers": true,
--       "incomplete_data": true,
--       "inconsistent_data": false
--     }
--   }'::jsonb
-- WHERE question_type IN ('input', 'textarea');

-- 4. Check survey categories table exists
SELECT COUNT(*) as category_table_exists
FROM information_schema.tables
WHERE table_name = 'survey_categories';

-- 5. If you want to test AI assistance immediately, run this to enable it on your questions:
-- This will enable AI assistance on all text-based questions with low threshold for easy testing
-- UPDATE survey_questions
-- SET
--   ai_assistance_enabled = true,
--   ai_assistance_config = jsonb_set(
--     COALESCE(ai_assistance_config, '{}'::jsonb),
--     '{enabled}',
--     'true'::jsonb
--   ) || '{
--     "assistance_type": "all",
--     "maxRetries": 3,
--     "confidence_threshold": 0.3,
--     "triggers": {
--       "short_answers": true,
--       "incomplete_data": true,
--       "inconsistent_data": true
--     }
--   }'::jsonb
-- WHERE question_type IN ('input', 'textarea', 'number');
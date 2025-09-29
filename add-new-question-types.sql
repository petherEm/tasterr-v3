-- Migration: Add new question types (image_comment, video_question)
-- Run this to update the database with the new question types

-- Drop the existing constraint
ALTER TABLE survey_questions
DROP CONSTRAINT IF EXISTS survey_questions_question_type_check;

-- Add the updated constraint with new question types
ALTER TABLE survey_questions
ADD CONSTRAINT survey_questions_question_type_check
CHECK (question_type IN (
  'input', 'select', 'radio', 'textarea', 'number',
  'image_sort', 'image_select', 'image_comment', 'image_upload_comment', 'video_upload', 'video_question', 'range'
));

-- Verify the constraint was added
SELECT conname, consrc FROM pg_constraint
WHERE conrelid = 'survey_questions'::regclass
AND conname = 'survey_questions_question_type_check';
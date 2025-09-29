-- Extended Custom Surveys Schema for New Question Types
-- Run this after the existing custom-surveys-schema.sql

-- Update survey_questions table to support new question types
ALTER TABLE survey_questions 
DROP CONSTRAINT survey_questions_question_type_check;

ALTER TABLE survey_questions
ADD CONSTRAINT survey_questions_question_type_check
CHECK (question_type IN (
  'input', 'select', 'radio', 'textarea', 'number',
  'image_sort', 'image_select', 'image_comment', 'image_upload_comment', 'video_upload', 'video_question', 'range'
));

-- Create uploads tracking table
CREATE TABLE survey_uploads (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  survey_id UUID REFERENCES custom_surveys(id) ON DELETE CASCADE,
  question_id UUID REFERENCES survey_questions(id) ON DELETE CASCADE,
  user_id TEXT, -- NULL for admin uploads, populated for user response uploads
  upload_key TEXT NOT NULL, -- UploadThing key
  file_url TEXT NOT NULL,
  file_name TEXT NOT NULL,
  file_size INTEGER NOT NULL,
  file_type TEXT NOT NULL,
  upload_type TEXT NOT NULL CHECK (upload_type IN ('survey_image', 'video_response')),
  metadata JSONB, -- Additional file metadata (dimensions, duration, etc.)
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
  UNIQUE(upload_key)
);

-- Create RLS policies for survey_uploads
ALTER TABLE survey_uploads ENABLE ROW LEVEL SECURITY;

-- Policy: Users can view uploads for published surveys (for images in questions)
CREATE POLICY "Users can view survey uploads" ON survey_uploads
  FOR SELECT USING (
    upload_type = 'survey_image' AND
    EXISTS (
      SELECT 1 FROM custom_surveys cs 
      WHERE cs.id = survey_uploads.survey_id 
      AND cs.status = 'published' 
      AND (cs.expires_at IS NULL OR cs.expires_at > now())
    )
  );

-- Policy: Users can insert their own video response uploads
CREATE POLICY "Users can insert own video uploads" ON survey_uploads
  FOR INSERT WITH CHECK (
    upload_type = 'video_response' AND 
    auth.jwt() ->> 'sub' = user_id
  );

-- Policy: Users can view their own video uploads
CREATE POLICY "Users can view own video uploads" ON survey_uploads
  FOR SELECT USING (
    upload_type = 'video_response' AND 
    auth.jwt() ->> 'sub' = user_id
  );

-- Create indexes for better performance
CREATE INDEX idx_survey_uploads_survey_id ON survey_uploads(survey_id);
CREATE INDEX idx_survey_uploads_question_id ON survey_uploads(question_id);
CREATE INDEX idx_survey_uploads_user_id ON survey_uploads(user_id);
CREATE INDEX idx_survey_uploads_type ON survey_uploads(upload_type);
CREATE INDEX idx_survey_uploads_key ON survey_uploads(upload_key);

-- Insert sample data for testing new question types
WITH sample_survey AS (
  INSERT INTO custom_surveys (
    title,
    description, 
    introduction,
    created_by,
    status
  ) VALUES (
    'Product Visual Feedback Survey',
    'Help us understand your preferences through images and videos',
    'This survey uses interactive questions including image sorting, video responses, and preference ratings. It should take about 5-7 minutes to complete.',
    'admin-sample-id',
    'published'
  ) RETURNING id
)
INSERT INTO survey_questions (survey_id, question_text, question_subtitle, question_type, is_required, order_index, options)
SELECT 
  sample_survey.id,
  unnest(ARRAY[
    'Sort these product packages by preference',
    'Select your top 3 favorite package designs',
    'Record a short video review of your experience',
    'Rate your likelihood to recommend this product'
  ]),
  unnest(ARRAY[
    'Drag and drop to arrange from most to least preferred',
    'Click to select up to 3 designs you find most appealing',
    'Share your honest thoughts in a 30-second video',
    'Use the slider to indicate how likely you are to recommend'
  ]),
  unnest(ARRAY['image_sort', 'image_select', 'video_upload', 'range']::text[]),
  unnest(ARRAY[true, true, false, true]::boolean[]),
  unnest(ARRAY[1, 2, 3, 4]),
  unnest(ARRAY[
    '{"images": [], "sortType": "preference", "instruction": "Drag to reorder by preference"}'::jsonb,
    '{"images": [], "maxSelections": 3, "minSelections": 1, "instruction": "Select your favorites"}'::jsonb,
    '{"maxSizeBytes": 52428800, "maxDurationSeconds": 30, "acceptedFormats": ["mp4"], "allowRecording": true, "instruction": "Share your thoughts"}'::jsonb,
    '{"min": 0, "max": 10, "step": 1, "defaultValue": 5, "labels": {"min": "Not likely at all", "max": "Extremely likely"}, "showValue": true, "instruction": "Rate likelihood to recommend"}'::jsonb
  ]::jsonb[])
FROM sample_survey;
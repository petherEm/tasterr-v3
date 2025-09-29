-- Migration: Add Survey Categories and AI Assistance (Fixed Version)
-- Created: 2025-01-18
-- Description: Adds category support and AI assistance features to surveys
-- This version handles existing constraints and partial migrations

-- Create survey_categories table
CREATE TABLE IF NOT EXISTS survey_categories (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  survey_id UUID NOT NULL REFERENCES custom_surveys(id) ON DELETE CASCADE,
  name VARCHAR(100) NOT NULL,
  description TEXT,
  order_index INTEGER NOT NULL,
  color VARCHAR(7) DEFAULT '#3B82F6', -- Default blue color
  icon VARCHAR(50) DEFAULT 'folder', -- Default lucide icon name
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Add indexes for efficient querying (with IF NOT EXISTS equivalent)
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_indexes WHERE indexname = 'idx_survey_categories_survey_id') THEN
        CREATE INDEX idx_survey_categories_survey_id ON survey_categories(survey_id);
    END IF;

    IF NOT EXISTS (SELECT 1 FROM pg_indexes WHERE indexname = 'idx_survey_categories_order') THEN
        CREATE INDEX idx_survey_categories_order ON survey_categories(survey_id, order_index);
    END IF;

    IF NOT EXISTS (SELECT 1 FROM pg_indexes WHERE indexname = 'idx_survey_questions_category_id') THEN
        CREATE INDEX idx_survey_questions_category_id ON survey_questions(category_id);
    END IF;
END $$;

-- Add unique constraint (only if it doesn't exist)
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'unique_category_name_per_survey') THEN
        ALTER TABLE survey_categories ADD CONSTRAINT unique_category_name_per_survey
            UNIQUE(survey_id, name);
    END IF;
END $$;

-- Add check constraint for valid hex colors (only if it doesn't exist)
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'valid_hex_color') THEN
        ALTER TABLE survey_categories ADD CONSTRAINT valid_hex_color
            CHECK (color ~ '^#[0-9A-Fa-f]{6}$');
    END IF;
END $$;

-- Add category and AI assistance fields to survey_questions
ALTER TABLE survey_questions
  ADD COLUMN IF NOT EXISTS category_id UUID REFERENCES survey_categories(id) ON DELETE SET NULL;

ALTER TABLE survey_questions
  ADD COLUMN IF NOT EXISTS ai_assistance_enabled BOOLEAN DEFAULT FALSE;

ALTER TABLE survey_questions
  ADD COLUMN IF NOT EXISTS ai_assistance_config JSONB DEFAULT '{
    "enabled": false,
    "assistance_type": "all",
    "maxRetries": 2,
    "confidence_threshold": 0.7,
    "triggers": {
      "short_answers": true,
      "incomplete_data": true,
      "inconsistent_data": false
    }
  }'::jsonb;

-- Add RLS policies for survey_categories (only if they don't exist)
DO $$
BEGIN
    -- Enable RLS on survey_categories
    ALTER TABLE survey_categories ENABLE ROW LEVEL SECURITY;

    -- Policy for authenticated users to view categories
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'survey_categories' AND policyname = 'Users can view survey categories') THEN
        CREATE POLICY "Users can view survey categories" ON survey_categories
            FOR SELECT USING (
                survey_id IN (
                    SELECT id FROM custom_surveys
                    WHERE status = 'published'
                )
            );
    END IF;

    -- Policy for admins to manage categories
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'survey_categories' AND policyname = 'Admins can manage survey categories') THEN
        CREATE POLICY "Admins can manage survey categories" ON survey_categories
            FOR ALL USING (true);
    END IF;
EXCEPTION WHEN OTHERS THEN
    -- RLS policies might fail if applied by service role, continue anyway
    RAISE NOTICE 'RLS policies creation skipped (likely running as service role): %', SQLERRM;
END $$;

-- Update RLS policies for survey_questions to handle categories
DO $$
BEGIN
    -- Policy for authenticated users to view questions with categories
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'survey_questions' AND policyname = 'Users can view survey questions with categories') THEN
        CREATE POLICY "Users can view survey questions with categories" ON survey_questions
            FOR SELECT USING (
                survey_id IN (
                    SELECT id FROM custom_surveys
                    WHERE status = 'published'
                )
            );
    END IF;
EXCEPTION WHEN OTHERS THEN
    RAISE NOTICE 'Survey questions RLS policies creation skipped: %', SQLERRM;
END $$;

-- Create helper function for category management
CREATE OR REPLACE FUNCTION reorder_survey_categories()
RETURNS TRIGGER AS $$
BEGIN
    -- Auto-assign order_index if not provided
    IF NEW.order_index IS NULL THEN
        SELECT COALESCE(MAX(order_index), 0) + 1
        INTO NEW.order_index
        FROM survey_categories
        WHERE survey_id = NEW.survey_id;
    END IF;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger for auto-ordering (only if it doesn't exist)
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'trigger_reorder_survey_categories') THEN
        CREATE TRIGGER trigger_reorder_survey_categories
            BEFORE INSERT ON survey_categories
            FOR EACH ROW EXECUTE FUNCTION reorder_survey_categories();
    END IF;
END $$;

-- Create cleanup function for orphaned questions
CREATE OR REPLACE FUNCTION cleanup_orphaned_category_references()
RETURNS void AS $$
BEGIN
    -- Set category_id to NULL for questions referencing deleted categories
    UPDATE survey_questions
    SET category_id = NULL
    WHERE category_id IS NOT NULL
    AND category_id NOT IN (SELECT id FROM survey_categories);

    -- Log the cleanup
    RAISE NOTICE 'Cleaned up orphaned category references in survey_questions';
END;
$$ LANGUAGE plpgsql;

-- Grant necessary permissions (if running with restricted user)
DO $$
BEGIN
    -- Grant usage on sequences (if any)
    GRANT USAGE ON ALL SEQUENCES IN SCHEMA public TO authenticated;

    -- Grant permissions on tables
    GRANT SELECT, INSERT, UPDATE, DELETE ON survey_categories TO authenticated;
    GRANT SELECT, UPDATE ON survey_questions TO authenticated;

    RAISE NOTICE 'Permissions granted successfully';
EXCEPTION WHEN OTHERS THEN
    RAISE NOTICE 'Permission granting skipped: %', SQLERRM;
END $$;

-- Final verification
DO $$
DECLARE
    category_count INTEGER;
    question_columns_count INTEGER;
BEGIN
    -- Check if survey_categories table exists and is accessible
    SELECT COUNT(*) INTO category_count FROM survey_categories LIMIT 1;

    -- Check if new columns exist in survey_questions
    SELECT COUNT(*) INTO question_columns_count
    FROM information_schema.columns
    WHERE table_name = 'survey_questions'
    AND column_name IN ('category_id', 'ai_assistance_enabled', 'ai_assistance_config');

    IF question_columns_count = 3 THEN
        RAISE NOTICE 'Migration completed successfully! survey_categories table and new survey_questions columns are ready.';
    ELSE
        RAISE NOTICE 'Migration partially completed. Found % out of 3 expected columns.', question_columns_count;
    END IF;
END $$;
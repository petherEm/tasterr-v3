-- Rollback Migration: Remove Survey Categories and AI Assistance
-- Created: 2025-01-18
-- Description: Rollback the category support and AI assistance features

-- Remove triggers first
DROP TRIGGER IF EXISTS trigger_assign_category_order ON survey_categories;
DROP TRIGGER IF EXISTS trigger_reorder_categories_after_delete ON survey_categories;

-- Remove functions
DROP FUNCTION IF EXISTS assign_category_order();
DROP FUNCTION IF EXISTS reorder_categories_after_delete();

-- Remove new columns from survey_questions
ALTER TABLE survey_questions DROP COLUMN IF EXISTS category_id;
ALTER TABLE survey_questions DROP COLUMN IF EXISTS ai_assistance_enabled;
ALTER TABLE survey_questions DROP COLUMN IF EXISTS ai_assistance_config;

-- Drop indexes
DROP INDEX IF EXISTS idx_survey_questions_category_id;
DROP INDEX IF EXISTS idx_survey_categories_survey_id;
DROP INDEX IF EXISTS idx_survey_categories_order;

-- Drop the survey_categories table
DROP TABLE IF EXISTS survey_categories;

-- Note: This rollback will remove all category data permanently
-- Make sure to backup any important category configurations before running this script
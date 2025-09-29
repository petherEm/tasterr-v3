-- Migration: Add Survey Categories and AI Assistance
-- Created: 2025-01-18
-- Description: Adds category support and AI assistance features to surveys

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

-- Add index for efficient querying
CREATE INDEX IF NOT EXISTS idx_survey_categories_survey_id ON survey_categories(survey_id);
CREATE INDEX IF NOT EXISTS idx_survey_categories_order ON survey_categories(survey_id, order_index);

-- Add unique constraint to prevent duplicate names within same survey
ALTER TABLE survey_categories ADD CONSTRAINT unique_category_name_per_survey
  UNIQUE(survey_id, name);

-- Add check constraint for valid hex colors
ALTER TABLE survey_categories ADD CONSTRAINT valid_hex_color
  CHECK (color ~ '^#[0-9A-Fa-f]{6}$');

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

-- Add index for category-based question queries
CREATE INDEX IF NOT EXISTS idx_survey_questions_category_id ON survey_questions(category_id);

-- Add RLS policies for survey_categories
ALTER TABLE survey_categories ENABLE ROW LEVEL SECURITY;

-- Users can view categories for published surveys
CREATE POLICY "Users can view categories for published surveys"
  ON survey_categories FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM custom_surveys
      WHERE custom_surveys.id = survey_categories.survey_id
      AND custom_surveys.status = 'published'
    )
  );

-- Survey creators can manage their survey categories
CREATE POLICY "Survey creators can manage categories"
  ON survey_categories FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM custom_surveys
      WHERE custom_surveys.id = survey_categories.survey_id
      AND custom_surveys.created_by = auth.uid()::text
    )
  );

-- Function to automatically assign order_index for new categories
CREATE OR REPLACE FUNCTION assign_category_order()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.order_index IS NULL THEN
    SELECT COALESCE(MAX(order_index), 0) + 1
    INTO NEW.order_index
    FROM survey_categories
    WHERE survey_id = NEW.survey_id;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger to auto-assign order_index
DROP TRIGGER IF EXISTS trigger_assign_category_order ON survey_categories;
CREATE TRIGGER trigger_assign_category_order
  BEFORE INSERT ON survey_categories
  FOR EACH ROW
  EXECUTE FUNCTION assign_category_order();

-- Function to reorder categories when one is deleted
CREATE OR REPLACE FUNCTION reorder_categories_after_delete()
RETURNS TRIGGER AS $$
BEGIN
  -- Decrease order_index for all categories that come after the deleted one
  UPDATE survey_categories
  SET order_index = order_index - 1
  WHERE survey_id = OLD.survey_id
  AND order_index > OLD.order_index;

  RETURN OLD;
END;
$$ LANGUAGE plpgsql;

-- Trigger to reorder after deletion
DROP TRIGGER IF EXISTS trigger_reorder_categories_after_delete ON survey_categories;
CREATE TRIGGER trigger_reorder_categories_after_delete
  AFTER DELETE ON survey_categories
  FOR EACH ROW
  EXECUTE FUNCTION reorder_categories_after_delete();

-- Insert some default categories for demonstration (can be removed in production)
-- This helps with testing and shows the intended structure
INSERT INTO survey_categories (survey_id, name, description, order_index, color, icon)
SELECT
  id as survey_id,
  'Introduction' as name,
  'Getting to know you better' as description,
  1 as order_index,
  '#10B981' as color,
  'user-circle' as icon
FROM custom_surveys
WHERE status = 'published'
LIMIT 1
ON CONFLICT (survey_id, name) DO NOTHING;

-- Add comments for documentation
COMMENT ON TABLE survey_categories IS 'Organizes survey questions into logical groups/categories';
COMMENT ON COLUMN survey_categories.name IS 'Display name for the category (e.g., "Introduction", "Demographics")';
COMMENT ON COLUMN survey_categories.description IS 'Optional description explaining the category purpose';
COMMENT ON COLUMN survey_categories.order_index IS 'Determines the order categories appear in the survey';
COMMENT ON COLUMN survey_categories.color IS 'Hex color code for UI styling';
COMMENT ON COLUMN survey_categories.icon IS 'Lucide icon name for visual representation';

COMMENT ON COLUMN survey_questions.category_id IS 'Optional category assignment for organizing questions';
COMMENT ON COLUMN survey_questions.ai_assistance_enabled IS 'Whether AI should provide assistance for this question';
COMMENT ON COLUMN survey_questions.ai_assistance_config IS 'JSON configuration for AI assistance behavior';
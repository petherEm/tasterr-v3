import { createAdminSupabaseClient } from "@/lib/supabase-admin";
import { createAuthenticatedSupabaseClient } from "@/lib/supabase-client-auth";
import type { SurveyCategory, CategorizedQuestions, SurveyQuestion } from "@/lib/types";

// Admin service for comprehensive category management
export class CategoryAdminService {
  private supabase = createAdminSupabaseClient();

  async createCategory(category: Omit<SurveyCategory, 'id' | 'created_at'>): Promise<{ success: boolean; data?: SurveyCategory; error?: string }> {
    try {
      const { data, error } = await this.supabase
        .from('survey_categories')
        .insert(category)
        .select()
        .single();

      if (error) {
        console.error('Error creating category:', error);
        return { success: false, error: error.message };
      }

      return { success: true, data };
    } catch (error) {
      console.error('Error creating category:', error);
      return { success: false, error: 'Failed to create category' };
    }
  }

  async updateCategory(id: string, updates: Partial<SurveyCategory>): Promise<{ success: boolean; data?: SurveyCategory; error?: string }> {
    try {
      const { data, error } = await this.supabase
        .from('survey_categories')
        .update(updates)
        .eq('id', id)
        .select()
        .single();

      if (error) {
        console.error('Error updating category:', error);
        return { success: false, error: error.message };
      }

      return { success: true, data };
    } catch (error) {
      console.error('Error updating category:', error);
      return { success: false, error: 'Failed to update category' };
    }
  }

  async deleteCategory(id: string): Promise<{ success: boolean; error?: string }> {
    try {
      // First, unassign all questions from this category
      await this.supabase
        .from('survey_questions')
        .update({ category_id: null })
        .eq('category_id', id);

      // Then delete the category
      const { error } = await this.supabase
        .from('survey_categories')
        .delete()
        .eq('id', id);

      if (error) {
        console.error('Error deleting category:', error);
        return { success: false, error: error.message };
      }

      return { success: true };
    } catch (error) {
      console.error('Error deleting category:', error);
      return { success: false, error: 'Failed to delete category' };
    }
  }

  async getCategoriesBySurvey(surveyId: string): Promise<{ success: boolean; data?: SurveyCategory[]; error?: string }> {
    try {
      const { data, error } = await this.supabase
        .from('survey_categories')
        .select('*')
        .eq('survey_id', surveyId)
        .order('order_index');

      if (error) {
        console.error('Error fetching categories:', error);
        return { success: false, error: error.message };
      }

      return { success: true, data: data || [] };
    } catch (error) {
      console.error('Error fetching categories:', error);
      return { success: false, error: 'Failed to fetch categories' };
    }
  }

  async reorderCategories(surveyId: string, categoryOrders: { id: string; order_index: number }[]): Promise<{ success: boolean; error?: string }> {
    try {
      // Use a transaction to update all category orders atomically
      const updates = categoryOrders.map(({ id, order_index }) =>
        this.supabase
          .from('survey_categories')
          .update({ order_index })
          .eq('id', id)
          .eq('survey_id', surveyId)
      );

      const results = await Promise.all(updates);

      // Check if any updates failed
      const hasError = results.some(result => result.error);
      if (hasError) {
        console.error('Error reordering categories:', results.find(r => r.error)?.error);
        return { success: false, error: 'Failed to reorder categories' };
      }

      return { success: true };
    } catch (error) {
      console.error('Error reordering categories:', error);
      return { success: false, error: 'Failed to reorder categories' };
    }
  }

  async getCategorizedQuestions(surveyId: string): Promise<{ success: boolean; data?: CategorizedQuestions; error?: string }> {
    try {
      // Get categories and questions in parallel
      const [categoriesResult, questionsResult] = await Promise.all([
        this.getCategoriesBySurvey(surveyId),
        this.supabase
          .from('survey_questions')
          .select('*')
          .eq('survey_id', surveyId)
          .order('order_index')
      ]);

      if (!categoriesResult.success || questionsResult.error) {
        return {
          success: false,
          error: categoriesResult.error || questionsResult.error?.message
        };
      }

      const categories = categoriesResult.data || [];
      const questions = questionsResult.data || [];

      // Group questions by category
      const categorizedQuestions: CategorizedQuestions = {};

      categories.forEach(category => {
        categorizedQuestions[category.id!] = {
          category,
          questions: questions.filter(q => q.category_id === category.id)
        };
      });

      // Add uncategorized questions if any exist
      const uncategorizedQuestions = questions.filter(q => !q.category_id);
      if (uncategorizedQuestions.length > 0) {
        categorizedQuestions['uncategorized'] = {
          category: {
            id: 'uncategorized',
            survey_id: surveyId,
            name: 'Uncategorized',
            description: 'Questions not assigned to a category',
            order_index: 999,
            color: '#6B7280',
            icon: 'help-circle'
          },
          questions: uncategorizedQuestions
        };
      }

      return { success: true, data: categorizedQuestions };
    } catch (error) {
      console.error('Error fetching categorized questions:', error);
      return { success: false, error: 'Failed to fetch categorized questions' };
    }
  }

  async assignQuestionToCategory(questionId: string, categoryId: string | null): Promise<{ success: boolean; error?: string }> {
    try {
      const { error } = await this.supabase
        .from('survey_questions')
        .update({ category_id: categoryId })
        .eq('id', questionId);

      if (error) {
        console.error('Error assigning question to category:', error);
        return { success: false, error: error.message };
      }

      return { success: true };
    } catch (error) {
      console.error('Error assigning question to category:', error);
      return { success: false, error: 'Failed to assign question to category' };
    }
  }

  async moveQuestionsBetweenCategories(
    questionIds: string[],
    fromCategoryId: string | null,
    toCategoryId: string | null
  ): Promise<{ success: boolean; error?: string }> {
    try {
      const { error } = await this.supabase
        .from('survey_questions')
        .update({ category_id: toCategoryId })
        .in('id', questionIds)
        .eq('category_id', fromCategoryId);

      if (error) {
        console.error('Error moving questions between categories:', error);
        return { success: false, error: error.message };
      }

      return { success: true };
    } catch (error) {
      console.error('Error moving questions between categories:', error);
      return { success: false, error: 'Failed to move questions between categories' };
    }
  }
}

// Client service for authenticated users (read-only operations)
export class CategoryClientService {
  private supabasePromise: Promise<any>;

  constructor(getToken: () => Promise<string | null>) {
    this.supabasePromise = createAuthenticatedSupabaseClient(getToken);
  }

  async getCategoriesBySurvey(surveyId: string): Promise<{ success: boolean; data?: SurveyCategory[]; error?: string }> {
    try {
      const supabase = await this.supabasePromise;
      const { data, error } = await supabase
        .from('survey_categories')
        .select('*')
        .eq('survey_id', surveyId)
        .order('order_index');

      if (error) {
        console.error('Error fetching categories:', error);
        return { success: false, error: error.message };
      }

      return { success: true, data: data || [] };
    } catch (error) {
      console.error('Error fetching categories:', error);
      return { success: false, error: 'Failed to fetch categories' };
    }
  }

  async getCategorizedQuestions(surveyId: string): Promise<{ success: boolean; data?: CategorizedQuestions; error?: string }> {
    try {
      const supabase = await this.supabasePromise;

      // Get categories and questions in parallel
      const [categoriesResult, questionsResult] = await Promise.all([
        this.getCategoriesBySurvey(surveyId),
        supabase
          .from('survey_questions')
          .select('*')
          .eq('survey_id', surveyId)
          .order('order_index')
      ]);

      if (!categoriesResult.success || questionsResult.error) {
        return {
          success: false,
          error: categoriesResult.error || questionsResult.error?.message
        };
      }

      const categories = categoriesResult.data || [];
      const questions = questionsResult.data || [];

      // Group questions by category
      const categorizedQuestions: CategorizedQuestions = {};

      categories.forEach(category => {
        categorizedQuestions[category.id!] = {
          category,
          questions: questions.filter(q => q.category_id === category.id)
        };
      });

      return { success: true, data: categorizedQuestions };
    } catch (error) {
      console.error('Error fetching categorized questions:', error);
      return { success: false, error: 'Failed to fetch categorized questions' };
    }
  }
}

// Utility functions for category operations
export const categoryUtils = {
  // Generate a random hex color for new categories
  generateRandomColor(): string {
    const colors = [
      '#3B82F6', // Blue
      '#10B981', // Emerald
      '#F59E0B', // Amber
      '#EF4444', // Red
      '#8B5CF6', // Violet
      '#06B6D4', // Cyan
      '#84CC16', // Lime
      '#F97316', // Orange
      '#EC4899', // Pink
      '#6366F1', // Indigo
    ];
    return colors[Math.floor(Math.random() * colors.length)];
  },

  // Get appropriate icon based on category name
  suggestIcon(categoryName: string): string {
    const name = categoryName.toLowerCase();

    if (name.includes('intro') || name.includes('welcome')) return 'user-circle';
    if (name.includes('demo') || name.includes('personal')) return 'users';
    if (name.includes('market') || name.includes('business')) return 'trending-up';
    if (name.includes('product') || name.includes('item')) return 'package';
    if (name.includes('feedback') || name.includes('opinion')) return 'message-circle';
    if (name.includes('contact') || name.includes('info')) return 'phone';
    if (name.includes('preference') || name.includes('choice')) return 'heart';
    if (name.includes('experience') || name.includes('usage')) return 'star';
    if (name.includes('final') || name.includes('conclusion')) return 'check-circle';

    return 'folder'; // Default icon
  },

  // Validate category data
  validateCategory(category: Partial<SurveyCategory>): { isValid: boolean; errors: string[] } {
    const errors: string[] = [];

    if (!category.name?.trim()) {
      errors.push('Category name is required');
    }

    if (category.name && category.name.length > 100) {
      errors.push('Category name must be 100 characters or less');
    }

    if (category.color && !/^#[0-9A-Fa-f]{6}$/.test(category.color)) {
      errors.push('Color must be a valid hex color (e.g., #3B82F6)');
    }

    if (category.order_index && category.order_index < 1) {
      errors.push('Order index must be positive');
    }

    return {
      isValid: errors.length === 0,
      errors
    };
  },

  // Sort categories by order_index
  sortCategories(categories: SurveyCategory[]): SurveyCategory[] {
    return [...categories].sort((a, b) => a.order_index - b.order_index);
  },

  // Get next available order index
  getNextOrderIndex(categories: SurveyCategory[]): number {
    if (categories.length === 0) return 1;
    const maxOrder = Math.max(...categories.map(c => c.order_index));
    return maxOrder + 1;
  }
};

// Export default admin service instance
export const categoryService = new CategoryAdminService();
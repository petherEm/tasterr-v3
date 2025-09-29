"use server";

import { auth } from "@clerk/nextjs/server";
import { revalidatePath } from "next/cache";
import { categoryService, categoryUtils } from "@/lib/category-service";
import type { SurveyCategory } from "@/lib/types";

// Create a new category
export async function createCategory(
  surveyId: string,
  categoryData: {
    name: string;
    description?: string;
    color?: string;
    icon?: string;
  }
) {
  try {
    const { userId } = await auth();
    if (!userId) {
      return { success: false, error: "Unauthorized" };
    }

    // Validate category data
    const validation = categoryUtils.validateCategory(categoryData);
    if (!validation.isValid) {
      return { success: false, error: validation.errors.join(", ") };
    }

    // Get existing categories to determine order
    const existingResult = await categoryService.getCategoriesBySurvey(surveyId);
    const orderIndex = existingResult.success
      ? categoryUtils.getNextOrderIndex(existingResult.data || [])
      : 1;

    // Set defaults
    const category: Omit<SurveyCategory, 'id' | 'created_at'> = {
      survey_id: surveyId,
      name: categoryData.name.trim(),
      description: categoryData.description?.trim(),
      order_index: orderIndex,
      color: categoryData.color || categoryUtils.generateRandomColor(),
      icon: categoryData.icon || categoryUtils.suggestIcon(categoryData.name)
    };

    const result = await categoryService.createCategory(category);

    if (result.success) {
      revalidatePath(`/admin/surveys/${surveyId}`);
      revalidatePath("/admin/surveys");
    }

    return result;
  } catch (error) {
    console.error("Error creating category:", error);
    return { success: false, error: "Failed to create category" };
  }
}

// Update an existing category
export async function updateCategory(
  categoryId: string,
  updates: Partial<SurveyCategory>
) {
  try {
    const { userId } = await auth();
    if (!userId) {
      return { success: false, error: "Unauthorized" };
    }

    // Validate updates
    const validation = categoryUtils.validateCategory(updates);
    if (!validation.isValid) {
      return { success: false, error: validation.errors.join(", ") };
    }

    const result = await categoryService.updateCategory(categoryId, updates);

    if (result.success && result.data) {
      revalidatePath(`/admin/surveys/${result.data.survey_id}`);
      revalidatePath("/admin/surveys");
    }

    return result;
  } catch (error) {
    console.error("Error updating category:", error);
    return { success: false, error: "Failed to update category" };
  }
}

// Delete a category (questions will be moved to uncategorized)
export async function deleteCategory(categoryId: string, surveyId: string) {
  try {
    const { userId } = await auth();
    if (!userId) {
      return { success: false, error: "Unauthorized" };
    }

    const result = await categoryService.deleteCategory(categoryId);

    if (result.success) {
      revalidatePath(`/admin/surveys/${surveyId}`);
      revalidatePath("/admin/surveys");
    }

    return result;
  } catch (error) {
    console.error("Error deleting category:", error);
    return { success: false, error: "Failed to delete category" };
  }
}

// Reorder categories
export async function reorderCategories(
  surveyId: string,
  categoryOrders: { id: string; order_index: number }[]
) {
  try {
    const { userId } = await auth();
    if (!userId) {
      return { success: false, error: "Unauthorized" };
    }

    const result = await categoryService.reorderCategories(surveyId, categoryOrders);

    if (result.success) {
      revalidatePath(`/admin/surveys/${surveyId}`);
    }

    return result;
  } catch (error) {
    console.error("Error reordering categories:", error);
    return { success: false, error: "Failed to reorder categories" };
  }
}

// Assign a question to a category
export async function assignQuestionToCategory(
  questionId: string,
  categoryId: string | null,
  surveyId: string
) {
  try {
    const { userId } = await auth();
    if (!userId) {
      return { success: false, error: "Unauthorized" };
    }

    const result = await categoryService.assignQuestionToCategory(questionId, categoryId);

    if (result.success) {
      revalidatePath(`/admin/surveys/${surveyId}`);
    }

    return result;
  } catch (error) {
    console.error("Error assigning question to category:", error);
    return { success: false, error: "Failed to assign question to category" };
  }
}

// Move multiple questions between categories
export async function moveQuestionsBetweenCategories(
  questionIds: string[],
  fromCategoryId: string | null,
  toCategoryId: string | null,
  surveyId: string
) {
  try {
    const { userId } = await auth();
    if (!userId) {
      return { success: false, error: "Unauthorized" };
    }

    const result = await categoryService.moveQuestionsBetweenCategories(
      questionIds,
      fromCategoryId,
      toCategoryId
    );

    if (result.success) {
      revalidatePath(`/admin/surveys/${surveyId}`);
    }

    return result;
  } catch (error) {
    console.error("Error moving questions between categories:", error);
    return { success: false, error: "Failed to move questions between categories" };
  }
}

// Get categories for a survey (used in client components)
export async function getCategoriesBySurvey(surveyId: string) {
  try {
    const { userId } = await auth();
    if (!userId) {
      return { success: false, error: "Unauthorized" };
    }

    return await categoryService.getCategoriesBySurvey(surveyId);
  } catch (error) {
    console.error("Error fetching categories:", error);
    return { success: false, error: "Failed to fetch categories" };
  }
}

// Get categorized questions for a survey
export async function getCategorizedQuestions(surveyId: string) {
  try {
    const { userId } = await auth();
    if (!userId) {
      return { success: false, error: "Unauthorized" };
    }

    return await categoryService.getCategorizedQuestions(surveyId);
  } catch (error) {
    console.error("Error fetching categorized questions:", error);
    return { success: false, error: "Failed to fetch categorized questions" };
  }
}

// Create default categories for a new survey
export async function createDefaultCategories(surveyId: string) {
  try {
    const { userId } = await auth();
    if (!userId) {
      return { success: false, error: "Unauthorized" };
    }

    const defaultCategories = [
      {
        name: "Introduction",
        description: "Getting to know you better",
        color: "#10B981", // Emerald
        icon: "user-circle"
      },
      {
        name: "Demographics",
        description: "Basic background information",
        color: "#3B82F6", // Blue
        icon: "users"
      },
      {
        name: "Main Questions",
        description: "Core survey questions",
        color: "#8B5CF6", // Violet
        icon: "help-circle"
      }
    ];

    const results = await Promise.all(
      defaultCategories.map((category, index) =>
        categoryService.createCategory({
          survey_id: surveyId,
          ...category,
          order_index: index + 1
        })
      )
    );

    const success = results.every(result => result.success);

    if (success) {
      revalidatePath(`/admin/surveys/${surveyId}`);
    }

    return {
      success,
      data: results.filter(r => r.success).map(r => r.data),
      error: success ? undefined : "Some default categories failed to create"
    };
  } catch (error) {
    console.error("Error creating default categories:", error);
    return { success: false, error: "Failed to create default categories" };
  }
}

// Suggest category based on question content
export async function suggestCategoryForQuestion(
  questionText: string,
  existingCategories: SurveyCategory[]
): Promise<{ suggestion: string | null; confidence: number }> {
  try {
    const text = questionText.toLowerCase();

    // Simple keyword-based suggestions
    const suggestions = [
      { keywords: ['name', 'age', 'gender', 'location', 'occupation'], category: 'Demographics', confidence: 0.8 },
      { keywords: ['welcome', 'introduction', 'start', 'begin'], category: 'Introduction', confidence: 0.9 },
      { keywords: ['experience', 'opinion', 'think', 'feel', 'rate'], category: 'Experience', confidence: 0.7 },
      { keywords: ['product', 'service', 'brand', 'company'], category: 'Product Feedback', confidence: 0.8 },
      { keywords: ['frequency', 'often', 'how much', 'usage'], category: 'Usage Patterns', confidence: 0.7 },
      { keywords: ['contact', 'email', 'phone', 'address'], category: 'Contact Information', confidence: 0.9 },
      { keywords: ['final', 'last', 'additional', 'comments'], category: 'Final Thoughts', confidence: 0.8 }
    ];

    for (const suggestion of suggestions) {
      const matchCount = suggestion.keywords.filter(keyword => text.includes(keyword)).length;
      if (matchCount > 0) {
        // Check if category already exists
        const existingCategory = existingCategories.find(cat =>
          cat.name.toLowerCase().includes(suggestion.category.toLowerCase())
        );

        if (existingCategory) {
          return { suggestion: existingCategory.id!, confidence: suggestion.confidence };
        } else {
          return { suggestion: suggestion.category, confidence: suggestion.confidence * 0.7 };
        }
      }
    }

    return { suggestion: null, confidence: 0 };
  } catch (error) {
    console.error("Error suggesting category:", error);
    return { suggestion: null, confidence: 0 };
  }
}
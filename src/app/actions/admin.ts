"use server"

import { auth, clerkClient } from "@clerk/nextjs/server"
import { createSupabaseAdminClient } from "@/lib/supabase-admin"
import { UserSurvey, SurveyQuestion, SurveyCategory, CustomSurveyWithCategories, AIAssistanceConfig } from "@/lib/types"
import { redirect } from "next/navigation"

// Check if user has admin role
export async function checkAdminAccess() {
  const { userId } = await auth()
  
  if (!userId) {
    redirect("/sign-in")
  }
  
  try {
    const client = await clerkClient()
    const user = await client.users.getUser(userId)
    
    // Check if user has admin role (you can configure this in Clerk dashboard)
    const isAdmin = user.publicMetadata?.role === 'admin' || 
                   user.privateMetadata?.role === 'admin'
    
    if (!isAdmin) {
      throw new Error("Unauthorized: Admin access required")
    }
    
    return { userId, isAdmin: true }
  } catch (error) {
    console.error("Admin access check failed:", error)
    redirect("/")
  }
}

// Get all surveys with user information
export async function getAllSurveys(page: number = 1, limit: number = 20) {
  await checkAdminAccess()

  try {
    const supabase = createSupabaseAdminClient()

    // Get user surveys with pagination
    const { data: userSurveys, error: userSurveyError, count } = await supabase
      .from('user_surveys')
      .select('*', { count: 'exact' })
      .order('created_at', { ascending: false })
      .range((page - 1) * limit, page * limit - 1)

    if (userSurveyError) {
      throw userSurveyError
    }

    return {
      success: true,
      data: userSurveys,
      pagination: {
        page,
        limit,
        total: count || 0,
        totalPages: Math.ceil((count || 0) / limit)
      }
    }
  } catch (error) {
    console.error("Failed to fetch surveys:", error)
    return {
      success: false,
      error: error instanceof Error ? error.message : "Failed to fetch surveys"
    }
  }
}

// Get survey statistics
export async function getSurveyStats() {
  await checkAdminAccess()

  try {
    const supabase = createSupabaseAdminClient()

    // Get total user surveys
    const { count: totalUserSurveys } = await supabase
      .from('user_surveys')
      .select('*', { count: 'exact', head: true })

    // Get total custom surveys
    const { count: totalCustomSurveys } = await supabase
      .from('custom_surveys')
      .select('*', { count: 'exact', head: true })

    // Get total custom survey responses
    const { count: customSurveyResponses } = await supabase
      .from('survey_responses')
      .select('*', { count: 'exact', head: true })

    // Get recent surveys (last 7 days)
    const sevenDaysAgo = new Date()
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7)

    const { count: recentSurveys } = await supabase
      .from('user_surveys')
      .select('*', { count: 'exact', head: true })
      .gte('created_at', sevenDaysAgo.toISOString())

    return {
      success: true,
      data: {
        totalUserSurveys: totalUserSurveys || 0,
        totalCustomSurveys: totalCustomSurveys || 0,
        customSurveyResponses: customSurveyResponses || 0,
        recentSurveys: recentSurveys || 0
      }
    }
  } catch (error) {
    console.error("Failed to fetch survey stats:", error)
    return {
      success: false,
      error: error instanceof Error ? error.message : "Failed to fetch stats"
    }
  }
}

// Get detailed survey information for a specific user
export async function getUserSurveyDetails(userId: string) {
  await checkAdminAccess()

  try {
    const supabase = createSupabaseAdminClient()

    // Get user survey
    const { data: userSurvey, error: userError } = await supabase
      .from('user_surveys')
      .select('*')
      .eq('user_id', userId)
      .single()

    if (userError && userError.code !== 'PGRST116') {
      throw userError
    }

    // Get user info from Clerk
    let userInfo = null
    try {
      const client = await clerkClient()
      const user = await client.users.getUser(userId)
      userInfo = {
        email: user.emailAddresses[0]?.emailAddress,
        firstName: user.firstName,
        lastName: user.lastName,
        createdAt: user.createdAt
      }
    } catch (clerkError) {
      console.error("Failed to fetch user info from Clerk:", clerkError)
    }

    return {
      success: true,
      data: {
        userSurvey,
        userInfo
      }
    }
  } catch (error) {
    console.error("Failed to fetch user survey details:", error)
    return {
      success: false,
      error: error instanceof Error ? error.message : "Failed to fetch user details"
    }
  }
}

// ====== CUSTOM SURVEYS MANAGEMENT ======

// Get all custom surveys
export async function getCustomSurveys() {
  await checkAdminAccess()
  
  try {
    const supabase = createSupabaseAdminClient()
    
    const { data: surveys, error } = await supabase
      .from('custom_surveys')
      .select(`
        *,
        questions:survey_questions(*),
        categories:survey_categories(*)
      `)
      .order('created_at', { ascending: false })
    
    if (error) throw error
    
    // Get response counts for each survey
    const surveysWithCounts = await Promise.all(
      (surveys || []).map(async (survey: any) => {
        const { count } = await supabase
          .from('survey_responses')
          .select('*', { count: 'exact', head: true })
          .eq('survey_id', survey.id)
        
        return {
          ...survey,
          response_count: count || 0
        }
      })
    )
    
    return {
      success: true,
      data: surveysWithCounts
    }
  } catch (error) {
    console.error("Failed to fetch custom surveys:", error)
    return {
      success: false,
      error: error instanceof Error ? error.message : "Failed to fetch surveys"
    }
  }
}

// Create a new custom survey
export async function createCustomSurvey(surveyData: {
  title: string
  description?: string
  introduction: string
  intro_image_url?: string
  target_audience: 'all' | 'new_users' | 'existing_users'
  questions: Omit<SurveyQuestion, 'id' | 'survey_id' | 'created_at'>[]
  categories?: Omit<SurveyCategory, 'id' | 'survey_id' | 'created_at'>[]
}) {
  const { userId } = await checkAdminAccess()

  try {
    const supabase = createSupabaseAdminClient()

    // Start transaction by creating survey first
    const { data: survey, error: surveyError } = await supabase
      .from('custom_surveys')
      .insert({
        title: surveyData.title,
        description: surveyData.description,
        introduction: surveyData.introduction,
        intro_image_url: surveyData.intro_image_url,
        created_by: userId,
        target_audience: surveyData.target_audience,
        status: 'draft'
      })
      .select()
      .single()

    if (surveyError) throw surveyError

    // Insert categories if provided
    const categoriesMap = new Map<string, string>() // Map category name to category UUID
    if (surveyData.categories && surveyData.categories.length > 0) {
      const categoriesToInsert = surveyData.categories.map((c, index) => ({
        survey_id: survey.id,
        name: c.name,
        description: c.description,
        order_index: c.order_index || index + 1,
        color: c.color || '#3B82F6',
        icon: c.icon || 'folder'
      }))

      const { data: insertedCategories, error: categoriesError } = await supabase
        .from('survey_categories')
        .insert(categoriesToInsert)
        .select()

      if (categoriesError) throw categoriesError

      // Create mapping from category name to new category UUID
      insertedCategories?.forEach((cat) => {
        categoriesMap.set(cat.name, cat.id)
      })
    }

    // Insert questions
    if (surveyData.questions.length > 0) {
      const questionsToInsert = surveyData.questions.map((q, index) => ({
        survey_id: survey.id,
        category_id: q.category_id ? categoriesMap.get(q.category_id) || null : null,
        question_text: q.question_text,
        question_subtitle: q.question_subtitle,
        question_type: q.question_type,
        options: q.options ? JSON.stringify(q.options) : null,
        is_required: q.is_required,
        order_index: q.order_index || index + 1,
        ai_assistance_enabled: q.ai_assistance_enabled !== false,
        ai_assistance_config: q.ai_assistance_config ? JSON.stringify(q.ai_assistance_config) : JSON.stringify({
          enabled: true,
          assistance_type: 'all',
          maxRetries: 2,
          confidence_threshold: 0.7,
          triggers: {
            short_answers: true,
            incomplete_data: true,
            inconsistent_data: false
          }
        })
      }))

      const { error: questionsError } = await supabase
        .from('survey_questions')
        .insert(questionsToInsert)

      if (questionsError) throw questionsError
    }

    return {
      success: true,
      data: survey
    }
  } catch (error) {
    console.error("Failed to create survey - Full error:", error)

    // Enhanced error reporting for debugging
    let errorMessage = "Failed to create survey"
    if (error instanceof Error) {
      errorMessage = error.message
    } else if (typeof error === 'object' && error !== null) {
      // Handle Supabase error objects
      const dbError = error as any
      if (dbError.code || dbError.details || dbError.hint) {
        errorMessage = `Database Error: ${dbError.message || 'Unknown'}`
        if (dbError.details) errorMessage += ` Details: ${dbError.details}`
        if (dbError.hint) errorMessage += ` Hint: ${dbError.hint}`
        if (dbError.code) errorMessage += ` Code: ${dbError.code}`
      }
    }

    return {
      success: false,
      error: errorMessage
    }
  }
}

// Update survey status (publish, archive, etc.)
export async function updateSurveyStatus(surveyId: string, status: 'draft' | 'published' | 'archived') {
  await checkAdminAccess()
  
  try {
    const supabase = createSupabaseAdminClient()
    
    const updateData: any = { status }
    if (status === 'published') {
      updateData.published_at = new Date().toISOString()
    }
    
    const { data, error } = await supabase
      .from('custom_surveys')
      .update(updateData)
      .eq('id', surveyId)
      .select()
      .single()
    
    if (error) throw error
    
    return {
      success: true,
      data
    }
  } catch (error) {
    console.error("Failed to update survey status:", error)
    return {
      success: false,
      error: error instanceof Error ? error.message : "Failed to update survey"
    }
  }
}

// Get survey with categories and questions for editing
export async function getSurveyWithCategories(surveyId: string): Promise<{ success: boolean; data?: CustomSurveyWithCategories; error?: string }> {
  await checkAdminAccess()

  try {
    const supabase = createSupabaseAdminClient()

    // Get survey with categories and questions
    const { data: survey, error: surveyError } = await supabase
      .from('custom_surveys')
      .select(`
        *,
        categories:survey_categories(*),
        questions:survey_questions(*)
      `)
      .eq('id', surveyId)
      .single()

    if (surveyError) throw surveyError
    if (!survey) throw new Error('Survey not found')

    // Transform the data to match our types
    const result: CustomSurveyWithCategories = {
      ...survey,
      categories: (survey.categories || []).sort((a: any, b: any) => a.order_index - b.order_index),
      questions: (survey.questions || []).map((q: any) => ({
        ...q,
        options: q.options ? JSON.parse(q.options) : null,
        ai_assistance_config: q.ai_assistance_config ? JSON.parse(q.ai_assistance_config) : undefined,
        category: survey.categories?.find((c: any) => c.id === q.category_id)
      })).sort((a: any, b: any) => a.order_index - b.order_index)
    }

    return {
      success: true,
      data: result
    }
  } catch (error) {
    console.error("Failed to fetch survey with categories:", error)
    return {
      success: false,
      error: error instanceof Error ? error.message : "Failed to fetch survey"
    }
  }
}

// Get survey with responses for admin viewing
export async function getSurveyWithResponses(surveyId: string) {
  await checkAdminAccess()

  try {
    const supabase = createSupabaseAdminClient()

    // Get survey with questions
    const { data: survey, error: surveyError } = await supabase
      .from('custom_surveys')
      .select(`
        *,
        questions:survey_questions(*)
      `)
      .eq('id', surveyId)
      .single()

    if (surveyError) throw surveyError

    // Get responses
    const { data: responses, error: responsesError } = await supabase
      .from('survey_responses')
      .select('*')
      .eq('survey_id', surveyId)
      .order('completed_at', { ascending: false })

    if (responsesError) throw responsesError

    return {
      success: true,
      data: {
        ...survey,
        responses: responses || [],
        response_count: responses?.length || 0
      }
    }
  } catch (error) {
    console.error("Failed to fetch survey with responses:", error)
    return {
      success: false,
      error: error instanceof Error ? error.message : "Failed to fetch survey data"
    }
  }
}

// Get survey with responses and user profiles for enhanced admin viewing
export async function getSurveyWithResponsesAndProfiles(surveyId: string) {
  await checkAdminAccess()

  try {
    const supabase = createSupabaseAdminClient()

    // Get survey with questions
    const { data: survey, error: surveyError } = await supabase
      .from('custom_surveys')
      .select(`
        *,
        questions:survey_questions(*)
      `)
      .eq('id', surveyId)
      .single()

    if (surveyError) throw surveyError

    // Get responses
    const { data: responses, error: responsesError } = await supabase
      .from('survey_responses')
      .select('*')
      .eq('survey_id', surveyId)
      .order('completed_at', { ascending: false })

    if (responsesError) throw responsesError

    // Get user profiles for these responses
    let responsesWithProfiles = responses || []
    if (responses && responses.length > 0) {
      const userIds = responses.map(r => r.user_id)
      const { data: userProfiles, error: profilesError } = await supabase
        .from('user_surveys')
        .select('*')
        .in('user_id', userIds)

      if (profilesError) {
        console.warn("Failed to fetch user profiles:", profilesError)
      } else {
        // Merge profiles with responses
        responsesWithProfiles = responses.map(response => {
          const userProfile = userProfiles?.find(p => p.user_id === response.user_id)
          return {
            ...response,
            user_profile: userProfile || null
          }
        })
      }
    }

    return {
      success: true,
      data: {
        ...survey,
        responses: responsesWithProfiles,
        response_count: responses?.length || 0
      }
    }
  } catch (error) {
    console.error("Failed to fetch survey with responses and profiles:", error)
    return {
      success: false,
      error: error instanceof Error ? error.message : "Failed to fetch survey data"
    }
  }
}

// Get demographic analytics for a survey
export async function getSurveyAnalytics(surveyId: string) {
  await checkAdminAccess()

  try {
    const supabase = createSupabaseAdminClient()

    // Get all survey responses first
    const { data: allResponses, error: responsesError } = await supabase
      .from('survey_responses')
      .select('*')
      .eq('survey_id', surveyId)

    if (responsesError) throw responsesError

    // Get user profiles for all users who responded
    const userIds = allResponses?.map(r => r.user_id) || []
    const { data: userProfiles, error: profilesError } = await supabase
      .from('user_surveys')
      .select('*')
      .in('user_id', userIds)

    if (profilesError) throw profilesError

    // Combine responses with user profiles
    const responses = allResponses?.map(response => ({
      ...response,
      user_profile: userProfiles?.find(profile => profile.user_id === response.user_id) || null
    })) || []

    // Calculate demographic breakdowns
    const analytics = {
      total_responses: responses?.length || 0,
      demographics: {
        age_groups: {} as Record<string, number>,
        gender: {} as Record<string, number>,
        city_size: {} as Record<string, number>,
        shopping_frequency: {} as Record<string, number>,
        profession: {} as Record<string, number>
      },
      response_quality: {
        avg_completion_time: 0, // Calculate if you have timing data
        completion_rate: 100 // Assuming completed responses only
      }
    }

    if (responses && responses.length > 0) {
      responses.forEach((response: { user_profile: UserSurvey }) => {
        const profile = response.user_profile
        if (profile) {
          // Count demographics
          if (profile.age) {
            analytics.demographics.age_groups[profile.age] =
              (analytics.demographics.age_groups[profile.age] || 0) + 1
          }
          if (profile.gender) {
            analytics.demographics.gender[profile.gender] =
              (analytics.demographics.gender[profile.gender] || 0) + 1
          }
          if (profile.city_size) {
            analytics.demographics.city_size[profile.city_size] =
              (analytics.demographics.city_size[profile.city_size] || 0) + 1
          }
          if (profile.shopping_frequency) {
            analytics.demographics.shopping_frequency[profile.shopping_frequency] =
              (analytics.demographics.shopping_frequency[profile.shopping_frequency] || 0) + 1
          }
          if (profile.profession) {
            analytics.demographics.profession[profile.profession] =
              (analytics.demographics.profession[profile.profession] || 0) + 1
          }
        }
      })
    }

    return {
      success: true,
      data: analytics
    }
  } catch (error) {
    console.error("Failed to fetch survey analytics:", error)
    return {
      success: false,
      error: error instanceof Error ? error.message : "Failed to fetch analytics"
    }
  }
}

// Delete a custom survey
export async function deleteCustomSurvey(surveyId: string) {
  await checkAdminAccess()
  
  try {
    const supabase = createSupabaseAdminClient()
    
    // Delete survey (CASCADE will handle questions and responses)
    const { error } = await supabase
      .from('custom_surveys')
      .delete()
      .eq('id', surveyId)
    
    if (error) throw error
    
    return {
      success: true
    }
  } catch (error) {
    console.error("Failed to delete survey:", error)
    return {
      success: false,
      error: error instanceof Error ? error.message : "Failed to delete survey"
    }
  }
}
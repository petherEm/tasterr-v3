import { NextRequest, NextResponse } from 'next/server'
import { checkAdminAccess } from '@/app/actions/admin'
import { createSupabaseAdminClient } from '@/lib/supabase-admin'

export async function GET(request: NextRequest) {
  try {
    // Check admin access
    await checkAdminAccess()

    const { searchParams } = new URL(request.url)
    const surveyId = searchParams.get('surveyId')
    const includeProfiles = searchParams.get('includeProfiles') === 'true'
    const includeMetadata = searchParams.get('includeMetadata') === 'true'

    if (!surveyId) {
      return NextResponse.json(
        { error: 'Survey ID is required' },
        { status: 400 }
      )
    }

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

    // Get user profiles if requested
    let userProfiles: Array<{ user_id: string; age?: string; gender?: string; city_size: string; shopping_frequency: string; preferred_brand?: string; profession: string; created_at: string; updated_at: string }> = []
    if (includeProfiles && responses && responses.length > 0) {
      const userIds = responses.map(r => r.user_id)
      const { data: profiles, error: profilesError } = await supabase
        .from('user_surveys')
        .select('*')
        .in('user_id', userIds)

      if (profilesError) throw profilesError
      userProfiles = profiles || []
    }

    // Structure the export data
    const exportData = {
      survey: {
        id: survey.id,
        title: survey.title,
        description: survey.description,
        introduction: survey.introduction,
        status: survey.status,
        target_audience: survey.target_audience,
        created_at: survey.created_at,
        published_at: survey.published_at,
        expires_at: survey.expires_at,
        questions: survey.questions?.map((q: { id: string; question_text: string; question_subtitle?: string; question_type: string; options?: string; required: boolean; order_index: number }) => ({
          id: q.id,
          question_text: q.question_text,
          question_subtitle: q.question_subtitle,
          question_type: q.question_type,
          options: q.options,
          required: q.required,
          order_index: q.order_index
        }))
      },
      responses: responses?.map((response: { id: string; user_id: string; response_data: Record<string, unknown>; completed_at: string; created_at: string }) => {
        const userProfile = includeProfiles
          ? userProfiles.find(p => p.user_id === response.user_id)
          : null

        const responseData: Record<string, unknown> = {
          id: response.id,
          user_id: response.user_id,
          response_data: response.response_data,
          completed_at: response.completed_at,
          created_at: response.created_at
        }

        if (includeProfiles && userProfile) {
          responseData.user_profile = {
            age: userProfile.age,
            gender: userProfile.gender,
            city_size: userProfile.city_size,
            shopping_frequency: userProfile.shopping_frequency,
            preferred_brand: userProfile.preferred_brand,
            profession: userProfile.profession,
            profile_created_at: userProfile.created_at,
            profile_updated_at: userProfile.updated_at
          }
        }

        if (includeMetadata) {
          responseData.metadata = {
            response_count: responses.length,
            survey_completion_rate: Math.round((responses.length / 100) * 100), // Placeholder calculation
            export_timestamp: new Date().toISOString(),
            export_settings: {
              include_profiles: includeProfiles,
              include_metadata: includeMetadata
            }
          }
        }

        return responseData
      }) || [],
      summary: {
        total_responses: responses?.length || 0,
        export_timestamp: new Date().toISOString(),
        includes_user_profiles: includeProfiles,
        includes_metadata: includeMetadata
      }
    }

    // Return JSON with appropriate headers for download
    const filename = `survey-${survey.title.replace(/[^a-zA-Z0-9]/g, '-')}-${new Date().toISOString().split('T')[0]}.json`

    return new NextResponse(JSON.stringify(exportData, null, 2), {
      status: 200,
      headers: {
        'Content-Type': 'application/json',
        'Content-Disposition': `attachment; filename="${filename}"`,
        'Cache-Control': 'no-cache'
      }
    })

  } catch (error) {
    console.error('Export error:', error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Export failed' },
      { status: 500 }
    )
  }
}
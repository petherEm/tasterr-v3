import { openai } from '@ai-sdk/openai'
import { generateObject } from 'ai'
import { z } from 'zod'
import type { SurveyQuestion, AIAssistanceConfig, AIAssistanceEvaluation } from '@/lib/types'

// Maximum execution duration for the serverless function
export const maxDuration = 30
// Prefer edge for lower latency
export const runtime = 'edge'

// Schema for the AI assistance evaluation
const AssistanceEvaluationSchema = z.object({
  needsAssistance: z.boolean().describe('Whether the answer needs improvement or clarification'),
  confidence: z.number().min(0).max(1).describe('Confidence score from 0-1 for this evaluation'),
  feedback: z.string().describe('Friendly, encouraging feedback message for the user'),
  suggestions: z.array(z.string()).optional().describe('Specific suggestions for improving the answer'),
  assistanceType: z.enum(['clarification', 'validation', 'enhancement', 'none']).describe('Type of assistance needed'),
  reasoningType: z.enum(['too_short', 'missing_detail', 'unclear', 'inconsistent', 'satisfactory']).describe('Why assistance is or isnt needed')
})

// Request body schema
const RequestBodySchema = z.object({
  question: z.object({
    id: z.string().optional(),
    question_text: z.string(),
    question_type: z.string(),
    ai_assistance_config: z.unknown().optional(),
    category_id: z.string().optional().nullable()
  }),
  answer: z.unknown().describe('The user\'s answer to evaluate'),
  previousAnswers: z.record(z.unknown()).optional().describe('Previous answers for context'),
  surveyContext: z.object({
    title: z.string(),
    description: z.string().optional(),
    currentCategory: z.object({
      name: z.string(),
      description: z.string().optional()
    }).optional()
  }),
  retryCount: z.number().default(0).describe('How many times this question has been assisted')
})

function sanitize(str: string, max = 400) {
  const cleaned = str.replace(/\s+/g, ' ').replace(/"/g, '\\"').trim()
  return cleaned.length > max ? cleaned.slice(0, max) + '…' : cleaned
}

function formatAnswerForEvaluation(answer: any, questionType: string): string {
  if (!answer) return "Nie udzielono odpowiedzi"

  switch (questionType) {
    case 'input':
    case 'textarea':
      return String(answer).trim()

    case 'number':
      return `Liczba: ${answer}`

    case 'select':
    case 'radio':
      return `Wybrano: ${answer}`

    case 'image_upload_comment':
      if (Array.isArray(answer)) {
        return `Przesłano ${answer.length} zdjęcie/ć z komentarzami: ${answer.map(img => img.comment || 'Brak komentarza').join('; ')}`
      }
      return "Nie przesłano zdjęć"

    case 'range':
      return `Ocena: ${answer}`

    case 'video_upload':
      return answer ? "Przesłano wideo" : "Nie przesłano wideo"

    default:
      return typeof answer === 'object' ? JSON.stringify(answer).slice(0, 200) : String(answer)
  }
}

function generateAssistancePrompt(
  question: any,
  aiConfig: AIAssistanceConfig,
  surveyContext: any,
  answer: string,
  retryCount: number
): string {
  const baseContext = `
Jesteś asystentem AI pomagającym użytkownikom udzielać lepszych odpowiedzi na pytania ankietowe.

Ankieta: "${sanitize(surveyContext.title)}"
${surveyContext.currentCategory ? `Kategoria: "${sanitize(surveyContext.currentCategory.name)}"` : ''}
Pytanie: "${sanitize(question.question_text)}"
Typ pytania: ${question.question_type}

Odpowiedź użytkownika: "${sanitize(answer)}"

To jest próba #${retryCount + 1} dla tego pytania.

WAŻNE: Wszystkie odpowiedzi i feedback MUSZĄ być w języku polskim.
`.trim()

  const customPrompt = aiConfig.prompt ? `\n\nInstrukcje niestandardowe: ${sanitize(aiConfig.prompt)}` : ''

  const evaluationGuidelines = `
Wytyczne oceny:
- Dla pytań tekstowych: Szukaj znaczących, przemyślanych odpowiedzi (minimum 10-15 słów dla istotnych pytań)
- Dla pytań oceniających/wyboru: Upewnij się, że dokonano wyboru
- Dla pytań przesyłających: Sprawdź, czy treść została dostarczona zgodnie z prośbą
- Bądź zachęcający i wspierający, nie krytyczny
- Skup się na pomaganiu użytkownikom w dostarczaniu cenniejszych spostrzeżeń
- Jeśli odpowiedź jest już dobra, nie wymuszaj pomocy
- ZAWSZE odpowiadaj w języku polskim

Czynniki do rozważenia:
${aiConfig.triggers?.short_answers ? '- Bardzo krótkie odpowiedzi tekstowe, które mogłyby zostać rozwinięte' : ''}
${aiConfig.triggers?.incomplete_data ? '- Brakujące ważne szczegóły lub kontekst' : ''}
${aiConfig.triggers?.inconsistent_data ? '- Odpowiedzi, które wydają się niespójne z intencją pytania' : ''}

Maksymalna liczba prób: ${aiConfig.maxRetries || 2}
Aktualna próba: ${retryCount}
`.trim()

  return `${baseContext}${customPrompt}\n\n${evaluationGuidelines}`
}

export async function POST(req: Request) {
  try {
    const body = await req.json()
    const parsed = RequestBodySchema.parse(body)

    const { question, answer, previousAnswers, surveyContext, retryCount } = parsed

    // Parse AI config with defaults
    const aiConfig: AIAssistanceConfig = {
      enabled: true,
      assistance_type: 'all',
      maxRetries: 2,
      confidence_threshold: 0.7,
      triggers: {
        short_answers: true,
        incomplete_data: true,
        inconsistent_data: false
      },
      ...question.ai_assistance_config
    }

    // Check if we've exceeded max retries
    if (retryCount >= (aiConfig.maxRetries || 2)) {
      return Response.json({
        needsAssistance: false,
        confidence: 1.0,
        feedback: "Dziękuję za odpowiedź! Przejdźmy do następnego pytania.",
        assistanceType: 'none',
        reasoningType: 'satisfactory'
      } as AIAssistanceEvaluation)
    }

    // Format the answer for evaluation
    const formattedAnswer = formatAnswerForEvaluation(answer, question.question_type)

    // Generate the evaluation prompt
    const systemPrompt = generateAssistancePrompt(
      question,
      aiConfig,
      surveyContext,
      formattedAnswer,
      retryCount
    )

    // Use AI to evaluate the answer
    const result = await generateObject({
      model: openai('gpt-4o-mini'),
      system: systemPrompt,
      prompt: `Proszę oceń odpowiedź użytkownika i określ, czy skorzystałby z pomocy w udzieleniu bardziej wyczerpującej odpowiedzi. Bądź zachęcający i pomocny. Odpowiedz w języku polskim.`,
      schema: AssistanceEvaluationSchema,
      temperature: 0.3, // Lower temperature for more consistent evaluations
    })

    // Apply confidence threshold
    const evaluation = result.object
    if (evaluation.confidence < (aiConfig.confidence_threshold || 0.7)) {
      evaluation.needsAssistance = false
      evaluation.assistanceType = 'none'
      evaluation.feedback = "Dziękuję za odpowiedź!"
    }

    // Ensure feedback is encouraging
    if (evaluation.needsAssistance && evaluation.feedback) {
      // Make sure feedback starts positively
      if (!evaluation.feedback.toLowerCase().includes('thank') &&
          !evaluation.feedback.toLowerCase().includes('great') &&
          !evaluation.feedback.toLowerCase().includes('good')) {
        evaluation.feedback = "Dziękuję za podzielenie się! " + evaluation.feedback
      }
    }

    return Response.json(evaluation)

  } catch (error) {
    console.error('AI assistance evaluation error:', error)

    // If it's a Zod validation error, provide detailed information
    if (error && typeof error === 'object' && 'issues' in error) {
      console.error('Validation issues:', (error as any).issues)
      return Response.json({
        error: 'Request validation failed',
        details: (error as any).issues
      }, { status: 400 })
    }

    // Return safe fallback for other errors
    return Response.json({
      needsAssistance: false,
      confidence: 0.5,
      feedback: "Dziękuję za odpowiedź! Kontynuujmy.",
      assistanceType: 'none',
      reasoningType: 'satisfactory'
    } as AIAssistanceEvaluation, { status: 200 })
  }
}

// Utility function to get default AI assistance config
export function getDefaultAIConfig(): AIAssistanceConfig {
  return {
    enabled: false,
    assistance_type: 'all',
    maxRetries: 2,
    confidence_threshold: 0.7,
    triggers: {
      short_answers: true,
      incomplete_data: true,
      inconsistent_data: false
    }
  }
}
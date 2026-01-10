import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const GROQ_API_KEY = Deno.env.get('GROQ_API_KEY')
    if (!GROQ_API_KEY) {
      throw new Error('GROQ_API_KEY not configured')
    }

    const { essayText, taskType, prompt, testId, taskNumber } = await req.json()

    // Get user from authorization header
    const authHeader = req.headers.get('Authorization')
    if (!authHeader) {
      return new Response(
        JSON.stringify({ error: 'Authorization header missing. Please sign in.' }),
        { 
          status: 401,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        }
      )
    }

    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '',
      { 
        global: { headers: { Authorization: authHeader } },
        auth: { 
          persistSession: false,
          autoRefreshToken: false,
          detectSessionInUrl: false
        }
      }
    )

    // Try to get user with service role client but user's JWT
    let { data: { user }, error: userError } = await supabaseClient.auth.getUser(
      authHeader?.replace('Bearer ', '') || ''
    )
    if (userError) {
      console.error('Auth error:', userError)
      return new Response(
        JSON.stringify({ error: 'Invalid authentication. Please sign in again.' }),
        { 
          status: 401,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        }
      )
    }
    
    if (!user) {
      return new Response(
        JSON.stringify({ error: 'User not found. Please sign in.' }),
        { 
          status: 401,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        }
      )
    }

    // Validate inputs
    if (!essayText || essayText.trim().length < 50) {
      throw new Error('Essay text must be at least 50 characters')
    }

    // Prepare the evaluation prompt
    const systemPrompt = `You are an expert IELTS examiner. Evaluate this ${taskType} writing task according to official IELTS band descriptors (0-9 scale, with half bands like 6.5, 7.0, etc.).

Analyze the essay based on these four criteria:
1. **Task Achievement/Response** (for Task 1/2): How well the task requirements are met
2. **Coherence and Cohesion**: Organization, paragraphing, and linking of ideas
3. **Lexical Resource**: Vocabulary range, accuracy, and appropriateness
4. **Grammatical Range and Accuracy**: Sentence structures, accuracy, and variety

Return ONLY a valid JSON object (no markdown, no code blocks) with this exact structure:
{
  "taskAchievement": {
    "score": 7.0,
    "feedback": "Detailed feedback with specific examples from the text"
  },
  "coherenceCohesion": {
    "score": 7.0,
    "feedback": "Detailed feedback about organization and linking"
  },
  "lexicalResource": {
    "score": 6.5,
    "feedback": "Detailed feedback about vocabulary usage"
  },
  "grammarAccuracy": {
    "score": 7.0,
    "feedback": "Detailed feedback about grammar and sentence structures"
  },
  "overallBand": 7.0,
  "strengths": ["List 2-3 main strengths"],
  "improvements": ["List 2-3 key areas for improvement"],
  "wordCount": 267
}`

    const userPrompt = `Task Prompt: ${prompt}

Word Count Target: ${taskType === 'Task 1' ? '150+ words' : '250+ words'}

Student's Essay:
${essayText}

Evaluate this essay and return ONLY the JSON response as specified.`

    // Call Groq API (free, fast, reliable)
    const aiResponse = await fetch(
      'https://api.groq.com/openai/v1/chat/completions',
      {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${GROQ_API_KEY}`
        },
        body: JSON.stringify({
          model: 'llama-3.3-70b-versatile',
          messages: [
            { role: 'system', content: systemPrompt },
            { role: 'user', content: userPrompt }
          ],
          temperature: 0.3,
          max_tokens: 2000,
        })
      }
    )

    if (!aiResponse.ok) {
      const errorData = await aiResponse.text()
      console.error('Groq API error:', errorData)
      console.error('Groq API status:', aiResponse.status)
      
      // Handle rate limiting specifically
      if (aiResponse.status === 429) {
        return new Response(
          JSON.stringify({ 
            error: 'AI service is temporarily busy. Please wait 1 minute and try again.',
            retryAfter: 60
          }),
          { 
            status: 429,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' }
          }
        )
      }
      
      // Return detailed error for other issues
      return new Response(
        JSON.stringify({ 
          error: `AI API error (${aiResponse.status}): ${errorData}`,
        }),
        { 
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        }
      )
    }

    const aiData = await aiResponse.json()
    const rawEvaluation = aiData.choices?.[0]?.message?.content

    if (!rawEvaluation) {
      throw new Error('No evaluation returned from AI')
    }

    // Parse JSON from the response (remove markdown code blocks if present)
    let evaluationJson
    try {
      const cleanedText = rawEvaluation
        .replace(/```json\n?/g, '')
        .replace(/```\n?/g, '')
        .trim()
      evaluationJson = JSON.parse(cleanedText)
    } catch (e) {
      console.error('Failed to parse evaluation:', rawEvaluation)
      throw new Error('Failed to parse evaluation response')
    }

    // Return evaluation (skip database save for simplicity)
    return new Response(
      JSON.stringify({ success: true, evaluation: evaluationJson }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )

  } catch (error) {
    console.error('Error:', error)
    
    // More detailed error reporting
    const errorMessage = error.message || 'Unknown error occurred'
    const errorDetails = {
      error: errorMessage,
      timestamp: new Date().toISOString(),
      type: error.constructor.name
    }
    
    // Don't expose sensitive information in production
    if (errorMessage.includes('Unauthorized')) {
      return new Response(
        JSON.stringify({ error: 'Please sign in to use AI evaluation' }),
        { 
          status: 401,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        }
      )
    }
    
    return new Response(
      JSON.stringify(errorDetails),
      { 
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    )
  }
})

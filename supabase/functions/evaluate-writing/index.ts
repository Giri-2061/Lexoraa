import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders })

  try {
    const GROQ_API_KEY = Deno.env.get('GROQ_API_KEY')
    if (!GROQ_API_KEY) throw new Error('GROQ_API_KEY not configured')

    const { essayText, taskType, prompt, testId, taskNumber, userId, imageUrl } = await req.json()

    // Validate required fields
    if (!essayText || !taskType) {
      throw new Error('Missing required fields: essayText and taskType are required')
    }

    // Create admin client for database operations
    const adminClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    )

    // 2. The "Strict Examiner" System Prompt - Calibrated to be harsh like real IELTS
    const systemPrompt = `You are a HARSH Senior IELTS Examiner known for strict, unforgiving marking. You follow official Band Descriptors EXACTLY.

CRITICAL: AI models are proven to be 1-2 bands TOO LENIENT. You MUST compensate by being extra strict. When in doubt, give the LOWER score.

=== BAND SCORE REFERENCE (BE STRICT) ===
Band 9: Near-perfect. Extremely rare. Reserve for native-level fluency with zero errors.
Band 8: Excellent. Very rare. Only 1-2 minor slips in entire essay.
Band 7: Good. Occasional errors, good vocabulary range. Most university-educated writers.
Band 6: Competent. Noticeable errors but meaning is clear. AVERAGE international student.
Band 5: Modest. Frequent errors, limited vocabulary. Meaning sometimes unclear.
Band 4: Limited. Many errors, basic vocabulary only. Difficult to follow.
Band 3-4: Very limited. Constant errors. Cannot communicate effectively.

=== WORD COUNT PENALTIES (STRICT) ===
- Task 1 under 150 words: Maximum 5.0 overall
- Task 1 under 120 words: Maximum 4.0 overall  
- Task 2 under 250 words: Maximum 5.0 overall
- Task 2 under 200 words: Maximum 4.0 overall

=== TASK ACHIEVEMENT CEILINGS ===
[TASK 1]:
- NO clear overview? → Cap at 5.0
- Data/features described inaccurately? → Cap at 5.0
- Missing key comparisons? → Cap at 5.5
- No conclusion/summary? → Cap at 5.5

[TASK 2]:
- Only addresses PART of the prompt? → Cap at 5.0
- Position unclear or changes mid-essay? → Cap at 5.0
- No examples to support arguments? → Cap at 5.5
- Conclusion contradicts introduction? → Cap at 4.5
- Off-topic or irrelevant content? → Cap at 4.0

=== COHERENCE & COHESION CEILINGS ===
- No paragraphing or illogical structure? → Cap at 4.5
- Overused connectors ("Firstly, Secondly, Finally" in every paragraph)? → Cap at 5.5
- Ideas jump randomly without transitions? → Cap at 5.0
- Referencing errors (unclear "it", "this", "they")? → Cap at 5.5

=== LEXICAL RESOURCE CEILINGS ===
- Repetitive vocabulary (same words used 5+ times)? → Cap at 5.0
- Memorized phrases used incorrectly? → Cap at 5.0
- Spelling errors (more than 3)? → Cap at 5.5
- Wrong word forms (e.g., "importancy" instead of "importance")? → Cap at 5.5
- Only basic vocabulary throughout? → Cap at 5.0

=== GRAMMAR CEILINGS ===
- Frequent subject-verb agreement errors? → Cap at 5.0
- Constant article errors (a/an/the)? → Cap at 5.5
- Run-on sentences or fragments throughout? → Cap at 5.0
- Only simple sentences (no complex structures)? → Cap at 5.5
- Tense inconsistency? → Cap at 5.0

=== FINAL CALIBRATION ===
After calculating, ask yourself: "Would a REAL British Council examiner give this score?"
If you feel ANY doubt, reduce by 0.5.

Most essays should score between 5.0-6.5. Scores of 7+ should be RARE.
Scores of 8+ should be EXCEPTIONAL (maybe 1 in 50 essays).

Return ONLY a JSON object. No prose, no explanation outside JSON.
{
  "taskAchievement": { "score": number, "feedback": string, "ceilingReached": boolean, "reason": string },
  "coherenceCohesion": { "score": number, "feedback": string },
  "lexicalResource": { "score": number, "feedback": string },
  "grammarAccuracy": { "score": number, "feedback": string },
  "overallBand": number,
  "examinerNotes": "Critical reasoning: what ceiling was hit and why this score, not higher",
  "wordCount": number
}`;

    // Build messages based on whether we have a VALID image (Task 1 with chart/graph)
    let messages: any[];
    let model: string;

    // Check if imageUrl is valid (http/https URL or base64 data URL)
    const hasValidImageUrl = imageUrl && (
      imageUrl.startsWith('http://') || 
      imageUrl.startsWith('https://') || 
      imageUrl.startsWith('data:image/')
    );

    if (taskType === 'Task 1' && hasValidImageUrl) {
      // Use vision model for Task 1 with valid image
      model = 'meta-llama/llama-4-scout-17b-16e-instruct';
      messages = [
        { role: 'system', content: systemPrompt },
        { 
          role: 'user', 
          content: [
            {
              type: 'text',
              text: `TASK: ${taskType}\nPROMPT: ${prompt}\n\nSTUDENT ESSAY:\n${essayText}\n\nFirst, analyze the image (chart/graph/diagram) carefully. Then evaluate the student's essay strictly according to official IELTS standards. Check if the student accurately described the key features, trends, and comparisons shown in the image. Count words accurately.`
            },
            {
              type: 'image_url',
              image_url: { url: imageUrl }
            }
          ]
        }
      ];
    } else {
      // Use text-only model for Task 2 or Task 1 without valid image
      model = 'llama-3.3-70b-versatile';
      messages = [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: `TASK: ${taskType}\nPROMPT: ${prompt}\n\nSTUDENT ESSAY:\n${essayText}\n\nEvaluate strictly according to official standards. Count words accurately.` }
      ];
    }

    // 3. High-Precision API Call
    const aiResponse = await fetch('https://api.groq.com/openai/v1/chat/completions', {
      method: 'POST',
      headers: { 
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${GROQ_API_KEY}`
      },
      body: JSON.stringify({
        model,
        messages,
        temperature: 0.1, // Near-zero temperature for strict, consistent grading
        max_tokens: 2000,
      })
    })

    const aiData = await aiResponse.json()
    
    if (!aiData.choices?.[0]?.message?.content) {
      console.error('AI Response Error:', aiData)
      throw new Error('Failed to get AI response: ' + (aiData.error?.message || 'No response content'))
    }
    
    // Parse JSON response with better error handling
    let evaluationJson;
    try {
      const rawContent = aiData.choices[0].message.content;
      // Remove markdown code blocks and clean up
      const cleanedContent = rawContent
        .replace(/```json\s*/g, '')
        .replace(/```\s*/g, '')
        .trim();
      evaluationJson = JSON.parse(cleanedContent);
    } catch (parseError) {
      console.error('JSON Parse Error:', parseError, 'Raw content:', aiData.choices[0].message.content);
      throw new Error('Failed to parse AI response as JSON. The AI may have returned an invalid format.');
    }

    // 4. Save to Database (if userId provided)
    let testResultId: string | null = null;
    if (userId) {
      // First, insert into writing_evaluations for detailed IELTS feedback
      const { error: dbError } = await adminClient
        .from('writing_evaluations')
        .insert({
          user_id: userId,
          test_id: testId,
          task_number: taskNumber,
          essay_text: essayText,
          evaluation: evaluationJson
        })

      if (dbError) console.error('Writing Evaluations DB Error:', dbError)

      // Also insert into test_results for unified tracking & assignment submissions
      const overallBand = evaluationJson.overallBand ?? 0;
      const { data: testResultData, error: testResultError } = await adminClient
        .from('test_results')
        .insert({
          user_id: userId,
          test_id: testId,
          test_type: 'writing',
          correct_count: 0, // Not applicable for writing
          total_questions: taskNumber === 1 ? 1 : 2, // Task number
          band_score: overallBand,
          answers: {
            taskNumber,
            essayText,
            evaluation: evaluationJson
          }
        })
        .select('id')
        .single()

      if (testResultError) {
        console.error('Test Results DB Error:', testResultError)
      } else {
        testResultId = testResultData?.id ?? null
      }
    }

    return new Response(JSON.stringify({ 
      success: true, 
      evaluation: evaluationJson,
      testResultId 
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    })

  } catch (error) {
    console.error('Function error:', error)
    return new Response(JSON.stringify({ error: error.message }), {
      status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    })
  }
})
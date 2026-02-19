import { serve } from "https://deno.land/std@0.168.0/http/server.ts"

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders })

  try {
    const GROQ_API_KEY = Deno.env.get('GROQ_API_KEY')
    if (!GROQ_API_KEY) throw new Error('GROQ_API_KEY not configured')

    const { imageBase64 } = await req.json()

    if (!imageBase64) {
      throw new Error('Missing required field: imageBase64 (data URL or base64 string)')
    }

    // Ensure we have a proper data URL
    const imageUrl = imageBase64.startsWith('data:image/')
      ? imageBase64
      : `data:image/jpeg;base64,${imageBase64}`

    // Use the vision model to transcribe handwritten text
    const model = 'meta-llama/llama-4-scout-17b-16e-instruct'

    const systemPrompt = `You are a strict, literal OCR (Optical Character Recognition) machine. Your ONLY job is to transcribe handwritten text from images into plain digital text EXACTLY as the student wrote it.

CRITICAL — THIS IS FOR EXAM EVALUATION. THE TEXT WILL BE GRADED. YOU MUST NOT FIX ANYTHING.

ABSOLUTE RULES — VIOLATING ANY OF THESE INVALIDATES THE EXAM:
1. NEVER correct spelling errors. If the student wrote "importent", output "importent" — NOT "important".
2. NEVER correct grammar. If they wrote "he go to school", output "he go to school" — NOT "he goes to school".
3. NEVER fix punctuation. Missing commas, periods, apostrophes — leave them exactly as written.
4. NEVER fix capitalization. If they wrote "london" with lowercase, output "london".
5. NEVER add words that are not written. Do not insert missing articles, prepositions, or conjunctions.
6. NEVER remove words that are written, even if they seem wrong or redundant.
7. NEVER rephrase, restructure, or reorder anything.
8. NEVER translate — keep the original language exactly as written.
9. Preserve the original paragraph structure, line breaks, and spacing as closely as possible.
10. If a word is unclear, provide your best visual guess. Do NOT skip it or add brackets/notes.
11. Do NOT add any commentary, headers, footnotes, labels, or meta-text.
12. Do NOT say "The handwritten text says..." or "Here is the transcription:" — output ONLY the raw text.
13. If the image contains no readable handwritten text, respond with exactly: [NO READABLE TEXT FOUND]
14. Include crossed-out or corrected words only if the final (replacement) word is clearly legible — use the final version the student intended.

You are a photocopier for handwriting. Your output must be an exact character-for-character digital replica of what the student wrote, errors and all.

Output ONLY the transcribed text, nothing else.`

    const messages = [
      { role: 'system', content: systemPrompt },
      {
        role: 'user',
        content: [
          {
            type: 'text',
            text: 'Transcribe all handwritten text from this image exactly as written. Output only the raw transcribed text.'
          },
          {
            type: 'image_url',
            image_url: { url: imageUrl }
          }
        ]
      }
    ]

    const aiResponse = await fetch('https://api.groq.com/openai/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${GROQ_API_KEY}`
      },
      body: JSON.stringify({
        model,
        messages,
        temperature: 0.1,
        max_tokens: 3000,
      })
    })

    const aiData = await aiResponse.json()

    if (!aiData.choices?.[0]?.message?.content) {
      console.error('AI Response Error:', aiData)
      throw new Error('Failed to get AI response: ' + (aiData.error?.message || 'No response content'))
    }

    const transcribedText = aiData.choices[0].message.content.trim()

    return new Response(JSON.stringify({
      success: true,
      transcribedText,
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    })

  } catch (error) {
    console.error('Transcription error:', error)
    return new Response(JSON.stringify({ error: error.message }), {
      status: 400,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    })
  }
})

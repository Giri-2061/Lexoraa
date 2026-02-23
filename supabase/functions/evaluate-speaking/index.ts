import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

// THE "STRICT & FAIR" KNOWLEDGE BASE (Standardized for IELTS)
const BAND_DESCRIPTORS = `
IELTS Speaking Band Descriptors (Strict Application):

FLUENCY & COHERENCE (FC):
- Band 9: Rare repetition/self-correction. Fully appropriate cohesive features.
- Band 8: Occasional repetition. Topics developed coherently.
- Band 7: Speaks at length without noticeable effort. Uses range of connectives.
- Band 6: May lose coherence due to repetition/hesitation.
- Band 5: Over-uses certain connectives. Slow speech.

LEXICAL RESOURCE (LR):
- Band 9: Full flexibility/precision. Natural idiomatic language.
- Band 8: Skillful use of uncommon/idiomatic vocabulary.
- Band 7: Uses some idiomatic language and collocations.
- Band 6: Generally paraphrases successfully. Sufficient vocabulary for length.

GRAMMATICAL RANGE (GRA):
- Band 9: Consistently accurate structures.
- Band 8: Majority of sentences are error-free.
- Band 7: Frequently produces error-free sentences. Must use complex structures.
- Band 6: Mix of simple/complex structures but limited flexibility.

PRONUNCIATION (PR):
- EVALUATE ONLY: Clarity, Intelligibility, Word Stress, and Sentence Rhythm.
- NEVER PENALIZE: South Asian/Nepalese accents. If a word is understood, it is correct.
`;

serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders })

  try {
    const GROQ_API_KEY = Deno.env.get('GROQ_API_KEY')
    if (!GROQ_API_KEY) throw new Error('GROQ_API_KEY not configured')

    const { recordings, testId, cueCardTopic, part3Theme } = await req.json()
    if (!recordings || !Array.isArray(recordings) || recordings.length === 0) {
      throw new Error('No recordings provided')
    }

    // 1. AUTHENTICATION & CLIENT SETUP
    const authHeader = req.headers.get('Authorization')
    if (!authHeader) {
      return new Response(JSON.stringify({ error: 'Authorization header missing.' }), { status: 401, headers: corsHeaders })
    }

    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '',
      { 
        global: { headers: { Authorization: authHeader } },
        auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false }
      }
    )

    const { data: { user }, error: userError } = await supabaseClient.auth.getUser(
      authHeader?.replace('Bearer ', '') || ''
    )
    if (userError || !user) throw new Error('Invalid authentication.')

    // 2. TRANSCRIPTION LOOP (Whisper-large-v3)
    const transcripts = { part1: '', part2: '', part3: '' };
    let totalDuration = 0;
    let transcriptionWarnings: string[] = [];

    for (const recording of recordings) {
      totalDuration += recording.duration || 0;
      try {
        const audioBuffer = Uint8Array.from(atob(recording.audioBase64), c => c.charCodeAt(0));
        const formData = new FormData();
        formData.append('file', new Blob([audioBuffer], { type: 'audio/webm' }), 'audio.webm');
        formData.append('model', 'whisper-large-v3');
        formData.append('response_format', 'verbose_json');
        formData.append('language', 'en');

        const whisperRes = await fetch('https://api.groq.com/openai/v1/audio/transcriptions', {
          method: 'POST',
          headers: { 'Authorization': `Bearer ${GROQ_API_KEY}` },
          body: formData
        });

        if (whisperRes.ok) {
          const data = await whisperRes.json();
          if (recording.part === 1) transcripts.part1 = data.text || '';
          else if (recording.part === 2) transcripts.part2 = data.text || '';
          else if (recording.part === 3) transcripts.part3 = data.text || '';
        } else {
          transcriptionWarnings.push(`Part ${recording.part}: Transcription issue.`);
        }
      } catch (err) {
        console.error(`Transcription error Part ${recording.part}:`, err);
      }
    }

    const fullTranscript = `
    PART 1 (Interview): ${transcripts.part1}
    PART 2 (Cue Card: ${cueCardTopic}): ${transcripts.part2}
    PART 3 (Discussion: ${part3Theme}): ${transcripts.part3}
    `.trim();

    // 3. METRIC CALCULATIONS (Manual checks to double-verify AI)
    const totalWords = fullTranscript.split(/\s+/).filter(w => w.length > 2 && !w.startsWith('[')).length;
    const minutes = totalDuration / 60;
    const wordsPerMinute = minutes > 0 ? Math.round(totalWords / minutes) : 0;
    const fillerWordsList = ['uh', 'um', 'er', 'ah', 'like', 'you know', 'basically', 'actually'];
    let fillerCount = 0;
    fillerWordsList.forEach(filler => {
      const regex = new RegExp(`\\b${filler}\\b`, 'gi');
      fillerCount += (fullTranscript.match(regex) || []).length;
    });

    // Determine audio quality for confidence scoring
    const hasValidTranscript = fullTranscript.replace(/[^a-zA-Z]/g, '').length > 100;
    let audioQuality = hasValidTranscript ? (totalWords < 500 ? 'fair' : 'good') : 'poor';

    // 4. THE "STRICT & FAIR" UPGRADED PROMPT
    const evaluationPrompt = `You are a Senior IELTS Speaking Examiner. Evaluate this transcript strictly but fairly.
    
    ${BAND_DESCRIPTORS}

    CANDIDATE DATA:
    Transcript: ${fullTranscript}
    Total Duration: ${totalDuration}s
    Words Per Minute: ${wordsPerMinute}
    Filler Word Count: ${fillerCount}
    Audio Quality: ${audioQuality}

    STRICTNESS RULES:
    1. FLUENCY: If Part 2 is less than 60 seconds, FC score cannot exceed 5.5.
    2. GRAMMAR: Identify specific quote-based errors. 7+ requires complex structures.
    3. PRONUNCIATION: Base score strictly on CLARITY and word stress. DO NOT penalize Nepalese accents.
    4. EVALUATION: Be constructive but do not "over-score" out of kindness.

    Return ONLY a valid JSON object:
    {
      "fc": {"score": 6.0, "feedback": "", "strengths": [], "improvements": []},
      "lr": {"score": 6.0, "feedback": "", "strengths": [], "improvements": []},
      "gra": {"score": 6.0, "feedback": "", "strengths": [], "improvements": []},
      "pr": {"score": 6.0, "feedback": "", "strengths": [], "improvements": []},
      "grammarErrors": [{"text": "original quote", "suggestion": "correction", "type": "grammar"}],
      "advancedVocab": [],
      "overallFeedback": "",
      "topicRelevance": 0.85
    }`;

    // 5. LLM CALL
    const llmRes = await fetch('https://api.groq.com/openai/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${GROQ_API_KEY}`
      },
      body: JSON.stringify({
        model: 'llama-3.3-70b-versatile',
        messages: [
          { role: 'system', content: 'You are an expert IELTS examiner. Respond with JSON only.' },
          { role: 'user', content: evaluationPrompt }
        ],
        temperature: 0.1,
        max_tokens: 3000
      })
    });

    if (!llmRes.ok) throw new Error(`LLM Error: ${llmRes.status}`);
    const llmData = await llmRes.json();
    const evaluationJson = JSON.parse(llmData.choices[0].message.content.replace(/```json|```/g, ''));

    // 6. FINAL SCORING & RESPONSE CONSTRUCTION
    // Apply official IELTS rounding rules
    const rawAverage = (evaluationJson.fc.score + evaluationJson.lr.score + evaluationJson.gra.score + evaluationJson.pr.score) / 4;
    const finalBand = Math.round(rawAverage * 2) / 2;

    const fullEvaluation = {
      estimatedBand: finalBand,
      bandRange: { low: Math.max(0, finalBand - 0.5), high: Math.min(9, finalBand + 0.5) },
      confidence: audioQuality === 'good' ? 'high' : 'medium',
      
      fluencyCoherence: {
        score: evaluationJson.fc.score,
        feedback: evaluationJson.fc.feedback,
        strengths: evaluationJson.fc.strengths,
        improvements: evaluationJson.fc.improvements
      },
      lexicalResource: {
        score: evaluationJson.lr.score,
        feedback: evaluationJson.lr.feedback,
        strengths: evaluationJson.lr.strengths,
        improvements: evaluationJson.lr.improvements
      },
      grammaticalRange: {
        score: evaluationJson.gra.score,
        feedback: evaluationJson.gra.feedback,
        strengths: evaluationJson.gra.strengths,
        improvements: evaluationJson.gra.improvements
      },
      pronunciation: {
        score: evaluationJson.pr.score,
        feedback: evaluationJson.pr.feedback,
        strengths: evaluationJson.pr.strengths,
        improvements: evaluationJson.pr.improvements,
        note: "Scored based on clarity, not accent."
      },
      
      metrics: {
        wordsPerMinute,
        fillerCount,
        totalSpeakingTime: totalDuration,
        fillerWords: [...new Set(fullTranscript.match(/\b(uh|um|er|ah|like)\b/gi) || [])]
      },
      
      grammarAnalysis: {
        errors: evaluationJson.grammarErrors,
        errorCount: evaluationJson.grammarErrors.length
      },
      
      vocabularyAnalysis: {
        advancedVocabulary: evaluationJson.advancedVocab,
        topicRelevance: evaluationJson.topicRelevance
      },
      
      transcripts: transcripts,
      audioQuality: {
        overall: audioQuality,
        warnings: transcriptionWarnings
      },
      
      overallFeedback: evaluationJson.overallFeedback,
      evaluatedAt: new Date().toISOString(),
      disclaimer: 'This is an AI-generated estimate. Official scores can only be obtained through certified test centers.'
    };

    // 7. SAVE TO DATABASE
    let testResultId: string | null = null;
    try {
      const adminClient = createClient(
        Deno.env.get('SUPABASE_URL') ?? '',
        Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
      );

      const { data: testResultData, error: testResultError } = await adminClient
        .from('test_results')
        .insert({
          user_id: user.id,
          test_id: testId || 'speaking-unknown',
          test_type: 'speaking',
          correct_count: 0,
          total_questions: 3,
          band_score: finalBand,
          duration_minutes: Math.round(totalDuration / 60),
          answers: {
            evaluation: fullEvaluation,
            transcripts,
            cueCardTopic,
            part3Theme
          },
          created_at: new Date().toISOString()
        })
        .select('id')
        .single();

      if (testResultError) {
        console.error('Test Results DB Error:', testResultError);
      } else {
        testResultId = testResultData?.id ?? null;
      }
    } catch (dbErr) {
      console.error('Database save error:', dbErr);
    }

    return new Response(JSON.stringify({ success: true, evaluation: fullEvaluation, testResultId }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' } });

  } catch (error) {
    console.error('Final Error:', error);
    return new Response(JSON.stringify({ error: error.message }), { status: 400, headers: corsHeaders });
  }
});

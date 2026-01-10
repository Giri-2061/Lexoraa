import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

// IELTS Band Descriptors for Speaking
const BAND_DESCRIPTORS = `
IELTS Speaking Band Descriptors:

FLUENCY & COHERENCE:
- Band 9: Speaks fluently with only rare repetition or self-correction. Discourse is coherent with fully appropriate cohesive features.
- Band 8: Speaks fluently with only occasional repetition or self-correction. Develops topics coherently and appropriately.
- Band 7: Speaks at length without noticeable effort. May demonstrate language-related hesitation. Uses a range of connectives and discourse markers.
- Band 6: Willing to speak at length but may lose coherence due to repetition, self-correction or hesitation. Uses a range of connectives but not always appropriately.
- Band 5: Usually maintains flow of speech but uses repetition and self-correction to keep going. May over-use certain connectives.
- Band 4: Cannot respond without noticeable pauses. May speak slowly with frequent repetition.

LEXICAL RESOURCE:
- Band 9: Uses vocabulary with full flexibility and precision. Uses idiomatic language naturally and accurately.
- Band 8: Uses a wide vocabulary resource readily and flexibly. Uses less common and idiomatic vocabulary skillfully.
- Band 7: Uses vocabulary resource flexibly to discuss variety of topics. Uses some less common and idiomatic vocabulary.
- Band 6: Has a wide enough vocabulary to discuss topics at length. Generally paraphrases successfully.
- Band 5: Manages to talk about familiar and unfamiliar topics but uses vocabulary with limited flexibility.
- Band 4: Uses basic vocabulary sufficient for less familiar topics. Makes frequent errors in word choice.

GRAMMATICAL RANGE & ACCURACY:
- Band 9: Uses a full range of structures naturally and appropriately. Produces consistently accurate structures.
- Band 8: Uses a wide range of structures flexibly. Produces majority of sentences error-free.
- Band 7: Uses a range of complex structures with flexibility. Frequently produces error-free sentences.
- Band 6: Uses a mix of simple and complex structures with limited flexibility.
- Band 5: Produces basic sentence forms with reasonable accuracy. Uses a limited range of complex structures.
- Band 4: Produces basic sentence forms. Makes numerous errors except in memorized expressions.

PRONUNCIATION (CLARITY & INTELLIGIBILITY - NOT ACCENT):
- Band 9: Uses full range of pronunciation features with precision and subtlety. Is effortless to understand.
- Band 8: Uses a wide range of pronunciation features. Is easy to understand throughout.
- Band 7: Shows all positive features of Band 6 and some of Band 8. Generally easy to understand.
- Band 6: Uses a range of pronunciation features with mixed control. Can generally be understood.
- Band 5: Shows some effective use of features but control is limited. Mispronunciation is frequent.
- Band 4: Uses a limited range of pronunciation features. Mispronunciation is frequent.

IMPORTANT: Pronunciation score is based on CLARITY and INTELLIGIBILITY only, NOT on accent. Regional accents should NEVER be penalized.
`;

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const GROQ_API_KEY = Deno.env.get('GROQ_API_KEY')
    if (!GROQ_API_KEY) {
      throw new Error('GROQ_API_KEY not configured')
    }

    const { recordings, testId, cueCardTopic, part3Theme } = await req.json()

    if (!recordings || !Array.isArray(recordings) || recordings.length === 0) {
      throw new Error('No recordings provided')
    }

    // Verify authentication
    const authHeader = req.headers.get('Authorization')
    if (!authHeader) {
      return new Response(
        JSON.stringify({ error: 'Authorization header missing. Please sign in.' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
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
    
    if (userError || !user) {
      return new Response(
        JSON.stringify({ error: 'Invalid authentication. Please sign in again.' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Transcribe audio using Groq Whisper
    const transcripts: { part1: string; part2: string; part3: string } = {
      part1: '',
      part2: '',
      part3: ''
    };

    let totalDuration = 0;
    const allQuestions: string[] = [];
    let transcriptionWarnings: string[] = [];

    for (const recording of recordings) {
      totalDuration += recording.duration || 0;
      allQuestions.push(...(recording.questions || []));

      try {
        // Decode base64 to binary
        const audioBuffer = Uint8Array.from(atob(recording.audioBase64), c => c.charCodeAt(0));
        
        // Create form data for Whisper API
        const formData = new FormData();
        const audioBlob = new Blob([audioBuffer], { type: 'audio/webm' });
        formData.append('file', audioBlob, 'audio.webm');
        formData.append('model', 'whisper-large-v3');
        formData.append('response_format', 'verbose_json');
        formData.append('language', 'en');

        const whisperResponse = await fetch('https://api.groq.com/openai/v1/audio/transcriptions', {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${GROQ_API_KEY}`,
          },
          body: formData
        });

        if (whisperResponse.ok) {
          const whisperData = await whisperResponse.json();
          const transcript = whisperData.text || '';
          
          if (recording.part === 1) transcripts.part1 = transcript;
          else if (recording.part === 2) transcripts.part2 = transcript;
          else if (recording.part === 3) transcripts.part3 = transcript;
        } else {
          const errorText = await whisperResponse.text();
          console.error('Whisper API error:', errorText);
          transcriptionWarnings.push(`Part ${recording.part}: Audio transcription had issues`);
          
          if (recording.part === 1) transcripts.part1 = '[Audio could not be transcribed clearly]';
          else if (recording.part === 2) transcripts.part2 = '[Audio could not be transcribed clearly]';
          else if (recording.part === 3) transcripts.part3 = '[Audio could not be transcribed clearly]';
        }
      } catch (transcriptionError) {
        console.error('Transcription error:', transcriptionError);
        transcriptionWarnings.push(`Part ${recording.part}: Transcription failed`);
        
        if (recording.part === 1) transcripts.part1 = '[Transcription unavailable]';
        else if (recording.part === 2) transcripts.part2 = '[Transcription unavailable]';
        else if (recording.part === 3) transcripts.part3 = '[Transcription unavailable]';
      }
    }

    // Combine all transcripts
    const fullTranscript = `
PART 1 (Introduction & Interview):
${transcripts.part1}

PART 2 (Long Turn - Topic: ${cueCardTopic || 'General topic'}):
${transcripts.part2}

PART 3 (Discussion - Theme: ${part3Theme || 'General discussion'}):
${transcripts.part3}
    `.trim();

    // Check transcript quality
    const hasValidTranscript = 
      !fullTranscript.includes('[Transcription unavailable]') &&
      !fullTranscript.includes('[Audio could not be transcribed clearly]') &&
      fullTranscript.replace(/[^a-zA-Z]/g, '').length > 100;

    // Determine audio quality
    let audioQuality: 'good' | 'fair' | 'poor' = 'good';
    const warnings: string[] = [...transcriptionWarnings];
    
    if (!hasValidTranscript) {
      audioQuality = 'poor';
      warnings.push('Audio quality was too low for accurate transcription. Scores may be less reliable.');
    } else if (fullTranscript.length < 500) {
      audioQuality = 'fair';
      warnings.push('Limited speech detected. Ensure you speak clearly and at sufficient length.');
    }

    // Calculate basic metrics
    const totalWords = fullTranscript.split(/\s+/).filter(w => w.length > 2 && !w.startsWith('[')).length;
    const minutes = totalDuration / 60;
    const wordsPerMinute = minutes > 0 ? Math.round(totalWords / minutes) : 0;

    // Filler word detection
    const fillerWordsList = ['uh', 'um', 'er', 'ah', 'like', 'you know', 'basically', 'actually'];
    let fillerCount = 0;
    const detectedFillers: string[] = [];
    fillerWordsList.forEach(filler => {
      const regex = new RegExp(`\\b${filler}\\b`, 'gi');
      const matches = fullTranscript.match(regex);
      if (matches) {
        fillerCount += matches.length;
        detectedFillers.push(filler);
      }
    });

    // Build LLM evaluation prompt
    const evaluationPrompt = `You are an expert IELTS Speaking examiner with 20+ years of experience. Evaluate the following speaking test transcript according to official IELTS band descriptors.

${BAND_DESCRIPTORS}

CANDIDATE'S SPEAKING TEST TRANSCRIPT:
${fullTranscript}

ADDITIONAL METRICS:
- Total speaking time: ${Math.round(totalDuration)} seconds
- Approximate words per minute: ${wordsPerMinute}
- Filler word count: ${fillerCount}

IMPORTANT EVALUATION RULES:
1. NEVER penalize regional accents - only evaluate clarity and intelligibility
2. Pronunciation score should be based on how easily the speaker can be understood, NOT on accent
3. Be fair and constructive in feedback
4. Consider that this is ASR-transcribed text, so some minor transcription errors may exist
5. Audio quality: ${audioQuality} - ${audioQuality === 'poor' ? 'Be more lenient due to audio issues' : 'Normal evaluation'}

Return ONLY a valid JSON object (no markdown, no code blocks) with this exact structure:
{
  "fluencyCoherence": {
    "score": 6.5,
    "feedback": "Detailed feedback on fluency and coherence with specific examples from the transcript",
    "strengths": ["Strength 1", "Strength 2"],
    "improvements": ["Improvement area 1", "Improvement area 2"]
  },
  "lexicalResource": {
    "score": 6.5,
    "feedback": "Detailed feedback on vocabulary with specific examples",
    "strengths": ["Strength 1", "Strength 2"],
    "improvements": ["Improvement area 1", "Improvement area 2"]
  },
  "grammaticalRange": {
    "score": 6.5,
    "feedback": "Detailed feedback on grammar with specific examples",
    "strengths": ["Strength 1", "Strength 2"],
    "improvements": ["Improvement area 1", "Improvement area 2"]
  },
  "pronunciation": {
    "score": 6.5,
    "feedback": "Feedback on clarity and intelligibility (NOT accent)",
    "strengths": ["Strength 1", "Strength 2"],
    "improvements": ["Improvement area 1", "Improvement area 2"],
    "note": "Score based on clarity and intelligibility, not accent"
  },
  "overallFeedback": "2-3 sentence summary of overall performance",
  "grammarErrors": [
    {"text": "example error from transcript", "suggestion": "correction", "type": "grammar"}
  ],
  "advancedVocabulary": ["word1", "word2"],
  "topicRelevance": 0.85
}`;

    // Call Groq LLM
    const llmResponse = await fetch('https://api.groq.com/openai/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${GROQ_API_KEY}`
      },
      body: JSON.stringify({
        model: 'llama-3.3-70b-versatile',
        messages: [
          { role: 'system', content: 'You are an expert IELTS examiner. Always respond with valid JSON only, no markdown formatting.' },
          { role: 'user', content: evaluationPrompt }
        ],
        temperature: 0.3,
        max_tokens: 3000
      })
    });

    if (!llmResponse.ok) {
      const errorText = await llmResponse.text();
      console.error('LLM API error:', errorText);
      
      if (llmResponse.status === 429) {
        return new Response(
          JSON.stringify({ error: 'AI service is busy. Please try again in 1 minute.' }),
          { status: 429, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
      
      throw new Error(`LLM API error: ${llmResponse.status}`);
    }

    const llmData = await llmResponse.json();
    const rawEvaluation = llmData.choices?.[0]?.message?.content;

    if (!rawEvaluation) {
      throw new Error('No evaluation returned from AI');
    }

    // Parse evaluation JSON
    let evaluationJson;
    try {
      const cleanedText = rawEvaluation
        .replace(/```json\n?/g, '')
        .replace(/```\n?/g, '')
        .trim();
      evaluationJson = JSON.parse(cleanedText);
    } catch (e) {
      console.error('Failed to parse evaluation:', rawEvaluation);
      throw new Error('Failed to parse evaluation response');
    }

    // Extract scores
    const fluencyScore = evaluationJson.fluencyCoherence?.score || 5;
    const lexicalScore = evaluationJson.lexicalResource?.score || 5;
    const grammarScore = evaluationJson.grammaticalRange?.score || 5;
    let pronunciationScore = evaluationJson.pronunciation?.score || 5;

    // Apply audio quality adjustments to pronunciation (SAFE MODE)
    if (audioQuality === 'poor') {
      // Cap pronunciation penalty for poor audio - be conservative
      pronunciationScore = Math.max(pronunciationScore, 5);
      warnings.push('Pronunciation score adjusted due to audio quality limitations.');
    } else if (audioQuality === 'fair') {
      pronunciationScore = Math.max(pronunciationScore, 4.5);
    }

    // Calculate overall band (equal weight for all 4 criteria)
    let overallBand = (fluencyScore + lexicalScore + grammarScore + pronunciationScore) / 4;
    overallBand = Math.round(overallBand * 2) / 2; // Round to nearest 0.5

    // Determine confidence range based on audio quality
    let bandRange = 0.5;
    if (audioQuality === 'fair') bandRange = 0.75;
    if (audioQuality === 'poor') bandRange = 1.0;

    // Build final evaluation response
    const evaluation = {
      estimatedBand: overallBand,
      bandRange: {
        low: Math.max(0, overallBand - bandRange),
        high: Math.min(9, overallBand + bandRange)
      },
      confidence: audioQuality === 'good' ? 'high' : audioQuality === 'fair' ? 'medium' : 'low',
      
      fluencyCoherence: {
        score: fluencyScore,
        confidence: audioQuality === 'poor' ? 0.6 : 0.85,
        feedback: evaluationJson.fluencyCoherence?.feedback || 'Unable to generate detailed feedback.',
        strengths: evaluationJson.fluencyCoherence?.strengths || [],
        improvements: evaluationJson.fluencyCoherence?.improvements || []
      },
      
      lexicalResource: {
        score: lexicalScore,
        confidence: audioQuality === 'poor' ? 0.7 : 0.9,
        feedback: evaluationJson.lexicalResource?.feedback || 'Unable to generate detailed feedback.',
        strengths: evaluationJson.lexicalResource?.strengths || [],
        improvements: evaluationJson.lexicalResource?.improvements || []
      },
      
      grammaticalRange: {
        score: grammarScore,
        confidence: audioQuality === 'poor' ? 0.7 : 0.9,
        feedback: evaluationJson.grammaticalRange?.feedback || 'Unable to generate detailed feedback.',
        strengths: evaluationJson.grammaticalRange?.strengths || [],
        improvements: evaluationJson.grammaticalRange?.improvements || []
      },
      
      pronunciation: {
        score: pronunciationScore,
        confidence: audioQuality === 'poor' ? 0.5 : 0.75,
        feedback: evaluationJson.pronunciation?.feedback || 'Unable to generate detailed feedback.',
        strengths: evaluationJson.pronunciation?.strengths || [],
        improvements: evaluationJson.pronunciation?.improvements || []
      },
      
      fluencyMetrics: {
        wordsPerMinute,
        averagePauseLength: 0,
        totalPauses: 0,
        fillerCount,
        fillerWords: [...new Set(detectedFillers)],
        speechRate: wordsPerMinute < 100 ? 'slow' : wordsPerMinute < 150 ? 'moderate' : 'fast',
        hesitationRatio: totalWords > 0 ? fillerCount / totalWords : 0
      },
      
      grammarAnalysis: {
        errorCount: evaluationJson.grammarErrors?.length || 0,
        errorDensity: totalWords > 0 ? ((evaluationJson.grammarErrors?.length || 0) / totalWords) * 100 : 0,
        errors: evaluationJson.grammarErrors || [],
        sentenceComplexity: 'moderate',
        complexSentenceRatio: 0.3
      },
      
      vocabularyAnalysis: {
        uniqueWords: new Set(fullTranscript.toLowerCase().split(/\s+/).filter(w => w.length > 2)).size,
        totalWords,
        lexicalDiversity: 0,
        advancedVocabularyCount: evaluationJson.advancedVocabulary?.length || 0,
        advancedVocabularyRatio: 0,
        collocations: [],
        idioms: [],
        topicRelevance: evaluationJson.topicRelevance || 0.7
      },
      
      pronunciationAnalysis: {
        clarityScore: pronunciationScore,
        consistencyScore: 0.8,
        intelligibilityEstimate: pronunciationScore / 9,
        warnings: audioQuality !== 'good' ? ['Score based on available audio quality'] : [],
        note: 'Pronunciation score is based on CLARITY and INTELLIGIBILITY only, NOT on accent. Regional accents are not penalized.'
      },
      
      transcripts,
      
      audioQuality: {
        overall: audioQuality,
        warnings,
        adjustmentApplied: audioQuality !== 'good'
      },
      
      evaluatedAt: new Date().toISOString(),
      totalSpeakingTime: totalDuration,
      disclaimer: 'This is an AI-generated estimate based on automated speech analysis. It is NOT an official IELTS score. Actual IELTS scores can only be obtained through official test centers. Pronunciation assessment is based on clarity, not accent.'
    };

    return new Response(
      JSON.stringify({ success: true, evaluation }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Error:', error);
    
    return new Response(
      JSON.stringify({ 
        error: error.message || 'An error occurred during evaluation',
        timestamp: new Date().toISOString()
      }),
      { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});

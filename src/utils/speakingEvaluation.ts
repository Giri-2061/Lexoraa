import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import type { 
  SpeakingEvaluation, 
  FluencyMetrics,
  VocabularyAnalysis,
  GrammarAnalysis
} from "@/types/speakingEvaluation";

// Filler words to detect
const FILLER_WORDS = [
  'uh', 'um', 'er', 'ah', 'like', 'you know', 'basically', 
  'actually', 'literally', 'so', 'well', 'i mean', 'kind of', 
  'sort of', 'right', 'okay'
];

// Advanced vocabulary indicators (B2-C2 level words)
const ADVANCED_VOCABULARY = [
  'furthermore', 'nevertheless', 'consequently', 'substantial', 'significant',
  'predominantly', 'comprehensive', 'fundamental', 'inevitable', 'perceive',
  'demonstrate', 'indicate', 'contribute', 'maintain', 'enhance', 'facilitate',
  'implement', 'subsequent', 'prior', 'considerable', 'numerous', 'crucial',
  'essential', 'beneficial', 'detrimental', 'adequate', 'sufficient',
  'perspective', 'aspect', 'factor', 'impact', 'influence', 'tendency',
  'phenomenon', 'circumstances', 'environment', 'opportunity', 'challenge'
];

// Common idioms
const COMMON_IDIOMS = [
  'at the end of the day', 'in my opinion', 'on the other hand',
  'as far as i know', 'to be honest', 'generally speaking',
  'it goes without saying', 'all in all', 'by and large',
  'for the most part', 'in a nutshell', 'to some extent'
];

/**
 * Analyze fluency metrics from transcript and timing data
 */
export function analyzeFluency(
  transcript: string, 
  durationSeconds: number
): FluencyMetrics {
  const words = transcript.toLowerCase().split(/\s+/).filter(w => w.length > 0);
  const totalWords = words.length;
  
  // Words per minute
  const minutes = durationSeconds / 60;
  const wordsPerMinute = minutes > 0 ? Math.round(totalWords / minutes) : 0;
  
  // Detect fillers
  const fillerWords: string[] = [];
  let fillerCount = 0;
  
  FILLER_WORDS.forEach(filler => {
    const regex = new RegExp(`\\b${filler}\\b`, 'gi');
    const matches = transcript.toLowerCase().match(regex);
    if (matches) {
      fillerCount += matches.length;
      fillerWords.push(...matches);
    }
  });
  
  // Estimate pauses (based on punctuation and transcript patterns)
  const pauseIndicators = (transcript.match(/[.,;:!?]|\.\.\./g) || []).length;
  const averagePauseLength = totalWords > 0 ? (pauseIndicators * 0.5) / totalWords : 0;
  
  // Speech rate classification
  let speechRate: FluencyMetrics['speechRate'] = 'moderate';
  if (wordsPerMinute < 100) speechRate = 'slow';
  else if (wordsPerMinute < 130) speechRate = 'moderate';
  else if (wordsPerMinute < 170) speechRate = 'fast';
  else speechRate = 'very-fast';
  
  // Hesitation ratio
  const hesitationRatio = totalWords > 0 ? fillerCount / totalWords : 0;
  
  return {
    wordsPerMinute,
    averagePauseLength,
    totalPauses: pauseIndicators,
    fillerCount,
    fillerWords: [...new Set(fillerWords)],
    speechRate,
    hesitationRatio
  };
}

/**
 * Analyze vocabulary usage
 */
export function analyzeVocabulary(transcript: string, topic: string): VocabularyAnalysis {
  const words = transcript.toLowerCase()
    .replace(/[^\w\s]/g, '')
    .split(/\s+/)
    .filter(w => w.length > 2);
  
  const totalWords = words.length;
  const uniqueWords = new Set(words).size;
  
  // Lexical diversity (Type-Token Ratio)
  const lexicalDiversity = totalWords > 0 ? uniqueWords / totalWords : 0;
  
  // Count advanced vocabulary
  let advancedVocabularyCount = 0;
  ADVANCED_VOCABULARY.forEach(word => {
    const regex = new RegExp(`\\b${word}\\b`, 'gi');
    const matches = transcript.toLowerCase().match(regex);
    if (matches) advancedVocabularyCount += matches.length;
  });
  
  const advancedVocabularyRatio = totalWords > 0 ? advancedVocabularyCount / totalWords : 0;
  
  // Detect idioms and collocations
  const idioms: string[] = [];
  COMMON_IDIOMS.forEach(idiom => {
    if (transcript.toLowerCase().includes(idiom)) {
      idioms.push(idiom);
    }
  });
  
  // Simple topic relevance check
  const topicWords = topic.toLowerCase().split(/\s+/);
  let relevantWordCount = 0;
  topicWords.forEach(tw => {
    if (transcript.toLowerCase().includes(tw)) relevantWordCount++;
  });
  const topicRelevance = topicWords.length > 0 ? relevantWordCount / topicWords.length : 0.5;
  
  return {
    uniqueWords,
    totalWords,
    lexicalDiversity,
    advancedVocabularyCount,
    advancedVocabularyRatio,
    collocations: [],
    idioms,
    topicRelevance: Math.min(topicRelevance, 1)
  };
}

/**
 * Simple grammar analysis (basic heuristics - LLM will do deeper analysis)
 */
export function analyzeGrammarBasic(transcript: string): GrammarAnalysis {
  const sentences = transcript.split(/[.!?]+/).filter(s => s.trim().length > 0);
  
  // Count complex sentences (those with subordinating conjunctions)
  const complexIndicators = ['because', 'although', 'while', 'whereas', 'if', 'unless', 
    'when', 'whenever', 'since', 'after', 'before', 'until', 'which', 'who', 'that'];
  
  let complexSentences = 0;
  sentences.forEach(sentence => {
    const lower = sentence.toLowerCase();
    if (complexIndicators.some(ind => lower.includes(ind))) {
      complexSentences++;
    }
  });
  
  const complexSentenceRatio = sentences.length > 0 ? complexSentences / sentences.length : 0;
  
  // Classify sentence complexity
  let sentenceComplexity: GrammarAnalysis['sentenceComplexity'] = 'simple';
  if (complexSentenceRatio > 0.6) sentenceComplexity = 'complex';
  else if (complexSentenceRatio > 0.3) sentenceComplexity = 'varied';
  else if (complexSentenceRatio > 0.1) sentenceComplexity = 'moderate';
  
  return {
    errorCount: 0,
    errorDensity: 0,
    errors: [],
    sentenceComplexity,
    complexSentenceRatio
  };
}

/**
 * Convert audio blob to base64 for API transmission
 */
export async function audioToBase64(blob: Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onloadend = () => {
      const base64 = reader.result as string;
      const base64Data = base64.split(',')[1];
      resolve(base64Data);
    };
    reader.onerror = reject;
    reader.readAsDataURL(blob);
  });
}

/**
 * Main evaluation function - calls the Edge Function
 */
export async function evaluateSpeaking(
  recordings: Array<{
    part: number;
    blob: Blob;
    duration: number;
    questions?: string[];
  }>,
  testId: string,
  cueCardTopic: string,
  part3Theme: string
): Promise<SpeakingEvaluation | null> {
  try {
    // Check authentication
    const { data: { session }, error: sessionError } = await supabase.auth.getSession();
    
    if (sessionError || !session) {
      toast.error("Please sign in to get AI evaluation");
      return null;
    }

    toast.info("Preparing audio for evaluation...");

    // Convert all audio recordings to base64
    const audioData = await Promise.all(
      recordings.map(async (rec) => ({
        part: rec.part,
        audioBase64: await audioToBase64(rec.blob),
        duration: rec.duration,
        questions: rec.questions || []
      }))
    );

    toast.info("Analyzing your speaking... This may take 30-60 seconds.");

    // Call the Edge Function
    const { data, error } = await supabase.functions.invoke('evaluate-speaking', {
      body: {
        recordings: audioData,
        testId,
        cueCardTopic,
        part3Theme
      }
    });

    if (error) {
      console.error('Speaking evaluation error:', error);
      toast.error("Failed to evaluate speaking. Please try again.");
      return null;
    }

    if (data?.error) {
      console.error('Evaluation error:', data.error);
      toast.error(data.error);
      return null;
    }

    toast.success("Evaluation complete!");
    return data.evaluation as SpeakingEvaluation;

  } catch (error) {
    console.error('Speaking evaluation error:', error);
    toast.error("An error occurred during evaluation. Please try again.");
    return null;
  }
}

/**
 * Calculate band score from criterion scores
 */
export function calculateOverallBand(
  fluency: number,
  lexical: number,
  grammar: number,
  pronunciation: number,
  audioQuality: 'good' | 'fair' | 'poor'
): { band: number; range: { low: number; high: number } } {
  // Equal weight for all criteria
  let rawBand = (fluency + lexical + grammar + pronunciation) / 4;
  
  // Round to nearest 0.5
  rawBand = Math.round(rawBand * 2) / 2;
  
  // Determine confidence range based on audio quality
  let range = 0.5;
  if (audioQuality === 'fair') range = 0.75;
  if (audioQuality === 'poor') range = 1.0;
  
  return {
    band: rawBand,
    range: {
      low: Math.max(0, rawBand - range),
      high: Math.min(9, rawBand + range)
    }
  };
}

/**
 * Get band description
 */
export function getBandDescription(band: number): string {
  if (band >= 9) return "Expert User";
  if (band >= 8) return "Very Good User";
  if (band >= 7) return "Good User";
  if (band >= 6) return "Competent User";
  if (band >= 5) return "Modest User";
  if (band >= 4) return "Limited User";
  return "Extremely Limited User";
}

// IELTS Speaking Evaluation Types

export interface WordConfidence {
  word: string;
  confidence: number;
  startTime?: number;
  endTime?: number;
}

export interface TranscriptionResult {
  transcript: string;
  words: WordConfidence[];
  overallConfidence: number;
  audioDuration: number;
  audioQuality: 'good' | 'fair' | 'poor';
  warnings: string[];
}

export interface FluencyMetrics {
  wordsPerMinute: number;
  averagePauseLength: number;
  totalPauses: number;
  fillerCount: number;
  fillerWords: string[];
  speechRate: 'slow' | 'moderate' | 'fast' | 'very-fast';
  hesitationRatio: number;
}

export interface GrammarAnalysis {
  errorCount: number;
  errorDensity: number; // errors per 100 words
  errors: GrammarError[];
  sentenceComplexity: 'simple' | 'moderate' | 'complex' | 'varied';
  complexSentenceRatio: number;
}

export interface GrammarError {
  text: string;
  suggestion: string;
  type: 'grammar' | 'spelling' | 'punctuation' | 'word-choice';
  severity: 'minor' | 'moderate' | 'major';
}

export interface VocabularyAnalysis {
  uniqueWords: number;
  totalWords: number;
  lexicalDiversity: number; // Type-Token Ratio
  advancedVocabularyCount: number;
  advancedVocabularyRatio: number;
  collocations: string[];
  idioms: string[];
  topicRelevance: number; // 0-1 score
}

export interface PronunciationAnalysis {
  clarityScore: number; // Based on ASR confidence, NOT accent
  consistencyScore: number;
  intelligibilityEstimate: number;
  warnings: string[];
  note: string; // Always explain this is clarity-based, not accent-based
}

export interface CriterionScore {
  score: number;
  confidence: number; // How confident the system is in this score
  feedback: string;
  strengths: string[];
  improvements: string[];
}

export interface SpeakingEvaluation {
  // Overall
  estimatedBand: number;
  bandRange: {
    low: number;
    high: number;
  };
  confidence: 'high' | 'medium' | 'low';
  
  // Four IELTS Criteria
  fluencyCoherence: CriterionScore;
  lexicalResource: CriterionScore;
  grammaticalRange: CriterionScore;
  pronunciation: CriterionScore;
  
  // Detailed Metrics
  fluencyMetrics: FluencyMetrics;
  grammarAnalysis: GrammarAnalysis;
  vocabularyAnalysis: VocabularyAnalysis;
  pronunciationAnalysis: PronunciationAnalysis;
  
  // Transcripts
  transcripts: {
    part1: string;
    part2: string;
    part3: string;
  };
  
  // Audio Quality
  audioQuality: {
    overall: 'good' | 'fair' | 'poor';
    warnings: string[];
    adjustmentApplied: boolean;
  };
  
  // Metadata
  evaluatedAt: string;
  totalSpeakingTime: number;
  disclaimer: string;
}

export interface PartRecording {
  part: 1 | 2 | 3;
  audioBlob: Blob;
  duration: number;
  questions: string[];
}

export interface EvaluationRequest {
  recordings: PartRecording[];
  testId: string;
  userId: string;
}

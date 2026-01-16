import { supabase } from '@/integrations/supabase/client';

export interface WritingEvaluation {
  taskAchievement: {
    score: number;
    feedback: string;
    ceilingReached?: boolean;
    reason?: string;
  };
  coherenceCohesion: {
    score: number;
    feedback: string;
  };
  lexicalResource: {
    score: number;
    feedback: string;
  };
  grammarAccuracy: {
    score: number;
    feedback: string;
  };
  overallBand: number;
  strengths?: string[];
  improvements?: string[];
  examinerNotes?: string;
  wordCount?: number;
}

export interface EvaluateWritingParams {
  essayText: string;
  taskType: 'Task 1' | 'Task 2';
  prompt: string;
  testId: string;
  taskNumber: 1 | 2;
}

export async function evaluateWriting(params: EvaluateWritingParams): Promise<{
  success: boolean;
  evaluation?: WritingEvaluation;
  error?: string;
}> {
  try {
    // Get user ID if logged in (for saving to database)
    const { data: { user } } = await supabase.auth.getUser();
    const userId = user?.id;

    // Make direct API call with apikey header (no JWT required)
    const response = await fetch(`${import.meta.env.VITE_SUPABASE_URL}/functions/v1/evaluate-writing`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY}`,
        'apikey': import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY,
      },
      body: JSON.stringify({
        ...params,
        userId // Pass userId in body for database storage
      })
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('Evaluation error:', errorText);
      try {
        const errorJson = JSON.parse(errorText);
        return {
          success: false,
          error: errorJson.error || `HTTP ${response.status}: ${errorText}`
        };
      } catch {
        return {
          success: false,
          error: `HTTP ${response.status}: ${errorText}`
        };
      }
    }

    const data = await response.json();

    if (!data?.evaluation) {
      return {
        success: false,
        error: 'No evaluation data returned'
      };
    }

    return {
      success: true,
      evaluation: data.evaluation
    };
  } catch (err) {
    console.error('Unexpected error:', err);
    return {
      success: false,
      error: err instanceof Error ? err.message : 'An unexpected error occurred'
    };
  }
}

export async function getUserEvaluations(userId: string) {
  const { data, error } = await supabase
    .from('writing_evaluations')
    .select('*')
    .eq('user_id', userId)
    .order('created_at', { ascending: false });

  if (error) {
    console.error('Error fetching evaluations:', error);
    return null;
  }

  return data;
}

export async function getTestEvaluation(userId: string, testId: string, taskNumber: number) {
  const { data, error } = await supabase
    .from('writing_evaluations')
    .select('*')
    .eq('user_id', userId)
    .eq('test_id', testId)
    .eq('task_number', taskNumber)
    .order('created_at', { ascending: false })
    .limit(1)
    .single();

  if (error && error.code !== 'PGRST116') { // PGRST116 is "no rows returned"
    console.error('Error fetching evaluation:', error);
    return null;
  }

  return data;
}

// Helper function to get word count
export function getWordCount(text: string): number {
  return text.trim().split(/\s+/).filter(word => word.length > 0).length;
}

// Helper function to calculate average from scores
export function calculateAverageBand(scores: number[]): number {
  const sum = scores.reduce((acc, score) => acc + score, 0);
  const avg = sum / scores.length;
  // Round to nearest 0.5
  return Math.round(avg * 2) / 2;
}

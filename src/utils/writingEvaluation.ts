import { supabase } from '@/integrations/supabase/client';

export interface WritingEvaluation {
  taskAchievement: {
    score: number;
    feedback: string;
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
  strengths: string[];
  improvements: string[];
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
    // Check authentication first with detailed logging
    let { data: { session }, error: sessionError } = await supabase.auth.getSession();
    
    console.log('Session check:', { 
      hasSession: !!session, 
      hasAccessToken: !!session?.access_token,
      sessionError,
      tokenExpiry: session?.expires_at ? new Date(session.expires_at * 1000) : null,
      currentTime: new Date(),
      tokenStart: session?.access_token?.substring(0, 30) + '...',
      supabaseUrl: import.meta.env.VITE_SUPABASE_URL,
      supabaseKey: import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY?.substring(0, 30) + '...'
    });
    
    if (sessionError) {
      console.error('Session error:', sessionError);
      return {
        success: false,
        error: 'Session error. Please sign in again at /auth'
      };
    }
    
    if (!session) {
      return {
        success: false,
        error: 'Please sign in to use AI evaluation. Go to /auth to create an account or sign in.'
      };
    }

    // Test if we can get user info from the current session
    try {
      const { data: { user }, error: userError } = await supabase.auth.getUser();
      console.log('User verification:', {
        hasUser: !!user,
        userId: user?.id,
        userEmail: user?.email,
        userError: userError?.message
      });
      
      if (userError || !user) {
        console.error('User verification failed:', userError);
        return {
          success: false,
          error: `Authentication verification failed: ${userError?.message || 'User not found'}. Please sign out and sign in again.`
        };
      }
    } catch (e) {
      console.error('User verification exception:', e);
      return {
        success: false,
        error: 'Authentication system error. Please sign out and sign in again.'
      };
    }

    // Check if token is expired and try to refresh
    if (session.expires_at && session.expires_at * 1000 < Date.now()) {
      console.log('Token expired, attempting refresh...');
      const { data: { session: refreshedSession }, error: refreshError } = await supabase.auth.refreshSession();
      
      if (refreshError || !refreshedSession) {
        console.error('Token refresh failed:', refreshError);
        return {
          success: false,
          error: 'Session expired. Please sign in again at /auth'
        };
      }
      
      // Use the refreshed session
      session = refreshedSession;
    }

    // Validate JWT format before proceeding
    if (session?.access_token) {
      const tokenParts = session.access_token.split('.');
      console.log('JWT validation:', {
        hasBearerPrefix: session.access_token.startsWith('Bearer '),
        tokenParts: tokenParts.length,
        isValidJWT: tokenParts.length === 3,
        firstPartLength: tokenParts[0]?.length || 0
      });
      
      // If token has Bearer prefix, remove it
      if (session.access_token.startsWith('Bearer ')) {
        session = {
          ...session,
          access_token: session.access_token.replace('Bearer ', '')
        };
        console.log('Removed Bearer prefix from token');
      }
    }

    const { data, error } = await supabase.functions.invoke('evaluate-writing', {
      body: params
    });

    if (error) {
      console.error('Evaluation error:', error);
      
      // Try to extract more detailed error information
      let errorMessage = 'Failed to evaluate essay';
      
      if (error.message) {
        errorMessage = error.message;
      }
      
      // For FunctionsHttpError, try to get the response body
      if (error.context) {
        try {
          const errorDetails = error.context;
          if (errorDetails && typeof errorDetails === 'object') {
            errorMessage = errorDetails.error || errorDetails.message || errorMessage;
          }
        } catch (e) {
          console.warn('Could not parse error context:', e);
        }
      }
      
      // If we still don't have a good error message, try direct fetch
      if (errorMessage === 'Failed to evaluate essay' || errorMessage.includes('non-2xx status code')) {
        try {
          if (!session?.access_token) {
            return {
              success: false,
              error: 'Authentication required. Please sign in at /auth'
            };
          }
          
          console.log('Trying direct fetch with token:', session.access_token.substring(0, 20) + '...');
          
          const response = await fetch(`${import.meta.env.VITE_SUPABASE_URL}/functions/v1/evaluate-writing`, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'Authorization': `Bearer ${session.access_token}`,
              'apikey': import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY,
            },
            body: JSON.stringify(params)
          });
          
          if (!response.ok) {
            const errorText = await response.text();
            console.error('Direct fetch error response:', errorText);
            try {
              const errorJson = JSON.parse(errorText);
              const errorMessage = errorJson.error || errorText;
              
              // If it's an invalid JWT error, suggest signing out and back in
              if (errorMessage.includes('Invalid JWT') || errorJson.message === 'Invalid JWT') {
                // Force sign out and clear all auth data
                await supabase.auth.signOut();
                localStorage.clear();
                sessionStorage.clear();
                
                return {
                  success: false,
                  error: 'Authentication cleared due to invalid token. Please refresh the page and sign in again at /auth to get a fresh token from the correct project.'
                };
              }
              
              return {
                success: false,
                error: errorMessage
              };
            } catch (e) {
              return {
                success: false,
                error: `HTTP ${response.status}: ${errorText}`
              };
            }
          }
        } catch (fetchError) {
          console.error('Direct fetch failed:', fetchError);
        }
      }
      
      return {
        success: false,
        error: errorMessage
      };
    }

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

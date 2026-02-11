// =============================================================================
// Feedback Service
// All Supabase interactions for the feedback system.
// Handles eligibility checks, submission, dismissal, and admin queries.
// =============================================================================

import { supabase } from '@/integrations/supabase/client';
import type { FeedbackSubmission, FeedbackRecord, FeedbackEligibility, FeedbackStats } from '@/types/feedback';

const THIRTY_DAYS_MS = 30 * 24 * 60 * 60 * 1000;
const SEVEN_DAYS_MS = 7 * 24 * 60 * 60 * 1000;

// ---------------------------------------------------------------------------
// Eligibility — determines whether to show the feedback modal
// ---------------------------------------------------------------------------

export async function checkFeedbackEligibility(userId: string): Promise<FeedbackEligibility> {
  try {
    // 1. Fetch user profile for feedback tracking fields
    const { data: profile, error: profileErr } = await supabase
      .from('profiles')
      .select('has_submitted_feedback, last_feedback_prompt_at, feedback_dismissed_at, created_at')
      .eq('user_id', userId)
      .single();

    if (profileErr || !profile) {
      return { eligible: false, reason: 'Profile not found' };
    }

    // Already submitted → never show again
    if (profile.has_submitted_feedback) {
      return { eligible: false, reason: 'Already submitted feedback' };
    }

    const now = Date.now();

    // Dismissed within the last 30 days → wait
    if (profile.feedback_dismissed_at) {
      const dismissedAt = new Date(profile.feedback_dismissed_at).getTime();
      if (now - dismissedAt < THIRTY_DAYS_MS) {
        return { eligible: false, reason: 'Dismissed recently' };
      }
    }

    // Prompted within the last 30 days → wait
    if (profile.last_feedback_prompt_at) {
      const promptedAt = new Date(profile.last_feedback_prompt_at).getTime();
      if (now - promptedAt < THIRTY_DAYS_MS) {
        return { eligible: false, reason: 'Prompted recently' };
      }
    }

    // 2. Activity-based eligibility checks
    // Check if user has completed at least one test
    const { count: testCount } = await supabase
      .from('test_results')
      .select('id', { count: 'exact', head: true })
      .eq('user_id', userId);

    const hasCompletedTest = (testCount ?? 0) > 0;

    // Check if user has been active for 7+ days (account age)
    const accountAge = now - new Date(profile.created_at).getTime();
    const isSevenDaysOld = accountAge >= SEVEN_DAYS_MS;

    if (!hasCompletedTest && !isSevenDaysOld) {
      return { eligible: false, reason: 'Not enough activity' };
    }

    return { eligible: true };
  } catch {
    return { eligible: false, reason: 'Error checking eligibility' };
  }
}

// ---------------------------------------------------------------------------
// Submission
// ---------------------------------------------------------------------------

export async function submitFeedback(
  userId: string,
  feedback: FeedbackSubmission
): Promise<{ success: boolean; error?: string }> {
  // Client-side validation
  if (feedback.rating < 1 || feedback.rating > 5 || !Number.isInteger(feedback.rating)) {
    return { success: false, error: 'Rating must be an integer between 1 and 5' };
  }

  try {
    // Insert feedback row
    const { error: insertErr } = await supabase.from('feedback').insert({
      user_id: userId,
      rating: feedback.rating,
      message: feedback.message?.trim() || null,
      user_agent: navigator.userAgent,
      platform: feedback.platform ?? 'web',
      app_version: feedback.appVersion ?? null,
    });

    if (insertErr) {
      // Unique constraint → duplicate submission
      if (insertErr.code === '23505') {
        return { success: false, error: 'You have already submitted feedback today' };
      }
      return { success: false, error: insertErr.message };
    }

    // Mark profile as having submitted feedback
    await supabase
      .from('profiles')
      .update({
        has_submitted_feedback: true,
        last_feedback_prompt_at: new Date().toISOString(),
      })
      .eq('user_id', userId);

    return { success: true };
  } catch {
    return { success: false, error: 'Unexpected error submitting feedback' };
  }
}

// ---------------------------------------------------------------------------
// Dismissal — "Maybe later"
// ---------------------------------------------------------------------------

export async function dismissFeedback(userId: string): Promise<void> {
  const now = new Date().toISOString();
  await supabase
    .from('profiles')
    .update({
      feedback_dismissed_at: now,
      last_feedback_prompt_at: now,
    })
    .eq('user_id', userId);
}

// ---------------------------------------------------------------------------
// Record that a prompt was shown (prevents re-showing in same 30-day window)
// ---------------------------------------------------------------------------

export async function recordFeedbackPrompt(userId: string): Promise<void> {
  await supabase
    .from('profiles')
    .update({ last_feedback_prompt_at: new Date().toISOString() })
    .eq('user_id', userId);
}

// ---------------------------------------------------------------------------
// Admin: Fetch all feedback with optional filters
// ---------------------------------------------------------------------------

export async function fetchAllFeedback(options?: {
  ratingFilter?: number;
  sortOrder?: 'asc' | 'desc';
  limit?: number;
  offset?: number;
}): Promise<{ data: FeedbackRecord[]; total: number }> {
  const {
    ratingFilter,
    sortOrder = 'desc',
    limit = 50,
    offset = 0,
  } = options ?? {};

  let query = supabase
    .from('feedback')
    .select('*', { count: 'exact' })
    .order('created_at', { ascending: sortOrder === 'asc' })
    .range(offset, offset + limit - 1);

  if (ratingFilter && ratingFilter >= 1 && ratingFilter <= 5) {
    query = query.eq('rating', ratingFilter);
  }

  const { data, count, error } = await query;

  if (error) throw error;

  return {
    data: (data ?? []) as FeedbackRecord[],
    total: count ?? 0,
  };
}

// ---------------------------------------------------------------------------
// Admin: Aggregate analytics
// ---------------------------------------------------------------------------

export async function getFeedbackStats(): Promise<FeedbackStats> {
  const { data, error } = await supabase
    .from('feedback')
    .select('rating');

  if (error) throw error;

  const ratings = (data ?? []).map((r) => r.rating);
  const totalCount = ratings.length;
  const averageRating =
    totalCount > 0 ? ratings.reduce((a, b) => a + b, 0) / totalCount : 0;

  const ratingDistribution: Record<number, number> = { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 };
  ratings.forEach((r) => {
    ratingDistribution[r] = (ratingDistribution[r] ?? 0) + 1;
  });

  return { totalCount, averageRating, ratingDistribution };
}

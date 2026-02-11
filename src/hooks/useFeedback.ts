// =============================================================================
// useFeedback Hook
// Manages the entire feedback lifecycle: eligibility check, show/hide modal,
// submission, and dismissal.  Uses localStorage as a fast first-pass guard
// so we don't hit Supabase on every page load.
// =============================================================================

import { useState, useEffect, useCallback } from 'react';
import { useAuth } from '@/hooks/useAuth';
import {
  checkFeedbackEligibility,
  submitFeedback,
  dismissFeedback,
  recordFeedbackPrompt,
} from '@/lib/feedbackService';
import type { FeedbackSubmission } from '@/types/feedback';

const LS_DISMISSED_KEY = 'lexora_feedback_dismissed_at';
const LS_SUBMITTED_KEY = 'lexora_feedback_submitted';
const THIRTY_DAYS_MS = 30 * 24 * 60 * 60 * 1000;

// Quick localStorage guard (avoids unnecessary Supabase calls)
function isLocallyBlocked(): boolean {
  // Already submitted
  if (localStorage.getItem(LS_SUBMITTED_KEY) === 'true') return true;

  // Dismissed recently
  const dismissed = localStorage.getItem(LS_DISMISSED_KEY);
  if (dismissed) {
    const ts = parseInt(dismissed, 10);
    if (Date.now() - ts < THIRTY_DAYS_MS) return true;
  }

  return false;
}

export function useFeedback() {
  const { user } = useAuth();
  const [showModal, setShowModal] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [submitted, setSubmitted] = useState(false);

  // -------------------------------------------------------------------------
  // On mount (or user change), decide whether to show the modal
  // -------------------------------------------------------------------------
  useEffect(() => {
    // TODO: REMOVE THIS FORCE-TEST BLOCK AFTER PREVIEWING
    setTimeout(() => setShowModal(true), 1000);
    return;
    // END FORCE-TEST BLOCK

    if (!user) return;

    // Fast local guard
    if (isLocallyBlocked()) return;

    // Authoritative server-side check
    let cancelled = false;

    const check = async () => {
      const { eligible } = await checkFeedbackEligibility(user.id);
      if (!cancelled && eligible) {
        // Record that we showed the prompt (starts the 30-day window)
        await recordFeedbackPrompt(user.id);
        // Small delay so the modal doesn't flash during page load
        setTimeout(() => {
          if (!cancelled) setShowModal(true);
        }, 2000);
      }
    };

    check();
    return () => { cancelled = true; };
  }, [user]);

  // -------------------------------------------------------------------------
  // Submit feedback
  // -------------------------------------------------------------------------
  const handleSubmit = useCallback(
    async (data: FeedbackSubmission) => {
      if (!user) return;
      setIsSubmitting(true);
      setSubmitError(null);

      const result = await submitFeedback(user.id, data);

      setIsSubmitting(false);

      if (result.success) {
        localStorage.setItem(LS_SUBMITTED_KEY, 'true');
        setSubmitted(true);
        // Close modal after a short thank-you delay
        setTimeout(() => setShowModal(false), 1800);
      } else {
        setSubmitError(result.error ?? 'Something went wrong');
      }
    },
    [user],
  );

  // -------------------------------------------------------------------------
  // Dismiss — "Maybe later"
  // -------------------------------------------------------------------------
  const handleDismiss = useCallback(async () => {
    if (!user) return;
    localStorage.setItem(LS_DISMISSED_KEY, Date.now().toString());
    setShowModal(false);
    await dismissFeedback(user.id);
  }, [user]);

  return {
    showModal,
    isSubmitting,
    submitError,
    submitted,
    handleSubmit,
    handleDismiss,
  };
}

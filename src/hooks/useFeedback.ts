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

function isLocallyBlocked(): boolean {
  if (localStorage.getItem(LS_SUBMITTED_KEY) === 'true') return true;
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

  useEffect(() => {
    if (!user) return;
    if (isLocallyBlocked()) return;

    let cancelled = false;

    const check = async () => {
      const { eligible } = await checkFeedbackEligibility(user.id);
      if (!cancelled && eligible) {
        await recordFeedbackPrompt(user.id);
        setTimeout(() => {
          if (!cancelled) setShowModal(true);
        }, 2000);
      }
    };

    check();
    return () => { cancelled = true; };
  }, [user]);

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
        setTimeout(() => setShowModal(false), 1800);
      } else {
        setSubmitError(result.error ?? 'Something went wrong');
      }
    },
    [user],
  );

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

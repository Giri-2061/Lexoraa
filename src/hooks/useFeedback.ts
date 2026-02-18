import { useState, useEffect, useCallback, useRef } from 'react';
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
const LS_SESSION_TIME_KEY = 'lexora_cumulative_session_ms';
const LS_SESSION_START_KEY = 'lexora_session_start';
const THIRTY_DAYS_MS = 30 * 24 * 60 * 60 * 1000;
const FOUR_HOURS_MS = 4 * 60 * 60 * 1000;
const SESSION_TICK_MS = 30_000; // persist every 30s

function isLocallyBlocked(): boolean {
  if (localStorage.getItem(LS_SUBMITTED_KEY) === 'true') return true;
  const dismissed = localStorage.getItem(LS_DISMISSED_KEY);
  if (dismissed) {
    const ts = parseInt(dismissed, 10);
    if (Date.now() - ts < THIRTY_DAYS_MS) return true;
  }
  return false;
}

/** Returns cumulative usage time in ms (persisted across sessions). */
function getCumulativeSessionMs(): number {
  return parseInt(localStorage.getItem(LS_SESSION_TIME_KEY) ?? '0', 10);
}

function persistSessionTime(): void {
  const start = localStorage.getItem(LS_SESSION_START_KEY);
  if (!start) return;
  const elapsed = Date.now() - parseInt(start, 10);
  const prev = getCumulativeSessionMs();
  localStorage.setItem(LS_SESSION_TIME_KEY, String(prev + elapsed));
  localStorage.setItem(LS_SESSION_START_KEY, String(Date.now()));
}

export function useFeedback() {
  const { user } = useAuth();
  const [showModal, setShowModal] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [submitted, setSubmitted] = useState(false);
  const hasTriggered = useRef(false);

  // ── Session time tracker ──────────────────────────────────────────────
  useEffect(() => {
    if (!user) return;

    // Mark session start
    localStorage.setItem(LS_SESSION_START_KEY, String(Date.now()));

    const interval = setInterval(persistSessionTime, SESSION_TICK_MS);

    const handleUnload = () => persistSessionTime();
    window.addEventListener('beforeunload', handleUnload);

    return () => {
      persistSessionTime();
      clearInterval(interval);
      window.removeEventListener('beforeunload', handleUnload);
    };
  }, [user]);

  // ── Auto-prompt check (on mount + on cumulative-time threshold) ───────
  useEffect(() => {
    if (!user) return;
    if (isLocallyBlocked()) return;
    if (hasTriggered.current) return;

    let cancelled = false;

    const tryPrompt = async () => {
      const { eligible } = await checkFeedbackEligibility(user.id);
      if (!cancelled && eligible) {
        hasTriggered.current = true;
        await recordFeedbackPrompt(user.id);
        setTimeout(() => {
          if (!cancelled) setShowModal(true);
        }, 2000);
      }
    };

    // Check on mount (covers 7-day / test-based eligibility)
    tryPrompt();

    // Also check periodically for the 4hr cumulative threshold
    const timer = setInterval(() => {
      if (hasTriggered.current || isLocallyBlocked()) return;
      const total = getCumulativeSessionMs();
      if (total >= FOUR_HOURS_MS) {
        tryPrompt();
      }
    }, SESSION_TICK_MS);

    return () => {
      cancelled = true;
      clearInterval(timer);
    };
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

  /** Open the feedback modal manually (e.g. from the floating button). */
  const openManually = useCallback(() => {
    if (!user) return;
    // Allow reopening even if already submitted — the modal shows the thank-you state
    setSubmitted(localStorage.getItem(LS_SUBMITTED_KEY) === 'true');
    setSubmitError(null);
    setShowModal(true);
  }, [user]);

  return {
    showModal,
    isSubmitting,
    submitError,
    submitted,
    handleSubmit,
    handleDismiss,
    openManually,
    isLoggedIn: !!user,
    hasAlreadySubmitted: localStorage.getItem(LS_SUBMITTED_KEY) === 'true',
  };
}

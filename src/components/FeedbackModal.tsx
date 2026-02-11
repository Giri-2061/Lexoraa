// =============================================================================
// FeedbackModal
// A clean, non-intrusive modal with star rating + optional text.
// Inspired by the feedback UX of Notion, Linear, and Duolingo.
// =============================================================================

import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Star, X, MessageSquareHeart, Loader2, CheckCircle2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import type { FeedbackSubmission } from '@/types/feedback';

interface FeedbackModalProps {
  open: boolean;
  submitted: boolean;
  isSubmitting: boolean;
  submitError: string | null;
  onSubmit: (data: FeedbackSubmission) => void;
  onDismiss: () => void;
}

export default function FeedbackModal({
  open,
  submitted,
  isSubmitting,
  submitError,
  onSubmit,
  onDismiss,
}: FeedbackModalProps) {
  const [rating, setRating] = useState(0);
  const [hoveredStar, setHoveredStar] = useState(0);
  const [message, setMessage] = useState('');

  const handleSubmit = () => {
    if (rating === 0) return;
    onSubmit({
      rating,
      message: message.trim() || null,
      platform: 'web',
    });
  };

  const ratingLabels: Record<number, string> = {
    1: 'Poor',
    2: 'Fair',
    3: 'Good',
    4: 'Great',
    5: 'Excellent',
  };

  return (
    <AnimatePresence>
      {open && (
        <>
          {/* Backdrop */}
          <motion.div
            className="fixed inset-0 z-[60] bg-black/40 backdrop-blur-sm"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onDismiss}
          />

          {/* Modal */}
          <motion.div
            className="fixed inset-0 z-[61] flex items-center justify-center p-4"
            initial={{ opacity: 0, scale: 0.95, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 20 }}
            transition={{ type: 'spring', damping: 25, stiffness: 300 }}
          >
            <div className="relative w-full max-w-md rounded-2xl bg-background border border-border shadow-2xl overflow-hidden">
              {/* Close button */}
              <button
                onClick={onDismiss}
                className="absolute right-4 top-4 rounded-full p-1.5 text-muted-foreground hover:bg-muted transition-colors"
                aria-label="Close feedback"
              >
                <X className="h-4 w-4" />
              </button>

              <div className="p-6 sm:p-8">
                {/* ---- Thank-you state ---- */}
                {submitted ? (
                  <motion.div
                    className="flex flex-col items-center gap-4 py-6 text-center"
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                  >
                    <CheckCircle2 className="h-14 w-14 text-green-500" />
                    <h3 className="text-xl font-semibold text-foreground">
                      Thank you for your feedback!
                    </h3>
                    <p className="text-sm text-muted-foreground">
                      Your input helps us make Lexora better for everyone.
                    </p>
                  </motion.div>
                ) : (
                  <>
                    {/* Header */}
                    <div className="flex items-center gap-3 mb-5">
                      <div className="flex h-10 w-10 items-center justify-center rounded-full bg-primary/10">
                        <MessageSquareHeart className="h-5 w-5 text-primary" />
                      </div>
                      <div>
                        <h3 className="text-lg font-semibold text-foreground">
                          How's your experience?
                        </h3>
                        <p className="text-sm text-muted-foreground">
                          We'd love to hear your feedback
                        </p>
                      </div>
                    </div>

                    {/* Star Rating */}
                    <div className="mb-1">
                      <div className="flex items-center justify-center gap-2">
                        {[1, 2, 3, 4, 5].map((star) => {
                          const filled = star <= (hoveredStar || rating);
                          return (
                            <button
                              key={star}
                              type="button"
                              onClick={() => setRating(star)}
                              onMouseEnter={() => setHoveredStar(star)}
                              onMouseLeave={() => setHoveredStar(0)}
                              className="group relative p-1 transition-transform hover:scale-110 active:scale-95"
                              aria-label={`Rate ${star} star${star > 1 ? 's' : ''}`}
                            >
                              <Star
                                className={`h-9 w-9 transition-colors ${
                                  filled
                                    ? 'fill-yellow-400 text-yellow-400'
                                    : 'fill-transparent text-muted-foreground/40 group-hover:text-yellow-300'
                                }`}
                              />
                            </button>
                          );
                        })}
                      </div>
                      <p className="mt-1 h-5 text-center text-sm font-medium text-muted-foreground">
                        {ratingLabels[hoveredStar || rating] ?? '\u00A0'}
                      </p>
                    </div>

                    {/* Optional message */}
                    <div className="mb-5">
                      <Textarea
                        placeholder="Tell us more (optional)..."
                        value={message}
                        onChange={(e) => setMessage(e.target.value)}
                        rows={3}
                        maxLength={1000}
                        className="resize-none text-sm"
                      />
                      <p className="mt-1 text-right text-xs text-muted-foreground">
                        {message.length}/1000
                      </p>
                    </div>

                    {/* Error */}
                    {submitError && (
                      <p className="mb-3 text-sm text-destructive text-center">{submitError}</p>
                    )}

                    {/* Actions */}
                    <div className="flex flex-col gap-2 sm:flex-row sm:justify-end">
                      <Button
                        variant="ghost"
                        onClick={onDismiss}
                        disabled={isSubmitting}
                        className="text-muted-foreground"
                      >
                        Maybe later
                      </Button>
                      <Button
                        onClick={handleSubmit}
                        disabled={rating === 0 || isSubmitting}
                        className="gap-2"
                      >
                        {isSubmitting ? (
                          <>
                            <Loader2 className="h-4 w-4 animate-spin" />
                            Submitting…
                          </>
                        ) : (
                          'Submit Feedback'
                        )}
                      </Button>
                    </div>
                  </>
                )}
              </div>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}

// =============================================================================
// FeedbackProvider
// A thin wrapper that auto-renders the FeedbackModal for authenticated users.
// Drop this inside <AuthProvider> and it handles everything automatically.
// =============================================================================

import FeedbackModal from '@/components/FeedbackModal';
import { useFeedback } from '@/hooks/useFeedback';

export default function FeedbackProvider() {
  const {
    showModal,
    isSubmitting,
    submitError,
    submitted,
    handleSubmit,
    handleDismiss,
  } = useFeedback();

  console.log('[FeedbackProvider] showModal:', showModal);

  return (
    <FeedbackModal
      open={showModal}
      submitted={submitted}
      isSubmitting={isSubmitting}
      submitError={submitError}
      onSubmit={handleSubmit}
      onDismiss={handleDismiss}
    />
  );
}

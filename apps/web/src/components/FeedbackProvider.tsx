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

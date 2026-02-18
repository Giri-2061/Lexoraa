import FeedbackModal from '@/components/FeedbackModal';
import FeedbackButton from '@/components/FeedbackButton';
import { useFeedback } from '@/hooks/useFeedback';

export default function FeedbackProvider() {
  const {
    showModal,
    isSubmitting,
    submitError,
    submitted,
    handleSubmit,
    handleDismiss,
    openManually,
    isLoggedIn,
  } = useFeedback();

  return (
    <>
      {/* Floating feedback button – visible when logged in & modal is closed */}
      {isLoggedIn && !showModal && (
        <FeedbackButton onClick={openManually} />
      )}

      <FeedbackModal
        open={showModal}
        submitted={submitted}
        isSubmitting={isSubmitting}
        submitError={submitError}
        onSubmit={handleSubmit}
        onDismiss={handleDismiss}
      />
    </>
  );
}

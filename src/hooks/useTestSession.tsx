import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";

type UseTestSessionOptions = {
  onConfirmExit?: () => void;
};

export function useTestSession(durationMinutes: number, opts?: UseTestSessionOptions) {
  const navigate = useNavigate();
  const [started, setStarted] = useState(false);
  const [timeLeft, setTimeLeft] = useState(durationMinutes * 60);
  const [showConfirmExit, setShowConfirmExit] = useState(false);

  useEffect(() => {
    if (!started) return;
    const t = setInterval(() => setTimeLeft(s => Math.max(0, s - 1)), 1000);
    return () => clearInterval(t);
  }, [started]);

  const openExit = () => setShowConfirmExit(true);
  const closeExit = () => setShowConfirmExit(false);

  const confirmExit = () => {
    // reset state
    setStarted(false);
    setTimeLeft(durationMinutes * 60);
    setShowConfirmExit(false);
    try { opts?.onConfirmExit?.(); } catch {}
    navigate('/mock-tests');
  };

  return {
    started,
    setStarted,
    timeLeft,
    setTimeLeft,
    showConfirmExit,
    openExit,
    closeExit,
    confirmExit,
  } as const;
}

export default useTestSession;

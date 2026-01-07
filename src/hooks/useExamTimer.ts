import { useState, useEffect, useCallback, useRef } from 'react';

interface UseExamTimerProps {
  initialSeconds: number;
  onTimeUp?: () => void;
  autoSaveInterval?: number;
  onAutoSave?: () => void;
}

export const useExamTimer = ({
  initialSeconds,
  onTimeUp,
  autoSaveInterval = 30,
  onAutoSave,
}: UseExamTimerProps) => {
  const [timeRemaining, setTimeRemaining] = useState(initialSeconds);
  const [isPaused, setIsPaused] = useState(false);
  const autoSaveCounterRef = useRef(0);

  useEffect(() => {
    if (isPaused || timeRemaining <= 0) return;

    const interval = setInterval(() => {
      setTimeRemaining((prev) => {
        if (prev <= 1) {
          clearInterval(interval);
          onTimeUp?.();
          return 0;
        }
        return prev - 1;
      });

      // Auto-save logic
      autoSaveCounterRef.current += 1;
      if (autoSaveCounterRef.current >= autoSaveInterval) {
        autoSaveCounterRef.current = 0;
        onAutoSave?.();
      }
    }, 1000);

    return () => clearInterval(interval);
  }, [isPaused, timeRemaining, onTimeUp, autoSaveInterval, onAutoSave]);

  const formatTime = useCallback((seconds: number) => {
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    const secs = seconds % 60;

    if (hours > 0) {
      return `${hours.toString().padStart(2, '0')}:${minutes
        .toString()
        .padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
    }
    return `${minutes.toString().padStart(2, '0')}:${secs
      .toString()
      .padStart(2, '0')}`;
  }, []);

  const pause = useCallback(() => setIsPaused(true), []);
  const resume = useCallback(() => setIsPaused(false), []);

  const isWarning = timeRemaining <= 300 && timeRemaining > 60; // Last 5 minutes
  const isCritical = timeRemaining <= 60; // Last minute

  return {
    timeRemaining,
    formattedTime: formatTime(timeRemaining),
    isPaused,
    pause,
    resume,
    isWarning,
    isCritical,
  };
};

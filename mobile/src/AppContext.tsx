import React, { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import {
  addAttempt as addAttemptTo,
  clearProgress,
  emptyProgress,
  loadProgress,
  recordAnswer as recordAnswerIn,
  saveProgress,
  toggleFlag as toggleFlagIn,
} from './store';
import type { Attempt, Progress } from './types';

interface AppContextValue {
  progress: Progress;
  ready: boolean;
  recordAnswer: (id: string, correct: boolean) => void;
  toggleFlag: (id: string) => void;
  addAttempt: (attempt: Attempt) => void;
  resetAll: () => void;
}

const AppContext = createContext<AppContextValue | null>(null);

export function useApp(): AppContextValue {
  const ctx = useContext(AppContext);
  if (!ctx) throw new Error('useApp must be used inside <AppProvider>');
  return ctx;
}

export function AppProvider({ children }: { children: React.ReactNode }) {
  const [progress, setProgress] = useState<Progress>(emptyProgress);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    let active = true;
    loadProgress().then((p) => {
      if (!active) return;
      setProgress(p);
      setReady(true);
    });
    return () => {
      active = false;
    };
  }, []);

  // Persist whenever progress changes, but not for the initial empty placeholder.
  useEffect(() => {
    if (ready) void saveProgress(progress);
  }, [progress, ready]);

  const recordAnswer = useCallback((id: string, correct: boolean) => {
    setProgress((p) => recordAnswerIn(p, id, correct));
  }, []);

  const toggleFlag = useCallback((id: string) => {
    setProgress((p) => toggleFlagIn(p, id));
  }, []);

  const addAttempt = useCallback((attempt: Attempt) => {
    setProgress((p) => addAttemptTo(p, attempt));
  }, []);

  const resetAll = useCallback(() => {
    setProgress(emptyProgress());
    void clearProgress();
  }, []);

  const value = useMemo(
    () => ({ progress, ready, recordAnswer, toggleFlag, addAttempt, resetAll }),
    [progress, ready, recordAnswer, toggleFlag, addAttempt, resetAll]
  );

  return <AppContext.Provider value={value}>{children}</AppContext.Provider>;
}

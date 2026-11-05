import AsyncStorage from '@react-native-async-storage/async-storage';
import type { Attempt, Progress, QuizState } from './types';

const PROGRESS_KEY = 'psm1.progress.v1';
const EXAM_KEY = 'psm1.exam.v1';

export const emptyProgress = (): Progress => ({ seen: {}, flags: {}, attempts: [] });

export async function loadProgress(): Promise<Progress> {
  try {
    const raw = await AsyncStorage.getItem(PROGRESS_KEY);
    if (!raw) return emptyProgress();
    const parsed = JSON.parse(raw) as Partial<Progress>;
    return {
      seen: parsed.seen ?? {},
      flags: parsed.flags ?? {},
      attempts: parsed.attempts ?? [],
    };
  } catch {
    return emptyProgress();
  }
}

export async function saveProgress(p: Progress): Promise<void> {
  try {
    await AsyncStorage.setItem(PROGRESS_KEY, JSON.stringify(p));
  } catch {
    // Storage failures are non-fatal: the session continues in memory.
  }
}

export async function clearProgress(): Promise<void> {
  await AsyncStorage.multiRemove([PROGRESS_KEY, EXAM_KEY]);
}

/** Minimal shape persisted for an in-flight exam so it survives app restarts. */
export interface SavedExam {
  ids: string[];
  orders: number[][];
  answers: Record<string, number[]>;
  index: number;
  endsAt: number;
}

export async function saveExam(state: QuizState): Promise<void> {
  if (state.mode !== 'exam' || state.endsAt == null) return;
  const payload: SavedExam = {
    ids: state.questions.map((q) => q.id),
    orders: state.questions.map((q) => q.order),
    answers: state.answers,
    index: state.index,
    endsAt: state.endsAt,
  };
  try {
    await AsyncStorage.setItem(EXAM_KEY, JSON.stringify(payload));
  } catch {
    // ignore
  }
}

export async function loadExam(): Promise<SavedExam | null> {
  try {
    const raw = await AsyncStorage.getItem(EXAM_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as SavedExam;
    if (!parsed?.ids?.length || parsed.endsAt <= Date.now()) return null;
    return parsed;
  } catch {
    return null;
  }
}

export async function clearExam(): Promise<void> {
  try {
    await AsyncStorage.removeItem(EXAM_KEY);
  } catch {
    // ignore
  }
}

export function recordAnswer(p: Progress, id: string, correct: boolean): Progress {
  const prev = p.seen[id] ?? { right: 0, wrong: 0, last: 'right' as const, at: 0 };
  return {
    ...p,
    seen: {
      ...p.seen,
      [id]: {
        right: prev.right + (correct ? 1 : 0),
        wrong: prev.wrong + (correct ? 0 : 1),
        last: correct ? 'right' : 'wrong',
        at: Date.now(),
      },
    },
  };
}

export function toggleFlag(p: Progress, id: string): Progress {
  const flags = { ...p.flags };
  if (flags[id]) delete flags[id];
  else flags[id] = true;
  return { ...p, flags };
}

export function addAttempt(p: Progress, a: Attempt): Progress {
  return { ...p, attempts: [...p.attempts, a] };
}

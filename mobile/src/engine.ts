import rawQuestions from './data/questions.json';
import type { DealtQuestion, Difficulty, Progress, Question } from './types';

export const QUESTIONS = rawQuestions as Question[];

export const EXAM_SIZE = 80;
export const EXAM_MINUTES = 60;
export const PASS_MARK = 85;

export const DOMAINS = Array.from(new Set(QUESTIONS.map((q) => q.domain))).sort();

export const LETTERS = 'ABCDEFGH';

export function shuffle<T>(input: readonly T[]): T[] {
  const a = input.slice();
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

export function deal(q: Question): DealtQuestion {
  return { ...q, order: shuffle(q.options.map((_, i) => i)) };
}

export function isCorrect(picked: readonly number[], correct: readonly number[]): boolean {
  if (picked.length !== correct.length) return false;
  const a = [...picked].sort((x, y) => x - y);
  const b = [...correct].sort((x, y) => x - y);
  return a.every((v, i) => v === b[i]);
}

export interface PracticeFilters {
  domain: string | null;
  difficulty: Difficulty | null;
  count: number | 'all';
  unseenFirst: boolean;
  onlyWrong: boolean;
}

export function buildPracticeSet(filters: PracticeFilters, progress: Progress): DealtQuestion[] {
  let pool = QUESTIONS.filter(
    (q) =>
      (!filters.domain || q.domain === filters.domain) &&
      (!filters.difficulty || q.difficulty === filters.difficulty)
  );

  if (filters.onlyWrong) {
    pool = pool.filter((q) => progress.flags[q.id] || progress.seen[q.id]?.last === 'wrong');
  }

  let ordered = shuffle(pool);
  if (filters.unseenFirst) {
    ordered = [...ordered].sort(
      (a, b) => (progress.seen[a.id] ? 1 : 0) - (progress.seen[b.id] ? 1 : 0)
    );
  }
  if (filters.count !== 'all') ordered = ordered.slice(0, filters.count);
  return ordered.map(deal);
}

export function buildExamSet(): DealtQuestion[] {
  return shuffle(QUESTIONS).slice(0, Math.min(EXAM_SIZE, QUESTIONS.length)).map(deal);
}

export interface DomainScore {
  domain: string;
  total: number;
  correct: number;
  pct: number;
}

export function scoreByDomain(
  questions: readonly DealtQuestion[],
  answers: Record<string, number[]>
): DomainScore[] {
  const map = new Map<string, { total: number; correct: number }>();
  for (const q of questions) {
    const entry = map.get(q.domain) ?? { total: 0, correct: 0 };
    entry.total += 1;
    if (isCorrect(answers[q.id] ?? [], q.correct)) entry.correct += 1;
    map.set(q.domain, entry);
  }
  return Array.from(map.entries())
    .map(([domain, v]) => ({
      domain,
      total: v.total,
      correct: v.correct,
      pct: v.total ? Math.round((v.correct / v.total) * 100) : 0,
    }))
    .sort((a, b) => a.domain.localeCompare(b.domain));
}

export function searchQuestions(
  term: string,
  domain: string | null,
  difficulty: Difficulty | null,
  flaggedOnly: boolean,
  progress: Progress
): Question[] {
  const tokens = term.trim().toLowerCase().split(/\s+/).filter(Boolean);
  return QUESTIONS.filter((q) => {
    if (domain && q.domain !== domain) return false;
    if (difficulty && q.difficulty !== difficulty) return false;
    if (flaggedOnly && !progress.flags[q.id]) return false;
    if (!tokens.length) return true;
    const hay = `${q.id} ${q.question} ${q.options.join(' ')} ${q.explanation}`.toLowerCase();
    return tokens.every((t) => hay.includes(t));
  });
}

export function formatClock(ms: number): string {
  const safe = Math.max(0, ms);
  const m = Math.floor(safe / 60000);
  const s = Math.floor((safe % 60000) / 1000);
  return `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
}

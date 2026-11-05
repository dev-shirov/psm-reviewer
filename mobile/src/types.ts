export type Difficulty = 'easy' | 'medium' | 'hard';
export type QuestionType = 'single' | 'multiple';

export interface Question {
  id: string;
  domain: string;
  difficulty: Difficulty;
  type: QuestionType;
  question: string;
  options: string[];
  correct: number[];
  explanation: string;
  reference: string;
}

/** A question with its options shuffled for one particular attempt. */
export interface DealtQuestion extends Question {
  /** Display order: entry i holds the ORIGINAL option index shown in position i. */
  order: number[];
}

export type QuizMode = 'practice' | 'exam';

export interface QuizState {
  mode: QuizMode;
  questions: DealtQuestion[];
  index: number;
  /** question id -> chosen ORIGINAL option indices */
  answers: Record<string, number[]>;
  /** question id -> graded (practice only) */
  checked: Record<string, boolean>;
  startedAt: number;
  endsAt: number | null;
}

export interface QuestionStat {
  right: number;
  wrong: number;
  last: 'right' | 'wrong';
  at: number;
}

export interface Attempt {
  at: number;
  mode: QuizMode;
  total: number;
  correct: number;
  pct: number;
  minutes: number;
}

export interface Progress {
  seen: Record<string, QuestionStat>;
  flags: Record<string, true>;
  attempts: Attempt[];
}

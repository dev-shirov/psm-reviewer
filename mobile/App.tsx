import { StatusBar } from 'expo-status-bar';
import React, { useCallback, useEffect, useState } from 'react';
import { Pressable, Text, View } from 'react-native';
import { SafeAreaProvider, useSafeAreaInsets } from 'react-native-safe-area-context';
import { AppProvider, useApp } from './src/AppContext';
import { confirmAction, notify } from './src/dialogs';
import { ThemeProvider, useTheme } from './src/ThemeContext';
import {
  QUESTIONS,
  buildExamSet,
  buildPracticeSet,
  deal,
  isCorrect,
  shuffle,
} from './src/engine';
import { BrowseScreen } from './src/screens/BrowseScreen';
import { FlashcardsScreen } from './src/screens/FlashcardsScreen';
import { HomeScreen, type PracticeRequest } from './src/screens/HomeScreen';
import { QuizScreen, type FinishPayload } from './src/screens/QuizScreen';
import { ResultsScreen } from './src/screens/ResultsScreen';
import { StatsScreen } from './src/screens/StatsScreen';
import { clearExam, loadExam } from './src/store';
import { spacing } from './src/theme';
import type { DealtQuestion, Question, QuizMode } from './src/types';

type Tab = 'home' | 'browse' | 'stats';

type Overlay =
  | { kind: 'none' }
  | {
      kind: 'quiz';
      mode: QuizMode;
      questions: DealtQuestion[];
      initialAnswers?: Record<string, number[]>;
      initialIndex?: number;
      endsAt?: number | null;
    }
  | { kind: 'flashcards'; questions: Question[] }
  | {
      kind: 'results';
      mode: QuizMode;
      questions: DealtQuestion[];
      answers: Record<string, number[]>;
      elapsedMs: number;
    };

const TABS: { key: Tab; label: string; icon: string }[] = [
  { key: 'home', label: 'Study', icon: '🏠' },
  { key: 'browse', label: 'Browse', icon: '🔍' },
  { key: 'stats', label: 'Stats', icon: '📊' },
];

function TabBar({ tab, onChange }: { tab: Tab; onChange: (t: Tab) => void }) {
  const t = useTheme();
  const insets = useSafeAreaInsets();
  return (
    <View
      style={{
        position: 'absolute',
        left: 0,
        right: 0,
        bottom: 0,
        flexDirection: 'row',
        backgroundColor: t.surface,
        borderTopWidth: 1,
        borderTopColor: t.border,
        paddingBottom: Math.max(insets.bottom, spacing.sm),
        paddingTop: spacing.sm,
      }}>
      {TABS.map((item) => {
        const active = item.key === tab;
        return (
          <Pressable
            key={item.key}
            onPress={() => onChange(item.key)}
            accessibilityRole="tab"
            accessibilityState={{ selected: active }}
            accessibilityLabel={item.label}
            style={{ flex: 1, alignItems: 'center', paddingVertical: 4 }}>
            <Text style={{ fontSize: 20, opacity: active ? 1 : 0.45 }}>{item.icon}</Text>
            <Text
              style={{
                color: active ? t.accent : t.muted,
                fontSize: 11,
                fontWeight: active ? '700' : '500',
                marginTop: 2,
              }}>
              {item.label}
            </Text>
          </Pressable>
        );
      })}
    </View>
  );
}

function Root() {
  const t = useTheme();
  const { progress, ready, addAttempt } = useApp();
  const [tab, setTab] = useState<Tab>('home');
  const [overlay, setOverlay] = useState<Overlay>({ kind: 'none' });
  const [hasSavedExam, setHasSavedExam] = useState(false);

  const refreshSavedExam = useCallback(() => {
    loadExam().then((saved) => setHasSavedExam(!!saved));
  }, []);

  useEffect(() => {
    refreshSavedExam();
  }, [refreshSavedExam]);

  const startPractice = (req: PracticeRequest) => {
    const questions = buildPracticeSet(req, progress);
    if (!questions.length) {
      notify('Nothing to practice', 'No questions match those filters — try widening them.');
      return;
    }
    setOverlay({ kind: 'quiz', mode: 'practice', questions });
  };

  const startExam = () => {
    const launch = () => {
      void clearExam();
      setHasSavedExam(false);
      setOverlay({ kind: 'quiz', mode: 'exam', questions: buildExamSet() });
    };
    if (hasSavedExam) {
      confirmAction({
        title: 'Start a new exam?',
        message: 'This discards your saved exam in progress.',
        confirmLabel: 'Start new',
        destructive: true,
        onConfirm: launch,
      });
      return;
    }
    launch();
  };

  const resumeExam = async () => {
    const saved = await loadExam();
    if (!saved) {
      setHasSavedExam(false);
      notify('No saved exam', 'That exam is no longer available.');
      return;
    }
    const byId = new Map(QUESTIONS.map((q) => [q.id, q]));
    const questions: DealtQuestion[] = saved.ids
      .map((id, i) => {
        const base = byId.get(id);
        return base ? { ...base, order: saved.orders[i] } : null;
      })
      .filter((q): q is DealtQuestion => q !== null);

    if (!questions.length) {
      void clearExam();
      setHasSavedExam(false);
      notify('No saved exam', 'That exam is no longer available.');
      return;
    }
    setOverlay({
      kind: 'quiz',
      mode: 'exam',
      questions,
      initialAnswers: saved.answers,
      initialIndex: Math.min(saved.index, questions.length - 1),
      endsAt: saved.endsAt,
    });
  };

  const startFlashcards = (domain: string | null) => {
    const pool = shuffle(QUESTIONS.filter((q) => !domain || q.domain === domain));
    if (!pool.length) return;
    setOverlay({ kind: 'flashcards', questions: pool });
  };

  const handleFinish = (payload: FinishPayload) => {
    const correct = payload.questions.filter((q) =>
      isCorrect(payload.answers[q.id] ?? [], q.correct)
    ).length;
    addAttempt({
      at: Date.now(),
      mode: payload.mode,
      total: payload.questions.length,
      correct,
      pct: payload.questions.length
        ? Math.round((correct / payload.questions.length) * 100)
        : 0,
      minutes: Math.max(1, Math.round(payload.elapsedMs / 60000)),
    });
    refreshSavedExam();
    setOverlay({
      kind: 'results',
      mode: payload.mode,
      questions: payload.questions,
      answers: payload.answers,
      elapsedMs: payload.elapsedMs,
    });
  };

  const closeOverlay = () => {
    refreshSavedExam();
    setOverlay({ kind: 'none' });
  };

  if (!ready) {
    return (
      <View style={{ flex: 1, backgroundColor: t.bg, alignItems: 'center', justifyContent: 'center' }}>
        <Text style={{ color: t.muted }}>Loading question bank…</Text>
      </View>
    );
  }

  if (overlay.kind === 'quiz') {
    return (
      <QuizScreen
        // Remount cleanly whenever a new set is dealt.
        key={`${overlay.mode}-${overlay.questions[0]?.id}-${overlay.questions.length}`}
        mode={overlay.mode}
        questions={overlay.questions}
        initialAnswers={overlay.initialAnswers}
        initialIndex={overlay.initialIndex}
        endsAt={overlay.endsAt}
        onExit={closeOverlay}
        onFinish={handleFinish}
      />
    );
  }

  if (overlay.kind === 'flashcards') {
    return <FlashcardsScreen questions={overlay.questions} onExit={closeOverlay} />;
  }

  if (overlay.kind === 'results') {
    return (
      <ResultsScreen
        mode={overlay.mode}
        questions={overlay.questions}
        answers={overlay.answers}
        elapsedMs={overlay.elapsedMs}
        onRetryWrong={(wrong) =>
          setOverlay({
            kind: 'quiz',
            mode: 'practice',
            questions: wrong.map((q) => deal(q)),
          })
        }
        onDone={closeOverlay}
      />
    );
  }

  return (
    <View style={{ flex: 1, backgroundColor: t.bg }}>
      {tab === 'home' && (
        <HomeScreen
          hasSavedExam={hasSavedExam}
          onStartPractice={startPractice}
          onStartExam={startExam}
          onResumeExam={resumeExam}
          onStartFlashcards={startFlashcards}
        />
      )}
      {tab === 'browse' && <BrowseScreen />}
      {tab === 'stats' && <StatsScreen />}
      <TabBar tab={tab} onChange={setTab} />
    </View>
  );
}

export default function App() {
  return (
    <SafeAreaProvider>
      <ThemeProvider>
        <AppProvider>
          <StatusBar style="auto" />
          <Root />
        </AppProvider>
      </ThemeProvider>
    </SafeAreaProvider>
  );
}

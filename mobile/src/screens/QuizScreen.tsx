import * as Haptics from 'expo-haptics';
import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Pressable, ScrollView, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useApp } from '../AppContext';
import { ExplanationBox, OptionRow, type OptionState } from '../components/OptionRow';
import { Bar, Btn, Pill } from '../components/ui';
import { confirmAction, notify } from '../dialogs';
import { EXAM_MINUTES, LETTERS, formatClock, isCorrect } from '../engine';
import { clearExam, saveExam } from '../store';
import { difficultyColor, radius, spacing } from '../theme';
import { useTheme } from '../ThemeContext';
import type { DealtQuestion, QuizMode, QuizState } from '../types';

export interface FinishPayload {
  mode: QuizMode;
  questions: DealtQuestion[];
  answers: Record<string, number[]>;
  elapsedMs: number;
}

interface Props {
  mode: QuizMode;
  questions: DealtQuestion[];
  initialAnswers?: Record<string, number[]>;
  initialIndex?: number;
  endsAt?: number | null;
  onExit: () => void;
  onFinish: (payload: FinishPayload) => void;
}

export function QuizScreen({
  mode,
  questions,
  initialAnswers,
  initialIndex,
  endsAt: endsAtProp,
  onExit,
  onFinish,
}: Props) {
  const t = useTheme();
  const insets = useSafeAreaInsets();
  const { progress, recordAnswer, toggleFlag } = useApp();
  const scrollRef = useRef<React.ComponentRef<typeof ScrollView>>(null);

  const [state, setState] = useState<QuizState>(() => ({
    mode,
    questions,
    index: initialIndex ?? 0,
    answers: initialAnswers ?? {},
    checked: {},
    startedAt: Date.now(),
    endsAt:
      mode === 'exam' ? (endsAtProp ?? Date.now() + EXAM_MINUTES * 60_000) : null,
  }));
  const [remaining, setRemaining] = useState(() =>
    state.endsAt ? state.endsAt - Date.now() : 0
  );

  const q = state.questions[state.index];
  const picked = state.answers[q.id] ?? [];
  const graded = mode === 'practice' && !!state.checked[q.id];
  const isLast = state.index === state.questions.length - 1;
  const flagged = !!progress.flags[q.id];

  const finish = useCallback(
    (current: QuizState) => {
      if (current.mode === 'exam') {
        for (const question of current.questions) {
          const a = current.answers[question.id];
          if (a?.length) recordAnswer(question.id, isCorrect(a, question.correct));
        }
        void clearExam();
      }
      onFinish({
        mode: current.mode,
        questions: current.questions,
        answers: current.answers,
        elapsedMs: Date.now() - current.startedAt,
      });
    },
    [onFinish, recordAnswer]
  );

  // Exam countdown; auto-submits when it hits zero.
  useEffect(() => {
    if (mode !== 'exam' || !state.endsAt) return;
    const id = setInterval(() => {
      const left = state.endsAt! - Date.now();
      setRemaining(left);
      if (left <= 0) {
        clearInterval(id);
        notify('Time is up', 'Your exam has been submitted automatically.');
        finish(state);
      }
    }, 1000);
    return () => clearInterval(id);
  }, [mode, state, finish]);

  // Keep the in-flight exam recoverable across app restarts.
  useEffect(() => {
    if (mode === 'exam') void saveExam(state);
  }, [mode, state]);

  const scrollTop = () => scrollRef.current?.scrollTo({ y: 0, animated: true });

  const select = (originalIndex: number) => {
    if (graded) return;
    void Haptics.selectionAsync();
    setState((s) => {
      const current = s.answers[q.id] ?? [];
      let next: number[];
      if (q.type === 'multiple') {
        next = current.includes(originalIndex)
          ? current.filter((i) => i !== originalIndex)
          : [...current, originalIndex];
      } else {
        next = [originalIndex];
      }
      return { ...s, answers: { ...s.answers, [q.id]: next } };
    });
  };

  const submit = () => {
    if (!picked.length) return;
    const ok = isCorrect(picked, q.correct);
    void Haptics.notificationAsync(
      ok ? Haptics.NotificationFeedbackType.Success : Haptics.NotificationFeedbackType.Error
    );
    recordAnswer(q.id, ok);
    setState((s) => ({ ...s, checked: { ...s.checked, [q.id]: true } }));
  };

  const move = (delta: number) => {
    setState((s) => {
      const next = s.index + delta;
      if (next < 0 || next >= s.questions.length) return s;
      return { ...s, index: next };
    });
    scrollTop();
  };

  const confirmExit = () => {
    if (mode === 'exam') {
      confirmAction({
        title: 'Exit exam?',
        message: 'Your answers are saved — you can resume from the home screen.',
        confirmLabel: 'Exit',
        cancelLabel: 'Keep going',
        destructive: true,
        onConfirm: onExit,
      });
    } else {
      onExit();
    }
  };

  const confirmFinish = () => {
    const answered = state.questions.filter((x) => (state.answers[x.id] ?? []).length).length;
    const missing = state.questions.length - answered;
    if (mode === 'exam' && missing > 0) {
      confirmAction({
        title: 'Submit exam?',
        message: `${missing} question${missing === 1 ? '' : 's'} still unanswered.`,
        confirmLabel: 'Submit',
        cancelLabel: 'Keep going',
        destructive: true,
        onConfirm: () => finish(state),
      });
      return;
    }
    finish(state);
  };

  const answerLetters = useMemo(
    () =>
      q.correct
        .map((c) => LETTERS[q.order.indexOf(c)])
        .sort()
        .join(', '),
    [q]
  );

  const optionState = (original: number): OptionState => {
    if (graded) {
      if (q.correct.includes(original)) return 'correct';
      if (picked.includes(original)) return 'incorrect';
      return 'idle';
    }
    return picked.includes(original) ? 'selected' : 'idle';
  };

  const lowTime = mode === 'exam' && remaining < 5 * 60_000;

  return (
    <View style={{ flex: 1, backgroundColor: t.bg, paddingTop: insets.top }}>
      <View
        style={{
          flexDirection: 'row',
          alignItems: 'center',
          justifyContent: 'space-between',
          paddingHorizontal: spacing.lg,
          paddingBottom: spacing.sm,
          gap: spacing.sm,
        }}>
        <Pressable onPress={confirmExit} accessibilityRole="button" hitSlop={10}>
          <Text style={{ color: t.accent, fontSize: 15, fontWeight: '600' }}>Exit</Text>
        </Pressable>

        <Text style={{ color: t.muted, fontSize: 13, fontWeight: '600' }}>
          {state.index + 1} / {state.questions.length}
        </Text>

        <View style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.sm }}>
          {mode === 'exam' && (
            <View
              style={{
                backgroundColor: lowTime ? t.bad : t.surface2,
                borderRadius: radius.sm,
                paddingHorizontal: 8,
                paddingVertical: 3,
              }}>
              <Text
                style={{
                  color: lowTime ? '#FFFFFF' : t.text,
                  fontWeight: '800',
                  fontVariant: ['tabular-nums'],
                  fontSize: 13,
                }}>
                {formatClock(remaining)}
              </Text>
            </View>
          )}
          <Pressable
            onPress={() => {
              void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
              toggleFlag(q.id);
            }}
            accessibilityRole="button"
            accessibilityLabel={flagged ? 'Remove flag' : 'Flag question'}
            hitSlop={10}>
            <Text style={{ fontSize: 19, opacity: flagged ? 1 : 0.35 }}>🔖</Text>
          </Pressable>
        </View>
      </View>

      <View style={{ paddingHorizontal: spacing.lg, paddingBottom: spacing.md }}>
        <Bar pct={((state.index + 1) / state.questions.length) * 100} />
      </View>

      <ScrollView
        ref={scrollRef}
        contentContainerStyle={{
          padding: spacing.lg,
          paddingTop: 0,
          paddingBottom: spacing.xl,
        }}
        keyboardShouldPersistTaps="handled">
        <View style={{ flexDirection: 'row', gap: 6, marginBottom: spacing.md, flexWrap: 'wrap' }}>
          <Pill label={q.domain} />
          <Pill label={q.difficulty} color={difficultyColor(t, q.difficulty)} />
          <Pill label={q.type === 'multiple' ? 'Select all that apply' : 'Single answer'} />
        </View>

        <Text style={{ color: t.muted, fontSize: 11, marginBottom: 6 }}>{q.id}</Text>
        <Text
          style={{
            color: t.text,
            fontSize: 19,
            fontWeight: '700',
            lineHeight: 26,
            marginBottom: spacing.lg,
          }}>
          {q.question}
        </Text>

        <View style={{ gap: spacing.sm }}>
          {q.order.map((original, position) => (
            <OptionRow
              key={original}
              letter={LETTERS[position]}
              text={q.options[original]}
              state={optionState(original)}
              onPress={graded ? undefined : () => select(original)}
            />
          ))}
        </View>

        {graded && (
          <ExplanationBox
            correct={isCorrect(picked, q.correct)}
            answerLetters={answerLetters}
            explanation={q.explanation}
            reference={q.reference}
          />
        )}
      </ScrollView>

      <View
        style={{
          flexDirection: 'row',
          gap: spacing.sm,
          padding: spacing.lg,
          paddingBottom: Math.max(insets.bottom, spacing.lg),
          borderTopWidth: 1,
          borderTopColor: t.border,
          backgroundColor: t.surface,
        }}>
        {state.index > 0 && (
          <Btn label="Back" kind="ghost" onPress={() => move(-1)} style={{ flex: 0.5 }} />
        )}

        {mode === 'practice' && !graded && (
          <Btn label="Submit answer" onPress={submit} disabled={!picked.length} style={{ flex: 1 }} />
        )}

        {((mode === 'practice' && graded) || mode === 'exam') && !isLast && (
          <Btn label="Next" onPress={() => move(1)} style={{ flex: 1 }} />
        )}

        {((mode === 'practice' && graded) || mode === 'exam') && isLast && (
          <Btn
            label={mode === 'exam' ? 'Submit exam' : 'See results'}
            onPress={confirmFinish}
            style={{ flex: 1 }}
          />
        )}
      </View>

      {mode === 'exam' && (
        <View
          style={{
            paddingHorizontal: spacing.lg,
            paddingBottom: Math.max(insets.bottom, spacing.sm),
            backgroundColor: t.surface,
          }}>
          <ScrollView horizontal showsHorizontalScrollIndicator={false}>
            <View style={{ flexDirection: 'row', gap: 6, paddingBottom: spacing.sm }}>
              {state.questions.map((item, i) => {
                const done = (state.answers[item.id] ?? []).length > 0;
                const isCurrent = i === state.index;
                return (
                  <Pressable
                    key={item.id}
                    onPress={() => {
                      setState((s) => ({ ...s, index: i }));
                      scrollTop();
                    }}
                    accessibilityRole="button"
                    accessibilityLabel={`Go to question ${i + 1}`}
                    style={{
                      width: 32,
                      height: 32,
                      borderRadius: radius.sm,
                      alignItems: 'center',
                      justifyContent: 'center',
                      backgroundColor: done ? t.accentSoft : t.surface2,
                      borderWidth: isCurrent ? 2 : progress.flags[item.id] ? 2 : 1,
                      borderColor: isCurrent
                        ? t.accent
                        : progress.flags[item.id]
                          ? t.warn
                          : t.border,
                    }}>
                    <Text
                      style={{
                        color: done ? t.accent : t.muted,
                        fontSize: 12,
                        fontWeight: '700',
                      }}>
                      {i + 1}
                    </Text>
                  </Pressable>
                );
              })}
            </View>
          </ScrollView>
        </View>
      )}
    </View>
  );
}

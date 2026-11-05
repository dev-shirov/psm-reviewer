import React, { useMemo, useState } from 'react';
import { ScrollView, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { ExplanationBox, OptionRow } from '../components/OptionRow';
import { Bar, Btn, Card, Pill, SectionTitle } from '../components/ui';
import { LETTERS, PASS_MARK, isCorrect, scoreByDomain } from '../engine';
import { difficultyColor, radius, spacing } from '../theme';
import { useTheme } from '../ThemeContext';
import type { DealtQuestion, QuizMode } from '../types';

interface Props {
  mode: QuizMode;
  questions: DealtQuestion[];
  answers: Record<string, number[]>;
  elapsedMs: number;
  onRetryWrong: (wrong: DealtQuestion[]) => void;
  onDone: () => void;
}

export function ResultsScreen({
  mode,
  questions,
  answers,
  elapsedMs,
  onRetryWrong,
  onDone,
}: Props) {
  const t = useTheme();
  const insets = useSafeAreaInsets();
  const [showReview, setShowReview] = useState(false);

  const correctCount = useMemo(
    () => questions.filter((q) => isCorrect(answers[q.id] ?? [], q.correct)).length,
    [questions, answers]
  );
  const pct = questions.length ? Math.round((correctCount / questions.length) * 100) : 0;
  const passed = pct >= PASS_MARK;
  const byDomain = useMemo(() => scoreByDomain(questions, answers), [questions, answers]);
  const wrong = useMemo(
    () => questions.filter((q) => !isCorrect(answers[q.id] ?? [], q.correct)),
    [questions, answers]
  );
  const minutes = Math.max(1, Math.round(elapsedMs / 60000));

  return (
    <View style={{ flex: 1, backgroundColor: t.bg, paddingTop: insets.top }}>
      <ScrollView
        contentContainerStyle={{
          padding: spacing.lg,
          paddingBottom: Math.max(insets.bottom, spacing.lg) + 80,
        }}>
        <Card style={{ alignItems: 'center', paddingVertical: spacing.xl }}>
          <View
            style={{
              width: 128,
              height: 128,
              borderRadius: 64,
              borderWidth: 8,
              borderColor: passed ? t.ok : t.bad,
              alignItems: 'center',
              justifyContent: 'center',
              marginBottom: spacing.md,
            }}>
            <Text style={{ color: t.text, fontSize: 36, fontWeight: '900' }}>{pct}%</Text>
          </View>
          <Text
            style={{
              color: passed ? t.ok : t.bad,
              fontSize: 19,
              fontWeight: '800',
              marginBottom: 4,
            }}>
            {passed ? '🎉 Pass' : 'Below pass mark'}
          </Text>
          <Text style={{ color: t.muted, fontSize: 13, textAlign: 'center' }}>
            {correctCount} of {questions.length} correct · pass mark {PASS_MARK}%
            {'\n'}
            {mode === 'exam' ? 'Mock exam' : 'Practice'} · {minutes} min
          </Text>
        </Card>

        <SectionTitle>By domain</SectionTitle>
        <View style={{ gap: spacing.sm }}>
          {byDomain.map((d) => (
            <Card key={d.domain} style={{ padding: spacing.md }}>
              <View
                style={{
                  flexDirection: 'row',
                  justifyContent: 'space-between',
                  marginBottom: 6,
                  gap: spacing.sm,
                }}>
                <Text style={{ color: t.text, fontWeight: '600', fontSize: 14, flex: 1 }}>
                  {d.domain}
                </Text>
                <Text style={{ color: t.muted, fontSize: 13 }}>
                  {d.correct}/{d.total} · {d.pct}%
                </Text>
              </View>
              <Bar
                pct={d.pct}
                color={d.pct >= PASS_MARK ? t.ok : d.pct >= 60 ? t.warn : t.bad}
              />
            </Card>
          ))}
        </View>

        <View style={{ gap: spacing.sm, marginTop: spacing.xl }}>
          {wrong.length > 0 && (
            <>
              <Btn
                label={showReview ? 'Hide review' : `Review ${wrong.length} incorrect`}
                onPress={() => setShowReview((v) => !v)}
              />
              <Btn
                label="Retry incorrect only"
                kind="ghost"
                onPress={() => onRetryWrong(wrong)}
              />
            </>
          )}
          <Btn label="Back to home" kind="ghost" onPress={onDone} />
        </View>

        {showReview && (
          <View style={{ marginTop: spacing.xl, gap: spacing.lg }}>
            {wrong.map((q) => {
              const picked = answers[q.id] ?? [];
              const letters = q.correct
                .map((c) => LETTERS[q.order.indexOf(c)])
                .sort()
                .join(', ');
              return (
                <Card key={q.id} style={{ padding: spacing.md }}>
                  <View style={{ flexDirection: 'row', gap: 6, marginBottom: spacing.sm, flexWrap: 'wrap' }}>
                    <Pill label={q.domain} />
                    <Pill label={q.difficulty} color={difficultyColor(t, q.difficulty)} />
                  </View>
                  <Text
                    style={{
                      color: t.text,
                      fontWeight: '700',
                      fontSize: 15,
                      lineHeight: 21,
                      marginBottom: spacing.md,
                    }}>
                    {q.question}
                  </Text>
                  <View style={{ gap: 6 }}>
                    {q.order.map((original, position) => (
                      <OptionRow
                        key={original}
                        letter={LETTERS[position]}
                        text={q.options[original]}
                        state={
                          q.correct.includes(original)
                            ? 'correct'
                            : picked.includes(original)
                              ? 'incorrect'
                              : 'idle'
                        }
                      />
                    ))}
                  </View>
                  <ExplanationBox
                    correct={false}
                    answerLetters={letters}
                    explanation={q.explanation}
                    reference={q.reference}
                  />
                </Card>
              );
            })}
          </View>
        )}
      </ScrollView>

      <View
        style={{
          position: 'absolute',
          left: 0,
          right: 0,
          bottom: 0,
          padding: spacing.lg,
          paddingBottom: Math.max(insets.bottom, spacing.lg),
          backgroundColor: t.surface,
          borderTopWidth: 1,
          borderTopColor: t.border,
          borderTopLeftRadius: radius.lg,
          borderTopRightRadius: radius.lg,
        }}>
        <Btn label="Done" onPress={onDone} />
      </View>
    </View>
  );
}

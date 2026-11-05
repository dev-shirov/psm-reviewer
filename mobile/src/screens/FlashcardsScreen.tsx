import * as Haptics from 'expo-haptics';
import React, { useState } from 'react';
import { Pressable, ScrollView, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useApp } from '../AppContext';
import { OptionRow } from '../components/OptionRow';
import { Bar, Btn, Card, Pill } from '../components/ui';
import { LETTERS } from '../engine';
import { difficultyColor, radius, spacing } from '../theme';
import { useTheme } from '../ThemeContext';
import type { Question } from '../types';

interface Props {
  questions: Question[];
  onExit: () => void;
}

export function FlashcardsScreen({ questions, onExit }: Props) {
  const t = useTheme();
  const insets = useSafeAreaInsets();
  const { progress, toggleFlag } = useApp();
  const [index, setIndex] = useState(0);
  const [revealed, setRevealed] = useState(false);

  const q = questions[index];
  const flagged = !!progress.flags[q.id];

  const move = (delta: number) => {
    const next = index + delta;
    if (next < 0 || next >= questions.length) return;
    setIndex(next);
    setRevealed(false);
  };

  const flip = () => {
    void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setRevealed((v) => !v);
  };

  return (
    <View style={{ flex: 1, backgroundColor: t.bg, paddingTop: insets.top }}>
      <View
        style={{
          flexDirection: 'row',
          alignItems: 'center',
          justifyContent: 'space-between',
          paddingHorizontal: spacing.lg,
          paddingBottom: spacing.sm,
        }}>
        <Pressable onPress={onExit} accessibilityRole="button" hitSlop={10}>
          <Text style={{ color: t.accent, fontSize: 15, fontWeight: '600' }}>Exit</Text>
        </Pressable>
        <Text style={{ color: t.muted, fontSize: 13, fontWeight: '600' }}>
          {index + 1} / {questions.length}
        </Text>
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

      <View style={{ paddingHorizontal: spacing.lg, paddingBottom: spacing.md }}>
        <Bar pct={((index + 1) / questions.length) * 100} />
      </View>

      <Pressable
        onPress={flip}
        accessibilityRole="button"
        accessibilityLabel={revealed ? 'Hide answer' : 'Reveal answer'}
        style={{ flex: 1 }}>
        <ScrollView
          contentContainerStyle={{ padding: spacing.lg, paddingTop: 0, paddingBottom: spacing.xl }}>
          <Card style={{ minHeight: 240 }}>
            <View style={{ flexDirection: 'row', gap: 6, marginBottom: spacing.md, flexWrap: 'wrap' }}>
              <Pill label={q.domain} />
              <Pill label={q.difficulty} color={difficultyColor(t, q.difficulty)} />
            </View>
            <Text style={{ color: t.muted, fontSize: 11, marginBottom: 6 }}>{q.id}</Text>
            <Text style={{ color: t.text, fontSize: 18, fontWeight: '700', lineHeight: 25 }}>
              {q.question}
            </Text>

            {revealed ? (
              <View style={{ marginTop: spacing.lg, gap: 6 }}>
                {q.options.map((opt, i) => (
                  <OptionRow
                    key={i}
                    letter={LETTERS[i]}
                    text={opt}
                    state={q.correct.includes(i) ? 'correct' : 'idle'}
                  />
                ))}
                <View
                  style={{
                    marginTop: spacing.md,
                    backgroundColor: t.surface2,
                    borderRadius: radius.md,
                    padding: spacing.md,
                  }}>
                  <Text style={{ color: t.text, fontWeight: '800', marginBottom: 6 }}>
                    Explanation
                  </Text>
                  <Text style={{ color: t.text, fontSize: 14, lineHeight: 20 }}>
                    {q.explanation}
                  </Text>
                  <Text style={{ color: t.muted, fontSize: 11, marginTop: 8 }}>
                    Reference: {q.reference}
                  </Text>
                </View>
              </View>
            ) : (
              <Text
                style={{
                  color: t.muted,
                  fontSize: 13,
                  marginTop: spacing.xl,
                  textAlign: 'center',
                }}>
                Tap the card to reveal the answer
              </Text>
            )}
          </Card>
        </ScrollView>
      </Pressable>

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
        <Btn
          label="Previous"
          kind="ghost"
          onPress={() => move(-1)}
          disabled={index === 0}
          style={{ flex: 1 }}
        />
        <Btn
          label={revealed ? 'Next' : 'Reveal'}
          onPress={revealed ? () => move(1) : flip}
          disabled={revealed && index === questions.length - 1}
          style={{ flex: 1 }}
        />
      </View>
    </View>
  );
}

import React from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { useTheme } from '../ThemeContext';
import { radius, spacing } from '../theme';

export type OptionState = 'idle' | 'selected' | 'correct' | 'incorrect';

export function OptionRow({
  letter,
  text,
  state,
  onPress,
}: {
  letter: string;
  text: string;
  state: OptionState;
  onPress?: () => void;
}) {
  const t = useTheme();

  const styleFor = (): { bg: string; border: string } => {
    switch (state) {
      case 'correct':
        return { bg: t.okSoft, border: t.ok };
      case 'incorrect':
        return { bg: t.badSoft, border: t.bad };
      case 'selected':
        return { bg: t.accentSoft, border: t.accent };
      default:
        return { bg: t.surface2, border: t.border };
    }
  };
  const c = styleFor();
  const markColor =
    state === 'correct' ? t.ok : state === 'incorrect' ? t.bad : state === 'selected' ? t.accent : t.muted;

  const body = (
    <View
      style={{
        flexDirection: 'row',
        alignItems: 'flex-start',
        gap: spacing.md,
        backgroundColor: c.bg,
        borderColor: c.border,
        borderWidth: state === 'idle' ? StyleSheet.hairlineWidth : 1.5,
        borderRadius: radius.md,
        padding: spacing.md,
      }}>
      <View
        style={{
          width: 26,
          height: 26,
          borderRadius: 13,
          borderWidth: 1.5,
          borderColor: markColor,
          alignItems: 'center',
          justifyContent: 'center',
          backgroundColor: state === 'idle' ? 'transparent' : markColor,
        }}>
        <Text
          style={{
            color: state === 'idle' ? markColor : t.dark && state === 'selected' ? t.bg : '#FFFFFF',
            fontWeight: '800',
            fontSize: 12,
          }}>
          {state === 'correct' ? '✓' : state === 'incorrect' ? '✕' : letter}
        </Text>
      </View>
      <Text style={{ flex: 1, color: t.text, fontSize: 15, lineHeight: 21 }}>{text}</Text>
    </View>
  );

  if (!onPress) return body;

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={`Option ${letter}: ${text}`}
      accessibilityState={{ selected: state === 'selected' }}
      onPress={onPress}
      style={({ pressed }) => ({ opacity: pressed ? 0.7 : 1 })}>
      {body}
    </Pressable>
  );
}

export function ExplanationBox({
  correct,
  answerLetters,
  explanation,
  reference,
}: {
  correct: boolean;
  answerLetters: string;
  explanation: string;
  reference: string;
}) {
  const t = useTheme();
  return (
    <View
      style={{
        marginTop: spacing.lg,
        backgroundColor: correct ? t.okSoft : t.badSoft,
        borderColor: correct ? t.ok : t.bad,
        borderWidth: 1,
        borderRadius: radius.md,
        padding: spacing.md,
      }}>
      <Text style={{ color: correct ? t.ok : t.bad, fontWeight: '800', marginBottom: 6 }}>
        {correct ? '✓ Correct' : '✕ Incorrect'} — answer: {answerLetters}
      </Text>
      <Text style={{ color: t.text, fontSize: 14, lineHeight: 20 }}>{explanation}</Text>
      <Text style={{ color: t.muted, fontSize: 11, marginTop: 8 }}>Reference: {reference}</Text>
    </View>
  );
}

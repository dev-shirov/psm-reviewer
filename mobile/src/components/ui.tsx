import React from 'react';
import {
  ActivityIndicator,
  Pressable,
  StyleSheet,
  Text,
  View,
  type StyleProp,
  type TextStyle,
  type ViewStyle,
} from 'react-native';
import { useTheme } from '../ThemeContext';
import { radius, spacing } from '../theme';

export function Card({
  children,
  style,
}: {
  children: React.ReactNode;
  style?: StyleProp<ViewStyle>;
}) {
  const t = useTheme();
  return (
    <View
      style={[
        {
          backgroundColor: t.surface,
          borderColor: t.border,
          borderWidth: StyleSheet.hairlineWidth,
          borderRadius: radius.lg,
          padding: spacing.lg,
        },
        style,
      ]}>
      {children}
    </View>
  );
}

export function Pill({
  label,
  color,
  background,
  style,
}: {
  label: string;
  color?: string;
  background?: string;
  style?: StyleProp<ViewStyle>;
}) {
  const t = useTheme();
  return (
    <View
      style={[
        {
          backgroundColor: background ?? t.surface2,
          borderRadius: 999,
          paddingHorizontal: 10,
          paddingVertical: 3,
        },
        style,
      ]}>
      <Text style={{ color: color ?? t.muted, fontSize: 11, fontWeight: '600' }}>{label}</Text>
    </View>
  );
}

type BtnKind = 'primary' | 'ghost' | 'danger';

export function Btn({
  label,
  onPress,
  kind = 'primary',
  disabled,
  busy,
  style,
  textStyle,
}: {
  label: string;
  onPress: () => void;
  kind?: BtnKind;
  disabled?: boolean;
  busy?: boolean;
  style?: StyleProp<ViewStyle>;
  textStyle?: StyleProp<TextStyle>;
}) {
  const t = useTheme();
  const palette: Record<BtnKind, { bg: string; fg: string; border: string }> = {
    primary: { bg: t.accent, fg: t.onAccent, border: t.accent },
    ghost: { bg: 'transparent', fg: t.text, border: t.border },
    danger: { bg: 'transparent', fg: t.bad, border: t.bad },
  };
  const c = palette[kind];
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityState={{ disabled: !!disabled }}
      onPress={onPress}
      disabled={disabled || busy}
      style={({ pressed }) => [
        {
          backgroundColor: c.bg,
          borderColor: c.border,
          borderWidth: 1,
          borderRadius: radius.md,
          paddingVertical: 13,
          paddingHorizontal: spacing.lg,
          alignItems: 'center',
          justifyContent: 'center',
          opacity: disabled ? 0.45 : pressed ? 0.75 : 1,
        },
        style,
      ]}>
      {busy ? (
        <ActivityIndicator color={c.fg} />
      ) : (
        <Text style={[{ color: c.fg, fontWeight: '700', fontSize: 15 }, textStyle]}>{label}</Text>
      )}
    </Pressable>
  );
}

export function Chip({
  label,
  selected,
  onPress,
}: {
  label: string;
  selected: boolean;
  onPress: () => void;
}) {
  const t = useTheme();
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityState={{ selected }}
      onPress={onPress}
      style={({ pressed }) => ({
        backgroundColor: selected ? t.accentSoft : t.surface2,
        borderColor: selected ? t.accent : t.border,
        borderWidth: 1,
        borderRadius: 999,
        paddingHorizontal: 13,
        paddingVertical: 7,
        opacity: pressed ? 0.7 : 1,
      })}>
      <Text
        style={{
          color: selected ? t.accent : t.muted,
          fontSize: 13,
          fontWeight: selected ? '700' : '500',
        }}>
        {label}
      </Text>
    </Pressable>
  );
}

export function Bar({ pct, color }: { pct: number; color?: string }) {
  const t = useTheme();
  return (
    <View
      style={{
        height: 6,
        borderRadius: 999,
        backgroundColor: t.surface2,
        overflow: 'hidden',
      }}>
      <View
        style={{
          height: '100%',
          width: `${Math.max(0, Math.min(100, pct))}%`,
          backgroundColor: color ?? t.accent,
          borderRadius: 999,
        }}
      />
    </View>
  );
}

export function StatTile({ value, label }: { value: string | number; label: string }) {
  const t = useTheme();
  return (
    <Card style={{ flex: 1, minWidth: 140, padding: spacing.md }}>
      <Text style={{ color: t.text, fontSize: 24, fontWeight: '800' }}>{value}</Text>
      <Text style={{ color: t.muted, fontSize: 12, marginTop: 2 }}>{label}</Text>
    </Card>
  );
}

export function SectionTitle({ children }: { children: React.ReactNode }) {
  const t = useTheme();
  return (
    <Text
      style={{
        color: t.text,
        fontSize: 17,
        fontWeight: '700',
        marginBottom: spacing.sm,
        marginTop: spacing.lg,
      }}>
      {children}
    </Text>
  );
}

export function Empty({ text }: { text: string }) {
  const t = useTheme();
  return (
    <Text
      style={{
        color: t.muted,
        textAlign: 'center',
        paddingVertical: 40,
        paddingHorizontal: spacing.lg,
      }}>
      {text}
    </Text>
  );
}

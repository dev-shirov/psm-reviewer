import React, { useMemo, useState } from 'react';
import { FlatList, Pressable, Text, TextInput, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useApp } from '../AppContext';
import { OptionRow } from '../components/OptionRow';
import { Card, Chip, Empty, Pill } from '../components/ui';
import { DOMAINS, LETTERS, searchQuestions } from '../engine';
import { difficultyColor, radius, spacing } from '../theme';
import { useTheme } from '../ThemeContext';
import type { Difficulty, Question } from '../types';

const DIFFICULTIES: Difficulty[] = ['easy', 'medium', 'hard'];

/** Short label so the domain chips stay readable on narrow screens. */
const shortDomain = (d: string) => d.replace(/^Scrum /, '').replace(/ & /g, ' & ');

export function BrowseScreen() {
  const t = useTheme();
  const insets = useSafeAreaInsets();
  const { progress, toggleFlag } = useApp();

  const [term, setTerm] = useState('');
  const [domain, setDomain] = useState<string | null>(null);
  const [difficulty, setDifficulty] = useState<Difficulty | null>(null);
  const [flaggedOnly, setFlaggedOnly] = useState(false);
  const [expanded, setExpanded] = useState<string | null>(null);

  const results = useMemo(
    () => searchQuestions(term, domain, difficulty, flaggedOnly, progress),
    [term, domain, difficulty, flaggedOnly, progress]
  );

  const renderItem = ({ item }: { item: Question }) => {
    const open = expanded === item.id;
    const stat = progress.seen[item.id];
    const flagged = !!progress.flags[item.id];

    return (
      <Card style={{ padding: spacing.md, marginBottom: spacing.sm }}>
        <Pressable
          onPress={() => setExpanded(open ? null : item.id)}
          accessibilityRole="button"
          accessibilityState={{ expanded: open }}>
          <Text style={{ color: t.text, fontSize: 15, fontWeight: '600', lineHeight: 21 }}>
            {item.question}
          </Text>
          <View
            style={{
              flexDirection: 'row',
              gap: 6,
              marginTop: spacing.sm,
              alignItems: 'center',
              flexWrap: 'wrap',
            }}>
            <Pill label={shortDomain(item.domain)} />
            <Pill label={item.difficulty} color={difficultyColor(t, item.difficulty)} />
            {stat && <Pill label={`✓${stat.right} ✕${stat.wrong}`} />}
            <View style={{ flex: 1 }} />
            <Pressable
              onPress={() => toggleFlag(item.id)}
              accessibilityRole="button"
              accessibilityLabel={flagged ? 'Remove flag' : 'Flag question'}
              hitSlop={8}>
              <Text style={{ fontSize: 17, opacity: flagged ? 1 : 0.3 }}>🔖</Text>
            </Pressable>
          </View>
        </Pressable>

        {open && (
          <View style={{ marginTop: spacing.md, gap: 6 }}>
            {item.options.map((opt, i) => (
              <OptionRow
                key={i}
                letter={LETTERS[i]}
                text={opt}
                state={item.correct.includes(i) ? 'correct' : 'idle'}
              />
            ))}
            <View
              style={{
                marginTop: spacing.sm,
                backgroundColor: t.surface2,
                borderRadius: radius.md,
                padding: spacing.md,
              }}>
              <Text style={{ color: t.text, fontWeight: '800', marginBottom: 6 }}>Explanation</Text>
              <Text style={{ color: t.text, fontSize: 14, lineHeight: 20 }}>
                {item.explanation}
              </Text>
              <Text style={{ color: t.muted, fontSize: 11, marginTop: 8 }}>
                Reference: {item.reference}
              </Text>
            </View>
          </View>
        )}
      </Card>
    );
  };

  return (
    <View style={{ flex: 1, backgroundColor: t.bg, paddingTop: insets.top }}>
      <View style={{ paddingHorizontal: spacing.lg, paddingBottom: spacing.sm }}>
        <Text style={{ color: t.text, fontSize: 26, fontWeight: '800', marginBottom: spacing.md }}>
          Browse
        </Text>
        <TextInput
          value={term}
          onChangeText={setTerm}
          placeholder="Search questions, answers, explanations…"
          placeholderTextColor={t.muted}
          returnKeyType="search"
          clearButtonMode="while-editing"
          style={{
            backgroundColor: t.surface2,
            borderColor: t.border,
            borderWidth: 1,
            borderRadius: radius.md,
            paddingHorizontal: spacing.md,
            paddingVertical: 11,
            color: t.text,
            fontSize: 15,
          }}
        />
      </View>

      <View style={{ paddingBottom: spacing.sm }}>
        <FlatList
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={{ paddingHorizontal: spacing.lg, gap: 6 }}
          data={['All', ...DOMAINS]}
          keyExtractor={(d) => d}
          renderItem={({ item }) => (
            <Chip
              label={item === 'All' ? 'All domains' : shortDomain(item)}
              selected={item === 'All' ? domain === null : domain === item}
              onPress={() => setDomain(item === 'All' ? null : item)}
            />
          )}
        />
      </View>

      <View
        style={{
          flexDirection: 'row',
          gap: 6,
          paddingHorizontal: spacing.lg,
          paddingBottom: spacing.md,
          flexWrap: 'wrap',
        }}>
        {DIFFICULTIES.map((d) => (
          <Chip
            key={d}
            label={d}
            selected={difficulty === d}
            onPress={() => setDifficulty(difficulty === d ? null : d)}
          />
        ))}
        <Chip
          label="🔖 Flagged"
          selected={flaggedOnly}
          onPress={() => setFlaggedOnly((v) => !v)}
        />
      </View>

      <Text
        style={{
          color: t.muted,
          fontSize: 12,
          paddingHorizontal: spacing.lg,
          paddingBottom: spacing.sm,
        }}>
        {results.length} question{results.length === 1 ? '' : 's'}
      </Text>

      <FlatList
        data={results}
        keyExtractor={(q) => q.id}
        renderItem={renderItem}
        contentContainerStyle={{
          paddingHorizontal: spacing.lg,
          paddingBottom: insets.bottom + 90,
        }}
        keyboardShouldPersistTaps="handled"
        initialNumToRender={8}
        windowSize={7}
        removeClippedSubviews
        ListEmptyComponent={<Empty text="No questions match your filters." />}
      />
    </View>
  );
}

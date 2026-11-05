import React, { useMemo, useState } from 'react';
import { ScrollView, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useApp } from '../AppContext';
import { Btn, Card, Chip, StatTile } from '../components/ui';
import { DOMAINS, EXAM_MINUTES, EXAM_SIZE, PASS_MARK, QUESTIONS } from '../engine';
import { spacing } from '../theme';
import { useTheme } from '../ThemeContext';
import type { Difficulty } from '../types';

const DIFFICULTIES: Difficulty[] = ['easy', 'medium', 'hard'];
const COUNTS: (number | 'all')[] = [10, 20, 40, 80, 'all'];

const shortDomain = (d: string) => d.replace(/^Scrum /, '');

export interface PracticeRequest {
  domain: string | null;
  difficulty: Difficulty | null;
  count: number | 'all';
  unseenFirst: boolean;
  onlyWrong: boolean;
}

interface Props {
  hasSavedExam: boolean;
  onStartPractice: (req: PracticeRequest) => void;
  onStartExam: () => void;
  onResumeExam: () => void;
  onStartFlashcards: (domain: string | null) => void;
}

export function HomeScreen({
  hasSavedExam,
  onStartPractice,
  onStartExam,
  onResumeExam,
  onStartFlashcards,
}: Props) {
  const t = useTheme();
  const insets = useSafeAreaInsets();
  const { progress } = useApp();

  const [domain, setDomain] = useState<string | null>(null);
  const [difficulty, setDifficulty] = useState<Difficulty | null>(null);
  const [count, setCount] = useState<number | 'all'>(20);
  const [unseenFirst, setUnseenFirst] = useState(false);
  const [onlyWrong, setOnlyWrong] = useState(false);

  const stats = useMemo(() => {
    const ids = Object.keys(progress.seen);
    const right = ids.reduce((s, id) => s + progress.seen[id].right, 0);
    const wrong = ids.reduce((s, id) => s + progress.seen[id].wrong, 0);
    return {
      attempted: ids.length,
      accuracy: right + wrong ? Math.round((right / (right + wrong)) * 100) : 0,
      flagged: Object.keys(progress.flags).length,
      sessions: progress.attempts.length,
    };
  }, [progress]);

  return (
    <View style={{ flex: 1, backgroundColor: t.bg, paddingTop: insets.top }}>
      <ScrollView
        contentContainerStyle={{
          padding: spacing.lg,
          paddingBottom: insets.bottom + 90,
        }}>
        <Text style={{ color: t.text, fontSize: 28, fontWeight: '800' }}>PSM I Reviewer</Text>
        <Text style={{ color: t.muted, fontSize: 14, marginTop: 4, lineHeight: 20 }}>
          {QUESTIONS.length} questions across {DOMAINS.length} domains, aligned with the Scrum
          Guide 2020. Real exam: {EXAM_SIZE} questions, {EXAM_MINUTES} minutes, {PASS_MARK}% to
          pass.
        </Text>

        <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm, marginTop: spacing.lg }}>
          <StatTile value={stats.attempted} label={`of ${QUESTIONS.length} attempted`} />
          <StatTile value={`${stats.accuracy}%`} label="accuracy" />
        </View>

        {/* ---------------- Practice ---------------- */}
        <Card style={{ marginTop: spacing.lg }}>
          <Text style={{ color: t.text, fontSize: 18, fontWeight: '700' }}>📝 Practice</Text>
          <Text style={{ color: t.muted, fontSize: 13, marginTop: 2, marginBottom: spacing.md }}>
            Instant feedback and an explanation after every question.
          </Text>

          <Text style={{ color: t.muted, fontSize: 12, fontWeight: '700', marginBottom: 6 }}>
            DOMAIN
          </Text>
          <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 6, marginBottom: spacing.md }}>
            <Chip label="All" selected={domain === null} onPress={() => setDomain(null)} />
            {DOMAINS.map((d) => (
              <Chip
                key={d}
                label={shortDomain(d)}
                selected={domain === d}
                onPress={() => setDomain(domain === d ? null : d)}
              />
            ))}
          </View>

          <Text style={{ color: t.muted, fontSize: 12, fontWeight: '700', marginBottom: 6 }}>
            DIFFICULTY
          </Text>
          <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 6, marginBottom: spacing.md }}>
            <Chip label="All" selected={difficulty === null} onPress={() => setDifficulty(null)} />
            {DIFFICULTIES.map((d) => (
              <Chip
                key={d}
                label={d}
                selected={difficulty === d}
                onPress={() => setDifficulty(difficulty === d ? null : d)}
              />
            ))}
          </View>

          <Text style={{ color: t.muted, fontSize: 12, fontWeight: '700', marginBottom: 6 }}>
            QUESTIONS
          </Text>
          <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 6, marginBottom: spacing.md }}>
            {COUNTS.map((c) => (
              <Chip
                key={String(c)}
                label={c === 'all' ? 'All' : String(c)}
                selected={count === c}
                onPress={() => setCount(c)}
              />
            ))}
          </View>

          <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 6, marginBottom: spacing.lg }}>
            <Chip
              label="Unseen first"
              selected={unseenFirst}
              onPress={() => setUnseenFirst((v) => !v)}
            />
            <Chip
              label="Wrong / flagged only"
              selected={onlyWrong}
              onPress={() => setOnlyWrong((v) => !v)}
            />
          </View>

          <Btn
            label="Start practice"
            onPress={() =>
              onStartPractice({ domain, difficulty, count, unseenFirst, onlyWrong })
            }
          />
        </Card>

        {/* ---------------- Exam ---------------- */}
        <Card style={{ marginTop: spacing.lg }}>
          <Text style={{ color: t.text, fontSize: 18, fontWeight: '700' }}>⏱️ Mock exam</Text>
          <Text style={{ color: t.muted, fontSize: 13, marginTop: 2, marginBottom: spacing.md }}>
            {EXAM_SIZE} random questions, {EXAM_MINUTES}-minute timer, no feedback until you
            submit. Scored against the real {PASS_MARK}% pass mark.
          </Text>
          {hasSavedExam && (
            <Btn
              label="Resume saved exam"
              kind="ghost"
              onPress={onResumeExam}
              style={{ marginBottom: spacing.sm }}
            />
          )}
          <Btn label="Start mock exam" onPress={onStartExam} />
        </Card>

        {/* ---------------- Flashcards ---------------- */}
        <Card style={{ marginTop: spacing.lg }}>
          <Text style={{ color: t.text, fontSize: 18, fontWeight: '700' }}>🃏 Flashcards</Text>
          <Text style={{ color: t.muted, fontSize: 13, marginTop: 2, marginBottom: spacing.md }}>
            Fast recall drilling — tap to reveal the answer and explanation.
          </Text>
          <Btn
            label={domain ? `Start · ${shortDomain(domain)}` : 'Start flashcards'}
            onPress={() => onStartFlashcards(domain)}
          />
          <Text style={{ color: t.muted, fontSize: 11, marginTop: spacing.sm }}>
            Uses the domain selected in Practice above.
          </Text>
        </Card>

        <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm, marginTop: spacing.lg }}>
          <StatTile value={stats.flagged} label="flagged for review" />
          <StatTile value={stats.sessions} label="sessions completed" />
        </View>

        <Text
          style={{
            color: t.muted,
            fontSize: 11,
            textAlign: 'center',
            marginTop: spacing.xl,
            lineHeight: 16,
          }}>
          Original study questions based on the publicly available Scrum Guide 2020.{'\n'}
          Not affiliated with or endorsed by Scrum.org.
        </Text>
      </ScrollView>
    </View>
  );
}

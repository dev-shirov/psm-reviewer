import React, { useMemo } from 'react';
import { ScrollView, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useApp } from '../AppContext';
import { Bar, Btn, Card, Empty, SectionTitle, StatTile } from '../components/ui';
import { confirmAction } from '../dialogs';
import { DOMAINS, PASS_MARK, QUESTIONS } from '../engine';
import { spacing } from '../theme';
import { useTheme } from '../ThemeContext';

export function StatsScreen() {
  const t = useTheme();
  const insets = useSafeAreaInsets();
  const { progress, resetAll } = useApp();

  const totals = useMemo(() => {
    const ids = Object.keys(progress.seen);
    const right = ids.reduce((s, id) => s + progress.seen[id].right, 0);
    const wrong = ids.reduce((s, id) => s + progress.seen[id].wrong, 0);
    return {
      attempted: ids.length,
      right,
      wrong,
      accuracy: right + wrong ? Math.round((right / (right + wrong)) * 100) : 0,
    };
  }, [progress]);

  const domainRows = useMemo(
    () =>
      DOMAINS.map((d) => {
        const qs = QUESTIONS.filter((q) => q.domain === d);
        const seen = qs.filter((q) => progress.seen[q.id]);
        const right = seen.reduce((s, q) => s + progress.seen[q.id].right, 0);
        const wrong = seen.reduce((s, q) => s + progress.seen[q.id].wrong, 0);
        return {
          domain: d,
          seen: seen.length,
          total: qs.length,
          accuracy: right + wrong ? Math.round((right / (right + wrong)) * 100) : 0,
        };
      }),
    [progress]
  );

  const confirmReset = () => {
    confirmAction({
      title: 'Reset all progress?',
      message: 'This deletes your answers, flags and session history on this device.',
      confirmLabel: 'Reset',
      destructive: true,
      onConfirm: resetAll,
    });
  };

  return (
    <View style={{ flex: 1, backgroundColor: t.bg, paddingTop: insets.top }}>
      <ScrollView
        contentContainerStyle={{
          padding: spacing.lg,
          paddingBottom: insets.bottom + 90,
        }}>
        <Text style={{ color: t.text, fontSize: 26, fontWeight: '800', marginBottom: spacing.md }}>
          Your progress
        </Text>

        <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm }}>
          <StatTile value={totals.attempted} label={`of ${QUESTIONS.length} attempted`} />
          <StatTile value={`${totals.accuracy}%`} label="accuracy" />
        </View>
        <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm, marginTop: spacing.sm }}>
          <StatTile value={totals.right} label="correct answers" />
          <StatTile value={totals.wrong} label="incorrect answers" />
        </View>

        <SectionTitle>By domain</SectionTitle>
        <View style={{ gap: spacing.sm }}>
          {domainRows.map((row) => (
            <Card key={row.domain} style={{ padding: spacing.md }}>
              <View
                style={{
                  flexDirection: 'row',
                  justifyContent: 'space-between',
                  gap: spacing.sm,
                  marginBottom: 6,
                }}>
                <Text style={{ color: t.text, fontWeight: '600', fontSize: 14, flex: 1 }}>
                  {row.domain}
                </Text>
                <Text style={{ color: t.muted, fontSize: 12 }}>
                  {row.seen}/{row.total} seen · {row.accuracy}%
                </Text>
              </View>
              <Bar
                pct={row.accuracy}
                color={
                  row.accuracy >= PASS_MARK ? t.ok : row.accuracy >= 60 ? t.warn : t.bad
                }
              />
            </Card>
          ))}
        </View>

        <SectionTitle>Recent sessions</SectionTitle>
        {progress.attempts.length === 0 ? (
          <Empty text="No completed sessions yet." />
        ) : (
          <View style={{ gap: spacing.sm }}>
            {[...progress.attempts]
              .reverse()
              .slice(0, 15)
              .map((a, i) => (
                <Card key={`${a.at}-${i}`} style={{ padding: spacing.md }}>
                  <View
                    style={{
                      flexDirection: 'row',
                      justifyContent: 'space-between',
                      alignItems: 'center',
                      gap: spacing.sm,
                    }}>
                    <View style={{ flex: 1 }}>
                      <Text style={{ color: t.text, fontWeight: '600', fontSize: 14 }}>
                        {a.mode === 'exam' ? 'Mock exam' : 'Practice'} · {a.correct}/{a.total}
                      </Text>
                      <Text style={{ color: t.muted, fontSize: 12, marginTop: 2 }}>
                        {new Date(a.at).toLocaleString()} · {a.minutes} min
                      </Text>
                    </View>
                    <Text
                      style={{
                        color: a.pct >= PASS_MARK ? t.ok : t.bad,
                        fontSize: 18,
                        fontWeight: '800',
                      }}>
                      {a.pct}%
                    </Text>
                  </View>
                </Card>
              ))}
          </View>
        )}

        <Btn
          label="Reset all progress"
          kind="danger"
          onPress={confirmReset}
          style={{ marginTop: spacing.xl }}
        />
      </ScrollView>
    </View>
  );
}

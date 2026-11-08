import { Text, TextInput, Paper, Icon } from './Storybook';
import React, { useEffect, useState } from 'react';
import {
  Modal,
  View,
  ScrollView,
  Pressable,
  StyleSheet,
  Linking,
  Platform,
  useWindowDimensions,
} from 'react-native';
import type { Language, Tag } from '../../../packages/shared/src/index';
import {
  childIcons,
  childStats,
  attemptScore,
  type Child,
  type Family,
} from '../../../packages/shared/src/family';
import {
  cachedParent,
  refreshParent,
  parentRequest,
  parentBase,
  loadFamily,
  saveChild,
  selectChild,
  syncFamily,
  signOut,
  importDeviceFamily,
  type Parent,
} from './family-store';
import { Button } from './components';
import { colors as c } from './theme';
import { randomUUID } from './uuid';

const languages: Record<Language, string> = {
  en: 'English',
  es: 'Español',
  ka: 'ქართული',
};
export function ParentCenter({
  onClose,
  language,
  onLanguage,
  tags,
  signInFailed,
  extras,
}: {
  onClose: () => void;
  language: Language;
  onLanguage: (language: Language) => void;
  tags: Tag[];
  signInFailed?: boolean;
  extras?: React.ReactNode;
}) {
  const { width } = useWindowDimensions();
  const [challenge] = useState(() => ({
    a: 3 + Math.floor(Math.random() * 7),
    b: 3 + Math.floor(Math.random() * 7),
  }));
  const [answer, setAnswer] = useState(''),
    [unlocked, setUnlocked] = useState(false),
    [gateError, setGateError] = useState('');
  const [parent, setParent] = useState<Parent | null>(null),
    [providers, setProviders] = useState({ google: false, apple: false });
  const [family, setFamily] = useState<Family>({ children: [], attempts: [] });
  const [viewChild, setViewChild] = useState<string>(),
    [draft, setDraft] = useState<Child>(),
    [ageText, setAgeText] = useState('4'),
    [interest, setInterest] = useState('');
  const [error, setError] = useState(
    signInFailed
      ? 'Sign-in was cancelled or could not be completed. Please try again.'
      : '',
  );
  const [notice, setNotice] = useState(''),
    [busy, setBusy] = useState(false),
    [loading, setLoading] = useState(true);
  async function reload() {
    const state = await loadFamily();
    setFamily(state);
    setViewChild((id) =>
      id && state.children.some((c) => c.id === id)
        ? id
        : (state.activeChildId ?? state.children[0]?.id),
    );
  }
  useEffect(() => {
    if (!unlocked) return;
    void (async () => {
      try {
        setParent(await cachedParent());
        await reload();
        const [account, config] = await Promise.all([
          refreshParent(),
          parentRequest<typeof providers>('config'),
        ]);
        setParent(account);
        setProviders(config);
        await syncFamily();
        await reload();
      } catch {
        setNotice(
          'Working on this device. Account sync is unavailable right now.',
        );
      } finally {
        setLoading(false);
      }
    })();
  }, [unlocked]);
  async function perform(fn: () => Promise<void>) {
    if (busy) return;
    setBusy(true);
    setError('');
    setNotice('');
    try {
      await fn();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Please try again.');
    } finally {
      setBusy(false);
    }
  }
  async function save() {
    if (!draft) return;
    const age = Number(ageText);
    if (!draft.name.trim() || !/^\d+$/.test(ageText) || age < 1 || age > 17) {
      setError('Enter a nickname and an age from 1 to 17.');
      return;
    }
    const updated = {
      ...draft,
      age,
      interests: [
        ...new Set([
          ...draft.interests,
          ...(interest.trim() ? [interest.trim()] : []),
        ]),
      ],
    };
    await saveChild(updated);
    if (!family.activeChildId || family.activeChildId === updated.id)
      onLanguage(updated.language);
    setViewChild(updated.id);
    setDraft(undefined);
    setInterest('');
    await reload();
    try {
      await syncFamily();
      setNotice(
        parent ? 'Profile saved and synced.' : 'Profile saved on this device.',
      );
    } catch {
      setNotice(
        'Profile saved on this device. It will sync when you reconnect.',
      );
    }
  }
  const viewed = family.children.find((c) => c.id === viewChild);
  const attempts = family.attempts
    .filter((a) => a.childId === viewed?.id)
    .sort((a, b) => b.completedAt.localeCompare(a.completedAt));
  const stats = childStats(attempts);
  const topics = [
    ...new Set([
      'Animals',
      'Friendship',
      'Adventure',
      'Nature',
      'Bedtime',
      'Kindness',
      ...tags
        .map((t) => t.labels[language] ?? t.labels.en)
        .filter((t): t is string => !!t),
    ]),
  ];
  const chip = (label: string, selected: boolean, onPress: () => void) => (
    <Pressable
      key={label}
      accessibilityRole="button"
      accessibilityState={{ selected }}
      onPress={onPress}
      style={[s.chip, selected && s.selected]}
    >
      <Text style={{ color: selected ? '#FFF' : c.ink, fontWeight: '600' }}>
        {label}
      </Text>
    </Pressable>
  );
  return (
    <Modal visible transparent animationType="fade" onRequestClose={onClose}>
      <View style={[s.overlay, { padding: width < 600 ? 10 : 28 }]}>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Dismiss Parental Center"
          onPress={onClose}
          style={StyleSheet.absoluteFill}
        />
        <View style={s.panel}>
          <Paper />
          <View style={s.header}>
            <View>
              <Text style={s.title}>Parental Center</Text>
              <Text style={s.muted}>Little readers, growing every day</Text>
            </View>
            <Pressable
              accessibilityRole="button"
              accessibilityLabel="Close Parental Center"
              onPress={onClose}
              style={s.close}
            >
              <Icon name="close" size={26} />
            </Pressable>
          </View>
          <ScrollView
            contentContainerStyle={s.content}
            keyboardShouldPersistTaps="handled"
          >
            {!unlocked ? (
              <View style={s.card}>
                <Text style={s.heading}>A moment for grown-ups</Text>
                <Text style={s.body}>
                  What is {challenge.a} × {challenge.b}?
                </Text>
                <TextInput
                  accessibilityLabel="Parent gate answer"
                  keyboardType="number-pad"
                  value={answer}
                  onChangeText={setAnswer}
                  style={s.input}
                  onSubmitEditing={() => {
                    if (Number(answer) === challenge.a * challenge.b)
                      setUnlocked(true);
                    else setGateError('Try that calculation again.');
                  }}
                />
                {!!gateError && <Text style={s.error}>{gateError}</Text>}
                <Button
                  onPress={() => {
                    if (Number(answer) === challenge.a * challenge.b)
                      setUnlocked(true);
                    else setGateError('Try that calculation again.');
                  }}
                >
                  Continue
                </Button>
              </View>
            ) : (
              <>
                {!!error && (
                  <Text accessibilityRole="alert" style={s.error}>
                    {error}
                  </Text>
                )}
                {!!notice && (
                  <Text accessibilityRole="status" style={s.muted}>
                    {notice}
                  </Text>
                )}
                <View style={s.card}>
                  <Text style={s.heading}>Parent account</Text>
                  {parent ? (
                    <>
                      <Text style={s.body}>
                        Signed in with{' '}
                        {parent.provider === 'google' ? 'Google' : 'Apple'}
                        {parent.email ? ` · ${parent.email}` : ''}
                      </Text>
                      <View style={s.row}>
                        <Button
                          disabled={busy}
                          onPress={() =>
                            void perform(async () => {
                              await syncFamily();
                              await reload();
                              setNotice('Progress is up to date.');
                            })
                          }
                        >
                          Sync progress
                        </Button>
                        <Button
                          quiet
                          disabled={busy}
                          onPress={() =>
                            void perform(async () => {
                              await syncFamily();
                              await signOut();
                              setParent(null);
                              await reload();
                            })
                          }
                        >
                          Sign out
                        </Button>
                        <Button
                          quiet
                          disabled={busy}
                          onPress={() =>
                            void perform(async () => {
                              await importDeviceFamily();
                              await reload();
                              setNotice(
                                'Device profiles and progress copied to your account.',
                              );
                            })
                          }
                        >
                          Copy device profiles to account
                        </Button>
                      </View>
                    </>
                  ) : (
                    <>
                      <Text style={s.body}>
                        Sign in to keep your child profiles and quiz progress
                        across devices. You can also use profiles on this device
                        without an account.
                      </Text>
                      <View style={s.row}>
                        {(['google', 'apple'] as const).map((provider) => (
                          <Button
                            key={provider}
                            quiet
                            disabled={loading || busy}
                            onPress={() => {
                              if (!providers[provider]) {
                                setError(
                                  `${provider === 'google' ? 'Google' : 'Apple'} sign-in is not configured yet. Profiles and progress still work on this device.`,
                                );
                                return;
                              }
                              if (Platform.OS !== 'web') {
                                setError(
                                  'Account sign-in is currently available in the web version.',
                                );
                                return;
                              }
                              void Linking.openURL(
                                `${parentBase()}/sign-in/${provider}`,
                              );
                            }}
                          >
                            Continue with{' '}
                            {provider === 'google' ? 'Google' : 'Apple'}
                          </Button>
                        ))}
                      </View>
                      {!loading && (!providers.google || !providers.apple) && (
                        <Text style={s.muted}>
                          Account sign-in will be available once provider setup
                          is complete.
                        </Text>
                      )}
                    </>
                  )}
                </View>
                <View style={s.card}>
                  <Text style={s.heading}>Children</Text>
                  <Text style={s.muted}>
                    Choose “Use profile” before a quiz to save results for that
                    child. Use a nickname—no date of birth is needed.
                  </Text>
                  <View style={s.row}>
                    {family.children.map((child) =>
                      chip(
                        `${child.icon} ${child.name}${family.activeChildId === child.id ? ' · Active' : ''}`,
                        viewChild === child.id,
                        () => setViewChild(child.id),
                      ),
                    )}
                  </View>
                  {!family.children.length && (
                    <Text style={s.body}>
                      Create your first child profile to start tracking quiz
                      progress.
                    </Text>
                  )}
                  <View style={s.row}>
                    <Button
                      quiet
                      onPress={() => {
                        setDraft({
                          id: randomUUID(),
                          name: '',
                          icon: '🐻',
                          age: 4,
                          interests: [],
                          language,
                        });
                        setAgeText('4');
                        setInterest('');
                        setError('');
                      }}
                    >
                      + Add child
                    </Button>
                    {viewed && (
                      <>
                        <Button
                          quiet
                          onPress={() => {
                            setDraft({
                              ...viewed,
                              interests: [...viewed.interests],
                            });
                            setAgeText(String(viewed.age));
                            setInterest('');
                            setError('');
                          }}
                        >
                          Edit profile
                        </Button>
                        <Button
                          disabled={busy || viewed.id === family.activeChildId}
                          onPress={() =>
                            void perform(async () => {
                              await selectChild(viewed.id);
                              onLanguage(viewed.language);
                              await reload();
                              setNotice(
                                `${viewed.name} is ready to read and take quizzes.`,
                              );
                            })
                          }
                        >
                          Use profile
                        </Button>
                      </>
                    )}
                  </View>
                  {draft && (
                    <View style={s.editor}>
                      <Text style={s.heading}>
                        {family.children.some((c) => c.id === draft.id)
                          ? 'Edit child profile'
                          : 'New child profile'}
                      </Text>
                      <Text style={s.label}>Nickname</Text>
                      <TextInput
                        accessibilityLabel="Child nickname"
                        value={draft.name}
                        maxLength={40}
                        onChangeText={(name) => setDraft({ ...draft, name })}
                        style={s.input}
                      />
                      <Text style={s.label}>Age</Text>
                      <TextInput
                        accessibilityLabel="Child age"
                        value={ageText}
                        keyboardType="number-pad"
                        maxLength={2}
                        onChangeText={setAgeText}
                        style={[s.input, { maxWidth: 100 }]}
                      />
                      <Text style={s.label}>Choose an icon</Text>
                      <View style={s.row}>
                        {childIcons.map((icon) =>
                          chip(icon, draft.icon === icon, () =>
                            setDraft({ ...draft, icon }),
                          ),
                        )}
                      </View>
                      <Text style={s.label}>Interests</Text>
                      <View style={s.row}>
                        {[...new Set([...topics, ...draft.interests])].map(
                          (topic) =>
                            chip(topic, draft.interests.includes(topic), () =>
                              setDraft({
                                ...draft,
                                interests: draft.interests.includes(topic)
                                  ? draft.interests.filter((t) => t !== topic)
                                  : [...draft.interests, topic].slice(0, 20),
                              }),
                            ),
                        )}
                      </View>
                      <TextInput
                        accessibilityLabel="Another interest"
                        placeholder="Another interest"
                        value={interest}
                        maxLength={60}
                        onChangeText={setInterest}
                        style={s.input}
                      />
                      <Text style={s.label}>Preferred story language</Text>
                      <View style={s.row}>
                        {(Object.keys(languages) as Language[]).map((code) =>
                          chip(languages[code], draft.language === code, () =>
                            setDraft({ ...draft, language: code }),
                          ),
                        )}
                      </View>
                      <View style={s.row}>
                        <Button
                          disabled={busy}
                          onPress={() => void perform(save)}
                        >
                          Save child profile
                        </Button>
                        <Button
                          quiet
                          disabled={busy}
                          onPress={() => setDraft(undefined)}
                        >
                          Cancel
                        </Button>
                      </View>
                    </View>
                  )}
                </View>
                {viewed && (
                  <View style={s.card}>
                    <Text style={s.heading}>
                      {viewed.icon} {viewed.name}’s progress
                    </Text>
                    <Text style={s.muted}>
                      Age {viewed.age} ·{' '}
                      {viewed.interests.join(', ') || 'No interests selected'}
                    </Text>
                    <View style={s.row}>
                      {[
                        [stats.quizzes, 'Quizzes completed'],
                        [stats.stories, 'Stories explored'],
                        [
                          stats.accuracy === null ? '—' : `${stats.accuracy}%`,
                          'Answer accuracy',
                        ],
                      ].map(([value, label]) => (
                        <View key={label} style={s.stat}>
                          <Text style={s.statValue}>{value}</Text>
                          <Text style={s.muted}>{label}</Text>
                        </View>
                      ))}
                    </View>
                    <Text style={s.muted}>
                      Accuracy uses multiple-choice answers only. Open-ended
                      questions encourage discussion and are not scored. Every
                      completed retry is a separate attempt.
                    </Text>
                    {!attempts.length ? (
                      <Text style={s.body}>
                        No completed quizzes yet. Select this profile, then take
                        a story quiz to see progress here.
                      </Text>
                    ) : (
                      <>
                        <Text style={s.label}>Results by story</Text>
                        {[...new Set(attempts.map((a) => a.storyId))].map(
                          (id) => {
                            const list = attempts.filter(
                                (a) => a.storyId === id,
                              ),
                              scored = list.map(attemptScore),
                              latest = scored[0],
                              first = scored[scored.length - 1];
                            const percentages = scored
                              .map((s) => s.percent)
                              .filter((p): p is number => p !== null);
                            return (
                              <View key={id} style={s.result}>
                                <Text style={s.label}>
                                  {list[0].storyTitle}
                                </Text>
                                <Text style={s.body}>
                                  {list.length} attempt
                                  {list.length === 1 ? '' : 's'} · Latest:{' '}
                                  {latest.percent === null
                                    ? 'Open-ended'
                                    : `${latest.correct}/${latest.total}`}{' '}
                                  · Best:{' '}
                                  {percentages.length
                                    ? `${Math.max(...percentages)}%`
                                    : '—'}
                                </Text>
                                {first.percent !== null &&
                                  latest.percent !== null &&
                                  list.length > 1 && (
                                    <Text style={s.muted}>
                                      First {first.percent}% → Latest{' '}
                                      {latest.percent}%
                                    </Text>
                                  )}
                                <View style={s.track}>
                                  <View
                                    style={[
                                      s.fill,
                                      { width: `${latest.percent ?? 0}%` },
                                    ]}
                                  />
                                </View>
                              </View>
                            );
                          },
                        )}
                        <Text style={s.label}>Recent quizzes</Text>
                        {attempts.slice(0, 10).map((attempt) => {
                          const score = attemptScore(attempt);
                          return (
                            <View key={attempt.id} style={s.result}>
                              <Text style={s.label}>{attempt.storyTitle}</Text>
                              <Text style={s.muted}>
                                {new Date(attempt.completedAt).toLocaleString()}{' '}
                                · {languages[attempt.language]} ·{' '}
                                {score.total
                                  ? `${score.correct}/${score.total} correct`
                                  : 'Open-ended discussion'}
                              </Text>
                            </View>
                          );
                        })}
                      </>
                    )}
                  </View>
                )}
                <View style={s.card}>
                  <Text style={s.heading}>Story language</Text>
                  <View style={s.row}>
                    {(Object.keys(languages) as Language[]).map((code) =>
                      chip(languages[code], language === code, () =>
                        onLanguage(code),
                      ),
                    )}
                  </View>
                  <Text style={s.muted}>
                    Changes the lobby and the language requested when opening
                    stories.
                  </Text>
                </View>
                {extras}
              </>
            )}
            <Button quiet onPress={onClose}>
              Back to stories
            </Button>
          </ScrollView>
        </View>
      </View>
    </Modal>
  );
}
const s = StyleSheet.create({
  overlay: { flex: 1, backgroundColor: '#432B1E80', justifyContent: 'center' },
  panel: {
    backgroundColor: c.paper,
    borderRadius: 24,
    boxShadow: '0px 18px 70px #432B1E30',
    borderWidth: 1,
    borderColor: c.line,
    maxWidth: 1000,
    width: '100%',
    maxHeight: '96%',
    alignSelf: 'center',
    flexShrink: 1,
    overflow: 'hidden',
  },
  header: {
    padding: 22,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    borderBottomWidth: 1,
    borderColor: c.line,
  },
  close: {
    padding: 8,
    width: 44,
    height: 44,
    borderRadius: 22,
    borderWidth: 1,
    borderColor: c.line,
    alignItems: 'center',
    justifyContent: 'center',
  },
  content: { padding: 20, gap: 18 },
  title: { fontSize: 25, fontWeight: '700', color: c.ink },
  heading: { fontSize: 21, fontWeight: '700', color: c.ink },
  body: { color: c.ink, fontSize: 16, lineHeight: 23 },
  muted: { color: c.muted, fontSize: 14, lineHeight: 21 },
  card: {
    backgroundColor: '#FFFCF7',
    borderWidth: 1,
    borderColor: c.line,
    borderRadius: 20,
    padding: 20,
    gap: 14,
  },
  row: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
    alignItems: 'center',
  },
  input: {
    backgroundColor: '#FFF',
    borderWidth: 1,
    borderColor: c.line,
    borderRadius: 12,
    padding: 12,
    color: c.ink,
    fontSize: 17,
  },
  chip: {
    paddingHorizontal: 14,
    paddingVertical: 11,
    borderRadius: 20,
    backgroundColor: c.light,
  },
  selected: { backgroundColor: c.green },
  label: { color: c.ink, fontSize: 16, fontWeight: '600' },
  error: { color: '#A32F35', fontSize: 15, lineHeight: 22 },
  editor: { paddingTop: 16, borderTopWidth: 1, borderColor: c.line, gap: 12 },
  stat: {
    flexGrow: 1,
    minWidth: 140,
    backgroundColor: '#F0EBD9',
    padding: 18,
    borderRadius: 14,
  },
  statValue: { color: c.ink, fontSize: 30, fontWeight: '700' },
  result: { borderTopWidth: 1, borderColor: c.line, paddingTop: 12, gap: 6 },
  track: {
    height: 8,
    backgroundColor: c.light,
    borderRadius: 4,
    overflow: 'hidden',
  },
  fill: { height: 8, backgroundColor: c.green },
});

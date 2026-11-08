import { Text, TextInput, Paper, Icon } from '../src/Storybook';
import React, { useEffect, useState, useCallback, useRef } from 'react';
import { View, FlatList, Modal, ScrollView, Pressable } from 'react-native';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { Image } from 'expo-image';
import { ReaderSafeArea, useReaderDimensions } from '../src/ReaderSafeArea';
import type {
  Preview,
  Tag,
  Category,
  Character,
  Language,
  Channel,
} from '../../../packages/shared/src/index';
import { api } from '../src/api';
import { downloads, metadata, type Guest } from '../src/storage';
import {
  Button,
  StoryCard,
  LoadingScreen,
  styles as s,
} from '../src/components';
import { colors as c } from '../src/theme';
import { LobbyHeader, CharacterShelf } from '../src/LobbyHeader';
import { matchesLobby, childAgeGroup, interestScore } from '../src/lobby';
import { assetStore } from '../src/storageAdapter';
import { ApiError } from '../../../packages/api-client/src/index';
import { ParentCenter } from '../src/ParentCenter';
import {
  loadFamily,
  loadReader,
  toggleReaderFavorite,
} from '../src/family-store';
import type { Child } from '../../../packages/shared/src/family';
import { enterStoryFullscreen } from '../src/fullscreen';
export default function Home() {
  return (
    <ReaderSafeArea>
      <LobbyContent />
    </ReaderSafeArea>
  );
}

function LobbyContent() {
  const router = useRouter(),
    { completed, parents, signin } = useLocalSearchParams<{
      completed?: string;
      parents?: string;
      signin?: string;
    }>(),
    { width } = useReaderDimensions();
  const columns = width >= 1000 ? 4 : width >= 700 ? 3 : 2;
  const [contentWidth, setContentWidth] = useState(width - 32);
  const [activeChild, setActiveChild] = useState<Child>();
  async function refreshActiveChild() {
    const family = await loadFamily();
    const child = family.children.find(
      (child) => child.id === family.activeChildId,
    );
    const reader = await loadReader();
    if (reader.id !== guest?.id) setItems([]);
    setGuest(reader);
    setActiveChild(child);
    setAge(child ? childAgeGroup(child.age) : '');
    setTag([]);
    setCategory('');
    setCharactersFilter([]);
    if (child) changeLanguage(child.language);
    else {
      const saved = await metadata.get('story-language');
      if (saved === 'en' || saved === 'es' || saved === 'ka')
        setLanguage(saved);
    }
    if (completed && !reader.favorites.includes(completed))
      setPrompt(completed);
  }
  function changeLanguage(value: Language) {
    setLanguage(value);
    void metadata.set('story-language', value);
  }
  const [items, setItems] = useState<Preview[]>([]),
    [tags, setTags] = useState<Tag[]>([]),
    [age, setAge] = useState(''),
    [tag, setTag] = useState<string[]>([]),
    [category, setCategory] = useState(''),
    [categories, setCategories] = useState<Category[]>([]),
    [characters, setCharacters] = useState<Character[]>([]),
    [selectedCharacters, setCharactersFilter] = useState<string[]>([]),
    [language, setLanguage] = useState<Language>('en'),
    [tab, setTab] = useState('home'),
    [cursor, setCursor] = useState<string | null>(null),
    [loading, setLoading] = useState(true),
    [error, setError] = useState(''),
    [selected, setSelected] = useState<Preview | null>(null),
    [guest, setGuest] = useState<Guest>(),
    [states, setStates] = useState<Record<string, string>>({}),
    [prompt, setPrompt] = useState<string>(),
    [parent, setParent] = useState(false),
    [downloadError, setDownloadError] = useState('');
  const [development, setDevelopment] = useState(false),
    [devCountry, setDevCountry] = useState('US'),
    [devChannel, setDevChannel] = useState<Channel>('web'),
    [devPremium, setDevPremium] = useState(false);
  const busy = useRef(false),
    generation = useRef(0);
  useEffect(() => {
    if (parents === '1') setParent(true);
    void refreshActiveChild();
    api
      .get<{ development: boolean; country: string; channel: Channel }>(
        '/config',
      )
      .then((config) => {
        setDevelopment(config.development);
        setDevCountry(config.country);
        setDevChannel(config.channel);
      })
      .catch(() => {});
  }, [completed]);
  useEffect(() => {
    api
      .tags()
      .then(setTags)
      .catch(() => {});
  }, []);
  useEffect(() => {
    let active = true;
    async function loadTaxonomy() {
      try {
        const [categories, characters] = await Promise.all([
          api.get<Category[]>('/categories'),
          api.get<Character[]>('/characters'),
        ]);
        if (!active) return;
        setCategories(categories);
        setCharacters(characters);
        await metadata.set(
          'lobby-taxonomy',
          JSON.stringify({ categories, characters }),
        );
      } catch {
        const cached = await metadata.get('lobby-taxonomy');
        if (active && cached) {
          const data = JSON.parse(cached);
          setCategories(data.categories);
          setCharacters(data.characters);
        }
      }
    }
    void loadTaxonomy();
    return () => {
      active = false;
    };
  }, []);
  const favorite = (id: string) => {
    void toggleReaderFavorite(id)
      .then((g) => {
        setGuest(g);
        if (tab === 'favorites' && !g.favorites.includes(id))
          setItems((rows) => rows.filter((r) => r.id !== id));
      })
      .catch((e) => setError(String(e)));
  };
  const load = useCallback(
    async (more = false) => {
      if (more && busy.current) return;
      const gen = more ? generation.current : ++generation.current;
      busy.current = true;
      setLoading(true);
      setError('');
      api.language = language;
      try {
        let next: Preview[];
        if (tab === 'favorites') {
          const g = await loadReader();
          const previews = await Promise.all(
            g.favorites.map((id) =>
              api.preview(id).catch(async (e) => {
                if (e instanceof ApiError) return null;
                const saved = await metadata.get(`preview:${id}:${language}`);
                return saved ? (JSON.parse(saved) as Preview) : null;
              }),
            ),
          );
          next = previews.filter((x): x is Preview => !!x);
          setCursor(null);
        } else {
          next = [];
          let nextPage: string | undefined;
          do {
            const result = await api.home({ cursor: nextPage });
            if (gen !== generation.current) return;
            next.push(...result.items);
            nextPage = result.nextCursor ?? undefined;
          } while (nextPage);
          setCursor(null);
        }
        if (gen !== generation.current) return;
        setItems((old) =>
          more
            ? [...old, ...next.filter((n) => !old.some((o) => o.id === n.id))]
            : next,
        );
        await metadata.set(
          `catalog:${language}:${tab}${tab === 'favorites' ? `:${guest?.id ?? 'guest'}` : ''}`,
          JSON.stringify(next),
        );
        for (const i of next) {
          await metadata.set(`preview:${i.id}:${language}`, JSON.stringify(i));
          const r = await downloads.inspect(i.id, language, i.updatedAt);
          if (gen === generation.current)
            setStates((old) => ({
              ...old,
              [i.id]: r?.state ?? 'not-downloaded',
            }));
        }
      } catch (e) {
        if (gen === generation.current) {
          setError(String(e));
          const cached = await metadata.get(
            `catalog:${language}:${tab}${tab === 'favorites' ? `:${guest?.id ?? 'guest'}` : ''}`,
          );
          if (cached && !more) {
            const rows = JSON.parse(cached) as Preview[];
            for (const item of rows) {
              const r = await downloads.inspect(
                item.id,
                language,
                item.updatedAt,
              );
              item.cover.url = await assetStore.resolve(item.cover);
              if (item.thumbnail)
                item.thumbnail.url = await assetStore.resolve(item.thumbnail);
              setStates((old) => ({
                ...old,
                [item.id]: r?.state ?? 'not-downloaded',
              }));
            }
            setItems(
              tab === 'favorites'
                ? rows.filter((row) => guest?.favorites.includes(row.id))
                : rows,
            );
          } else if (!more) setItems([]);
        }
      } finally {
        if (gen === generation.current) {
          setLoading(false);
          busy.current = false;
        }
      }
    },
    [language, tab, cursor, guest?.id],
  );
  useEffect(() => {
    void load(false);
  }, [language, tab, guest?.id]);
  const download = async (story: Preview) => {
    if (story.locked) {
      setParent(true);
      return;
    }
    setDownloadError('');
    try {
      api.language = language;
      const m = await api.manifest(story.id, true);
      await assetStore.put(story.cover);
      if (story.thumbnail && story.thumbnail.hash !== story.cover.hash)
        await assetStore.put(story.thumbnail);
      await downloads.download(m, (r) =>
        setStates((old) => ({ ...old, [story.id]: r.state })),
      );
    } catch (e) {
      setDownloadError(String(e));
    }
  };
  const play = (story: Preview, resume = false, quiz = false) => {
    void enterStoryFullscreen();
    setSelected(null);
    router.push({
      pathname: '/player/[id]',
      params: {
        id: story.id,
        language,
        ...(resume ? { resume: '1' } : {}),
        ...(quiz ? { quiz: '1' } : {}),
      },
    });
  };
  return (
    <View style={{ flex: 1, backgroundColor: c.paper }}>
      <Paper />
      <FlatList
        key={columns}
        numColumns={columns}
        data={items
          .filter((story) =>
            matchesLobby(story, age, tag, category, selectedCharacters),
          )
          .sort((a, b) =>
            activeChild && tab !== 'favorites'
              ? interestScore(
                  b,
                  activeChild.interests,
                  tags,
                  categories,
                  characters,
                ) -
                interestScore(
                  a,
                  activeChild.interests,
                  tags,
                  categories,
                  characters,
                )
              : 0,
          )}
        contentContainerStyle={{
          maxWidth: 1240,
          width: '100%',
          alignSelf: 'center',
          padding: width < 600 ? 16 : 32,
          paddingBottom: 40,
        }}
        columnWrapperStyle={{ gap: width < 600 ? 12 : 18, marginBottom: 18 }}
        onEndReached={() => {
          if (cursor && !loading && tab === 'home') void load(true);
        }}
        onEndReachedThreshold={0.4}
        ListHeaderComponent={
          <View onLayout={(e) => setContentWidth(e.nativeEvent.layout.width)}>
            <LobbyHeader
              child={activeChild}
              language={language}
              setLanguage={changeLanguage}
              favorites={tab === 'favorites'}
              toggleFavorites={() =>
                setTab(tab === 'favorites' ? 'home' : 'favorites')
              }
              openParents={() => setParent(true)}
              age={age}
              setAge={setAge}
              selectedTags={tag}
              setTags={setTag}
              category={category}
              setCategory={setCategory}
              categories={categories}
              characters={characters}
              selectedCharacters={selectedCharacters}
              setCharacters={setCharactersFilter}
              tags={tags}
              stories={items.filter((story) =>
                matchesLobby(story, age, [], ''),
              )}
              guest={guest}
              onResume={(story) =>
                story.locked ? setSelected(story) : play(story, true)
              }
            />
            {error && (
              <View style={{ padding: 18, gap: 8 }}>
                <Text style={s.body}>
                  You may be offline. Saved stories can still be opened.
                </Text>
                <Text style={s.small}>{error}</Text>
                <Button onPress={() => void load(false)}>Try again</Button>
              </View>
            )}
            {downloadError && (
              <Text
                accessibilityRole="alert"
                style={{ color: '#A33', padding: 14 }}
              >
                {downloadError}
              </Text>
            )}
          </View>
        }
        renderItem={({ item }) => (
          <View
            style={{
              width:
                (contentWidth - (columns - 1) * (width < 600 ? 12 : 18)) /
                columns,
            }}
          >
            <StoryCard
              story={item}
              onPress={() => setSelected(item)}
              favorite={guest?.favorites.includes(item.id) ?? false}
              onFavorite={() => favorite(item.id)}
              status={states[item.id] ?? ''}
              onDownload={() => void download(item)}
            />
          </View>
        )}
        ListEmptyComponent={
          loading ? (
            <LoadingScreen />
          ) : (
            <View style={{ padding: 40 }}>
              <Text style={s.cardTitle}>
                {tab === 'favorites'
                  ? 'Your favorite tales will live here.'
                  : 'No tales here just yet.'}
              </Text>
              <Text style={s.body}>Try another language or filter.</Text>
            </View>
          )
        }
        ListFooterComponent={
          <View>
            {loading && items.length > 0 && <LoadingScreen />}
            <CharacterShelf
              characters={characters}
              selected={selectedCharacters}
              onSelect={(id) =>
                setCharactersFilter(
                  selectedCharacters.includes(id)
                    ? selectedCharacters.filter((item) => item !== id)
                    : [...selectedCharacters, id],
                )
              }
            />
            <Text style={[s.small, { textAlign: 'center', marginTop: 24 }]}>
              {activeChild
                ? `${activeChild.icon} Reading as ${activeChild.name} · Quiz progress is saved to this profile`
                : 'Choose a child profile to save quiz progress.'}
            </Text>
            <Text style={[s.small, { textAlign: 'center', padding: 24 }]}>
              Made for little dreamers · No ads. Just stories.
            </Text>
          </View>
        }
      />
      <Modal
        visible={!!selected}
        transparent
        animationType="fade"
        onRequestClose={() => setSelected(null)}
      >
        <View
          style={{
            flex: 1,
            backgroundColor: '#432B1E80',
            justifyContent: 'center',
            padding: 24,
          }}
        >
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Dismiss story popup"
            onPress={() => setSelected(null)}
            style={{
              position: 'absolute',
              top: 0,
              right: 0,
              bottom: 0,
              left: 0,
            }}
          />
          <View
            style={{
              maxHeight: '90%',
              maxWidth: 540,
              width: '100%',
              alignSelf: 'center',
              backgroundColor: c.paper,
              borderRadius: 28,
              overflow: 'hidden',
            }}
          >
            <Paper />
            <ScrollView contentContainerStyle={{ padding: 24, gap: 16 }}>
              {selected && (
                <>
                  <Image
                    source={(selected.thumbnail ?? selected.cover).url}
                    accessibilityLabel={`${selected.title} thumbnail`}
                    style={{ height: 220, borderRadius: 20 }}
                    contentFit="cover"
                  />
                  <Text style={[s.title, { fontSize: width < 600 ? 30 : 36 }]}>
                    {selected.title}
                  </Text>
                  <Text style={s.body}>{selected.description}</Text>
                  <Text style={s.small}>
                    Ages {selected.minAge}–{selected.maxAge} ·{' '}
                    {selected.languages.join(' / ').toUpperCase()}
                  </Text>
                  <View style={s.row}>
                    <Button
                      quiet
                      icon="heart"
                      onPress={() => favorite(selected.id)}
                    >
                      {guest?.favorites.includes(selected.id)
                        ? 'Saved'
                        : 'Favorite'}
                    </Button>
                    <Button
                      quiet
                      icon="download"
                      onPress={() => void download(selected)}
                    >
                      {states[selected.id] === 'downloaded'
                        ? 'Available offline'
                        : 'Download'}
                    </Button>
                  </View>
                  <Button
                    onPress={() =>
                      selected.locked ? setParent(true) : play(selected)
                    }
                  >
                    {selected.locked
                      ? '♜ Premium · Ask a grown-up'
                      : 'Let’s read →'}
                  </Button>
                  <Button
                    quiet
                    onPress={() =>
                      selected.locked
                        ? setParent(true)
                        : play(selected, false, true)
                    }
                  >
                    Take a test
                  </Button>
                  {states[selected.id] === 'downloaded' && (
                    <Button
                      quiet
                      onPress={() =>
                        void downloads.remove(selected.id, language).then(() =>
                          setStates((old) => ({
                            ...old,
                            [selected.id]: 'not-downloaded',
                          })),
                        )
                      }
                    >
                      Remove download
                    </Button>
                  )}
                </>
              )}
            </ScrollView>
            <Pressable
              accessibilityRole="button"
              accessibilityLabel="Close story popup"
              onPress={() => setSelected(null)}
              style={{
                position: 'absolute',
                top: 12,
                right: 12,
                width: 44,
                height: 44,
                borderRadius: 22,
                backgroundColor: c.paper,
                borderWidth: 1,
                borderColor: c.line,
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              <Icon name="close" size={26} />
            </Pressable>
          </View>
        </View>
      </Modal>
      <Modal
        visible={!!prompt}
        transparent
        onRequestClose={() => setPrompt(undefined)}
      >
        <View
          style={{
            flex: 1,
            backgroundColor: '#432B1E80',
            justifyContent: 'center',
            padding: 30,
          }}
        >
          <View
            style={{
              backgroundColor: c.paper,
              borderRadius: 28,
              padding: 30,
              gap: 20,
              maxWidth: 500,
              alignSelf: 'center',
            }}
          >
            <Text style={s.title}>A happily ever after. ♥</Text>
            <Text style={s.body}>
              Did you enjoy this tale? Save it to your Favorites for another
              day.
            </Text>
            <Button
              onPress={() => {
                if (prompt) favorite(prompt);
                setPrompt(undefined);
              }}
            >
              Add to Favorites
            </Button>
            <Button quiet onPress={() => setPrompt(undefined)}>
              Not now
            </Button>
          </View>
        </View>
      </Modal>
      {parent && (
        <ParentCenter
          language={language}
          onLanguage={changeLanguage}
          tags={tags}
          signInFailed={signin === 'failed'}
          onClose={() => {
            setParent(false);
            void refreshActiveChild();
          }}
          extras={
            <>
              {development && (
                <View
                  style={{
                    gap: 10,
                    padding: 12,
                    borderWidth: 1,
                    borderColor: c.line,
                    borderRadius: 12,
                  }}
                >
                  <Text style={s.cardTitle}>Development access test</Text>
                  <Text style={s.small}>
                    Local testing only · {devPremium ? 'Premium' : 'Free'}.
                    Expires after 30 minutes or app restart. Disabled by the
                    production server.
                  </Text>
                  <TextInput
                    accessibilityLabel="Development country"
                    value={devCountry}
                    onChangeText={(v) => setDevCountry(v.toUpperCase())}
                    maxLength={6}
                    style={{
                      padding: 12,
                      borderWidth: 1,
                      borderColor: c.line,
                      borderRadius: 12,
                    }}
                  />
                  <View style={s.row}>
                    {(['web', 'mobile', 'unity'] as Channel[]).map(
                      (channel) => (
                        <Button
                          key={channel}
                          quiet={channel !== devChannel}
                          onPress={() => setDevChannel(channel)}
                        >
                          {channel}
                        </Button>
                      ),
                    )}
                  </View>
                  <View style={s.row}>
                    {[false, true].map((premium) => (
                      <Button
                        key={String(premium)}
                        quiet
                        onPress={() => {
                          void api
                            .developmentSession({
                              premium,
                              country: devCountry,
                              channel: devChannel,
                            })
                            .then(() => {
                              setDevPremium(premium);
                              setSelected(null);
                              void load(false);
                            })
                            .catch((e) => setDownloadError(String(e)));
                        }}
                      >
                        {premium ? 'Test Premium' : 'Test Free'}
                      </Button>
                    ))}
                  </View>
                </View>
              )}
            </>
          }
        />
      )}
    </View>
  );
}

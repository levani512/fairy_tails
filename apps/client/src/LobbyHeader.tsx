import { Text, Icon, Brand } from './Storybook';
import React, { useEffect, useState } from 'react';
import {
  View,
  Pressable,
  ScrollView,
  StyleSheet,
  useWindowDimensions,
} from 'react-native';
import { Image } from 'expo-image';
import type {
  Language,
  Preview,
  Tag,
  Category,
  Character,
} from '../../../packages/shared/src/index';
import type { Guest } from './storage';
import { ageGroups } from './lobby';
import { colors as c } from './theme';
import { api } from './api';
import type { Manifest } from '../../../packages/shared/src/index';

function ReadingProgress({
  story,
  page,
  language,
}: {
  story: Preview;
  page: number;
  language: Language;
}) {
  const [count, setCount] = useState<number>();
  useEffect(() => {
    const controller = new AbortController();
    setCount(undefined);
    api
      .get<Manifest>(
        `/stories/${encodeURIComponent(story.id)}/manifest`,
        { language },
        controller.signal,
      )
      .then((manifest) => {
        if (!controller.signal.aborted) setCount(manifest.pages.length);
      })
      .catch(() => {});
    return () => controller.abort();
  }, [story.id, story.updatedAt, language]);
  const percent = count
    ? Math.min(100, Math.round((page / Math.max(1, count - 1)) * 100))
    : undefined;
  return (
    <View style={{ gap: 6 }}>
      <Text style={{ fontSize: 14 }}>
        Continue · {percent === undefined ? `Page ${page + 1}` : `${percent}%`}
      </Text>
      {percent !== undefined && (
        <View
          accessibilityRole="progressbar"
          accessibilityLabel="Reading progress"
          accessibilityValue={{ min: 0, max: 100, now: percent }}
          style={{
            height: 9,
            borderRadius: 5,
            backgroundColor: '#E4DED3',
            overflow: 'hidden',
          }}
        >
          <View
            style={{
              width: `${percent}%`,
              height: '100%',
              borderRadius: 5,
              backgroundColor: c.green,
            }}
          />
        </View>
      )}
    </View>
  );
}

export function Pill({
  children,
  active = false,
  onPress,
  label,
}: {
  children: React.ReactNode;
  active?: boolean;
  onPress: () => void;
  label?: string;
}) {
  const phone = useWindowDimensions().width < 600;
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={label}
      accessibilityState={{ selected: active }}
      onPress={onPress}
      style={({ pressed }) => [
        l.pill,
        { minWidth: phone ? 42 : 80 },
        active && l.active,
        { opacity: pressed ? 0.7 : 1 },
      ]}
    >
      <Text
        numberOfLines={1}
        style={[
          l.pillText,
          { fontSize: phone ? 14 : 17 },
          active && { color: '#FFF' },
        ]}
      >
        {children}
      </Text>
    </Pressable>
  );
}
export function LobbyHeader({
  language,
  setLanguage,
  favorites,
  toggleFavorites,
  openParents,
  age,
  setAge,
  selectedTags,
  setTags,
  category,
  setCategory,
  categories,
  characters,
  selectedCharacters,
  setCharacters,
  tags,
  stories,
  guest,
  onResume,
  child,
}: {
  language: Language;
  setLanguage: (l: Language) => void;
  favorites: boolean;
  toggleFavorites: () => void;
  openParents: () => void;
  age: string;
  setAge: (a: string) => void;
  selectedTags: string[];
  setTags: (t: string[]) => void;
  category: string;
  categories: Category[];
  characters: Character[];
  selectedCharacters: string[];
  setCharacters: (ids: string[]) => void;
  setCategory: (c: string) => void;
  tags: Tag[];
  stories: Preview[];
  guest?: Guest;
  child?: { name: string; icon: string };
  onResume: (s: Preview) => void;
}) {
  const { width } = useWindowDimensions();
  const phone = width < 600;
  const [languagesOpen, setLanguagesOpen] = useState(false),
    [moreTags, setMoreTags] = useState(false);
  const topics = tags.filter((t) => t.active);
  const unfinished = stories.filter(
    (s) =>
      guest?.progress[`${s.id}:${language}`] !== undefined &&
      !guest?.completed.includes(s.id),
  );
  const filtered =
    !!category || selectedTags.length > 0 || selectedCharacters.length > 0;
  const toggleTag = (id: string) =>
    setTags(
      selectedTags.includes(id)
        ? selectedTags.filter((t) => t !== id)
        : [...selectedTags, id],
    );
  return (
    <View>
      <View style={[l.header, { marginBottom: phone ? 24 : 30 }]}>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="All stories home"
          onPress={() => {
            setCategory('');
            setCharacters([]);
            setAge('');
            setTags([]);
            if (favorites) toggleFavorites();
          }}
        >
          <Brand small={phone} />
        </Pressable>
        <View
          style={{
            flexDirection: 'row',
            alignItems: 'center',
            gap: phone ? 4 : 12,
          }}
        >
          <Pill
            label="Choose story language"
            active={languagesOpen}
            onPress={() => setLanguagesOpen(!languagesOpen)}
          >
            {language.toUpperCase()}⌄
          </Pill>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Favorites"
            accessibilityState={{ selected: favorites }}
            onPress={toggleFavorites}
            style={l.heart}
          >
            <Icon
              name="heart"
              size={phone ? 25 : 32}
              color={c.orange}
              filled={favorites}
            />
          </Pressable>
          <Pill
            label={child ? `${child.name} profile` : 'Choose a child profile'}
            onPress={openParents}
          >
            {child ? `${child.icon} ${child.name}` : 'Choose profile'}
          </Pill>
        </View>
      </View>
      {languagesOpen && (
        <View
          style={[l.wrap, { justifyContent: 'flex-end', marginBottom: 18 }]}
        >
          {(['en', 'es', 'ka'] as Language[]).map((code) => (
            <Pill
              key={code}
              active={language === code}
              onPress={() => {
                setLanguage(code);
                setLanguagesOpen(false);
              }}
            >
              {{ en: 'English', es: 'Español', ka: 'ქართული' }[code]}
            </Pill>
          ))}
        </View>
      )}
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        style={{ marginBottom: 18 }}
        contentContainerStyle={{ gap: 10, flexGrow: 1 }}
      >
        {[{ id: '', name: 'All Stories' }, ...categories].map(
          ({ id, name }) => (
            <View key={id} style={!phone && { flex: 1 }}>
              <Pill active={category === id} onPress={() => setCategory(id)}>
                {name}
              </Pill>
            </View>
          ),
        )}
      </ScrollView>
      <View
        style={{
          flexDirection: 'row',
          alignItems: 'center',
          gap: 10,
          marginBottom: 12,
        }}
      >
        <Text style={l.label}>Age:</Text>
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={{ gap: 8 }}
        >
          {ageGroups.map((a) => (
            <Pill key={a} active={a === age} onPress={() => setAge(a)}>
              {a || 'All'}
            </Pill>
          ))}
        </ScrollView>
      </View>
      {topics.length > 0 && (
        <View
          style={{
            flexDirection: 'row',
            alignItems: 'center',
            gap: 10,
            marginBottom: 12,
          }}
        >
          <Icon name="tag" size={22} />
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={{ gap: 8 }}
          >
            {topics.slice(0, 3).map((t) => (
              <Pill
                key={t.id}
                active={selectedTags.includes(t.id)}
                onPress={() => toggleTag(t.id)}
              >
                {t.labels[language] ?? t.labels.en ?? t.id}
              </Pill>
            ))}
            {topics.length > 3 && (
              <Pill active={moreTags} onPress={() => setMoreTags(!moreTags)}>
                More {moreTags ? '⌃' : '⌄'}
              </Pill>
            )}
          </ScrollView>
        </View>
      )}
      {moreTags && (
        <View style={[l.wrap, { marginBottom: 12 }]}>
          {topics.slice(3).map((t) => (
            <Pill
              key={t.id}
              active={selectedTags.includes(t.id)}
              onPress={() => toggleTag(t.id)}
            >
              {t.labels[language] ?? t.labels.en ?? t.id}
            </Pill>
          ))}
        </View>
      )}
      {(filtered || age) && (
        <Pressable
          accessibilityRole="button"
          onPress={() => {
            setCategory('');
            setCharacters([]);
            setTags([]);
            setAge('');
          }}
          style={{
            position: 'absolute',
            bottom: 12,
            right: 0,
            paddingVertical: 10,
            minHeight: 44,
            justifyContent: 'center',
            zIndex: 1,
          }}
        >
          <Text style={{ color: c.green, fontWeight: '600' }}>
            Reset filters ×
          </Text>
        </Pressable>
      )}
      {!favorites && !filtered && unfinished.length > 0 && (
        <View style={{ marginTop: 20, marginBottom: 12 }}>
          <Text style={l.heading}>Continue Reading</Text>
          {unfinished.slice(-1).map((story) => (
            <Pressable
              key={story.id}
              accessibilityRole="button"
              accessibilityLabel={`Continue reading ${story.title}`}
              onPress={() => onResume(story)}
              style={l.resume}
            >
              <Image
                source={(story.thumbnail ?? story.cover).url}
                contentFit="cover"
                style={{
                  width: phone ? 92 : 180,
                  aspectRatio: 1.65,
                  borderRadius: 14,
                }}
              />
              <View style={{ flex: 1, gap: 8 }}>
                <Text
                  numberOfLines={2}
                  style={[l.storyTitle, { fontSize: phone ? 17 : 24 }]}
                >
                  {story.title}
                </Text>
                <ReadingProgress
                  story={story}
                  page={guest?.progress[`${story.id}:${language}`] ?? 0}
                  language={language}
                />
              </View>
              <View style={l.play}>
                <Icon name="play" size={23} color="#FFF9EF" filled />
              </View>
            </Pressable>
          ))}
        </View>
      )}
      <Text
        style={[
          l.heading,
          { marginTop: 22, paddingRight: filtered || age ? 108 : 0 },
        ]}
      >
        {favorites
          ? 'Your Favorites'
          : filtered
            ? !category
              ? 'Matching Stories'
              : (categories.find((c) => c.id === category)?.name ??
                'Matching Stories')
            : 'Stories for You'}
      </Text>
    </View>
  );
}
export function CharacterShelf({
  characters,
  selected,
  onSelect,
}: {
  characters: Character[];
  selected: string[];
  onSelect: (id: string) => void;
}) {
  const { width } = useWindowDimensions();
  const phone = width < 600;
  if (!characters.length) return null;
  return (
    <View style={{ marginTop: 20, marginBottom: 8 }}>
      <Text style={l.heading}>Meet the Characters</Text>
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={{
          gap: phone ? 14 : 28,
          paddingBottom: 4,
          flexGrow: 1,
        }}
      >
        {characters.map((character) => (
          <Pressable
            key={character.id}
            accessibilityRole="button"
            accessibilityLabel={`Filter by ${character.name}`}
            accessibilityState={{ selected: selected.includes(character.id) }}
            onPress={() => onSelect(character.id)}
            style={{
              flexDirection: phone ? 'column' : 'row',
              alignItems: 'center',
              gap: phone ? 6 : 12,
              width: phone ? 105 : 260,
              flexGrow: phone ? 0 : 1,
            }}
          >
            <View
              style={{
                padding: 4,
                borderRadius: 50,
                borderWidth: 3,
                borderColor: selected.includes(character.id)
                  ? c.green
                  : 'transparent',
              }}
            >
              <Image
                source={character.image.url}
                contentFit="cover"
                style={{
                  width: phone ? 82 : 108,
                  height: phone ? 82 : 108,
                  borderRadius: 54,
                }}
              />
            </View>
            <Text
              style={[
                l.storyTitle,
                {
                  fontSize: phone ? 16 : 20,
                  textAlign: phone ? 'center' : 'left',
                  flexShrink: 1,
                },
              ]}
            >
              {character.name}
              {selected.includes(character.id) ? ' ✓' : ''}
            </Text>
          </Pressable>
        ))}
      </ScrollView>
    </View>
  );
}
export const l = StyleSheet.create({
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    gap: 8,
    flexWrap: 'wrap',
  },
  logo: { fontWeight: '800', color: '#DC721D', letterSpacing: -1.2 },
  pill: {
    minHeight: 44,
    paddingVertical: 7,
    paddingHorizontal: 12,
    borderRadius: 24,
    borderWidth: 1,
    borderColor: c.line,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#FFFAEF99',
  },
  active: {
    backgroundColor: c.green,
    borderColor: '#6E8B48',
    boxShadow: 'inset 0px 2px 5px #FFFFFF24',
  },
  pillText: { fontSize: 14, fontWeight: '600', color: c.ink },
  heart: {
    minWidth: 44,
    minHeight: 44,
    alignItems: 'center',
    justifyContent: 'center',
  },
  label: { fontSize: 17, fontWeight: '700', color: c.ink },
  wrap: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  heading: {
    fontSize: 26,
    fontWeight: '900',
    letterSpacing: -0.6,
    color: c.ink,
    marginBottom: 16,
  },
  storyTitle: { color: c.ink, fontWeight: '900' },
  resume: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
    backgroundColor: '#FFFCF280',
    boxShadow: '0px 2px 1px #62421D16',
    borderWidth: 1,
    borderColor: c.line,
    padding: 12,
    borderRadius: 22,
    marginBottom: 10,
  },
  play: {
    width: 46,
    height: 46,
    borderRadius: 23,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: c.orange,
    borderWidth: 1,
    borderColor: '#C56019',
    boxShadow: 'inset 0px 2px 2px #FFFFFF55',
  },
});

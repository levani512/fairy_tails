import React, { useEffect, useState, useRef } from 'react';
import { View, Text } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { ReaderSafeArea } from '../../src/ReaderSafeArea';
import {
  type Manifest,
  type Language,
} from '../../../../packages/shared/src/index';
import {
  preload,
  preparePage,
} from '../../../../packages/asset-manager/src/index';
import { api } from '../../src/api';
import { ApiError } from '../../../../packages/api-client/src/index';
import { downloads } from '../../src/storage';
import { loadReader, recordReading } from '../../src/family-store';
import { assetStore } from '../../src/storageAdapter';
import { StoryPlayer } from '../../src/Player';
import { StoryQuiz } from '../../src/StoryQuiz';
import { LoadingScreen, Button, styles } from '../../src/components';
import { sendToUnity } from '../../../../integrations/unity/bridge';
import { leaveStoryFullscreen } from '../../src/fullscreen';
export default function PlayerRoute() {
  useEffect(
    () => () => {
      void leaveStoryFullscreen();
    },
    [],
  );
  const {
      id,
      language = 'en',
      resume,
      quiz,
    } = useLocalSearchParams<{
      id: string;
      language: Language;
      resume?: string;
      quiz?: string;
    }>(),
    router = useRouter();
  const [manifest, setManifest] = useState<Manifest>(),
    [index, setIndex] = useState(0),
    [error, setError] = useState(''),
    [attempt, setAttempt] = useState(0);
  const original = useRef<Manifest | undefined>(undefined);
  useEffect(() => {
    const controller = new AbortController();
    let active = true;
    setError('');
    setManifest(undefined);
    void (async () => {
      try {
        api.language = language;
        let m: Manifest;
        try {
          m = await api.manifest(id);
        } catch (e) {
          if (e instanceof ApiError) throw e;
          const offline = await downloads.playable(id, language);
          if (!offline) throw e;
          m = offline;
        }
        original.current = m;
        if (m.cover) m.cover.url = await assetStore.resolve(m.cover);
        if (quiz === '1') {
          if (m.music)
            m.music.asset.url = await assetStore.resolve(m.music.asset);
          if (active) setManifest(m);
          return;
        }
        const guest = resume === '1' ? await loadReader() : undefined;
        const start = Math.min(
          guest?.progress[`${id}:${language}`] ?? 0,
          m.pages.length - 1,
        );
        await preparePage(m, start, assetStore, controller.signal);
        const copy = structuredClone(m);
        for (const page of copy.pages) {
          for (const a of [
            page.illustration,
            page.video,
            page.poster,
            page.narration,
            page.music?.asset,
            ...page.effects.map((e) => e.asset),
          ])
            if (a) a.url = await assetStore.resolve(a);
        }
        if (copy.music)
          copy.music.asset.url = await assetStore.resolve(copy.music.asset);
        if (active) {
          setIndex(start);
          setManifest(copy);
          sendToUnity({ version: 1, type: 'STORY_STARTED', storyId: id });
        }
      } catch (e) {
        if (active) {
          setError(String(e));
          sendToUnity({
            version: 1,
            type:
              e instanceof ApiError && e.code === 'SESSION_EXPIRED'
                ? 'SESSION_EXPIRED'
                : 'ERROR',
            code: e instanceof ApiError ? e.code : 'PLAYBACK_UNAVAILABLE',
          });
        }
      }
    })();
    return () => {
      active = false;
      controller.abort();
    };
  }, [id, language, resume, quiz, attempt]);
  useEffect(() => {
    if (!original.current || quiz === '1') return;
    const controller = new AbortController();
    void preload(original.current, index, assetStore, controller.signal).catch(
      () => {},
    );
    return () => controller.abort();
  }, [manifest, index, quiz]);
  async function exit(complete: boolean) {
    await recordReading(id, language, index, complete);
    sendToUnity({
      version: 1,
      type: complete ? 'STORY_COMPLETED' : 'RETURN_TO_UNITY',
      storyId: id,
    });
    router.replace(
      complete ? { pathname: '/', params: { completed: id } } : '/',
    );
  }
  return (
    <ReaderSafeArea>
      <View style={{ flex: 1 }}>
        {error ? (
          <View style={{ gap: 20, padding: 30 }}>
            <Text style={styles.title}>This tale needs a moment.</Text>
            <Text style={styles.body}>{error}</Text>
            <Button onPress={() => setAttempt((a) => a + 1)}>Try again</Button>
            <Button quiet onPress={() => router.replace('/')}>
              Back to stories
            </Button>
          </View>
        ) : manifest && quiz === '1' ? (
          manifest.quiz?.length ? (
            <StoryQuiz
              storyId={manifest.id}
              language={manifest.language}
              title={manifest.title}
              questions={manifest.quiz}
              music={manifest.music}
              coverUrl={
                manifest.cover?.url ?? manifest.pages[0]?.illustration.url
              }
              onHome={() => router.replace('/')}
            />
          ) : (
            <View style={{ gap: 20, padding: 30 }}>
              <Text style={styles.title}>
                This story doesn’t have a quiz yet.
              </Text>
              <Button onPress={() => router.replace('/')}>
                Back to stories
              </Button>
            </View>
          )
        ) : manifest ? (
          <StoryPlayer
            manifest={manifest}
            index={index}
            setIndex={setIndex}
            onExit={() => void exit(false)}
            onComplete={() => void exit(true)}
          />
        ) : (
          <LoadingScreen />
        )}
      </View>
    </ReaderSafeArea>
  );
}

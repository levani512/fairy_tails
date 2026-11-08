import { storyPageLayout } from './reader-layout';
import { useReaderDimensions } from './ReaderSafeArea';
import { ILLUSTRATION_ASPECT } from '../../../packages/shared/src/illustration';
import { Text, Paper, Icon } from './Storybook';
import React, { useEffect, useMemo, useRef, useState } from 'react';
import {
  View,
  Text as NativeText,
  AppState,
  Animated,
  Pressable,
  ScrollView,
  StyleSheet,
} from 'react-native';
import { Image } from 'expo-image';
import { readerLayout, needsPhoneRotation } from './reader-layout';
import { useVideoPlayer, VideoView } from 'expo-video';
import {
  useAudioPlayer,
  useAudioPlayerStatus,
  createAudioPlayer,
} from 'expo-audio';
import type { Manifest, Page } from '../../../packages/shared/src/index';
import {
  activeWord,
  textSegments,
  CueTimeline,
} from '../../../packages/story-player/src/index';
import { styles as s } from './components';
import { StoryQuiz } from './StoryQuiz';
import { Music } from './Music';
import { colors as c } from './theme';
import { enterStoryFullscreen } from './fullscreen';
export function NarrationText({
  page,
  position,
  activeWordRef,
}: {
  page: Page;
  position: number;
  activeWordRef?: React.Ref<React.ComponentRef<typeof NativeText>>;
}) {
  const { height } = useReaderDimensions();
  const segments = useMemo(() => textSegments(page.text, page.timings), [page]),
    index = activeWord(page.timings, position);
  return (
    <Text
      style={{
        fontSize: height < 500 ? 18 : 24,
        lineHeight: height < 500 ? 27 : 36,
        fontWeight: '600',
        color: '#654524',
        textAlign: 'center',
      }}
    >
      {segments.map((part, i) => (
        <NativeText
          key={i}
          ref={
            part.index >= 0 && part.index === index ? activeWordRef : undefined
          }
          style={
            part.index >= 0 && part.index === index
              ? { backgroundColor: '#F6D58C', color: '#263F36' }
              : undefined
          }
        >
          {part.text}
        </NativeText>
      ))}
    </Text>
  );
}

function NarrationViewport({
  page,
  position,
  enabled,
  width,
  compact = false,
  flush = false,
}: {
  page: Page;
  position: number;
  enabled: boolean;
  width: number | '100%';
  compact?: boolean;
  flush?: boolean;
}) {
  const scroll = useRef<React.ComponentRef<typeof ScrollView>>(null);
  const content = useRef<React.ComponentRef<typeof View>>(null);
  const word = useRef<React.ComponentRef<typeof NativeText>>(null);
  const [viewport, setViewport] = useState({ width: 0, height: 0 });
  const [contentHeight, setContentHeight] = useState(0);
  const offset = useRef(0);
  const index = activeWord(page.timings, position);
  useEffect(() => {
    if (!enabled || index < 0 || !viewport.height) return;
    const frame = requestAnimationFrame(() => {
      if (!word.current || !content.current) return;
      word.current.measureLayout(
        content.current,
        (_x, y, _w, height) => {
          // Move only when the spoken line approaches the clipped edge.
          const top = offset.current + 12;
          const bottom = offset.current + viewport.height - 24;
          if (y < top || y + height > bottom) {
            const target = Math.max(
              0,
              Math.min(
                contentHeight - viewport.height,
                y - viewport.height * 0.25,
              ),
            );
            offset.current = target;
            scroll.current?.scrollTo({ y: target, animated: true });
          }
        },
        () => {},
      );
    });
    return () => cancelAnimationFrame(frame);
  }, [index, enabled, viewport, contentHeight]);
  return (
    <View
      style={{
        flex: 1,
        minHeight: 0,
        overflow: 'hidden',
        width,
        alignSelf: 'center',
        marginTop: flush ? 0 : 12,
        marginBottom: flush ? 0 : 4,
        borderRadius: compact ? 18 : 24,
        borderWidth: 1,
        borderColor: c.line,
        backgroundColor: '#FFFCF5D9',
        boxShadow: '0px 2px 4px #62421D10',
      }}
    >
      <ScrollView
        ref={scroll}
        testID="narration-viewport"
        accessibilityLabel="Narration text"
        style={{ flex: 1 }}
        contentContainerStyle={{ flexGrow: 1 }}
        scrollEnabled
        showsVerticalScrollIndicator
        onLayout={(event) => setViewport(event.nativeEvent.layout)}
        onScroll={(event) => {
          offset.current = event.nativeEvent.contentOffset.y;
        }}
        scrollEventThrottle={16}
      >
        <View
          ref={content}
          onLayout={(event) =>
            setContentHeight(event.nativeEvent.layout.height)
          }
          style={{
            flexGrow: 1,
            justifyContent: 'center',
            paddingHorizontal: compact ? 12 : 24,
            paddingVertical: 14,
          }}
        >
          <NarrationText
            page={page}
            position={enabled ? position : -1}
            activeWordRef={word}
          />
        </View>
      </ScrollView>
    </View>
  );
}
export function AnimatedPage({
  page,
  paused,
  onNarrating,
  navigation,
  endingActions,
  autoNarration,
  soundEffects,
  replayControl,
  onIllustrationAspect,
}: {
  page: Page;
  paused: boolean;
  onNarrating: (v: boolean) => void;
  navigation: React.ReactNode;
  endingActions?: React.ReactNode;
  autoNarration: boolean;
  soundEffects: boolean;
  replayControl: React.ReactNode;
  onIllustrationAspect?: (aspect: number) => void;
}) {
  const { width, height } = useReaderDimensions();
  const [bounds, setBounds] = useState({ width, height });
  const aspect = ILLUSTRATION_ASPECT;
  useEffect(() => {
    onIllustrationAspect?.(aspect);
  }, [aspect, onIllustrationAspect]);
  const { stacked, wide, compact, imageWidth, imageHeight } = storyPageLayout(
    bounds.width,
    bounds.height,
    aspect,
  );

  const narration = useAudioPlayer(page.narration?.url ?? null, {
      updateInterval: 50,
    }),
    status = useAudioPlayerStatus(narration);
  const [narrationPosition, setNarrationPosition] = useState(0);
  useEffect(() => {
    let frame: number;
    const update = () => {
      setNarrationPosition(narration.currentTime * 1000);
      frame = requestAnimationFrame(update);
    };
    update();
    return () => cancelAnimationFrame(frame);
  }, [narration]);
  const video = useVideoPlayer(page.video?.url ?? null, (p) => {
    p.muted = true;
    p.loop = false;
    p.timeUpdateEventInterval = 0.05;
  });
  const [videoFailed, setVideoFailed] = useState(false),
    [error, setError] = useState('');
  const effects = useRef<
      {
        player: ReturnType<typeof createAudioPlayer>;
        animation: boolean;
        durationMs?: number;
      }[]
    >([]),
    animationCues = useRef(new CueTimeline()),
    pageCues = useRef(new CueTimeline()),
    fade = useRef(new Animated.Value(0)).current;
  const animationStart = useRef(Date.now()),
    pausedAt = useRef<number | null>(null);
  const effectsEnabled = useRef(soundEffects);
  effectsEnabled.current = soundEffects;
  function stopEffects(animation?: boolean) {
    effects.current = effects.current.filter((effect) => {
      if (animation !== undefined && effect.animation !== animation)
        return true;
      effect.player.pause();
      effect.player.remove();
      return false;
    });
  }
  function cue(indices: number[], animation: boolean) {
    if (!effectsEnabled.current) return;
    const cues = page.effects.filter((e) => e.animation === animation);
    indices.forEach((i) => {
      const effect = cues[i],
        player = createAudioPlayer(effect.asset.url);
      player.volume = effect.volume;
      player.play();
      effects.current.push({
        player,
        animation,
        durationMs: effect.durationMs,
      });
    });
  }
  useEffect(() => {
    fade.setValue(0);
    Animated.timing(fade, {
      toValue: 1,
      duration: page.transition === 'none' ? 0 : page.transitionMs,
      useNativeDriver: true,
    }).start();
    if (page.video && !paused) video.play();
    return () => {
      stopEffects();
    };
  }, []);
  useEffect(() => {
    onNarrating(autoNarration && status.playing);
    if (page.narration && autoNarration && status.isLoaded === false)
      setError('Loading narration…');
    else setError('');
  }, [status.playing, status.isLoaded, autoNarration]);
  useEffect(() => {
    if (paused) {
      narration.pause();
      video.pause();
      effects.current.forEach(({ player }) => player.pause());
      pausedAt.current = Date.now();
    } else {
      if (pausedAt.current) {
        animationStart.current += Date.now() - pausedAt.current;
        pausedAt.current = null;
        if (page.video) video.play();
        effects.current.forEach(({ player }) => player.play());
      }
    }
  }, [paused]);
  useEffect(() => {
    narration.muted = !autoNarration;
    if (!page.narration || !autoNarration || paused) {
      narration.pause();
      return;
    }
    const remainingDelay = Math.max(
      0,
      page.delayMs - (Date.now() - animationStart.current),
    );
    const timer = setTimeout(() => narration.play(), remainingDelay);
    return () => clearTimeout(timer);
  }, [autoNarration, paused, narration]);
  useEffect(() => {
    if (!soundEffects) stopEffects();
  }, [soundEffects]);
  useEffect(() => {
    const sub = video.addListener('statusChange', (e) => {
      if (e.status === 'error') setVideoFailed(true);
    });
    return () => sub.remove();
  }, [video]);
  useEffect(() => {
    if (paused) return;
    const timer = setInterval(() => {
      effects.current = effects.current.filter((effect) => {
        const done =
          effect.durationMs !== undefined &&
          effect.player.currentTime * 1000 >= effect.durationMs;
        if (done) {
          effect.player.pause();
          effect.player.remove();
          return false;
        }
        return true;
      });
      const position =
        page.video && !videoFailed
          ? video.currentTime * 1000
          : Date.now() - animationStart.current;
      if (!autoNarration || !page.narration) {
        cue(
          pageCues.current.advance(
            Math.max(0, Date.now() - animationStart.current - page.delayMs),
            page.effects.filter((e) => !e.animation),
          ),
          false,
        );
      }
      cue(
        animationCues.current.advance(
          position,
          page.effects.filter((e) => e.animation),
        ),
        true,
      );
    }, 50);
    return () => clearInterval(timer);
  }, [paused, videoFailed, autoNarration]);
  useEffect(() => {
    if (!paused && autoNarration && page.narration)
      cue(
        pageCues.current.advance(
          status.currentTime * 1000,
          page.effects.filter((e) => !e.animation),
        ),
        false,
      );
  }, [status.currentTime, paused, autoNarration]);
  if (stacked)
    return (
      <View
        style={{ flex: 1 }}
        onLayout={(event) => setBounds(event.nativeEvent.layout)}
      >
        <View style={{ height: 84 }}>{replayControl}</View>
        <Animated.View
          style={{
            flex: 1,
            minHeight: 0,
            opacity: page.transition === 'fade' ? fade : 1,
          }}
        >
          <View
            testID="illustration-frame"
            style={{
              width: imageWidth,
              height: imageHeight,
              alignSelf: 'center',
              overflow: 'hidden',
              backgroundColor: '#FFFFFF',
            }}
          >
            {page.video && !videoFailed ? (
              <VideoView
                player={video}
                style={reader.video}
                contentFit="contain"
                nativeControls={false}
                playsInline
                fullscreenOptions={{ enable: false }}
                allowsPictureInPicture={false}
              />
            ) : (
              <Image
                source={(page.poster ?? page.illustration).url}
                style={{ width: '100%', height: '100%' }}
                contentFit="contain"
              />
            )}
          </View>
          {endingActions ? (
            <View
              style={{
                flex: 1,
                minHeight: 0,
                justifyContent: 'center',
                paddingHorizontal: 24,
              }}
            >
              {endingActions}
            </View>
          ) : page.kind === 'cover' ? (
            <View style={{ flex: 1 }} />
          ) : (
            <NarrationViewport
              width={imageWidth}
              page={page}
              position={narrationPosition}
              enabled={autoNarration}
            />
          )}
          {error ? (
            <Text
              numberOfLines={2}
              style={[s.small, { paddingHorizontal: 24 }]}
            >
              {error} Tap replay if playback is blocked.
            </Text>
          ) : null}
          {navigation && (
            <View
              pointerEvents="box-none"
              style={{
                width: 340,
                maxWidth: '100%',
                alignSelf: 'center',
                flexShrink: 0,
                paddingBottom: 16,
              }}
            >
              {navigation}
            </View>
          )}
        </Animated.View>
      </View>
    );
  return (
    <Animated.View
      onLayout={(event) => setBounds(event.nativeEvent.layout)}
      style={{
        opacity: page.transition === 'fade' ? fade : 1,
        transform:
          page.transition === 'slide'
            ? [
                {
                  translateX: fade.interpolate({
                    inputRange: [0, 1],
                    outputRange: [30, 0],
                  }),
                },
              ]
            : [],
        flex: 1,
        flexDirection: 'column',
        justifyContent: 'flex-start',
        paddingTop: compact ? 60 : 76,
        paddingBottom: 6,
      }}
    >
      <View
        style={{
          flexDirection: 'row',
          alignItems: 'stretch',
          paddingLeft: 0,
          paddingRight: 24,
          gap: 6,
        }}
      >
        <View
          testID="illustration-frame"
          style={{
            width: imageWidth,
            height: imageHeight,
            backgroundColor: '#FFFFFF',
            overflow: 'hidden',
            borderRadius: 12,
          }}
        >
          {page.video && !videoFailed ? (
            <VideoView
              player={video}
              style={reader.video}
              contentFit="contain"
              nativeControls={false}
              playsInline
              fullscreenOptions={{ enable: false }}
              allowsPictureInPicture={false}
            />
          ) : (
            <Image
              source={(page.poster ?? page.illustration).url}
              style={{ width: '100%', height: '100%' }}
              contentFit="contain"
            />
          )}
        </View>
        {wide ? (
          <View
            style={[
              reader.panel,
              {
                flex: 1,
                height: imageHeight,
                paddingHorizontal: 0,
                paddingBottom: 0,
                paddingTop: 0,
              },
            ]}
          >
            {endingActions ? (
              <ScrollView
                contentContainerStyle={reader.textArea}
                style={{ flex: 1 }}
              >
                {endingActions}
              </ScrollView>
            ) : page.kind === 'cover' ? (
              <View style={{ flex: 1 }} />
            ) : (
              <NarrationViewport
                page={page}
                position={narrationPosition}
                enabled={autoNarration}
                width="100%"
                compact={compact}
                flush
              />
            )}
            {error ? (
              <Text style={s.small}>
                {error} Tap replay if playback is blocked.
              </Text>
            ) : null}
            {page.kind === 'cover' ? (
              <View
                pointerEvents="box-none"
                style={{
                  position: 'absolute',
                  top: 0,
                  bottom: 0,
                  left: compact ? 12 : 24,
                  right: compact ? 12 : 24,
                  justifyContent: 'center',
                }}
              >
                {navigation}
              </View>
            ) : null}
          </View>
        ) : (
          <View
            style={{
              width: 64,
              height: imageHeight,
              paddingBottom: page.kind === 'cover' ? 0 : 12,
              justifyContent: page.kind === 'cover' ? 'center' : 'flex-end',
            }}
          >
            {navigation}
          </View>
        )}
      </View>
      {replayControl}
      {page.kind !== 'cover' && navigation && (
        <View
          style={{
            position: 'absolute',
            top: compact ? 6 : 7,
            width: Math.min(280, bounds.width - 300),
            alignSelf: 'center',
          }}
        >
          {navigation}
        </View>
      )}
      {!wide && (
        <ScrollView
          style={{ flex: 1 }}
          contentContainerStyle={{
            paddingHorizontal: 24,
            paddingVertical: 22,
            flexGrow: 1,
            justifyContent: 'flex-start',
          }}
        >
          {endingActions ?? (
            <NarrationText
              page={page}
              position={autoNarration ? narrationPosition : -1}
            />
          )}
          {error ? (
            <Text style={s.small}>
              {error} Tap replay if playback is blocked.
            </Text>
          ) : null}
        </ScrollView>
      )}
    </Animated.View>
  );
}
export function StoryPlayer({
  manifest,
  index,
  setIndex,
  onExit,
  onComplete,
}: {
  manifest: Manifest;
  index: number;
  setIndex: (n: number) => void;
  onExit: () => void;
  onComplete: () => void;
}) {
  const { width, height } = useReaderDimensions();
  const { stacked, wide, compact } = readerLayout(width, height, 16 / 9);
  const rotatePhone = needsPhoneRotation(width, height);
  const [autoNarration, setAutoNarration] = useState(true);
  const [soundEffects, setSoundEffects] = useState(true);
  const [backgroundMusic, setBackgroundMusic] = useState(true);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [fullscreenHint, setFullscreenHint] = useState('');
  const [replay, setReplay] = useState(0);
  const [quizOpen, setQuizOpen] = useState(false);
  const [illustrationAspect, setIllustrationAspect] =
    useState(ILLUSTRATION_ASPECT);
  const [paused, setPaused] = useState(false),
    [narrating, setNarrating] = useState(false);
  const [leaving, setLeaving] = useState(false),
    leaveTimer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);
  useEffect(
    () => () => {
      if (leaveTimer.current) clearTimeout(leaveTimer.current);
    },
    [],
  );
  const page = manifest.pages[index],
    music = page.music ?? manifest.music;
  const leave = (complete: boolean) => {
    if (leaveTimer.current) return;
    setLeaving(true);
    leaveTimer.current = setTimeout(
      complete ? onComplete : onExit,
      music?.fadeMs ?? 0,
    );
  };
  useEffect(() => {
    const sub = AppState.addEventListener('change', (state) => {
      setPaused(state !== 'active');
    });
    return () => sub.remove();
  }, []);
  if (quizOpen && manifest.quiz?.length)
    return (
      <StoryQuiz
        storyId={manifest.id}
        language={manifest.language}
        title={manifest.title}
        questions={manifest.quiz}
        coverUrl={manifest.cover?.url ?? manifest.pages[0]?.illustration.url}
        aspect={illustrationAspect}
        soundEnabled={soundEffects}
        music={manifest.music}
        musicEnabled={backgroundMusic}
        onHome={onComplete}
      />
    );
  return (
    <View style={reader.root}>
      <Paper />
      <View
        style={{ flex: 1, opacity: rotatePhone ? 0 : 1 }}
        pointerEvents={rotatePhone ? 'none' : 'auto'}
        accessibilityElementsHidden={rotatePhone}
        importantForAccessibility={rotatePhone ? 'no-hide-descendants' : 'auto'}
        aria-hidden={rotatePhone}
      >
        <Music
          key={music?.asset.hash ?? 'silent'}
          config={music}
          paused={paused || rotatePhone || !backgroundMusic}
          duck={narrating && autoNarration}
          fadingOut={leaving}
        />
        <AnimatedPage
          key={`${page.id}-${replay}`}
          page={page}
          paused={paused || leaving || rotatePhone}
          onNarrating={setNarrating}
          autoNarration={autoNarration}
          soundEffects={soundEffects}
          endingActions={
            page.kind === 'end' ? (
              <View
                style={[
                  reader.endingActions,
                  stacked && reader.endingActionsStacked,
                ]}
              >
                <Pressable
                  accessibilityRole="button"
                  accessibilityLabel="Home"
                  disabled={leaving}
                  onPress={() => leave(true)}
                  style={({ pressed }) => [
                    reader.endingButton,
                    pressed && reader.pressed,
                  ]}
                >
                  <Text style={reader.endingButtonText}>⌂ Home</Text>
                </Pressable>
                <Pressable
                  accessibilityRole="button"
                  accessibilityLabel="Replay story"
                  disabled={leaving}
                  onPress={() => {
                    setQuizOpen(false);
                    setSettingsOpen(false);
                    setPaused(false);
                    setNarrating(false);
                    setReplay((n) => n + 1);
                    setIndex(0);
                  }}
                  style={({ pressed }) => [
                    reader.endingButton,
                    pressed && reader.pressed,
                  ]}
                >
                  <Text style={reader.endingButtonText}>↻ Replay</Text>
                </Pressable>
                <Pressable
                  accessibilityRole="button"
                  accessibilityLabel="Take a test"
                  disabled={leaving || !manifest.quiz?.length}
                  onPress={() => {
                    setSettingsOpen(false);
                    setQuizOpen(true);
                  }}
                  style={({ pressed }) => [
                    reader.endingButton,
                    !manifest.quiz?.length && reader.disabled,
                    pressed && reader.pressed,
                  ]}
                >
                  <Text style={reader.endingButtonText}>✓ Take a test</Text>
                </Pressable>
                {!manifest.quiz?.length && (
                  <Text style={reader.quizNotice}>
                    No quiz has been added to this story yet.
                  </Text>
                )}
              </View>
            ) : undefined
          }
          replayControl={
            <Pressable
              accessibilityRole="button"
              accessibilityLabel="Replay narration and animation"
              disabled={leaving}
              onPress={() => {
                setPaused(false);
                setReplay((n) => n + 1);
              }}
              style={[
                reader.replayAll,
                compact && { width: 48, height: 48 },
                wide && { top: 6, left: 22 },
              ]}
            >
              <Icon name="replay" size={compact ? 32 : 42} />
            </Pressable>
          }
          onIllustrationAspect={setIllustrationAspect}
          navigation={
            page.kind === 'end' ? null : (
              <View
                style={[
                  reader.navigation,
                  wide && { paddingTop: 0 },
                  page.kind === 'cover' && { paddingTop: 0 },
                ]}
              >
                <View
                  style={[
                    reader.arrows,
                    !wide &&
                      !stacked && {
                        flexDirection: 'column',
                        gap: compact ? 4 : 8,
                      },
                  ]}
                >
                  {page.kind !== 'cover' && (
                    <Pressable
                      accessibilityRole="button"
                      accessibilityLabel="Previous page"
                      disabled={index === 0 || leaving}
                      onPress={() => setIndex(index - 1)}
                      style={({ pressed }) => [
                        reader.arrow,
                        compact && {
                          width: wide ? 48 : 44,
                          height: wide ? 48 : 44,
                          borderRadius: 24,
                        },
                        (index === 0 || leaving) && reader.disabled,
                        pressed && reader.pressed,
                      ]}
                    >
                      <Icon
                        name="back"
                        size={compact ? 28 : 34}
                        color="#FFF9EF"
                      />
                    </Pressable>
                  )}
                  {!page.kind && (
                    <Text
                      accessibilityLabel={`Page ${index + 1 - (manifest.pages[0]?.kind === 'cover' ? 1 : 0)} of ${manifest.pages.filter((p) => !p.kind).length}`}
                      style={reader.pageNumber}
                    >
                      {index +
                        1 -
                        (manifest.pages[0]?.kind === 'cover' ? 1 : 0)}
                    </Text>
                  )}
                  <Pressable
                    accessibilityRole="button"
                    accessibilityLabel={
                      index === manifest.pages.length - 1 ? 'Home' : 'Next page'
                    }
                    disabled={leaving}
                    onPress={() =>
                      index === manifest.pages.length - 1
                        ? leave(true)
                        : setIndex(index + 1)
                    }
                    style={({ pressed }) => [
                      reader.arrow,
                      compact && {
                        width: wide ? 48 : 44,
                        height: wide ? 48 : 44,
                        borderRadius: 24,
                      },
                      leaving && reader.disabled,
                      pressed && reader.pressed,
                    ]}
                  >
                    <Icon
                      name="next"
                      size={compact ? 28 : 34}
                      color="#FFF9EF"
                    />
                  </Pressable>
                </View>
              </View>
            )
          }
        />
        {settingsOpen && (
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Dismiss playback settings"
            onPress={() => setSettingsOpen(false)}
            style={StyleSheet.absoluteFill}
          />
        )}
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Playback settings"
          accessibilityState={{ expanded: settingsOpen }}
          onPress={() => setSettingsOpen((x) => !x)}
          style={[
            reader.settingsButton,
            { top: stacked ? 16 : compact ? 6 : 14, right: stacked ? 86 : 84 },
          ]}
        >
          <Icon name="settings" size={29} />
        </Pressable>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Close story"
          disabled={leaving}
          onPress={() => leave(false)}
          style={({ pressed }) => [
            reader.close,
            { top: stacked ? 16 : compact ? 7 : 15, right: stacked ? 24 : 30 },
            pressed && reader.pressed,
          ]}
        >
          <Icon name="close" size={28} />
        </Pressable>
        {settingsOpen && (
          <View
            style={[
              reader.settingsPopup,
              { top: stacked ? 74 : 64, right: stacked ? 16 : 30 },
            ]}
          >
            <ScrollView
              style={{
                maxHeight: Math.max(120, height - (stacked ? 74 : 64) - 52),
              }}
              contentContainerStyle={{ gap: 18 }}
            >
              <Pressable
                accessibilityRole="button"
                accessibilityLabel="Full screen story"
                style={reader.settingRow}
                onPress={() => {
                  void enterStoryFullscreen().then((entered) => {
                    setFullscreenHint(
                      entered
                        ? ''
                        : 'On iPhone, use Safari’s Share menu → Add to Home Screen → Open as Web App, then launch FairyTails from its icon.',
                    );
                    if (entered) setSettingsOpen(false);
                  });
                }}
              >
                <Text style={reader.settingLabel}>Full screen</Text>
                <Icon name="fullscreen" size={26} />
              </Pressable>
              {!!fullscreenHint && (
                <Text style={s.small}>{fullscreenHint}</Text>
              )}
              {[
                {
                  label: 'Auto Narration',
                  enabled: autoNarration,
                  toggle: () => setAutoNarration((x) => !x),
                  icon: 'check' as const,
                },
                {
                  label: 'Sound Effects',
                  enabled: soundEffects,
                  toggle: () => setSoundEffects((x) => !x),
                  icon: 'sound' as const,
                },
                {
                  label: 'Background Music',
                  enabled: backgroundMusic,
                  toggle: () => setBackgroundMusic((x) => !x),
                  icon: 'music' as const,
                },
              ].map((setting) => (
                <Pressable
                  key={setting.label}
                  accessibilityRole="switch"
                  accessibilityLabel={setting.label}
                  aria-checked={setting.enabled}
                  accessibilityState={{ checked: setting.enabled }}
                  onPress={setting.toggle}
                  style={reader.settingRow}
                >
                  <Text style={reader.settingLabel}>{setting.label}</Text>
                  <View
                    style={{
                      borderRadius: 18,
                      padding: 8,
                      backgroundColor: setting.enabled ? c.light : '#EFE9E0',
                      opacity: setting.enabled ? 1 : 0.45,
                    }}
                  >
                    <Icon
                      name={setting.icon}
                      size={26}
                      color={setting.enabled ? c.green : c.muted}
                    />
                  </View>
                </Pressable>
              ))}
            </ScrollView>
          </View>
        )}
      </View>
      {rotatePhone && (
        <View
          style={[
            StyleSheet.absoluteFill,
            {
              alignItems: 'center',
              justifyContent: 'center',
              padding: 30,
              backgroundColor: '#FFFFFF',
              gap: 20,
            },
          ]}
        >
          <Text
            style={{ fontSize: 72, color: '#8C6034' }}
            accessibilityElementsHidden
          >
            ↻ ▯
          </Text>
          <Text
            accessibilityRole="header"
            style={{
              fontSize: 28,
              fontWeight: '700',
              color: '#654524',
              textAlign: 'center',
            }}
          >
            Rotate your phone
          </Text>
          <Text
            style={{
              fontSize: 18,
              lineHeight: 28,
              color: '#654524',
              textAlign: 'center',
            }}
          >
            Turn your phone sideways to enjoy the illustration and story
            together.
          </Text>
          <Text
            style={{
              fontSize: 14,
              lineHeight: 22,
              color: '#877562',
              textAlign: 'center',
            }}
          >
            If the screen doesn’t rotate, turn off Portrait Orientation Lock.
          </Text>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Back to stories"
            onPress={() => leave(false)}
            style={{ padding: 16 }}
          >
            <Text
              style={{
                fontSize: 17,
                color: '#654524',
                textDecorationLine: 'underline',
              }}
            >
              Back to stories
            </Text>
          </Pressable>
        </View>
      )}
    </View>
  );
}

const reader = StyleSheet.create({
  root: { flex: 1, backgroundColor: c.paper },
  video: {
    width: '100%',
    height: '100%',
    backgroundColor: '#FFFFFF',
    borderWidth: 0,
  },
  panel: { paddingHorizontal: 28, paddingBottom: 14, minWidth: 0 },
  textArea: { flexGrow: 1, justifyContent: 'center', paddingVertical: 16 },
  endingActions: {
    alignItems: 'center',
    justifyContent: 'center',
    gap: 12,
    width: '100%',
  },
  endingActionsStacked: { flexDirection: 'row', flexWrap: 'wrap' },
  endingButton: {
    backgroundColor: c.orangeLight,
    borderColor: '#A86C37',
    borderWidth: 2,
    borderRadius: 24,
    minHeight: 48,
    minWidth: 150,
    maxWidth: '100%',
    paddingVertical: 10,
    paddingHorizontal: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },
  endingButtonText: { color: '#654524', fontSize: 18, fontWeight: '700' },
  quizNotice: {
    color: '#654524',
    textAlign: 'center',
    fontSize: 14,
    width: '100%',
  },
  navigation: { paddingTop: 12 },
  arrows: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    alignItems: 'center',
    gap: 12,
  },
  replayAll: {
    backgroundColor: c.paper,
    borderRadius: 36,
    borderWidth: 1,
    borderColor: c.line,
    boxShadow: '0px 2px 5px #432B1E25',
    position: 'absolute',
    top: 14,
    left: 14,
    width: 64,
    height: 64,
    alignItems: 'center',
    justifyContent: 'center',
  },
  replayRing: {
    fontSize: 78,
    lineHeight: 82,
    color: '#080808',
    fontWeight: '500',
  },
  replayTriangle: {
    position: 'absolute',
    fontSize: 24,
    color: '#080808',
    top: 21,
    left: 24,
  },
  settingsButton: {
    backgroundColor: c.paper,
    borderRadius: 24,
    borderWidth: 1,
    borderColor: c.line,
    position: 'absolute',
    top: 16,
    right: 86,
    width: 48,
    height: 48,
    alignItems: 'center',
    justifyContent: 'center',
  },
  settingsGlyph: { fontSize: 48, lineHeight: 52, color: '#111' },
  settingsPopup: {
    position: 'absolute',
    top: 82,
    right: 16,
    width: 310,
    maxWidth: '92%',
    backgroundColor: c.paper,
    borderRadius: 30,
    borderWidth: 2,
    borderColor: c.line,
    padding: 20,
    gap: 18,
    boxShadow: '0px 10px 30px #432B1E22',
  },
  settingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    minHeight: 52,
    gap: 12,
  },
  settingLabel: { color: c.ink, fontSize: 19, fontWeight: '700' },
  settingIcon: { color: '#111', fontSize: 34 },
  arrow: {
    width: 62,
    height: 62,
    borderRadius: 31,
    backgroundColor: c.orange,
    borderWidth: 2,
    borderColor: '#965728',
    borderBottomWidth: 5,
    alignItems: 'center',
    justifyContent: 'center',
  },
  arrowGlyph: {
    color: '#FFF7DF',
    fontSize: 39,
    lineHeight: 46,
    fontWeight: '900',
    transform: [{ rotate: '180deg' }],
    textShadowColor: '#8E542D',
    textShadowOffset: { width: 1, height: 2 },
    textShadowRadius: 1,
  },
  pageNumber: {
    textAlign: 'center',
    color: '#71502D',
    fontSize: 26,
    fontWeight: '700',
  },
  close: {
    position: 'absolute',
    top: 20,
    right: 24,
    width: 46,
    height: 46,
    borderRadius: 23,
    backgroundColor: '#FFFFFF',
    borderWidth: 2,
    borderColor: c.line,
    alignItems: 'center',
    justifyContent: 'center',
  },
  closeGlyph: {
    color: '#111111',
    fontSize: 36,
    fontWeight: '300',
    lineHeight: 36,
  },
  disabled: { opacity: 0.3 },
  pressed: { opacity: 0.75, transform: [{ scale: 0.96 }] },
});

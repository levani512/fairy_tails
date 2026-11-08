import { colors as c } from './theme';
import { Text, Paper, Icon } from './Storybook';
import React, { useEffect, useRef, useState } from 'react';
import {
  AppState,
  Pressable,
  ScrollView,
  StyleSheet,
  View,
  useWindowDimensions,
} from 'react-native';
import { useAudioPlayer } from 'expo-audio';
import { Image } from 'expo-image';
import type {
  Manifest,
  Language,
  QuizQuestion,
} from '../../../packages/shared/src/index';
import { Music } from './Music';
import { needsPhoneRotation, readerLayout } from './reader-layout';
import { shuffleQuizAnswers } from './quiz-order';
import { QuizConfetti } from './QuizConfetti';
import type { QuizAttempt } from '../../../packages/shared/src/family';
import { quizChild, recordAttempt } from './family-store';
import { randomUUID } from './uuid';

export function StoryQuiz({
  title,
  questions,
  onHome,
  aspect = 16 / 9,
  soundEnabled = true,
  coverUrl,
  music,
  musicEnabled = true,
  storyId,
  language,
}: {
  title: string;
  questions: QuizQuestion[];
  onHome: () => void;
  aspect?: number;
  soundEnabled?: boolean;
  coverUrl?: string;
  music?: Manifest['music'];
  musicEnabled?: boolean;
  storyId: string;
  language: Language;
}) {
  const { width, height } = useWindowDimensions();
  const layout = readerLayout(width, height, aspect);
  const [index, setIndex] = useState(0);
  const [shuffledQuestions, setShuffledQuestions] = useState(() =>
    shuffleQuizAnswers(questions),
  );
  const [selected, setSelected] = useState<number | null>(null);
  const [feedback, setFeedback] = useState<'correct' | 'wrong' | null>(null);
  const [score, setScore] = useState(0);
  const childAtStart = useRef<ReturnType<typeof quizChild> | null>(null);
  const responses = useRef<QuizAttempt['answers']>([]);
  const attemptId = useRef(randomUUID());
  const savedAttempt = useRef(false);
  const [saveNotice, setSaveNotice] = useState('');
  useEffect(() => {
    childAtStart.current ??= quizChild();
  }, []);
  const [appPaused, setAppPaused] = useState(
    AppState.currentState !== 'active',
  );
  const [questionBottom, setQuestionBottom] = useState(0);
  const [answersHeight, setAnswersHeight] = useState(0);
  const locked = useRef(false),
    exited = useRef(false);
  const timer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);
  const scroll = useRef<React.ComponentRef<typeof ScrollView>>(null);
  const correctSound = useAudioPlayer(require('../assets/quiz-correct.wav'));
  const wrongSound = useAudioPlayer(require('../assets/quiz-wrong.wav'));
  const winSound = useAudioPlayer(require('../assets/quiz-win.wav'));
  const finished = index === questions.length,
    question = shuffledQuestions[index];
  const openEnded = !finished && question.answers.length === 0;
  const scoredCount = questions.filter((q) => q.answers.length > 0).length;
  useEffect(() => {
    if (!finished || savedAttempt.current) return;
    savedAttempt.current = true;
    const answers = [...responses.current],
      id = attemptId.current;
    void (async () => {
      const selectedChild = await (childAtStart.current ?? quizChild());
      if (!selectedChild.child) {
        setSaveNotice(
          'Choose a child profile in Parental Center to track future quizzes.',
        );
        return;
      }
      await recordAttempt(selectedChild.owner, {
        id,
        childId: selectedChild.child.id,
        storyId,
        storyTitle: title,
        language,
        completedAt: new Date().toISOString(),
        answers,
      });
      setSaveNotice(`Progress saved for ${selectedChild.child.name}.`);
    })().catch(() => {
      setSaveNotice('Progress could not be saved on this device.');
    });
  }, [finished, storyId, title, language]);
  useEffect(() => {
    if (!finished || !soundEnabled) return;
    let active = true;
    void winSound
      .seekTo(0)
      .then(() => {
        if (active && !exited.current) winSound.play();
      })
      .catch(() => {});
    return () => {
      active = false;
      winSound.pause();
    };
  }, [finished, soundEnabled, winSound]);
  useEffect(() => {
    exited.current = false;
    return () => {
      exited.current = true;
      clearTimeout(timer.current);
    };
  }, []);
  useEffect(() => {
    const subscription = AppState.addEventListener('change', (state) => {
      setAppPaused(state !== 'active');
      if (state !== 'active') {
        correctSound.pause();
        wrongSound.pause();
        winSound.pause();
      }
    });
    return () => subscription.remove();
  }, [correctSound, wrongSound, winSound]);
  const exit = () => {
    exited.current = true;
    locked.current = true;
    clearTimeout(timer.current);
    correctSound.pause();
    wrongSound.pause();
    winSound.pause();
    onHome();
  };
  const next = () => {
    if (locked.current || finished) return;
    if (openEnded) {
      responses.current[index] = { question: question.question };
      setIndex((i) => i + 1);
      setSelected(null);
      scroll.current?.scrollTo({ y: 0, animated: false });
      return;
    }
    if (selected === null) return;
    locked.current = true;
    const correct = selected === question.correctAnswer;
    responses.current[index] = {
      question: question.question,
      selected: question.answers[selected],
      correct,
    };
    setFeedback(correct ? 'correct' : 'wrong');
    if (correct) setScore((s) => s + 1);
    if (soundEnabled) {
      const player = correct ? correctSound : wrongSound;
      void player
        .seekTo(0)
        .then(() => {
          if (!exited.current) player.play();
        })
        .catch(() => {});
    }
    timer.current = setTimeout(() => {
      setIndex((i) => i + 1);
      setSelected(null);
      setFeedback(null);
      locked.current = false;
      scroll.current?.scrollTo({ y: 0, animated: false });
    }, 1500);
  };
  const frameWidth = layout.wide ? layout.imageWidth : width;
  const frameHeight = layout.wide
    ? layout.imageHeight
    : Math.max(120, Math.min(frameWidth / aspect, height - 184));
  const nextDisabled = (!openEnded && selected === null) || !!feedback;
  const tabletNext = !finished && (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel="Next ➜"
      disabled={nextDisabled}
      onPress={next}
      style={[styles.button, styles.next, nextDisabled && styles.nextDisabled]}
    >
      <Text style={[styles.buttonText, { fontSize: 24 }]}>Next →</Text>
    </Pressable>
  );
  const button = (label: string, onPress: () => void, disabled = false) => (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={label}
      disabled={disabled}
      onPress={onPress}
      style={[styles.button, disabled && styles.disabled]}
    >
      <Text style={styles.buttonText}>{label}</Text>
    </Pressable>
  );
  if (needsPhoneRotation(width, height))
    return (
      <View style={styles.rotate}>
        <Text style={styles.question}>
          Rotate your phone to continue the quiz.
        </Text>
        {button('Exit', exit)}
      </View>
    );
  return (
    <View
      style={[styles.screen, !layout.wide && { justifyContent: 'flex-start' }]}
    >
      <Paper />
      {!layout.wide && (
        <View style={styles.tabletHeader}>
          <View style={styles.tabletIdentity}>
            {coverUrl && (
              <Image
                source={coverUrl}
                contentFit="cover"
                accessibilityLabel={`${title} cover`}
                style={styles.tabletThumbnail}
              />
            )}
            <Text numberOfLines={2} style={styles.tabletTitle}>
              {title}
            </Text>
          </View>
          <View
            accessibilityLabel={
              finished
                ? 'Quiz complete'
                : `Question ${index + 1} of ${questions.length}`
            }
            style={styles.tabletProgress}
          >
            {questions.map((_, i) => (
              <View
                key={i}
                style={[
                  styles.dot,
                  { width: 8, height: 8 },
                  i < index && styles.completedDot,
                  i === index && styles.currentDot,
                ]}
              />
            ))}
          </View>
          <View style={{ flex: 1, alignItems: 'flex-end' }}>
            <Pressable
              accessibilityRole="button"
              accessibilityLabel="Exit quiz"
              onPress={exit}
              style={[styles.close, { marginTop: 0, marginRight: 0 }]}
            >
              <Icon name="close" size={26} />
            </Pressable>
          </View>
        </View>
      )}
      <View
        style={[
          styles.row,
          !layout.wide && {
            flexDirection: 'column',
            paddingHorizontal: 0,
            gap: 0,
          },
        ]}
      >
        <Music
          key={music?.asset.hash ?? 'silent'}
          config={music}
          paused={appPaused || !musicEnabled}
          duck={false}
        />
        <View
          style={[styles.frame, { width: frameWidth, height: frameHeight }]}
        >
          {coverUrl && (
            <Image
              source={coverUrl}
              contentFit="cover"
              style={StyleSheet.absoluteFill}
            />
          )}
          <View
            pointerEvents="none"
            style={[
              StyleSheet.absoluteFill,
              { backgroundColor: 'rgba(255, 255, 255, 0.9)' },
            ]}
          />
          <ScrollView
            ref={scroll}
            testID="quiz-illustration-area"
            style={{ flex: 1 }}
            contentContainerStyle={[
              styles.content,
              layout.compact && { padding: 16, gap: 10 },
              !layout.wide && !finished && !openEnded && { paddingBottom: 96 },
            ]}
          >
            <View
              style={[
                styles.header,
                finished && { display: 'none' },
                openEnded && { position: 'absolute', top: 24, right: 24 },
              ]}
            >
              {!finished && (
                <Text
                  accessibilityLabel={`Question ${index + 1} of ${questions.length}`}
                  style={styles.counter}
                >
                  {index + 1}/{questions.length}
                </Text>
              )}
            </View>
            {finished ? (
              <View
                style={{
                  flex: 1,
                  justifyContent: 'center',
                  alignItems: 'center',
                  gap: 20,
                }}
              >
                <Text accessibilityRole="header" style={styles.question}>
                  Quiz complete!
                </Text>
                <Text accessibilityRole="alert" style={styles.question}>
                  {scoredCount > 0
                    ? `You got ${score} out of ${scoredCount} correct.`
                    : 'You’ve explored every question!'}
                </Text>
                {!!saveNotice && (
                  <Text style={styles.caption}>{saveNotice}</Text>
                )}
                <View style={{ width: '30%' }}>
                  {button('Try again', () => {
                    locked.current = false;
                    responses.current = [];
                    attemptId.current = randomUUID();
                    savedAttempt.current = false;
                    setSaveNotice('');
                    setShuffledQuestions(shuffleQuizAnswers(questions));
                    setIndex(0);
                    setScore(0);
                    setSelected(null);
                    setFeedback(null);
                  })}
                </View>
              </View>
            ) : openEnded ? (
              <View
                style={{
                  flex: 1,
                  justifyContent: 'center',
                  paddingVertical: 48,
                }}
              >
                <Text
                  accessibilityRole="header"
                  style={[styles.question, layout.compact && { fontSize: 20 }]}
                >
                  {question.question}
                </Text>
              </View>
            ) : (
              <>
                <Text
                  accessibilityRole="header"
                  onLayout={({ nativeEvent: { layout: bounds } }) =>
                    setQuestionBottom(bounds.y + bounds.height)
                  }
                  style={[styles.question, layout.compact && { fontSize: 20 }]}
                >
                  {question.question}
                </Text>
                <View
                  onLayout={({ nativeEvent: { layout: bounds } }) =>
                    setAnswersHeight(bounds.height)
                  }
                  style={[
                    styles.answers,
                    {
                      marginTop: Math.max(
                        16,
                        (frameHeight - answersHeight) / 2 -
                          questionBottom -
                          (layout.compact ? 10 : 16),
                      ),
                    },
                  ]}
                >
                  {question.answers.map((answer, i) => (
                    <Pressable
                      key={`${index}-${i}`}
                      accessibilityRole="radio"
                      accessibilityLabel={answer}
                      accessibilityState={{
                        checked: selected === i,
                        disabled: !!feedback,
                      }}
                      disabled={!!feedback}
                      onPress={() => setSelected(i)}
                      style={[
                        styles.answer,
                        layout.compact && { padding: 10 },
                        selected === i && styles.selected,
                        selected === i &&
                          feedback === 'correct' &&
                          styles.correct,
                        selected === i && feedback === 'wrong' && styles.wrong,
                      ]}
                    >
                      <Text style={styles.answerText}>
                        {String.fromCharCode(65 + i)}. {answer}
                      </Text>
                    </Pressable>
                  ))}
                </View>
                {feedback && (
                  <View accessibilityRole="alert">
                    <Text style={styles.caption}>
                      {feedback === 'correct'
                        ? 'Correct!'
                        : 'Not quite — let’s try the next one.'}
                    </Text>
                    {!!question.explanation && (
                      <Text style={styles.caption}>{question.explanation}</Text>
                    )}
                  </View>
                )}
              </>
            )}
          </ScrollView>
          {!layout.wide && !finished && (
            <View pointerEvents="box-none" style={styles.tabletFooter}>
              {tabletNext}
            </View>
          )}
          {finished && <QuizConfetti width={frameWidth} height={frameHeight} />}
        </View>
        {layout.wide && (
          <View style={[styles.controls, { height: frameHeight }]}>
            <Pressable
              accessibilityRole="button"
              accessibilityLabel="Exit quiz"
              onPress={exit}
              style={styles.close}
            >
              <Icon name="close" size={26} />
            </Pressable>
            <ScrollView
              style={{ width: '100%', flex: 1 }}
              contentContainerStyle={[
                styles.storyCard,
                layout.compact && { gap: 12, paddingVertical: 8 },
              ]}
            >
              {coverUrl && (
                <Image
                  source={coverUrl}
                  contentFit="cover"
                  accessibilityLabel={`${title} cover`}
                  style={[styles.thumbnail, { maxHeight: frameHeight * 0.32 }]}
                />
              )}
              <Text
                style={[styles.storyTitle, layout.compact && { fontSize: 20 }]}
              >
                {title}
              </Text>
              <View
                accessibilityLabel={
                  finished
                    ? 'Quiz complete'
                    : `Question ${index + 1} of ${questions.length}`
                }
                style={styles.progress}
              >
                {questions.map((_, i) => (
                  <View
                    key={i}
                    style={[
                      styles.dot,
                      i < index && styles.completedDot,
                      i === index && styles.currentDot,
                    ]}
                  />
                ))}
              </View>
              {!finished && (
                <Pressable
                  accessibilityRole="button"
                  accessibilityLabel="Next ➜"
                  disabled={(!openEnded && selected === null) || !!feedback}
                  onPress={next}
                  style={[
                    styles.button,
                    styles.next,
                    ((!openEnded && selected === null) || !!feedback) &&
                      styles.nextDisabled,
                  ]}
                >
                  <Text
                    style={[
                      styles.buttonText,
                      { fontSize: layout.compact ? 20 : 24 },
                    ]}
                  >
                    Next →
                  </Text>
                </Pressable>
              )}
            </ScrollView>
          </View>
        )}
      </View>
    </View>
  );
}
const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: c.paper, justifyContent: 'center' },
  row: { flexDirection: 'row', paddingHorizontal: 8, gap: 8 },
  tabletHeader: {
    height: 88,
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 20,
    gap: 12,
    backgroundColor: '#FFF9EF99',
  },
  tabletIdentity: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  tabletThumbnail: { width: 64, height: 46, borderRadius: 10 },
  tabletTitle: { flex: 1, color: '#654524', fontSize: 16, fontWeight: '800' },
  tabletProgress: {
    flex: 1,
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'center',
    gap: 6,
  },
  tabletFooter: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    minHeight: 96,
    alignItems: 'center',
    justifyContent: 'flex-end',
    paddingBottom: 20,
    paddingTop: 12,
  },
  frame: {
    backgroundColor: '#FFFFFF',
    overflow: 'hidden',
    borderRadius: 12,
    flexGrow: 0,
    flexShrink: 0,
  },
  content: { padding: 24, gap: 16, flexGrow: 1 },
  header: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    marginBottom: -8,
  },
  storyCard: {
    flexGrow: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 20,
    paddingVertical: 20,
    paddingHorizontal: 16,
  },
  thumbnail: {
    width: '100%',
    maxWidth: 280,
    aspectRatio: 1.5,
    borderRadius: 22,
  },
  storyTitle: {
    fontSize: 28,
    fontWeight: '800',
    color: '#654524',
    textAlign: 'center',
    maxWidth: 280,
  },
  progress: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'center',
    gap: 10,
    maxWidth: 240,
    paddingVertical: 4,
  },
  dot: { width: 12, height: 12, borderRadius: 6, backgroundColor: '#F3DFC2' },
  currentDot: { backgroundColor: '#EF9C23' },
  completedDot: { backgroundColor: '#DDB67F' },
  close: {
    alignSelf: 'flex-end',
    width: 44,
    height: 44,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 22,
    borderWidth: 2,
    borderColor: '#80572D',
    marginRight: 12,
    marginTop: 8,
  },
  closeText: { color: '#80572D', fontSize: 34, lineHeight: 36 },
  next: { width: '85%', maxWidth: 250, minHeight: 56, borderRadius: 30 },
  nextDisabled: { backgroundColor: '#F9D4A3' },
  counter: {
    transform: [{ translateX: -8 }, { translateY: 8 }],
    fontSize: 16,
    lineHeight: 21,
    fontWeight: '800',
    color: '#654524',
  },
  question: {
    fontSize: 24,
    fontWeight: '800',
    color: '#654524',
    textAlign: 'center',
  },
  caption: {
    fontSize: 14,
    lineHeight: 21,
    color: '#654524',
    textAlign: 'center',
  },
  answers: { gap: 16, width: '56%', alignSelf: 'center' },
  answer: {
    padding: 14,
    borderRadius: 14,
    borderWidth: 2,
    borderColor: c.line,
    boxShadow: '0px 2px 3px #62421D12',
    backgroundColor: '#FFFFFF',
  },
  selected: { borderColor: '#A86C37', backgroundColor: '#FFE4BE' },
  correct: { borderColor: '#218445', backgroundColor: '#A9E6B8' },
  wrong: { borderColor: '#BE4141', backgroundColor: '#F5B3B3' },
  answerText: { fontSize: 18, lineHeight: 26, color: '#543D26' },
  controls: {
    flex: 1,
    minWidth: 0,
    backgroundColor: '#FFF9EF99',
    alignItems: 'center',
    paddingBottom: 12,
  },
  button: {
    minHeight: 48,
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: 24,
    backgroundColor: c.orangeLight,
    justifyContent: 'center',
    alignItems: 'center',
  },
  buttonText: {
    color: '#654524',
    fontWeight: '800',
    fontSize: 17,
    textAlign: 'center',
  },
  disabled: { opacity: 0.45 },
  rotate: {
    flex: 1,
    backgroundColor: '#FFFFFF',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 24,
    gap: 24,
  },
});

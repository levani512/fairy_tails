import { expect, it } from 'vitest';
import { shuffleQuizAnswers } from '../apps/client/src/quiz-order';
import { quizQuestionSchema } from '../packages/shared/src/index';

it('keeps open-ended questions unscored when shuffling', () => {
  const question = { question: 'Why?', answers: [] };
  expect(quizQuestionSchema.parse(shuffleQuizAnswers([question])[0])).toEqual(
    question,
  );
  expect(
    quizQuestionSchema.safeParse({
      ...question,
      answers: ['Only one'],
      correctAnswer: 0,
    }).success,
  ).toBe(false);
});

it('shuffles answers without changing question order or correct-answer identity', () => {
  const questions = [
    { question: 'First?', answers: ['A', 'B', 'C'], correctAnswer: 1 },
    {
      question: 'Second?',
      answers: ['Same', 'Same', 'Other'],
      correctAnswer: 0,
    },
  ];
  const original = structuredClone(questions);
  const result = shuffleQuizAnswers(questions, () => 0);
  expect(result.map((q) => q.question)).toEqual(['First?', 'Second?']);
  expect(result[0].answers).toEqual(['B', 'C', 'A']);
  expect(result[0].correctAnswer).toBe(0);
  expect(result[1].correctAnswer).toBe(2);
  expect(questions).toEqual(original);
});

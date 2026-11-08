import { describe, expect, it } from 'vitest';
import {
  childSchema,
  childStats,
  attemptScore,
  quizAttemptSchema,
  type QuizAttempt,
} from '../packages/shared/src/family';
const attempt: QuizAttempt = {
  id: '9339b8f8-fcb2-449c-980a-e50125afdb10',
  childId: 'aac7b3a4-aaca-4673-bef9-70d5b9c8aed3',
  storyId: '30',
  storyTitle: 'Three Little Pigs',
  language: 'en',
  completedAt: '2026-11-08T12:00:00Z',
  answers: [
    { question: 'How many?', selected: 'Three', correct: true },
    { question: 'Who?', selected: 'Rabbit', correct: false },
    { question: 'Why?' },
  ],
};
describe('family learning stats', () => {
  it('excludes open-ended questions from accuracy', () => {
    expect(attemptScore(attempt)).toEqual({
      correct: 1,
      total: 2,
      percent: 50,
    });
    expect(
      childStats([
        attempt,
        {
          ...attempt,
          id: 'retry',
          answers: [{ question: 'How many?', correct: true }],
        },
      ]),
    ).toEqual({ quizzes: 2, stories: 1, total: 3, correct: 2, accuracy: 67 });
  });
  it('does not invent a zero score for discussion-only or empty history', () => {
    expect(
      attemptScore({ ...attempt, answers: [{ question: 'Why?' }] }).percent,
    ).toBeNull();
    expect(childStats([]).accuracy).toBeNull();
  });
  it('validates child ages, names, icons and attempt data', () => {
    const child = {
      id: attempt.childId,
      name: 'Fox',
      age: 4,
      icon: '🦊',
      interests: ['Nature'],
      language: 'en',
    };
    expect(childSchema.safeParse(child).success).toBe(true);
    for (const invalid of [
      { age: 0 },
      { age: 4.5 },
      { age: 18 },
      { name: ' ' },
      { icon: 'unknown' },
    ])
      expect(childSchema.safeParse({ ...child, ...invalid }).success).toBe(
        false,
      );
    expect(quizAttemptSchema.safeParse(attempt).success).toBe(true);
    expect(
      quizAttemptSchema.safeParse({ ...attempt, answers: [] }).success,
    ).toBe(false);
  });
});

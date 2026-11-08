import { z } from 'zod';
import { languageSchema } from './index';

export const childIcons = [
  '🐻',
  '🦊',
  '🐰',
  '🐼',
  '🦁',
  '🐱',
  '🐸',
  '🦉',
] as const;
export const childSchema = z.object({
  id: z.string().uuid(),
  name: z.string().trim().min(1).max(40),
  icon: z.enum(childIcons),
  age: z.number().int().min(1).max(17),
  interests: z.array(z.string().trim().min(1).max(60)).max(20),
  language: languageSchema,
  favorites: z.array(z.string()).optional(),
  readingProgress: z
    .record(z.string(), z.number().int().nonnegative())
    .optional(),
  completedStories: z.array(z.string()).optional(),
});
export type Child = z.infer<typeof childSchema>;
export const quizAttemptSchema = z.object({
  id: z.string().uuid(),
  childId: z.string().uuid(),
  storyId: z.string().min(1).max(100),
  storyTitle: z.string().min(1).max(300),
  language: languageSchema,
  completedAt: z.string().datetime(),
  answers: z
    .array(
      z.object({
        question: z.string().max(4000),
        selected: z.string().max(4000).optional(),
        correct: z.boolean().optional(),
      }),
    )
    .min(1)
    .max(50),
});
export type QuizAttempt = z.infer<typeof quizAttemptSchema>;
export function attemptScore(attempt: QuizAttempt) {
  const scored = attempt.answers.filter((a) => typeof a.correct === 'boolean');
  const correct = scored.filter((a) => a.correct).length;
  return {
    correct,
    total: scored.length,
    percent: scored.length ? Math.round((correct / scored.length) * 100) : null,
  };
}
export function childStats(attempts: QuizAttempt[]) {
  const scores = attempts.map(attemptScore);
  const total = scores.reduce((sum, score) => sum + score.total, 0);
  const correct = scores.reduce((sum, score) => sum + score.correct, 0);
  return {
    quizzes: attempts.length,
    stories: new Set(attempts.map((a) => a.storyId)).size,
    total,
    correct,
    accuracy: total ? Math.round((correct / total) * 100) : null,
  };
}
export type Family = {
  children: Child[];
  attempts: QuizAttempt[];
  activeChildId?: string;
};

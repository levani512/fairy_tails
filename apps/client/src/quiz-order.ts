import type { QuizQuestion } from '../../../packages/shared/src/index';

export function shuffleQuizAnswers(
  questions: QuizQuestion[],
  random: () => number = Math.random,
): QuizQuestion[] {
  return questions.map((question) => {
    const choices = question.answers.map((text, originalIndex) => ({
      text,
      originalIndex,
    }));
    for (let i = choices.length - 1; i > 0; i--) {
      const j = Math.floor(random() * (i + 1));
      [choices[i], choices[j]] = [choices[j], choices[i]];
    }
    return {
      ...question,
      answers: choices.map((choice) => choice.text),
      correctAnswer:
        choices.length === 0
          ? undefined
          : choices.findIndex(
              (choice) => choice.originalIndex === question.correctAnswer,
            ),
    };
  });
}

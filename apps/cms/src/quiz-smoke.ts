import 'dotenv/config';
import assert from 'node:assert/strict';
import { getPayload } from 'payload';
import config from './payload.config';
import { toStory } from './content';
const payload = await getPayload({ config });
try {
  if (process.argv[2] === 'cleanup') {
    const id = Number(process.argv[3]);
    const doc = await payload.findByID({ collection: 'stories', id });
    assert.ok(doc.slug.startsWith('quiz-verification-'));
    await payload.delete({ collection: 'stories', id });
    console.log('Removed temporary quiz verification story.');
  } else {
    const source = (
      await payload.find({
        collection: 'stories',
        where: { slug: { equals: 'three-little-pigs' } },
        limit: 1,
        depth: 0,
      })
    ).docs[0];
    assert.ok(source);
    const data = JSON.parse(
      JSON.stringify(source, (key, value) =>
        key === 'id' ? undefined : value,
      ),
    );
    delete data.updatedAt;
    delete data.createdAt;
    const quiz = [
      { question: 'What kind of house would you build?', answers: [] },
      {
        question: 'How many little pigs are in this story?',
        answers: [
          { text: 'Two', correct: false },
          { text: 'Three', correct: true },
        ],
        explanation: 'The story is about three little pigs.',
      },
      {
        question: 'Who tries to blow down their houses?',
        answers: [
          { text: 'The wolf', correct: true },
          { text: 'A rabbit', correct: false },
        ],
      },
    ];
    const saved = await payload.create({
      collection: 'stories',
      data: {
        ...data,
        title: 'Quiz verification',
        slug: `quiz-verification-${Date.now()}`,
        pages: data.pages.slice(0, 1),
        quiz,
      },
    });
    const story = await toStory(saved, payload, true);
    assert.equal(story.translations.en?.manifest.quiz?.length, 3);
    assert.deepEqual(story.translations.en?.manifest.quiz?.[0].answers, []);
    assert.equal(story.translations.en?.manifest.quiz?.[0].correctAnswer, undefined);
    assert.equal(story.translations.en?.manifest.quiz?.[1].correctAnswer, 1);
    for (const answers of [
      [{ text: 'Only', correct: true }],
      [
        { text: 'One', correct: false },
        { text: 'Two', correct: false },
      ],
      [
        { text: 'One', correct: true },
        { text: 'Two', correct: true },
      ],
    ]) {
      await assert.rejects(
        payload.update({
          collection: 'stories',
          id: saved.id,
          data: { quiz: [{ question: 'Invalid question', answers }] },
        }),
      );
    }
    console.log(
      `PASS: quiz persisted, delivered, invalid choices rejected. Temporary story ID: ${saved.id}`,
    );
  }
} finally {
  await payload.destroy();
}
process.exit(0);

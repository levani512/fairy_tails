import { expect, it } from 'vitest';
import { validateProductionEnvironment } from '../scripts/production-config.mjs';

const valid = {
  DATABASE_URL: 'postgres://user:password@database/fairytails',
  PAYLOAD_SECRET: 'a'.repeat(48),
  SERVER_URL: 'https://fairytails-api.onrender.com',
  CLIENT_ORIGIN: 'https://fairytails.onrender.com',
};
it('uses the hosting port', () => {
  expect(validateProductionEnvironment({ ...valid, PORT: '10000' }).port).toBe(
    10000,
  );
});
it.each(['DATABASE_URL', 'PAYLOAD_SECRET', 'SERVER_URL', 'CLIENT_ORIGIN'])(
  'rejects a missing %s before starting services',
  (name) => {
    expect(() =>
      validateProductionEnvironment({ ...valid, [name]: '' }),
    ).toThrow();
  },
);
it('rejects local URLs, placeholder secrets and unsupported object storage', () => {
  expect(() =>
    validateProductionEnvironment({
      ...valid,
      CLIENT_ORIGIN: 'http://localhost:8081',
    }),
  ).toThrow();
  expect(() =>
    validateProductionEnvironment({
      ...valid,
      PAYLOAD_SECRET: 'replace-with-at-least-32-random-characters',
    }),
  ).toThrow();
  expect(() =>
    validateProductionEnvironment({ ...valid, S3_BUCKET: 'uploads' }),
  ).toThrow();
  expect(() =>
    validateProductionEnvironment({ ...valid, PORT: 'invalid' }),
  ).toThrow();
});

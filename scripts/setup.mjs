import { existsSync, writeFileSync, readFileSync } from 'node:fs';
import { randomBytes } from 'node:crypto';
if (!existsSync('apps/cms/.env')) {
  let env = readFileSync('apps/cms/.env.example', 'utf8').replace(
    'replace-with-at-least-32-random-characters',
    randomBytes(32).toString('hex'),
  );
  if (process.argv.includes('--embedded'))
    env = env.replace('localhost:5432', 'localhost:55432');
  writeFileSync('apps/cms/.env', env);
}
if (!existsSync('apps/client/.env'))
  writeFileSync('apps/client/.env', readFileSync('apps/client/.env.example'));
console.log(
  'Local environment files ready. Existing configuration was preserved.',
);

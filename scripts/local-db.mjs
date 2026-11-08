import EmbeddedPostgres from 'embedded-postgres';
import { existsSync } from 'node:fs';
import { resolve } from 'node:path';
const databaseDir = resolve('.local/postgres-utf8');
const pg = new EmbeddedPostgres({
  databaseDir,
  user: 'fairytails',
  password: 'local-development-only',
  port: 55432,
  persistent: true,
  initdbFlags: ['--encoding=UTF8', '--locale=C'],
  postgresFlags: ['-h', '127.0.0.1'],
  onLog: (message) => {
    if (process.env.DEBUG_POSTGRES) console.log(message);
  },
  onError: console.error,
});
if (!existsSync(resolve(databaseDir, 'PG_VERSION'))) await pg.initialise();
await pg.start();
const client = pg.getPgClient();
await client.connect();
const result = await client.query(
  "SELECT 1 FROM pg_database WHERE datname='fairytails'",
);
await client.end();
if (!result.rows.length) await pg.createDatabase('fairytails');
console.log(
  'Local PostgreSQL ready on 127.0.0.1:55432. Ctrl+C stops it; data stays in .local/postgres.',
);
const stop = async () => {
  await pg.stop();
  process.exit(0);
};
process.on('SIGINT', stop);
process.on('SIGTERM', stop);
setInterval(() => {}, 60000);

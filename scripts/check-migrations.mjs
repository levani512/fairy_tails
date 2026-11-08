import EmbeddedPostgres from 'embedded-postgres';
import { resolve } from 'node:path';
import { spawnSync } from 'node:child_process';
const pg = new EmbeddedPostgres({
  databaseDir: resolve('.local/postgres-utf8'),
  user: 'fairytails',
  password: 'local-development-only',
  port: 55432,
  persistent: true,
});
const name = `migration_check_${Date.now()}`,
  client = pg.getPgClient();
await client.connect();
await client.query(`CREATE DATABASE ${client.escapeIdentifier(name)}`);
try {
  const result = spawnSync(
    process.execPath,
    ['node_modules/payload/bin.js', 'migrate'],
    {
      cwd: resolve('apps/cms'),
      env: {
        ...process.env,
        NODE_ENV: 'production',
        DATABASE_URL: `postgres://fairytails:local-development-only@127.0.0.1:55432/${name}`,
      },
      stdio: 'inherit',
      windowsHide: true,
    },
  );
  if (result.status !== 0) throw new Error('Fresh database migration failed');
  console.log(
    'PASS: all migrations applied to a fresh UTF-8 PostgreSQL database.',
  );
} finally {
  await client.query(`DROP DATABASE ${client.escapeIdentifier(name)}`);
  await client.end();
}

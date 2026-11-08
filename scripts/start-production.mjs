import { spawn } from 'node:child_process';
import { createRequire } from 'node:module';
import { dirname, resolve } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { access, mkdir } from 'node:fs/promises';
import { constants } from 'node:fs';
import { validateProductionEnvironment } from './production-config.mjs';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const cms = resolve(root, 'apps/cms');
const cmsRequire = createRequire(resolve(cms, 'package.json'));
const rootRequire = createRequire(resolve(root, 'package.json'));
const { port } = validateProductionEnvironment(process.env);
const env = {
  ...process.env,
  NODE_ENV: 'production',
  NEXT_TELEMETRY_DISABLED: '1',
};
const media = resolve(cms, 'media');
await mkdir(media, { recursive: true });
await access(media, constants.W_OK);
// Mount Render's persistent disk at apps/cms/media; both processes share it.
const children = new Set();
let stopping = false;
function stop(code = 0) {
  if (stopping) return;
  stopping = true;
  process.exitCode = code;
  for (const child of children) child.kill('SIGTERM');
  const timer = setTimeout(() => {
    for (const child of children) child.kill('SIGKILL');
  }, 15000);
  timer.unref();
}
process.on('SIGTERM', () => stop());
process.on('SIGINT', () => stop());
function launch(name, args, cwd) {
  const child = spawn(process.execPath, args, {
    cwd,
    env,
    stdio: 'inherit',
    windowsHide: true,
  });
  children.add(child);
  child.on('error', (error) => {
    console.error(`${name} could not start: ${error.message}`);
    stop(1);
  });
  child.on('exit', () => children.delete(child));
  return child;
}

console.log('Applying production database migrations...');
const migration = launch(
  'Migrations',
  [resolve(dirname(cmsRequire.resolve('payload')), '../bin.js'), 'migrate'],
  cms,
);
const migrated = await new Promise((done) => {
  migration.once('exit', (code) => done(code === 0));
  migration.once('error', () => done(false));
});
if (!migrated || stopping) {
  stop(1);
} else {
  const server = launch(
    'CMS',
    [
      cmsRequire.resolve('next/dist/bin/next'),
      'start',
      '--hostname',
      '0.0.0.0',
      '--port',
      String(port),
    ],
    cms,
  );
  const worker = launch(
    'Media worker',
    [
      '--import',
      pathToFileURL(rootRequire.resolve('tsx')).href,
      resolve(root, 'workers/media/src/worker.ts'),
    ],
    resolve(root, 'workers/media'),
  );
  for (const [name, child] of [
    ['CMS', server],
    ['Media worker', worker],
  ]) {
    child.on('exit', (code, signal) => {
      if (!stopping) {
        console.error(
          `${name} stopped (${code ?? signal}); restarting the service is required.`,
        );
        stop(1);
      }
    });
  }
}

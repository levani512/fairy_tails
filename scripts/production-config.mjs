export function validateProductionEnvironment(env) {
  for (const name of [
    'DATABASE_URL',
    'PAYLOAD_SECRET',
    'SERVER_URL',
    'CLIENT_ORIGIN',
  ]) {
    if (!env[name])
      throw new Error(`Missing production environment variable: ${name}`);
  }
  if (
    env.PAYLOAD_SECRET.length < 32 ||
    env.PAYLOAD_SECRET.startsWith('replace-')
  )
    throw new Error(
      'PAYLOAD_SECRET must contain at least 32 random characters.',
    );
  for (const name of ['SERVER_URL', 'CLIENT_ORIGIN']) {
    const url = new URL(env[name]);
    if (url.protocol !== 'https:' || url.origin !== env[name])
      throw new Error(
        `${name} must be an HTTPS origin without a trailing slash or path.`,
      );
  }
  if (env.S3_BUCKET)
    throw new Error(
      'This deployment uses a persistent media disk. The media worker does not support S3 yet.',
    );
  const port = Number(env.PORT ?? 3000);
  if (!Number.isInteger(port) || port < 1 || port > 65535)
    throw new Error('PORT must be a valid TCP port.');
  return { port };
}

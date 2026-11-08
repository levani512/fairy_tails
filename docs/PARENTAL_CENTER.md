# Parental Center

Open Parental Center in the lobby and answer the grown-up arithmetic gate. This gate prevents casual child access; it is not account authentication.

Add a child with a nickname, icon, age (1–17), interests, and preferred story language. The first profile becomes active automatically. Use **Use profile** to switch children before starting a quiz. Editing the active profile's preferred language also changes the story language. Profiles can work without signing in and remain on this device.

Every completed quiz saves an attempt for the child selected when the quiz started. Retries are separate attempts. Interrupted quizzes are not counted. Open-ended questions never count as right or wrong. Stats show completed quizzes, stories explored, weighted answer accuracy, latest/best score per story, first-to-latest progress, and ten recent attempts. An all-open-ended quiz counts as completed but has no accuracy percentage. Earlier quizzes cannot be attributed retroactively.

Account profiles are separate from device-only profiles. After signing in, **Copy device profiles to account** explicitly copies the local profiles and history to that account. Pending changes are retained locally when syncing fails. Reopen Parental Center or press Sync progress to retry. Quiz completion also attempts sync. Results are learning feedback, not tamper-proof exam results.

## Google and Apple setup

Live provider login has not been tested because credentials are not configured. The local profile and stats features work now. Sign-in currently targets the web app, including iPhone/iPad browsers; a native-app callback flow is not implemented.

Set these values in `apps/cms/.env` and restart the CMS:

```dotenv
CLIENT_ORIGIN=https://stories.example.com
SERVER_URL=https://api.example.com
GOOGLE_CLIENT_ID=...
GOOGLE_CLIENT_SECRET=...
APPLE_CLIENT_ID=...
APPLE_CLIENT_SECRET=...
```

Use web and API hosts on the same site (for example the two subdomains above) so the HTTP-only session cookie works. Do not put secrets in any EXPO_PUBLIC variable. Production requires HTTPS. Existing PAYLOAD_SECRET must remain stable.

- Google: create a Web application OAuth client. Register `${SERVER_URL}/api/parent/callback/google` as the exact redirect URI. Local Google development can use `http://localhost:3000/api/parent/callback/google`.
- Apple: configure a Services ID, associated Sign in with Apple app, verified domain, and `${SERVER_URL}/api/parent/callback/apple` return URL. Apple requires an HTTPS domain, not a localhost callback. `APPLE_CLIENT_SECRET` is the signed client-secret JWT created from your Apple developer key/team and Services ID. Renew it before expiry.

Provider references: [Google OpenID Connect](https://developers.google.com/identity/openid-connect/openid-connect) and [Apple webpage configuration](https://developer.apple.com/documentation/signinwithapple/configuring-your-webpage-for-sign-in-with-apple).

The integration uses a short-lived signed OAuth transaction cookie, state and nonce checks, Google PKCE, remote-key ID-token verification with issuer/audience validation, opaque HTTP-only sessions stored as hashes, and origin checks for mutations. Accounts are keyed by provider and subject; matching emails do not silently link accounts. Parent data is unavailable through public Payload collection APIs or CMS users. Session logout revokes the current session.

## Deployment and verification

Apply the `20261108_110802_parental_center` database migration using the normal production migration command before deploying. Local development uses Payload schema push.

Checks: `pnpm test`, `pnpm typecheck`, `pnpm build:web`, and from `apps/cms`, `pnpm exec tsx src/parent-smoke.ts`. The smoke test creates and removes only its own temporary accounts and records, verifying profile persistence, ownership isolation, origin checks, duplicate-attempt prevention, logout, and private collection access. `node scripts/check-migrations.mjs` verifies all migrations against a temporary database.

Use a gateway with request-size limits and rate limiting when deploying. Cloud history currently returns up to 10,000 attempts per parent and 100 profiles; very large accounts will need pagination. Profile removal, account deletion, and native-app sign-in are not included in this first version.

# Wi-Fi testing on iPhone and iPad

Keep the computer running, with the CMS on port 3000 and its PostgreSQL database started. Connect the phone/tablet to the same local network (the computer may use Ethernet).

From the repository root:

```powershell
pnpm build:web
pnpm dev:lan
```

Open the exact `http://…:8082` URL printed by the command in Safari. The server binds to a private IPv4 address, proxies only the reader/parent APIs to the local CMS, and rewrites local media addresses. Admin and database ports are not exposed by this server. Existing desktop `localhost:8081` and `localhost:3000/admin` links keep working.

If multiple network adapters exist, select the appropriate address explicitly before starting:

```powershell
$env:LAN_HOST = 'YOUR_COMPUTER_PRIVATE_IP'
pnpm dev:lan
```

Windows Firewall must allow inbound TCP 8082 on the selected adapter from the local subnet only. Do not configure router port forwarding. Guest Wi-Fi/client isolation can prevent devices from reaching each other.

The LAN gateway expects the CMS's CLIENT_ORIGIN to be `http://localhost:8081`. If you have changed it, set `LAN_CMS_CLIENT_ORIGIN` to that value. The frontend automatically uses the gateway when opened on port 8082 and its configured API is localhost. Production HTTPS deployments continue to use EXPO_PUBLIC_API_URL normally.

## Browser compatibility

On local HTTP, the reader uses IndexedDB for verified media storage and a bundled SHA-256 implementation when WebCrypto is unavailable. Profile/quiz UUIDs use secure random bytes when randomUUID is unavailable. Manual reading, playback, profiles and quizzes can therefore be tested without installing a certificate.

Service-worker installation and a fully offline app launch still require HTTPS (or localhost). Google/Apple sign-in also needs appropriate provider configuration; the Wi-Fi URL is for local testing, not public deployment.

After code changes, rebuild with `pnpm build:web` and refresh Safari. If the computer's IP changes, restart the LAN server, use its newly printed address, and update any address-specific firewall rule.

## GitHub contents

The repository includes source code, migrations, package lockfile, generated UI assets and example environment files. Real `.env` files, credentials, uploaded stories/media, database files, generated builds and local preview screenshots are excluded. Back up the database and media separately; cloning GitHub will not restore your edited story content.

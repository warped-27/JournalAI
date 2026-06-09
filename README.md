# NERD_JOURNAL_

> Zero-knowledge encrypted personal journal for developers, hackers, and privacy enthusiasts.
> Brutalist terminal UI · Local-first AI · Cross-platform (iOS · Android · macOS · Windows · Linux)

---

## Philosophy

**Serverless. Client-Centric. Zero-Knowledge.**

There is no central database, no subscription, no proxy server. Your notes are encrypted on-device before they ever touch storage or the network. Your keys are yours. Your cloud is yours.

Three pillars:

| Pillar | What it means |
|---|---|
| **Zero-Knowledge Encryption** | AES-256-GCM with a key derived via Argon2id from your master password. Notes never leave the device in plain text. |
| **BYOK** (Bring Your Own Key) | Direct API calls to the AI provider of your choice — no middleman, no quota sharing. |
| **BYO-Cloud** | Sync only to the server you control: WebDAV, Nextcloud, ownCloud, or an encrypted file you move manually. |

---

## Features

### Interface
- Brutalist terminal aesthetic — `border-radius: 0`, phosphor-green accents, JetBrains Mono, CRT scanlines
- Responsive: single-column on mobile, two-panel sidebar layout on desktop (Tauri)
- Keyboard shortcuts on desktop (`⌘N` new note, `⌘K` ask, `⌘⌫` back)
- System tray integration on macOS/Windows/Linux

### Notes & Knowledge
- Full SQLite database, offline-first
- Full-text search across all notes (title + content)
- Auto-tagging, bullet-point summaries, and semantic enrichment via AI (on save)
- Related notes panel using TF-IDF cosine similarity (no embeddings, no cloud)
- Writing streak tracker, word count, sparkline activity chart
- Daily writing prompts

### AI — Provider Cascade
AI requests flow through a local-first cascade — the first available provider wins:

```
llama.rn (on-device) → Ollama → MLX → Custom → Claude → Gemini
```

| Provider | Type | Notes |
|---|---|---|
| **llama.rn** | On-device (iOS/Android) | Gemma 3 4B, Q4_K_M — fully offline |
| **Ollama** | Local LAN | Any Ollama model, e.g. `llama3.2:3b` |
| **MLX** | Local (Apple Silicon) | `mlx_lm.server`, any MLX-compatible model |
| **OpenAI** | Cloud (BYOK) | `api.openai.com` — preset in Settings |
| **Grok (xAI)** | Cloud (BYOK) | `api.x.ai` — preset in Settings |
| **Mistral** | Cloud (BYOK) | `api.mistral.ai` — preset in Settings |
| **Perplexity** | Cloud (BYOK) | `api.perplexity.ai` — preset in Settings |
| **Custom** | Cloud/Local (BYOK) | Any OpenAI-compatible endpoint |
| **Claude (Anthropic)** | Cloud (BYOK) | Dedicated provider — Fable 5, Opus 4.8, Sonnet 4.6, Haiku 4.5 |
| **Gemini** | Cloud (BYOK) | Default fallback — Flash Lite, Flash, 2.5 variants |

### Second Brain (RAG)
Ask questions across your entire note collection. TF-IDF retrieval selects the most relevant notes, builds a context window, and queries the active AI provider — all without sending embeddings to any third party.

### Voice Transcription
- **On-device**: Whisper Small (244 MB, runs fully offline on iOS/Android)
- **Fallback**: disabled gracefully on web/desktop where native Whisper is unavailable

### Security
- Vault unlock: master password (always) + optional Face ID / Fingerprint (iOS/Android)
- Biometric key stored in device Secure Enclave — never leaves hardware
- OS keychain on desktop (Rust `keyring` crate via Tauri IPC)
- Tauri IPC allowlist: JS can only read/write explicitly named keychain keys
- Content Security Policy locks outbound connections to known AI/sync endpoints

### Sync
- **WebDAV / Nextcloud / ownCloud**: push/pull of encrypted bundle, ETag-based conditional sync
- **File backup**: export/import encrypted `.njvault` bundle manually
- Delta sync: skips upload if nothing changed since last sync

---

## Platform Support

| Platform | How to run | Native features |
|---|---|---|
| **Web (browser)** | `npm run web` | Core notes, AI via API, WebDAV sync |
| **Desktop (Tauri)** | `npm run dev:tauri` | + OS keychain, file pickers, tray, keyboard shortcuts |
| **iOS** | EAS build or `npx expo run:ios` | + llama.rn, Whisper, biometrics, camera |
| **Android** | EAS build or `npx expo run:android` | + llama.rn, Whisper, biometrics, camera |

---

## Getting Started

### Web / Browser (quickest)

```bash
git clone https://github.com/warped-27/nerd_journal_
cd nerd_journal_
npm install
npm run web
```

No environment variables required. The Gemini API key (and any other provider key) is entered inside the app Settings screen and stored in the device keychain.

### Desktop (Tauri)

Requires [Rust](https://rustup.rs) and the Tauri system dependencies for your OS.

```bash
# macOS / Linux (one-time)
curl https://sh.rustup.rs -sSf | sh

# Linux — additional system deps
sudo apt install libwebkit2gtk-4.1-dev libgtk-3-dev libayatana-appindicator3-dev

# Run in dev mode (hot-reload)
npm run dev:tauri

# Production build (.dmg / .msi / .deb / .AppImage)
npm run build:tauri
```

### Mobile (iOS / Android)

**With EAS cloud build** (no local toolchain required):

```bash
npm install -g eas-cli
eas login
eas build --profile development --platform android   # .apk
eas build --profile development --platform ios       # requires Apple Developer account
```

**Local Android build**:

```bash
npx expo prebuild --platform android
npx expo run:android
```

**Local iOS build** (requires Xcode 15+):

```bash
npx expo prebuild --platform ios
npx expo run:ios
```

---

## Tech Stack

| Layer | Technology |
|---|---|
| Framework | Expo 56 + React Native 0.85 + React 19 |
| Desktop wrapper | Tauri v2 (Rust) |
| Navigation | Expo Router (file-based) |
| Database | expo-sqlite (SQLite, on-device) |
| Encryption | AES-256-GCM (`@noble/ciphers`) · Argon2id KDF (`@noble/hashes`) |
| On-device LLM | llama.rn (iOS/Android) |
| On-device STT | whisper.rn (iOS/Android) |
| Similarity search | TF-IDF cosine similarity (no external service) |
| State | Zustand + React Context |
| Styling | React Native StyleSheet — JetBrains Mono, design tokens |
| Tests | Jest + jest-expo (365 tests) |
| Type checking | TypeScript 6 (strict) |

---

## Project Structure

```
app/                  Expo Router screens
  (tabs)/index.tsx    Home — note list
  note/[id].tsx       Note editor
  settings.tsx        Settings — AI, sync, security

src/
  ai/                 AI providers, RAG, enrichment, TF-IDF
    providers/        gemini · openAiCompat · claude · llamaRn
    whisper/          Whisper STT context + model manager
    onDevice/         llama.rn context + model manager
  crypto/             Vault (AES-GCM + Argon2id), biometrics, keychain
  notes/              Note model, store, search, related notes
  sync/               WebDAV sync, file export/import, encrypted bundle
  stats/              Streak, word count, sparkline, daily prompts
  design/             Design tokens, Box, T, Btn, Input components
  platform/           isTauri() / isNative() detection, file system abstraction
  hooks/              useKeyboardShortcuts
  lib/                URL validation, logger, Result type

src-tauri/            Rust — OS keychain IPC, system tray, file pickers
```

---

## Scripts

```bash
npm run web           # Expo web dev server
npm run dev:tauri     # Tauri desktop dev mode
npm run build:tauri   # Tauri production build
npm test              # Jest test suite
npm run typecheck     # tsc --noEmit
```

---

## License

MIT

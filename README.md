# Voice Batch Generator

Upload a CSV of lines, generate every one as an MP3 with [ElevenLabs](https://elevenlabs.io), and download the whole batch as a ZIP. Runs entirely on Next.js — no database, no auth provider, deploys to Vercel for free.

## Features

- Drag-and-drop CSV upload (filename + voice-over text columns)
- Configurable model, and Speed / Stability / Similarity / Style sliders
- Concurrent generation with a configurable worker count (default 5)
- Automatic retry with exponential backoff on rate limits, timeouts, and 5xx errors
- Failed rows are collected into a `failed.csv` inside the ZIP instead of stopping the batch
- Live progress: completed / failed / elapsed / ETA / current file
- Cancel mid-batch, clear the queue, remembers your slider settings
- Optional password gate for private deployments
- Dark mode, fully responsive

## Tech stack

Next.js 15 (App Router) · TypeScript · Tailwind CSS · shadcn/ui-style components · JSZip · PapaParse · the ElevenLabs REST API.

## CSV format

Two columns, no header required (but a header row is fine and will be detected/skipped):

```
1,Hello everyone.
2,Welcome back.
3,Today we will...
```

Column A becomes the output filename (`1.mp3`, `2.mp3`, `3.mp3`); column B is the text sent to ElevenLabs. Blank rows are ignored and whitespace is trimmed automatically.

## Security

This project pins `next@15.5.7` and `react@19.2.3`, the patched releases that fix the React Server Components RCE/DoS vulnerabilities disclosed in late 2025 / early 2026 (CVE-2025-55182, CVE-2025-55183, CVE-2025-55184, CVE-2025-67779, CVE-2025-66478). Before deploying, run `npm outdated` / check the [Next.js security advisories](https://nextjs.org/blog) to confirm these are still current — Vercel's dashboard will also flag any project running a vulnerable version.

## Installation

```bash
npm install
```

## Development

```bash
cp .env.example .env.local
# fill in ELEVENLABS_API_KEY / ELEVENLABS_VOICE_ID if you want server-side defaults
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

You can also skip the `.env.local` values entirely and paste your API key / Voice ID directly into the UI each session — whatever you type in the form always takes priority over the environment variables.

## Environment variables

| Variable               | Required | Description                                                                 |
| ----------------------- | -------- | ----------------------------------------------------------------------------- |
| `ELEVENLABS_API_KEY`   | No       | Fallback API key used when the UI field is left blank.                       |
| `ELEVENLABS_VOICE_ID`  | No       | Fallback voice ID used when the UI field is left blank.                      |
| `APP_PASSWORD`         | No       | If set, visitors must enter this password before using the app.              |
| `AUTH_SECRET`          | No*      | Secret used to sign the session cookie. *Recommended* whenever `APP_PASSWORD` is set — generate with `openssl rand -hex 32`. |

If `APP_PASSWORD` is empty or unset, authentication is disabled entirely and every route is public.

### How to obtain an ElevenLabs API key

1. Sign in at [elevenlabs.io](https://elevenlabs.io).
2. Go to **Settings → API Keys**.
3. Create a key and copy it — paste it into the UI or into `ELEVENLABS_API_KEY`.

### How to find a Voice ID

1. Go to the **Voices** tab (or the [Voice Library](https://elevenlabs.io/app/voice-library)).
2. Open a voice and copy its Voice ID from the voice settings panel, or from the API's `GET /v1/voices` response.

## Deployment (Vercel)

1. Push this repo to GitHub.
2. Import it in [Vercel](https://vercel.com/new).
3. Add the environment variables you want under **Project Settings → Environment Variables**.
4. Deploy. No build configuration or `vercel.json` is required.

### Large CSVs on Vercel Hobby

The generation route streams live progress and can legitimately run for minutes on large CSVs. The Hobby plan caps serverless function duration at 60 seconds regardless of the `maxDuration` set in code; Pro/Enterprise allow up to 800s. On Hobby, keep batches to roughly what your account's ElevenLabs rate limit and 60s window can realistically finish (a few hundred short lines at concurrency 5 is a safe ballpark) — for bigger jobs, split the CSV or upgrade your Vercel plan.

## Architecture

```
app/
  page.tsx              client UI
  layout.tsx             root layout, theme + toast setup
  login/page.tsx          password gate screen
  api/generate/route.ts   streams NDJSON progress, returns the ZIP as base64 in the final event
  api/login/route.ts       verifies APP_PASSWORD, sets a signed session cookie
  api/logout/route.ts      clears the session cookie
components/
  ui/                    small local shadcn-style primitives (button, card, input, slider, ...)
  UploadZone.tsx           drag-and-drop CSV picker
  CredentialsPanel.tsx      API key / voice ID / model / concurrency
  VoiceSettingsPanel.tsx    the four sliders
  ProgressPanel.tsx         live stats
lib/
  csv.ts                 CSV parsing + failed.csv builder (PapaParse)
  elevenlabs.ts            ElevenLabs text-to-speech client
  retry.ts                exponential backoff helper
  queue.ts                 concurrency-limited task runner
  auth.ts                  password-gate session signing (Web Crypto, Edge-safe)
hooks/
  useGeneration.ts         drives the fetch + NDJSON stream + ZIP download on the client
  useLocalStorage.ts        persists slider/model/concurrency choices
types/
  index.ts                shared types + defaults
```

### How generation works

1. The browser parses the CSV client-side with PapaParse and shows the row count immediately.
2. On **Generate**, the rows and settings are POSTed to `/api/generate`.
3. The route streams newline-delimited JSON progress events back over the same connection as files complete, retry, or fail — each row runs through a concurrency-limited queue (default 5 at a time) with 3 retries and exponential backoff.
4. When every row is done, the server zips the MP3s (plus `failed.csv` if anything failed) and sends the ZIP as base64 in a final `done` event.
5. The browser decodes it into a Blob and triggers the download automatically.

## Troubleshooting

- **"Missing ElevenLabs API key"** — enter one in the form or set `ELEVENLABS_API_KEY`.
- **"Invalid API key" / 401 errors** — double check the key under ElevenLabs → Settings → API Keys, and that it hasn't been revoked.
- **A lot of rows end up in `failed.csv`** — usually a rate-limit issue; lower the concurrency value and re-run just the failed rows (re-upload `failed.csv`, dropping the Reason column).
- **Nothing downloads at the end** — check the browser console; very large batches can produce a large ZIP that some browsers are slower to hand off. Use "Download ZIP again" if the automatic download didn't fire.
- **Request times out on Vercel** — see "Large CSVs on Vercel Hobby" above.

## Screenshots

_Add screenshots of the upload screen and the in-progress generation view here._

`docs/screenshot-upload.png`
`docs/screenshot-progress.png`

## License

MIT

# DropZone

Share files with one link. DropZone is a client-only React SPA that uploads files to either **Supabase Storage** (cloud, works across devices) or **IndexedDB** (local, works in the same browser) and gives you a shareable link immediately.

## Features

- Drag and drop, browse, or paste multiple files.
- Upload up to three files in parallel with real progress, retry, cancel, and per-file errors.
- Add more files to an existing link after the first upload finishes.
- Cloud mode for cross-device links, with automatic local-only fallback when Supabase is not configured.
- Copy link, native share, and QR code for every transfer and individual file.
- Recent transfers stored on the uploader's device.
- Collection and single-file pages with image, video, audio, and PDF previews.
- Individual downloads and ZIP downloads with duplicate-name handling and smart compression.
- Delete a transfer and all of its stored files.
- Responsive dark UI, error boundary, and offline status.

## Quick Start

```bash
npm ci
npm run dev
```

Open **http://localhost:3000**. The dev server uses `strictPort`, so another process already using port 3000 will block startup.

| Command | What it does |
| --- | --- |
| `npm run dev` | Vite dev server on port 3000 |
| `npm run typecheck` | TypeScript check (`tsc --noEmit`) |
| `npm run build` | Production build to `dist/` |
| `npm run preview` | Serve the production build (Vite default port 4173) |

There is no lint, formatter, or automated test suite in this repo.

## Storage Modes

### Local mode (default)

If `VITE_SUPABASE_URL` and `VITE_SUPABASE_ANON_KEY` are both missing, DropZone stores files in IndexedDB.

- Works immediately with no backend.
- Share links only work in the same browser profile on the same device.
- Clearing browser data removes the files.
- Enabling cloud mode later makes local shares inaccessible from the UI.

### Cloud mode

When both Supabase values are present, files upload to Supabase Storage and links work on any device.

1. Copy `.env.example` to `.env` and fill in:

   ```env
   VITE_SUPABASE_URL=https://your-project.supabase.co
   VITE_SUPABASE_ANON_KEY=your-anon-key
   VITE_SUPABASE_STORAGE_BUCKET=dropzone-files
   ```

2. Run [`supabase/migrations/001_initial_schema.sql`](./supabase/migrations/001_initial_schema.sql) in the Supabase SQL Editor.

   **Do not run the SQL in `SUPABASE_SETUP.md` or `CLOUD_SETUP_GUIDE.md`.** Those older guides add a required `files.file_id` column that the app never writes, and uploads will fail.

3. In the Supabase dashboard, create a **public** storage bucket named `dropzone-files` with a **100 MB** per-file limit, then run [`supabase/migrations/002_storage_setup.sql`](./supabase/migrations/002_storage_setup.sql) for the storage policies.

4. Restart the dev server. For deployments, rebuild after changing env vars because Vite inlines `VITE_*` values at build time.

## Deployment

DropZone is a static Vite SPA. No application server is required.

1. Add the same three `VITE_SUPABASE_*` variables to the hosting provider's environment settings for Production (and Preview if used).
2. Set the build command to `npm run build` and the output directory to `dist`.
3. Redeploy after changing environment variables. Vite reads them at build time; changing dashboard values alone does not update an existing deployment.
4. Share links use `HashRouter` (`/#/share/...`), so no SPA rewrite rule is required. The app must still be served over HTTPS for clipboard and crypto APIs.
5. Never add a service-role key or any other secret as a `VITE_*` variable. Only the project URL, anon public key, and public bucket name belong in the browser.

If the deployed app says **Local**, the build did not receive both Supabase variables. Rebuild with them configured; do not deploy a `dist` folder that was built without them.

## Architecture

```text
src/
├── components/          UI: DropZone, FileCard, CollectionCard, ShareActions, ErrorBoundary...
├── hooks/
│   ├── useUpload.ts     Upload queue, concurrency, retries, cancellation, share reuse
│   ├── useRecentShares.ts
│   ├── useClipboard.ts
│   └── useOnlineStatus.ts
├── lib/
│   ├── storage.ts       Only storage boundary: Supabase + IndexedDB
│   ├── supabase.ts      Lazy client and env configuration
│   ├── zipUtils.ts      Lazy-loaded ZIP creation
│   ├── recentShares.ts  Local uploader history
│   ├── shareLink.ts     Hash-route URL builders
│   ├── fileUtils.ts     Validation, categories, formatting
│   └── id.ts            UUID generation without a dependency
├── pages/
│   ├── HomePage.tsx
│   └── SharePage.tsx
├── types/index.ts
├── App.tsx
├── main.tsx
└── index.css
```

`HashRouter` routes:

- `#/` — upload and transfer management
- `#/share/:shareId` — collection page
- `#/share/:shareId/file/:fileId` — single-file preview and download

Cloud uploads go through the Supabase Storage REST API with `XMLHttpRequest` so large files get real upload progress and can be cancelled. File metadata is written with `@supabase/supabase-js`. If metadata insertion fails, the uploaded object is removed.

ZIP and QR libraries are loaded on demand, and the two page routes are code-split.

## Privacy and Security

- **Local mode:** files never leave the browser. Links are not portable to another device.
- **Cloud mode:** files travel over HTTPS and live in your Supabase project.
- Share links are public by design: anyone with a link can open the transfer.
- The default Supabase policies are fully public (select/insert/delete) with no auth or ownership. Do not use the default policies for sensitive data without tightening RLS and storage policies.
- Deleting a transfer removes its database rows and storage objects.

## Tech Stack

- React 18 + TypeScript
- Vite 6
- Tailwind CSS 4 (`@tailwindcss/vite`, theme tokens in `src/index.css`)
- React Router 6 (`HashRouter`)
- Supabase JS / Storage
- JSZip
- Lucide React
- `qrcode.react`

## License

MIT

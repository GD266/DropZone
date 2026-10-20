# AGENTS.md

DropZone is a client-only React 18 + TypeScript SPA for uploading files and sharing them by link. There is no application server in this repo: storage is either Supabase (cloud) or IndexedDB (local fallback), selected automatically from env vars.

## Commands

- `npm ci` — install from the lockfile.
- `npm run dev` — Vite dev server at **http://localhost:3000**. `vite.config.js` sets `port: 3000` and `strictPort`.
- `npm run typecheck` — `tsc --noEmit`; the only static check.
- `npm run build` — production build to `dist/`.
- `npm run preview` — serve the production build; Vite's default preview port is 4173.
- No lint, formatter, test, or e2e suite is configured. Verify changes with `typecheck` then `build`; use a browser for upload/share/download flows.
- Routes and ZIP/QR code are lazy-loaded. If the build suddenly produces one oversized chunk, check that the dynamic imports were not accidentally made static.

## Architecture

- Entry: `src/main.tsx` → `src/App.tsx`. `HashRouter` routes: `#/` upload, `#/share/:shareId` collection, `#/share/:shareId/file/:fileId` single file.
- `src/hooks/useUpload.ts` is the transfer engine: one share is created and reused when files are added later, validation runs before upload, up to three files upload concurrently, and failed files can be retried or cancelled. Do not revert to sequential uploads or a new share per batch; adding files after success is intentional product behavior.
- `src/lib/storage.ts` is the only storage boundary. It uses Supabase when both `VITE_SUPABASE_URL` and `VITE_SUPABASE_ANON_KEY` exist; otherwise it uses IndexedDB. There is no explicit mode flag.
- Cloud uploads use the Storage REST API through `XMLHttpRequest` so progress and cancellation work; metadata is written through `@supabase/supabase-js`. If you replace the XHR path, preserve real progress and cleanup of the storage object when the metadata insert fails.
- `deleteShare()` removes both storage objects and database rows. Deletion is intentionally available from the uploader's success card.
- Local-mode links only work in the same browser profile. Adding/changing Supabase env vars switches the mode and makes existing IndexedDB shares inaccessible.
- Share URLs are built in `src/lib/shareLink.ts` as `origin + pathname + #/share/...`. Keep the hash format, routes, and builders in sync; switching to `BrowserRouter` would break static-hosted links.
- `src/lib/recentShares.ts` stores uploader history in `localStorage` under `dropzone_recent_shares_v1`. It is convenience metadata only, not a source of truth.
- `src/lib/zipUtils.ts` dynamically imports JSZip, de-duplicates entry names, and uses `STORE` for already-compressed media/archives. Individual file failures are skipped; if every file fails it throws instead of producing an empty ZIP.
- `ShareActions` provides copy/native-share/QR; QR code comes from `qrcode.react`. `ErrorBoundary`, `PageLoader`, and `useOnlineStatus` form the app shell.
- Single-file and collection downloads support cloud public URLs and local object URLs. Cloud download URLs use Supabase's `?download=` option so the original filename is preserved.

## Supabase

- `supabase/migrations/001_initial_schema.sql` is the source of truth: `shares` and `files` tables plus public RLS policies.
- **Do not run the SQL in `SUPABASE_SETUP.md` or `CLOUD_SETUP_GUIDE.md`.** It adds a required `files.file_id` column that the app never writes, so uploads will fail. Use `001_initial_schema.sql`.
- `002_storage_setup.sql` only documents/creates storage policies. The public `dropzone-files` bucket (100 MB limit) must be created manually in the Supabase dashboard; there is no Supabase CLI config in the repo.
- Cloud objects live at `shares/{shareId}/{fileId}/{sanitized filename}`. DB rows are snake_case and mapped to camelCase in `storage.ts`; update `src/types/index.ts` with any schema change.
- RLS is intentionally fully public (select/insert/delete) and there is no auth or ownership. Anyone with a share URL can read; anyone with the anon key can insert/delete.
- The 100 MB per-file limit is enforced by `MAX_FILE_SIZE` in `src/lib/fileUtils.ts`; keep it aligned with the bucket limit.
- Missing Supabase config falls back to local mode. If only one of the two env vars is set, the UI shows a partial-configuration warning via `getPartialConfigurationError()`.

## Styling and env

- Tailwind CSS 4 runs through `@tailwindcss/vite`; there is no `tailwind.config.js`. Theme tokens (`surface-0..3`, `border`, `text-*`, `accent`) are in the `@theme` block of `src/index.css`; use those classes instead of raw colors.
- Cloud setup: copy `.env.example` to `.env`, fill the three `VITE_SUPABASE_*` values, and restart the dev server. Vite inlines them at build time, so deployed env changes require a rebuild.
- Top-level `BUG_*`, `FIX_*`, `*_REPORT.md`, `IMPLEMENTATION.md`, and `QUICK_START.md` are historical notes, not current docs; several contradict the code (e.g. they claim IndexedDB was removed). Prefer `README.md`, `package.json`, `vite.config.js`, and the source.

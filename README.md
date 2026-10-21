# Tandem

A calm todo list with direct device sync. Add tasks, organize them into Personal, Work, and Life, set dates and importance, add notes, search, sort, and check things off. The first visit starts with an empty list; suggestion buttons add real tasks only when selected.

## Install, run, and rebuild

Use Node.js 24 and npm.

```sh
npm ci
npm run dev
```

Build and preview the production site:

```sh
npm run typecheck
npm test
npm run build
npm run preview -- --host 0.0.0.0
```

Open the local address printed by Vite. `dist/` is the complete static export and is included alongside the source and lockfile. The publisher can serve it directly. Vite uses `base: './'`; scripts, styles, font, favicon, and share image use relative URLs. There are no server routes or runtime API keys. Serve over HTTPS (or localhost for development), rather than opening `index.html` as a file.

## Sync two devices

1. Open the site on both devices, preferably on the same Wi-Fi.
2. On the first device, choose **Sync devices → Create pairing code**. Send the code privately to your other device.
3. On the second device, choose **Sync devices → Enter a code**, paste the code, and choose **Create reply code**.
4. Send that reply back. Paste it into the first device’s reply field and choose **Connect devices**.
5. Once both say **Connected to one device**, changes sync in both directions. You can close the dialog and keep working.

**Both pages must remain open.** Closing or reloading either page ends the pairing session. Pair again to merge changes made while apart. This is direct WebRTC sync, with no cloud account, signaling server, or background synchronization. It is not a cloud backup service.

The optional **Try connecting across different networks** checkbox uses Google’s public STUN server to discover a connection route. It sends no task contents to that server. Some firewalls, VPNs, mobile networks, and isolated Wi-Fi networks block direct connections. No TURN relay is configured. If connection fails, use the same Wi-Fi or transfer a backup. Physical devices and cross-network connectivity were not available for validation; real data-channel sync was tested between separate browser contexts with separate storage.

Pair only devices you trust: pairing merges the entire list and lets either device edit or delete tasks. Share codes through a private channel. WebRTC data channels use transport encryption, but task storage and exported backups are readable by someone with access to the browser profile or file. See [MDN’s data channel documentation](https://developer.mozilla.org/en-US/docs/Web/API/WebRTC_API/Using_data_channels).

## Storage and backups

- Tasks persist in `localStorage` under `tandem.tasks.v1`. Tabs on the same origin also merge changes.
- An already loaded page works without internet; there is no service worker, so loading the site again while offline is not guaranteed.
- **Backup & restore** downloads a versioned JSON file or merges a previously exported one. Invalid imports do not replace existing tasks.
- Clearing site data removes that browser’s copy. Download a backup first. Storage failures are displayed; in-memory changes can still be exported.
- Each task field has its own logical revision and device-session identifier. Edits to different fields merge. Simultaneous writes to the same field resolve by logical revision, then identifier, rather than device wall-clock time.
- Deletions remain as tombstones, including the task’s contents, so an older device or backup cannot revive them. Undo writes a newer deletion state. A backup includes this deletion history; deletion is not secure erasure.
- Names are limited to 240 characters, notes to 2,000. There is a 10,000-record limit including tombstones and a 25 MB import limit. Browser storage quotas may be lower. This is intended for personal task lists, not bulk data storage.

## Checks and actual results

Validated on 21 October 2026 against the production export, served under a subpath:

| Check | Actual result |
| --- | --- |
| `npm run typecheck` | Passed; no TypeScript errors |
| `npm test` | 8 model tests passed |
| `npm run build` | Passed; Vite production export generated |
| `npm run test:browser` | 9 groups of Chromium interaction checks passed |
| Axe scans | 0 violations in four inspected states |
| Pinned `taste.mjs` | 16/16 checks passed after corrections |
| Responsive checks | No horizontal overflow at 320, 390, 720, 900, and 1440 CSS px |
| First screen at 390 | Task input and Add task visible; button bottom measured at 242.69 px |
| Cross-device protocol | Real WebRTC between isolated contexts; two-way edits, completion, deletion, undo, and offline-merge reconnection passed |
| WebKit | Attempted; could not launch because required system libraries are absent |

The environment prohibited modifying repository `node_modules/`, so dependencies were installed into a temporary copy outside the repository. The same source, manifest, and lockfile were typechecked and built there; the final build wrote directly into this repository’s `dist/`. Browser checks then targeted that exact export. No dependencies or caches are included in the submission.

To repeat the browser checks on a machine with browser dependencies available:

```sh
npx playwright install chromium webkit
npm run build
npm run test:browser
```

On Linux, Playwright may also need operating-system browser libraries. The browser script starts and stops its own preview server, uses isolated contexts, and puts transient results under `test/scratch/browser-checks/`. `TANDEM_EXPORT` can point the script at another export directory. A missing WebKit runtime is recorded as a limitation, not a passing check.

The pinned review was run from the repository root with:

```sh
node .imd/reads/skills/design-critic/scripts/taste.mjs --out test/scratch/taste
```

`IMD_PLAYWRIGHT` pointed to the externally installed Playwright module, and `PLAYWRIGHT_BROWSERS_PATH` to its temporary browser installation. The pinned inputs are removed by the submission system; the recorded results remain in `artifacts/taste-results.json`.

See [the full validation report](artifacts/validation.md) for six-domain coverage, findings and fixes, screenshots, and honest limitations. Screen readers, physical devices, native browser zoom, and cross-network pairing remain unverified. A 200% CSS text-size reflow check is not a native browser zoom test.

## Source map

| Path | Purpose |
| --- | --- |
| `src/App.tsx` | Task views, composer, editing, backups, and notifications |
| `src/model.ts` | Validation, logical revisions, field-level merge, deletion history |
| `src/store.ts` | Local persistence and same-origin tab merging |
| `src/peer.ts` | WebRTC pairing, bounded messages, buffered sending, connection states |
| `src/SyncDialog.tsx` | Pairing instructions, codes, error recovery |
| `src/Modal.tsx` | Native modal dialog, Escape, focus return |
| `src/style.css` | Tokens, component styles, responsive layouts |
| `src/Icons.tsx` | Original line icons and decorative notebook illustration |
| `public/` | Favicon, generated share image, and font license copied into the export |
| `tests/` | Model tests and production browser validation |
| `DESIGN.md` | Implemented design system |

## Submission and ignore-file budget

The submission must stay below **8,388,608 bytes**. The final measured source/export/evidence inventory is in `artifacts/submission-size.json`. Generated packaging archives are not deliverables.

Explicit `.gitignore` path budget: **one file, at most 1,024 bytes**, restricted to the generated paths below. It does not ignore `dist/`, source, manifests, lockfiles, tests, or documentation.

| Ignored path | Reason |
| --- | --- |
| `**/node_modules/` | Installed dependencies, at every nesting level |
| `**/.cache/`, `**/.vite/` | Generated tool caches |
| `**/.npm/`, `**/npm-cache/` | Package-manager caches |
| `**/coverage/` | Generated coverage reports |
| `/.playwright-mcp/` | Browser-tool transient files |
| `/test/scratch/` | Assignment scratch space, removed before submission |

Only these exclusions were added. The source, static runtime assets, local font and license, lockfile, and selected verification evidence remain complete.

## Attribution

DM Sans is bundled locally under the SIL Open Font License; see `src/assets/FONT-LICENSE.txt`. A copy is included in the static export as `font-license.txt`. The logo, line icons, notebook illustration, and share-card layout are original SVG work. `src/assets/share-card.svg` is the source of `public/share.png`.

The implementation and review used the pinned Better Interface guide by Jakub Krehel (MIT, commit `267330e1adfc66a718fb65fa6918c1f06d0a689e`) and its documentation method adapted from Paul Bakaus’s Impeccable (Apache-2.0, commit `9d715cc4f5564a990ca8345abfdd5df6dc9b41c8`). Notices and full license texts are retained in `artifacts/design-guidance-LICENSE.txt`; source links are recorded in the validation report.

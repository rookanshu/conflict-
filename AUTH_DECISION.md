# AUTH DECISION — Firebase Auth without the startup latency

**Date**: 2026-09-18
**Phase**: 3D prerequisite (3A / 3B / 3C)
**Base**: `sih/` (Next.js 16.3.4 App Router, authoritative)
**Source**: `NER/frontend` (Firebase Auth patterns, imported selectively)
**Status**: DECIDED — Option B (Firebase + Google Sign-In), implemented

> All numbers are measured with the same Playwright/Firefox harness on the
> same host (loopback, cold cache). No estimates. Raw JSON: `/tmp/measure/out/`
> (`ner-baseline.json`, `ner-cold.json`, `sih-demo-baseline.json`, `sih-live-cold.json`).

---

## 3A — NER waterfall, measured (cold load of NER `dist/`)

| Metric | Value |
| :--- | :--- |
| `load` event (wall) | 263-389 ms |
| First usable UI (wall) | 737-738 ms |
| FCP | 202-317 ms |
| App transfer total | 1 578 434 bytes (~1.51 MB) |
| JS on first paint | 7 files, all before usable UI |
| Firebase vendor chunk | 103 kB @ ~89 ms — inside the critical path |
| Largest asset | hero JPG 759 kB @ ~620 ms — inside the critical path |
| Firebase net before any auth action | SDK chunk fetched unconditionally; `initializeApp`+`getAuth` run at module import (`services/firebase.js:47-61`) |

Where the cost comes from (read, not inferred):

1. Eager SDK import — `firebase/app` + `firebase/auth` at module top level.
2. Hardcoded `FALLBACK_CONFIG` ships a real key, so `isFirebaseConfigured` is
   effectively always true; there is no anonymous fast path.
3. Boot route renders the Login page and blocks usable UI on the auth surface.
4. `inMemoryPersistence` + explicit `signOut(auth)` on every mount
   (`AuthContext.jsx:29-46`): sessions never survive reload, so every visit
   repeats the full waterfall.
5. No `onAuthStateChanged` listener, no Firestore reads in the auth path —
   there was nothing to "parallelise". The fix is to skip auth work entirely
   for anonymous visitors.

## 3B — Optimisations applied (before -> after, measured)

| # | Change (sih) | Effect |
| :--- | :--- | :--- |
| 1 | SDK behind dynamic `import()` (`src/lib/firebase.ts`); static imports are types only | `firebase/*` is a separate chunk, fetched only when a session may exist (`AUTH_HINT_KEY`) or sign-in opens |
| 2 | No auth work on provider mount (`AuthContext.tsx`): no init, no listener, 1-byte hint check only | Anonymous cold load = 0 Firebase requests (measured) |
| 3 | Reconcile is storage-only, deferred to `requestIdleCallback` + 3 s safety net | First paint never gated on auth |
| 4 | `browserLocalPersistence` replaces NER in-memory; no sign-out-on-mount | Sessions survive reload |
| 5 | `saveFirebaseConfig` localStorage override NOT carried over | Any visitor could repoint NER at an arbitrary project; env-only now |
| 6 | Env-only config, placeholder-aware, demo mode when unconfigured | Previews boot with zero auth cost; no hardcoded key in repo |

Cold-load comparison (same harness, same host):

| Metric | NER baseline | sih merged (live Firebase env) | Delta |
| :--- | :--- | :--- | :--- |
| `load` (wall) | 263-389 ms | 442 ms | parity (richer shell) |
| First usable UI (wall) | 737-738 ms | 647 ms | -90 ms |
| FCP | 202-317 ms | 352 ms | parity |
| App transfer | 1 578 kB | 329 kB | -79% |
| Firebase reqs before auth action | vendor chunk unconditional | 0 | deferred |
| Console / page errors | 0 | 0 | clean |

## 3C — Decision: Option B (Firebase + Google Sign-In)

| Option | Verdict |
| :--- | :--- |
| A. Optimised Firebase, email only | Works, but drops the org primary identity (Google accounts) |
| B. Firebase + Google Sign-In | CHOSEN — same deferred cost as A; popup SDK loads on click (+1 932 ms after click, never before paint); one handler, one button |
| C. Non-Firebase Google auth | REJECTED — engine has no session system; would invent token verification plus store plus rotation for no measured gain |

Known project-side caveats (surfaced by measurement):

- Email/password is DISABLED in the Firebase project (`PASSWORD_LOGIN_DISABLED`,
  1 526 ms to typed error). UI shows the exact remediation; Google unaffected.
- Preview host needs allow-listing (`auth/unauthorized-domain` on popup until
  the deployment domain is added under Authentication -> Settings).

## Implementation map

| Concern | File |
| :--- | :--- |
| Lazy SDK, env-only config, error catalogue | `sih/src/lib/firebase.ts` |
| Session lifecycle, persistence, claim-pinned roles | `sih/src/context/AuthContext.tsx` |
| Role matrix, hint key, tab access | `sih/src/constants/roles.ts` |
| Tab-level guard (NER route guard adapted to tab shell) | `sih/src/components/auth/ProtectedRoute.tsx` |
| Sign-in surface (demo + live, Google + email) | `sih/src/components/modals/LoginModal.tsx` |
| Env template (no secrets committed) | `sih/.env.example` |

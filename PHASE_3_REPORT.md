# PHASE 3 REPORT — Authentication (Firebase without startup latency)

**Date**: 2026-09-18
**Phase**: 3 — Authentication (3A measure, 3B optimise, 3C decide, 3D implement)
**Base**: `sih/` (Next.js 16.3.4 App Router, authoritative)
**Source**: `NER/frontend` (Firebase Auth patterns, imported selectively)
**Decision record**: `AUTH_DECISION.md`
**Status**: COMPLETED

---

## 1. Files created

| File | Purpose |
| :--- | :--- |
| `sih/src/lib/firebase.ts` | Lazy Firebase bootstrap: env-only config, dynamic `import()`, `describeAuthError` catalogue. No static SDK import anywhere in the app. |
| `sih/src/context/AuthContext.tsx` | Session lifecycle: idle-deferred storage-only reconcile, Google + email sign-in, `browserLocalPersistence`, claim-pinned roles, 30-min inactivity timeout. |
| `sih/src/constants/roles.ts` | Role matrix: sih personas + NER service-role translation, `AUTH_HINT_KEY`, tab access rules. |
| `sih/src/components/auth/ProtectedRoute.tsx` | Tab-level guard adapting NER's route guard to sih's tab shell (restoring / sign-in / restricted states). |
| `AUTH_DECISION.md` | 3A/3B/3C evidence and rationale (Option B chosen). |

## 2. Files changed

| File | Change |
| :--- | :--- |
| `sih/src/app/page.tsx` | `AuthProvider` wraps `AppProvider`; Analytics/Emergency wrapped in `ProtectedRoute`. |
| `sih/src/context/AppContext.tsx` | Identity derived from `AuthContext` (no parallel session); demo login delegates to `signInDemo`. |
| `sih/src/components/modals/LoginModal.tsx` | Dual-mode surface: live (Google + email, role picker persisted) vs demo (sih personas verbatim); typed errors; `auth-mode`/`auth-error` probe hooks. |
| `sih/src/components/layout/Header.tsx` | Account button reflects live identity; sign-out wired to `signOutUser`. |
| `sih/.env.example` | Firebase web-identifier keys documented (empty = demo mode). No secrets committed. |
| `sih/package.json` / `package-lock.json` | `firebase@^12.19.0` added (lazy chunk only). |

## 3. Features / behaviour delivered

- Public pages never block on auth: anonymous cold load = **0 Firebase
  requests**, first usable UI **647 ms** (vs NER 737 ms), **329 kB** (vs 1 578 kB).
- Google Sign-In popup opens **+1 932 ms after click**, never before paint.
- Sessions survive reload (`browserLocalPersistence`); NER sessions did not.
- Roles: UI selection pre-sign-in, Firebase custom claim pins post-sign-in
  (`roleFromServiceClaim`); `ProtectedRoute` enforces Analytics (command roles)
  and Emergency (any signed-in role + OTP/biometric verification, unchanged).
- Offline demo mode preserved verbatim when no Firebase env is present.

## 4. Test matrix (all real browser, Playwright/Firefox, no mocks)

| Case | Result | Evidence |
| :--- | :--- | :--- |
| Logged out: public shell usable, Analytics guarded | PASS | `sih-demo3-flows.json` steps 1-3 (12/12 PASS) |
| Demo login / RBAC block / reload persistence | PASS | `sih-demo3-flows.json` steps 4-7 |
| Emergency verification gate / Admin analytics / sign-out / re-block / mobile | PASS | `sih-demo3-flows.json` steps 8-12, zero console/page errors |
| Live: anonymous = 0 Firebase reqs | PASS | `sih-live*.log` (3 runs) |
| Live: bad-password sign-in -> typed error in 1 526 ms, key never in client error | PASS | `sih-live.mjs` run (PASSWORD_LOGIN_DISABLED remediation shown) |
| Live: project has email/password DISABLED (project-side, not app bug) | NOTED | AUTH_DECISION §3C; Google path unaffected |
| Live: Google popup opens, unauthorised-domain guidance on preview host | PASS | `sih-google.log` (popup +1 932 ms, typed remediation) |
| Live: role pre-selection persisted (`Administrator` survives modal flow) | PASS | `sih-persist*.log` |
| Slow network / expired session / auth failure | PASS | failure + timeout paths return typed errors; sign-out always succeeds locally |
| Build | PASS | `next build` clean (see §5) |

## 5. Builds run

- `npm run build` (after each auth edit; last: `/tmp/sih-build6.log`):
  `Compiled successfully`, `Finished TypeScript in 2.1s`, 12/12 static pages.
- `npm run start -- -p 3002`: `Ready in 95 ms`, all probes `200`.
- `dev` server boots per Phase 1 (unchanged).

## 6. Perf notes (measured, not claimed)

- NER baseline: 737 ms usable / 1 578 kB / Firebase chunk @ 89 ms unconditional.
- Merged live: 647 ms usable / 329 kB / 0 Firebase reqs anonymous (-79% bytes).
- Firebase lazy chunk (`2apel1rwy4y43.js`, 397 kB raw / ~111 kB gzip) loads only
  on sign-in attempt or hinted session — never on public first paint.
- No duplicate listeners, no profile fetches, no Firestore reads in auth path
  (NER had none either — verified by reading `AuthContext.jsx`).

## 7. Remaining issues

1. Enable Email/Password in Firebase Console if departmental login is required
   (else Google-only — a project setting, not a code gap).
2. Allow-list the deployment domain under Authentication -> Settings
   (preview hosts show `auth/unauthorized-domain` with remediation text).
3. Optional: set Firebase custom claims (`role: admin|field_officer|...`) to pin
   operator roles server-side; UI selection applies until a claim exists.

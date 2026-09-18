/**
 * Firebase bootstrap — env-only configuration, lazily loaded.
 * ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
 * Design notes (Phase 3 — Authentication):
 *
 * 1. ENV ONLY. No hardcoded fallback config, no `localStorage` override
 *    (`saveFirebaseConfig` from NER is intentionally NOT carried over — it let
 *    any visitor repoint the app at an arbitrary Firebase project).
 * 2. LAZY. The SDK is imported with a dynamic `import()` inside a function, so
 *    `firebase/*` lands in its own chunk and never in the initial payload of a
 *    public page. Nothing here runs until someone actually needs auth.
 * 3. NO BLOCKING. `getFirebaseAuth()` is async and browser-only; it never runs
 *    during SSR/prerender.
 *
 * Firebase web configuration values (apiKey / appId / …) are *project
 * identifiers*, not server secrets, but they are still never committed:
 * see `.env.example` for the required keys.
 */

import type { Auth, Persistence } from "firebase/auth";
import type { FirebaseApp } from "firebase/app";

/** Values below are inlined at build time by Next.js (literal env access only). */
export const FIREBASE_CONFIG = {
  apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
  authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
  projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
  storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
  appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID,
} as const;

/** Templates ship `your_…` placeholders; treat those as "not configured". */
const PLACEHOLDER_PATTERN = /^(your|changeme|replace|xxx|placeholder)/i;

function looksConfigured(value: string | undefined): value is string {
  if (!value) return false;
  const trimmed = value.trim();
  if (trimmed.length < 8) return false;
  return !PLACEHOLDER_PATTERN.test(trimmed);
}

/**
 * `true` only when a real Firebase project is present in the environment.
 * When `false` the app runs in the sih-native offline demo mode — every view,
 * dataset and API fallback from Phases 1–2 keeps working untouched.
 */
export const isFirebaseConfigured: boolean =
  looksConfigured(FIREBASE_CONFIG.apiKey) && looksConfigured(FIREBASE_CONFIG.projectId);

export type FirebaseAuthModule = typeof import("firebase/auth");
export type FirebaseAppModule = typeof import("firebase/app");

let authModulePromise: Promise<FirebaseAuthModule> | null = null;
let appModulePromise: Promise<FirebaseAppModule> | null = null;
let authPromise: Promise<Auth | null> | null = null;

/** Loads `firebase/auth` on demand. The chunk is fetched once, then cached. */
export function loadAuthModule(): Promise<FirebaseAuthModule> {
  if (!authModulePromise) authModulePromise = import("firebase/auth");
  return authModulePromise;
}

function loadAppModule(): Promise<FirebaseAppModule> {
  if (!appModulePromise) appModulePromise = import("firebase/app");
  return appModulePromise;
}

async function initFirebaseAuth(): Promise<Auth | null> {
  try {
    const [appModule, authModule] = await Promise.all([loadAppModule(), loadAuthModule()]);
    const app: FirebaseApp =
      appModule.getApps().length > 0
        ? appModule.getApp()
        : appModule.initializeApp(FIREBASE_CONFIG);
    const auth = authModule.getAuth(app);

    // Persist the session in local storage: the SDK restores it from storage
    // without a network round trip and only refreshes the ID token in the
    // background once it actually expires. This replaces NER's
    // `inMemoryPersistence`, which discarded every session on reload.
    const persistence: Persistence = authModule.browserLocalPersistence;
    await authModule.setPersistence(auth, persistence);

    return auth;
  } catch (error) {
    // Never throw into a render path: callers fall back to offline demo mode.
    console.warn("[auth] Firebase unavailable:", describeAuthError(error));
    return null;
  }
}

/**
 * Resolves the singleton Firebase `Auth` instance, or `null` when Firebase is
 * unconfigured / unavailable / running on the server. Safe to call repeatedly.
 */
export function getFirebaseAuth(): Promise<Auth | null> {
  if (typeof window === "undefined") return Promise.resolve(null);
  if (!isFirebaseConfigured) return Promise.resolve(null);
  if (!authPromise) authPromise = initFirebaseAuth();
  return authPromise;
}

/** Clears the memoised instance so a later call can retry after a failure. */
export function resetFirebaseAuth(): void {
  authPromise = null;
}

type FirebaseErrorLike = { code?: string; message?: string };

/**
 * Operator-facing error text. Ported from NER's `AuthContext` mapping and
 * extended for the credential errors the merged app can surface.
 */
export function describeAuthError(error: unknown): string {
  const err = error as FirebaseErrorLike | null | undefined;
  const code = err?.code ?? "";
  const fallback = err?.message || "Authentication failed. Please try again.";

  switch (code) {
    case "auth/configuration-not-found":
    case "auth/operation-not-allowed":
      return "This sign-in method is not enabled for the configured Firebase project. Enable it in Firebase Console → Authentication → Sign-in method.";
    case "auth/unauthorized-domain":
      return "This domain is not authorised in Firebase Console → Authentication → Settings → Authorized domains.";
    case "auth/popup-blocked":
      return "The browser blocked the Google sign-in popup. Allow popups for this site and retry.";
    case "auth/popup-closed-by-user":
    case "auth/cancelled-popup-request":
      return "Google sign-in was cancelled before it completed.";
    case "auth/invalid-credential":
    case "auth/wrong-password":
    case "auth/user-not-found":
      return "Those credentials are not recognised. Check the official e-mail and passphrase.";
    case "auth/invalid-email":
      return "That e-mail address is not valid.";
    case "auth/missing-password":
      return "Enter your passphrase to continue.";
    case "auth/too-many-requests":
      return "Too many attempts. The account is temporarily locked — try again shortly.";
    case "auth/user-disabled":
      return "This account has been disabled by the administrator.";
    case "auth/network-request-failed":
    case "auth/timeout":
      return "Network unreachable. Check the connection and retry — offline demo mode remains available.";
    case "auth/internal-error":
      return "The identity provider returned an unexpected response. Please retry.";
    default:
      return fallback;
  }
}
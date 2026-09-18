"use client";

/**
 * AuthContext — session lifecycle for the merged platform.
 * ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
 * Goals (Phase 3):
 *  • Real authentication (Firebase Auth: Google + e-mail/passphrase) — but
 *    without NER's startup cost, and without blocking public pages.
 *  • Sessions survive a reload (`browserLocalPersistence` +
 *    `onAuthStateChanged`), replacing NER's in-memory-only session.
 *  • Offline demo mode is preserved: with no Firebase project configured the
 *    app behaves exactly like sih did before, using the static demo personas.
 *
 * Startup contract:
 *  • Mounting this provider performs **no** network work and loads **no**
 *    Firebase code by itself.
 *  • A session is only reconciled when the `AUTH_HINT_KEY` marker says one may
 *    exist, and then only after the browser is idle — so first paint is never
 *    gated on auth.
 */

import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from "react";
import type { User as FirebaseUser } from "firebase/auth";
import type { UserRole } from "@/types";
import {
  AUTH_HINT_KEY,
  ROLE_STORAGE_KEY,
  USER_ROLES,
  isUserRole,
  roleFromServiceClaim,
} from "@/constants/roles";
import {
  describeAuthError,
  getFirebaseAuth,
  isFirebaseConfigured,
  loadAuthModule,
} from "@/lib/firebase";

export type AuthStatus = "restoring" | "authenticated" | "unauthenticated";
export type AuthProviderId = "google.com" | "password" | "demo";

export interface AuthIdentity {
  uid: string;
  displayName: string;
  email: string | null;
  photoURL: string | null;
  provider: AuthProviderId;
  emailVerified: boolean;
  role: UserRole;
  /** `true` when the identity came from Firebase, `false` in offline demo mode. */
  live: boolean;
  /** `true` when the role was pinned by a Firebase custom claim (cannot be switched). */
  roleFromClaim: boolean;
}

export interface AuthResult {
  success: boolean;
  identity?: AuthIdentity;
  error?: string;
}

export interface AuthContextValue {
  status: AuthStatus;
  identity: AuthIdentity | null;
  isFirebaseConfigured: boolean;
  /** Offline demo personas are only offered when Firebase is unavailable. */
  isDemoMode: boolean;
  isAuthenticating: boolean;
  authError: string | null;
  authNotice: string | null;
  signInWithGoogle: (role: UserRole) => Promise<AuthResult>;
  signInWithEmail: (email: string, password: string, role: UserRole) => Promise<AuthResult>;
  /** Offline/demo persona login — only honoured when Firebase is not configured. */
  signInDemo: (role: UserRole) => AuthResult;
  /** Switches the operational role within an existing session (ignored when a claim pins it). */
  changeRole: (role: UserRole) => AuthResult;
  signOutUser: () => Promise<void>;
  clearAuthError: () => void;
  clearAuthNotice: () => void;
}

export const DEFAULT_ROLE: UserRole = "Regular User";

/** 30 minutes of inactivity, matching NER's ProtectedRoute policy. */
const SESSION_TIMEOUT_MS = 30 * 60 * 1000;
const SESSION_CHECK_INTERVAL_MS = 60 * 1000;
const ACTIVITY_EVENTS = ["mousedown", "keydown", "scroll", "touchstart", "mousemove"] as const;

/* ------------------------------------------------------------------ storage */

function readStoredRole(): UserRole {
  if (typeof window === "undefined") return DEFAULT_ROLE;
  try {
    const stored = window.localStorage.getItem(ROLE_STORAGE_KEY);
    return isUserRole(stored) ? stored : DEFAULT_ROLE;
  } catch {
    return DEFAULT_ROLE;
  }
}

function persistRole(role: UserRole): void {
  try {
    window.localStorage.setItem(ROLE_STORAGE_KEY, role);
  } catch {
    /* storage disabled — session stays in memory for this tab */
  }
}

function hasAuthHint(): boolean {
  if (typeof window === "undefined") return false;
  try {
    return window.localStorage.getItem(AUTH_HINT_KEY) === "1";
  } catch {
    return false;
  }
}

function writeAuthHint(): void {
  try {
    window.localStorage.setItem(AUTH_HINT_KEY, "1");
  } catch {
    /* ignore */
  }
}

function clearAuthHint(): void {
  try {
    window.localStorage.removeItem(AUTH_HINT_KEY);
  } catch {
    /* ignore */
  }
}

/** Runs `cb` once the browser is idle, with a `setTimeout` fallback. */
function scheduleAfterPaint(cb: () => void): void {
  if (typeof window === "undefined") return;
  const ric = (window as Window & { requestIdleCallback?: (cb: () => void) => number })
    .requestIdleCallback;
  if (typeof ric === "function") {
    ric(cb);
    return;
  }
  window.setTimeout(cb, 0);
}

/** Local-storage key for the persisted offline demo persona (demo mode only). */
export const DEMO_IDENTITY_KEY = "ner_lifeline_demo_role";

function readDemoRole(): UserRole | null {
  if (typeof window === "undefined") return null;
  try {
    const stored = window.localStorage.getItem(DEMO_IDENTITY_KEY);
    return isUserRole(stored) ? stored : null;
  } catch {
    return null;
  }
}

function writeDemoRole(role: UserRole): void {
  try {
    window.localStorage.setItem(DEMO_IDENTITY_KEY, role);
  } catch {
    /* ignore */
  }
}

function clearDemoRole(): void {
  try {
    window.localStorage.removeItem(DEMO_IDENTITY_KEY);
  } catch {
    /* ignore */
  }
}

function makeDemoIdentity(role: UserRole): AuthIdentity {
  return {
    uid: `demo-${role.toLowerCase().replace(/\s+/g, "-")}`,
    displayName: `Demo ${role}`,
    email: null,
    photoURL: null,
    provider: "demo",
    emailVerified: false,
    role,
    live: false,
    roleFromClaim: false,
  };
}

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

/* -------------------------------------------------------------- provider */

export function AuthProvider({ children }: { children: ReactNode }) {
  const [identity, setIdentity] = useState<AuthIdentity | null>(null);
  // Always starts anonymous on both server and client so the first render is
  // identical (hydration-safe). Any persisted session is applied in the mount
  // effect below — after paint, never before it.
  const [status, setStatus] = useState<AuthStatus>("unauthenticated");
  const [isAuthenticating, setIsAuthenticating] = useState(false);
  const [authError, setAuthError] = useState<string | null>(null);
  const [authNotice, setAuthNotice] = useState<string | null>(null);

  const mountedRef = useRef(true);
  useEffect(() => {
    mountedRef.current = true;
    return () => {
      mountedRef.current = false;
    };
  }, []);

  const clearAuthError = useCallback(() => setAuthError(null), []);
  const clearAuthNotice = useCallback(() => setAuthNotice(null), []);

  const buildIdentity = useCallback(
    (
      fbUser: FirebaseUser,
      role: UserRole,
      roleFromClaim: boolean,
      provider?: AuthProviderId
    ): AuthIdentity => ({
      uid: fbUser.uid,
      displayName: fbUser.displayName || fbUser.email?.split("@")[0] || "Emergency Officer",
      email: fbUser.email,
      photoURL: fbUser.photoURL,
      provider: provider ?? (fbUser.providerData[0]?.providerId as AuthProviderId) ?? "password",
      emailVerified: fbUser.emailVerified,
      role,
      live: true,
      roleFromClaim,
    }),
    []
  );

  /**
   * Resolves the authoritative role for a live user.
   * A `role` custom claim (set by an operator via the Admin SDK / Console) wins;
   * otherwise the locally selected role is kept.
   */
  const resolveClaimRole = useCallback(async (fbUser: FirebaseUser) => {
    try {
      // Uses the already-cached ID token when unexpired → no extra network call.
      const token = await fbUser.getIdTokenResult();
      return roleFromServiceClaim(token.claims as Record<string, unknown>);
    } catch {
      return null;
    }
  }, []);

  const applyFirebaseUser = useCallback(
    async (fbUser: FirebaseUser | null) => {
      if (!mountedRef.current) return;
      if (!fbUser) {
        clearAuthHint();
        setIdentity(null);
        setStatus("unauthenticated");
        return;
      }
      const claimRole = await resolveClaimRole(fbUser);
      const role = claimRole ?? readStoredRole();
      if (claimRole) persistRole(claimRole);
      writeAuthHint();
      if (!mountedRef.current) return;
      setIdentity(buildIdentity(fbUser, role, Boolean(claimRole)));
      setStatus("authenticated");
    },
    [buildIdentity, resolveClaimRole]
  );

  /* ---- Session reconcile: deferred, storage-first, never blocking paint ---- */
  useEffect(() => {
    if (!isFirebaseConfigured) {
      // Offline demo mode: restore the persisted demo persona, if any.
      const demoRole = readDemoRole();
      if (demoRole) {
        setIdentity(makeDemoIdentity(demoRole));
        setStatus("authenticated");
      }
      return;
    }
    if (!hasAuthHint()) return; // anonymous visitor — never load the SDK
    setStatus("restoring");
    let cancelled = false;
    let unsubscribe: (() => void) | null = null;

    scheduleAfterPaint(() => {
      void (async () => {
        const [authModule, auth] = await Promise.all([loadAuthModule(), getFirebaseAuth()]);
        if (cancelled || !authModule || !auth) {
          if (!cancelled) setStatus("unauthenticated");
          return;
        }
        // The first callback fires from persisted local storage — no network.
        unsubscribe = authModule.onAuthStateChanged(auth, (fbUser) => {
          void applyFirebaseUser(fbUser);
        });
      })();
    });

    return () => {
      cancelled = true;
      unsubscribe?.();
    };
  }, [applyFirebaseUser]);

  // Lets the inactivity timer trigger sign-out without re-subscribing.
  const signOutRef = useRef<(() => Promise<void>) | null>(null);

  /* ---- Session timeout (30 min inactivity), active only while signed in ---- */
  useEffect(() => {
    if (status !== "authenticated") return;
    let lastActivity = Date.now();
    const resetTimer = () => {
      lastActivity = Date.now();
    };
    ACTIVITY_EVENTS.forEach((evt) => window.addEventListener(evt, resetTimer, { passive: true }));
    const timer = window.setInterval(() => {
      if (Date.now() - lastActivity > SESSION_TIMEOUT_MS) {
        setAuthNotice("Session expired after 30 minutes of inactivity. Please sign in again.");
        void signOutRef.current?.();
      }
    }, SESSION_CHECK_INTERVAL_MS);
    return () => {
      ACTIVITY_EVENTS.forEach((evt) => window.removeEventListener(evt, resetTimer));
      window.clearInterval(timer);
    };
  }, [status]);

  /* ------------------------------- actions -------------------------------- */

  const signInWithGoogle = useCallback(
    async (role: UserRole): Promise<AuthResult> => {
      setAuthError(null);
      setIsAuthenticating(true);
      try {
        const [authModule, auth] = await Promise.all([loadAuthModule(), getFirebaseAuth()]);
        if (!authModule || !auth) {
          const message = "Google Sign-In requires a configured Firebase project.";
          setAuthError(message);
          return { success: false, error: message };
        }
        const provider = new authModule.GoogleAuthProvider();
        provider.setCustomParameters({ prompt: "select_account" });
        provider.addScope("profile");
        provider.addScope("email");
        const result = await authModule.signInWithPopup(auth, provider);
        persistRole(role);
        await applyFirebaseUser(result.user);
        return { success: true };
      } catch (error) {
        const message = describeAuthError(error);
        if (mountedRef.current) setAuthError(message);
        return { success: false, error: message };
      } finally {
        if (mountedRef.current) setIsAuthenticating(false);
      }
    },
    [applyFirebaseUser]
  );

  const signInWithEmail = useCallback(
    async (email: string, password: string, role: UserRole): Promise<AuthResult> => {
      setAuthError(null);
      setIsAuthenticating(true);
      try {
        const [authModule, auth] = await Promise.all([loadAuthModule(), getFirebaseAuth()]);
        if (!authModule || !auth) {
          const message = "E-mail sign-in requires a configured Firebase project.";
          setAuthError(message);
          return { success: false, error: message };
        }
        const result = await authModule.signInWithEmailAndPassword(auth, email, password);
        persistRole(role);
        await applyFirebaseUser(result.user);
        return { success: true };
      } catch (error) {
        const message = describeAuthError(error);
        if (mountedRef.current) setAuthError(message);
        return { success: false, error: message };
      } finally {
        if (mountedRef.current) setIsAuthenticating(false);
      }
    },
    [applyFirebaseUser]
  );

  /**
   * Offline persona login. Only honoured while no Firebase project is
   * configured — this is sih's original behaviour, preserved verbatim so the
   * app remains fully demonstrable offline.
   */
  const signInDemo = useCallback((role: UserRole): AuthResult => {
    if (isFirebaseConfigured) {
      const message =
        "Demo access is disabled while a Firebase project is configured. Sign in with Google or your official credentials.";
      setAuthError(message);
      return { success: false, error: message };
    }
    const nextRole = isUserRole(role) ? role : DEFAULT_ROLE;
    persistRole(nextRole);
    writeDemoRole(nextRole);
    const demoIdentity = makeDemoIdentity(nextRole);
    setIdentity(demoIdentity);
    setStatus("authenticated");
    setAuthError(null);
    return { success: true, identity: demoIdentity };
  }, []);

  /** Switches the operational role inside an existing session. */
  const changeRole = useCallback(
    (role: UserRole): AuthResult => {
      if (!isUserRole(role)) return { success: false, error: "Unknown operational role." };
      if (identity?.roleFromClaim && identity.role !== role) {
        const message = `Your role is assigned by directory policy (${identity.role}) and cannot be changed locally.`;
        setAuthError(message);
        return { success: false, error: message };
      }
      persistRole(role);
      setIdentity((current) => (current ? { ...current, role } : current));
      return { success: true };
    },
    [identity]
  );

  const signOutUser = useCallback(async () => {
    try {
      const [authModule, auth] = await Promise.all([loadAuthModule(), getFirebaseAuth()]);
      if (authModule && auth) await authModule.signOut(auth);
    } catch {
      /* sign-out must always succeed locally, even offline */
    }
    clearAuthHint();
    clearDemoRole();
    setIdentity(null);
    setStatus("unauthenticated");
  }, []);

  useEffect(() => {
    signOutRef.current = signOutUser;
  }, [signOutUser]);

  const value = useMemo<AuthContextValue>(
    () => ({
      status,
      identity,
      isFirebaseConfigured,
      isDemoMode: !isFirebaseConfigured,
      isAuthenticating,
      authError,
      authNotice,
      signInWithGoogle,
      signInWithEmail,
      signInDemo,
      changeRole,
      signOutUser,
      clearAuthError,
      clearAuthNotice,
    }),
    [
      status,
      identity,
      isAuthenticating,
      authError,
      authNotice,
      signInWithGoogle,
      signInWithEmail,
      signInDemo,
      changeRole,
      signOutUser,
      clearAuthError,
      clearAuthNotice,
    ]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthContextValue {
  const context = useContext(AuthContext);
  if (!context) throw new Error("useAuth must be used within an AuthProvider");
  return context;
}
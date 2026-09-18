"use client";

import React, { useState } from "react";
import { useApp, DEMO_USERS } from "@/context/AppContext";
import { useAuth } from "@/context/AuthContext";
import { ROLE_STORAGE_KEY, USER_ROLES } from "@/constants/roles";
import { UserRole } from "@/types";
import {
  Lock,
  User,
  AlertCircle,
  X,
  Check,
  Loader2,
  ShieldCheck,
  WifiOff,
  KeyRound,
} from "lucide-react";

const GoogleIcon = () => (
  <svg className="w-4 h-4 shrink-0" viewBox="0 0 24 24" aria-hidden="true">
    <path fill="#4285F4" d="M23.745 12.27c0-.7-.06-1.4-.19-2.07H12v4.51h6.6c-.29 1.52-1.14 2.82-2.4 3.68v3.05h3.88c2.27-2.09 3.66-5.17 3.66-9.17z" />
    <path fill="#34A853" d="M12 24c3.24 0 5.95-1.08 7.93-2.91l-3.88-3.05c-1.08.72-2.45 1.16-4.05 1.16-3.12 0-5.77-2.1-6.72-4.93H1.26v3.15C3.25 21.37 7.32 24 12 24z" />
    <path fill="#FBBC05" d="M5.28 14.27c-.25-.72-.38-1.49-.38-2.27s.13-1.55.38-2.27V6.58H1.26C.46 8.16 0 9.97 0 12s.46 3.84 1.26 5.42l4.02-3.15z" />
    <path fill="#EA4335" d="M12 4.75c1.77 0 3.35.61 4.6 1.8l3.42-3.42C17.95 1.19 15.24 0 12 0 7.32 0 3.25 2.63 1.26 6.58l4.02 3.15c.95-2.83 3.6-4.98 6.72-4.98z" />
  </svg>
);

export function LoginModal() {
  const { isLoginModalOpen, setIsLoginModalOpen, login, currentUser } = useApp();
  const {
    isFirebaseConfigured,
    isDemoMode,
    isAuthenticating,
    authError,
    signInWithGoogle,
    signInWithEmail,
    clearAuthError,
  } = useAuth();

  const [selectedRole, setSelectedRole] = useState<UserRole>(currentUser.role || "Regular User");
  const [userId, setUserId] = useState("vikram.bora@aswc.gov.in");
  const [password, setPassword] = useState("");
  const [localError, setLocalError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  if (!isLoginModalOpen) return null;

  const close = () => {
    clearAuthError();
    setLocalError(null);
    setPassword("");
    setIsLoginModalOpen(false);
  };

  const handleSelectRole = (role: UserRole) => {
    setSelectedRole(role);
    // Live mode: remember the operator's pre-sign-in choice locally so a
    // reload keeps their selection. The server-side custom claim (if any)
    // still wins at session-apply time and pins the role after sign-in.
    try {
      localStorage.setItem(ROLE_STORAGE_KEY, role);
    } catch {
      /* storage unavailable — selection still applies to this attempt */
    }
    if (isDemoMode) {
      setUserId(DEMO_USERS[role].email);
      setPassword("••••••••••••");
    }
  };

  /** Offline demo mode — preserves sih's original persona sign-in exactly. */
  const handleDemoSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    setTimeout(() => {
      login(selectedRole);
      setIsSubmitting(false);
      close();
    }, 600);
  };

  /** Live mode — e-mail / passphrase against Firebase Auth. */
  const handleLiveSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLocalError(null);
    clearAuthError();

    if (!userId.trim() || !password.trim()) {
      setLocalError("Enter both your official e-mail and passphrase.");
      return;
    }
    setIsSubmitting(true);
    const result = await signInWithEmail(userId.trim(), password, selectedRole);
    setIsSubmitting(false);
    if (result.success) close();
  };

  /** Live mode — Google account chooser popup. */
  const handleGoogle = async () => {
    setLocalError(null);
    clearAuthError();
    setIsSubmitting(true);
    const result = await signInWithGoogle(selectedRole);
    setIsSubmitting(false);
    if (result.success) close();
  };

  const busy = isSubmitting || isAuthenticating;
  const errorText = localError ?? authError;
  const roleList: UserRole[] = [...USER_ROLES];

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-black/80 backdrop-blur-sm flex items-center justify-center p-4 animate-in fade-in duration-200">
      <div className="w-full max-w-md bg-slate-950 border border-slate-800 rounded-xl shadow-2xl p-6 relative">
        {/* Close Button */}
        <button
          onClick={close}
          aria-label="Close sign-in dialog"
          className="absolute top-4 right-4 text-slate-400 hover:text-white p-1 rounded-lg hover:bg-slate-800"
        >
          <X className="w-4 h-4" />
        </button>

        {/* Header */}
        <div className="text-center mb-6">
          <div className="w-12 h-12 rounded-xl bg-sky-600/20 border border-sky-500/30 flex items-center justify-center text-sky-400 mx-auto mb-3">
            <Lock className="w-6 h-6" />
          </div>
          <h2 className="text-lg font-black tracking-tight text-white">
            NER LOGISTICS INTELLIGENCE
          </h2>
          <p className="text-xs text-slate-400 mt-1">
            Regional Operations Access Gateway
          </p>
        </div>

        {/* Authentication Mode Banner */}
        <div
          className={`mb-4 flex items-center gap-2 px-3 py-2 rounded-lg border text-[11px] font-semibold ${
            isDemoMode
              ? "bg-amber-950/40 border-amber-800/60 text-amber-300"
              : "bg-emerald-950/40 border-emerald-800/60 text-emerald-300"
          }`}
        >
          {isDemoMode ? <WifiOff className="w-3.5 h-3.5" /> : <ShieldCheck className="w-3.5 h-3.5" />}
          <span>
            {isDemoMode
              ? "Offline demo mode — Firebase is not configured, so static demo personas are used."
              : "Live authentication — Firebase Auth (Google or departmental account)."}
          </span>
        </div>

        {/* Operational Role Selector */}
        <div className="mb-6 p-1 bg-slate-900 border border-slate-800 rounded-lg">
          <div className="text-[10px] uppercase font-bold text-slate-400 px-2 py-1 tracking-wider">
            {isDemoMode ? "Select Demo Account Profile:" : "Operational role for this session:"}
          </div>
          <div className="grid grid-cols-2 gap-1 mt-1">
            {roleList.map((role) => {
              const isSelected = selectedRole === role;
              return (
                <button
                  type="button"
                  key={role}
                  onClick={() => handleSelectRole(role)}
                  disabled={busy}
                  className={`px-2.5 py-1.5 rounded text-[11px] font-semibold text-left transition-colors flex items-center justify-between disabled:opacity-60 ${
                    isSelected
                      ? "bg-sky-600 text-white shadow-sm"
                      : "text-slate-300 hover:bg-slate-800"
                  }`}
                >
                  <span className="truncate">{role}</span>
                  {isSelected && <Check className="w-3 h-3 shrink-0 ml-1" />}
                </button>
              );
            })}
          </div>
        </div>

        {/* Error State */}
        {errorText && (
          <div
            role="alert"
            data-testid="auth-error"
            className="mb-4 flex items-start gap-2 p-3 rounded-lg bg-red-950/50 border border-red-800 text-[11px] text-red-200"
          >
            <AlertCircle className="w-3.5 h-3.5 shrink-0 mt-0.5 text-red-400" />
            <span className="leading-snug">{errorText}</span>
          </div>
        )}

        {/* Google Sign-In (live mode only) */}
        {isFirebaseConfigured && (
          <div className="mb-4">
            <button
              type="button"
              onClick={handleGoogle}
              disabled={busy}
              className="w-full flex items-center justify-center gap-2.5 py-2.5 rounded-lg bg-white hover:bg-slate-100 text-slate-900 font-bold text-xs transition-colors disabled:opacity-60 cursor-pointer shadow-lg"
            >
              {busy ? <Loader2 className="w-4 h-4 animate-spin" /> : <GoogleIcon />}
              CONTINUE WITH GOOGLE
            </button>
            <div className="flex items-center gap-2 my-4 text-[10px] uppercase font-bold text-slate-500 tracking-wider">
              <span className="flex-1 border-t border-slate-800" />
              or departmental credentials
              <span className="flex-1 border-t border-slate-800" />
            </div>
          </div>
        )}

        {/* Sign In Form */}
        <form onSubmit={isDemoMode ? handleDemoSubmit : handleLiveSubmit} className="space-y-4">
          <div>
            <label
              htmlFor="login-user-id"
              className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-1.5"
            >
              {isDemoMode ? "User ID" : "Official E-mail"}
            </label>
            <div className="relative">
              <input
                id="login-user-id"
                type="text"
                required
                autoComplete="username"
                value={userId}
                onChange={(e) => setUserId(e.target.value)}
                disabled={busy}
                className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-xs text-white focus:outline-none focus:border-sky-500 font-mono disabled:opacity-60"
                placeholder="official.email@gov.in"
              />
              <User className="w-4 h-4 text-slate-500 absolute right-3 top-2.5" />
            </div>
          </div>

          <div>
            <label
              htmlFor="login-password"
              className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-1.5"
            >
              {isDemoMode ? "Password" : "Passphrase"}
            </label>
            <div className="relative">
              <input
                id="login-password"
                type="password"
                required
                autoComplete="current-password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                disabled={busy}
                className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-xs text-white focus:outline-none focus:border-sky-500 disabled:opacity-60"
                placeholder="••••••••••••"
              />
              <KeyRound className="w-4 h-4 text-slate-500 absolute right-3 top-2.5" />
            </div>
          </div>

          <button
            type="submit"
            disabled={busy}
            className="w-full py-2.5 rounded-lg bg-sky-600 hover:bg-sky-500 text-white font-bold text-xs uppercase tracking-wider transition-all disabled:opacity-50 cursor-pointer shadow-lg shadow-sky-900/40 mt-2 flex items-center justify-center gap-2"
          >
            {busy && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
            {busy
              ? "Authenticating Session..."
              : isDemoMode
              ? "SIGN IN"
              : "SIGN IN WITH E-MAIL"}
          </button>
        </form>

        {/* sign-in probe hook: stable ids for automated auth-path checks. */}
        <div className="hidden" aria-hidden="true">
          <span data-testid="auth-mode">{isDemoMode ? "demo" : "live"}</span>
          {busy && <span data-testid="auth-busy">1</span>}
        </div>

        {/* Realistic Disclaimer & Privacy Note */}
        <div className="mt-6 pt-4 border-t border-slate-800 text-center">
          <p className="text-[11px] text-slate-400 font-medium">
            &ldquo;Authorized platform users only&rdquo;
          </p>
          <p className="text-[10px] text-slate-500 mt-1">
            Access to North Eastern interstate logistics and telemetry is subject to Indian Information Technology Act provisions.
          </p>
        </div>
      </div>
    </div>
  );
}

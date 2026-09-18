"use client";

/**
 * ProtectedRoute — authentication + authorisation guard.
 * ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
 * Ported from NER's `components/auth/ProtectedRoute.jsx` and adapted to the
 * merged app's architecture:
 *
 *  • NER guards **URL routes** (react-router `<Navigate>`); sih (BASE) is a
 *    single shell whose views are selected by `activeTab` state. This guard
 *    therefore protects **workspace tabs / panels** and renders an explanatory
 *    state instead of navigating, which keeps sih's navigation model intact
 *    (no URL churn, no lost in-app context).
 *  • The guard never blocks public content: it only decides what a *restricted*
 *    panel shows while the session is missing, restoring, or under-privileged.
 *  • Render states: restoring → verifying; anonymous → sign-in required;
 *    wrong role → restricted. All three are real, styled states instead of a
 *    blank screen or a silent redirect.
 */

import React, { type ReactNode } from "react";
import { Lock, LogIn, ShieldAlert, Loader2 } from "lucide-react";
import { useAuth } from "@/context/AuthContext";
import { getRoleDisplayName, requiredRolesForTab } from "@/constants/roles";
import type { UserRole } from "@/types";

export interface ProtectedRouteProps {
  children: ReactNode;
  /** Explicit allow-list. When omitted, `tab` is used to look one up. */
  allowedRoles?: readonly UserRole[];
  /** Workspace tab id, used to resolve the RBAC rule for the panel. */
  tab?: string;
  /** Human label shown in notices, e.g. "Regional Analytics". */
  label?: string;
  /**
   * Force the authentication requirement on (or off). Defaults to "on" whenever
   * `tab` or `allowedRoles` is supplied.
   */
  requireAuth?: boolean;
  /** Opens the sign-in surface (wired to the app shell). */
  onRequestSignIn?: () => void;
}

function GuardPanel({
  icon,
  tone,
  eyebrow,
  title,
  body,
  action,
}: {
  icon: ReactNode;
  tone: "amber" | "sky";
  eyebrow: string;
  title: string;
  body: string;
  action?: ReactNode;
}) {
  const tones = {
    amber: "bg-amber-950/60 border-amber-600/50 text-amber-400 shadow-amber-950/40",
    sky: "bg-sky-950/60 border-sky-600/50 text-sky-400 shadow-sky-950/40",
  } as const;

  return (
    <div className="flex-1 flex items-center justify-center p-6 bg-slate-950">
      <div className="w-full max-w-md p-8 rounded-2xl border border-slate-800 bg-slate-900/90 text-center shadow-2xl space-y-4">
        <div
          className={`w-14 h-14 rounded-2xl border flex items-center justify-center mx-auto shadow-lg ${tones[tone]}`}
        >
          {icon}
        </div>
        <div>
          <div className="text-[11px] font-bold uppercase tracking-widest mb-1 text-slate-400">
            {eyebrow}
          </div>
          <h2 className="text-lg font-black text-white">{title}</h2>
          <p className="text-xs text-slate-400 mt-2 leading-relaxed">{body}</p>
        </div>
        {action}
      </div>
    </div>
  );
}

export function ProtectedRoute({
  children,
  allowedRoles,
  tab,
  label,
  requireAuth,
  onRequestSignIn,
}: ProtectedRouteProps) {
  const { status, identity } = useAuth();

  const required = allowedRoles ?? (tab ? requiredRolesForTab(tab) : []);
  const needsAuth = requireAuth ?? Boolean(allowedRoles || tab);
  const surface = label ?? "This workspace";

  // Nothing to enforce — render straight through, never touching auth state.
  if (!needsAuth) return <>{children}</>;

  // A session may exist — reconcile is storage-only and completes within a frame
  // or two, so this state is deliberately short-lived.
  if (status === "restoring") {
    return (
      <GuardPanel
        tone="sky"
        icon={<Loader2 className="w-7 h-7 animate-spin" />}
        eyebrow="Verifying session"
        title="Restoring your credentials"
        body={`Confirming your authorisation for ${surface}…`}
      />
    );
  }

  if (!identity) {
    return (
      <GuardPanel
        tone="sky"
        icon={<LogIn className="w-7 h-7" />}
        eyebrow="Authentication required"
        title="Sign in to continue"
        body={`${surface} is available to authorised personnel only. Sign in with your official Google or department account.`}
        action={
          onRequestSignIn ? (
            <button
              onClick={onRequestSignIn}
              className="w-full py-2.5 rounded-lg bg-sky-600 hover:bg-sky-500 text-white font-bold text-xs uppercase tracking-wider transition-colors shadow-lg shadow-sky-900/40 cursor-pointer flex items-center justify-center gap-2"
            >
              <LogIn className="w-3.5 h-3.5" />
              Sign In
            </button>
          ) : undefined
        }
      />
    );
  }

  if (required.length > 0 && !required.includes(identity.role)) {
    return (
      <GuardPanel
        tone="amber"
        icon={<Lock className="w-7 h-7" />}
        eyebrow="Restricted workspace"
        title="Access not authorised"
        body={`${surface} is restricted to ${required.join(" / ")}. You are signed in as ${getRoleDisplayName(
          identity.role
        )}.`}
        action={
          <div className="p-3.5 rounded-lg bg-slate-950 border border-slate-800 text-xs text-left space-y-1">
            <div className="flex justify-between text-slate-400">
              <span>Authenticated as:</span>
              <span className="text-white font-medium truncate max-w-[180px]">
                {identity.displayName}
              </span>
            </div>
            <div className="flex justify-between text-slate-400">
              <span>Current role:</span>
              <span className="text-sky-400 font-semibold">{identity.role}</span>
            </div>
          </div>
        }
      />
    );
  }

  return <>{children}</>;
}

/** Compact banner form of the same guard notice, for inline surfaces. */
export function AccessRestrictedNotice({ tab, label }: { tab?: string; label?: string }) {
  const { identity } = useAuth();
  const required = tab ? requiredRolesForTab(tab) : [];
  return (
    <div className="flex items-center gap-2 p-3 rounded-lg border border-amber-800/60 bg-amber-950/40 text-[11px] text-amber-200">
      <ShieldAlert className="w-3.5 h-3.5 shrink-0 text-amber-400" />
      <span>
        {label ?? "This panel"} requires {required.join(" / ") || "elevated"} authorisation. Current
        role: {identity ? identity.role : "unauthenticated"}.
      </span>
    </div>
  );
}
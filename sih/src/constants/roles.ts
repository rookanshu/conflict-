/**
 * Role-Based Access Control matrix for the merged NER-LIFELINE platform.
 * ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
 * Two role vocabularies are reconciled here:
 *
 *  • sih (BASE) workspace roles — the operator-facing personas surfaced in the
 *    UI: `Regular User`, `Field Officer`, `Administrator`, `Emergency Commander`.
 *  • NER service roles — the canonical machine roles used by the FastAPI engine
 *    and by Firebase custom claims: `admin`, `logistics_manager`,
 *    `field_officer`, `driver`.
 *
 * `SERVICE_ROLE_TO_USER_ROLE` is the single translation point, so a Firebase
 * custom claim (set by an operator in the Firebase Console) deterministically
 * wins over any UI role selection.
 */

import type { UserRole } from "@/types";

/** Local-storage key inherited from NER so existing sessions keep their role. */
export const ROLE_STORAGE_KEY = "ner_lifeline_user_role";

/**
 * Lightweight "a session may exist" marker. Written on successful sign-in and
 * cleared on sign-out. It lets the app skip loading the Firebase SDK entirely
 * for anonymous visitors, so public pages never pay the auth cost.
 */
export const AUTH_HINT_KEY = "ner_lifeline_auth_hint";

export const USER_ROLES: readonly UserRole[] = [
  "Regular User",
  "Field Officer",
  "Administrator",
  "Emergency Commander",
] as const;

/** Roles that may open command-and-control surfaces. */
export const COMMAND_ROLES: readonly UserRole[] = ["Administrator", "Emergency Commander"] as const;

export function isUserRole(value: unknown): value is UserRole {
  return typeof value === "string" && (USER_ROLES as readonly string[]).includes(value);
}

/** NER's canonical service roles, as emitted by the engine / custom claims. */
export type ServiceRole = "admin" | "logistics_manager" | "field_officer" | "driver";

const SERVICE_ROLE_TO_USER_ROLE: Record<string, UserRole> = {
  admin: "Administrator",
  logistics_manager: "Regular User",
  field_officer: "Field Officer",
  driver: "Regular User",
  // Extension: the merged platform adds a dedicated disaster-response persona.
  emergency_commander: "Emergency Commander",
};

/** Translates a `role` custom claim into a workspace role, if it is recognised. */
export function roleFromServiceClaim(claims: Record<string, unknown> | undefined): UserRole | null {
  const raw = claims?.role;
  if (typeof raw !== "string") return null;
  return SERVICE_ROLE_TO_USER_ROLE[raw.trim().toLowerCase()] ?? null;
}

/**
 * Tab-level access. Tabs absent from this map are public (usable without a
 * session) — this mirrors sih's existing behaviour, where only Analytics was
 * hard-gated by role.
 */
export const TAB_ACCESS: Record<string, readonly UserRole[] | "public"> = {
  analytics: COMMAND_ROLES,
};

/**
 * Tabs that require a valid session but accept **any** operational role.
 * `emergency` is deliberately not role-restricted: sih's command surface is
 * unlocked by the privileged-identity verification step (OTP + biometric
 * simulation) rather than by persona, and narrowing it here would silently
 * remove an existing capability from Field Officers.
 */
export const AUTHENTICATED_TABS: readonly string[] = ["emergency"];

/** Tabs that additionally require the privileged identity verification step. */
export const PRIVILEGED_TABS: readonly string[] = ["emergency"];

/** True when `tab` may only be rendered for a signed-in operator. */
export function requiresAuthentication(tab: string): boolean {
  return isTabAccessRestricted(tab) || AUTHENTICATED_TABS.includes(tab);
}

export function isTabAccessRestricted(tab: string): boolean {
  return TAB_ACCESS[tab] !== undefined;
}

/** True when `role` may open `tab`. Unknown tabs are treated as public. */
export function canAccessTab(role: UserRole | null | undefined, tab: string): boolean {
  const rule = TAB_ACCESS[tab];
  if (rule === undefined || rule === "public") return true;
  if (!role) return false;
  return rule.includes(role);
}

/** Roles permitted for a tab (empty array when the tab is public/unrestricted). */
export function requiredRolesForTab(tab: string): readonly UserRole[] {
  const rule = TAB_ACCESS[tab];
  return rule === undefined || rule === "public" ? [] : rule;
}

export function requiresPrivilegedVerification(tab: string): boolean {
  return PRIVILEGED_TABS.includes(tab);
}

/** Human-readable persona label, used in guard notices and audit entries. */
export function getRoleDisplayName(role: UserRole): string {
  switch (role) {
    case "Administrator":
      return "State Command Administrator";
    case "Emergency Commander":
      return "Emergency Response Commander";
    case "Field Officer":
      return "Field Operations & Hazard Officer";
    default:
      return "Logistics Operator";
  }
}
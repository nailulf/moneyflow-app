import type { OnboardingDraft } from '@/lib/onboarding/build-draft'

/**
 * Persistence for the onboarding draft across a full-page OAuth redirect.
 *
 * The funnel draft normally lives only in the in-memory Zustand store
 * (`funnel-store.ts`). The email conversion path reads it and finalizes
 * in-process, so it never leaves the page. The OAuth path, however, hands the
 * browser to the provider and back via a full navigation — at which point the
 * in-memory store is gone. We therefore serialize the SAME draft the email path
 * builds into `sessionStorage` before `linkIdentity` redirects, then rehydrate
 * and finalize it once the user lands back authenticated.
 *
 * `sessionStorage` (not `localStorage`) is the right scope: the draft is only
 * meaningful for this conversion attempt in this tab, and we want it gone if the
 * user abandons and closes the tab. We still clear it explicitly after a
 * successful finalize so a refresh can't re-run conversion.
 */
const STORAGE_KEY = 'moneyflow:onboarding:pending-draft'

/** Marker appended to the OAuth `redirectTo` so the landing step knows to finalize. */
export const OAUTH_FINALIZE_PARAM = 'oauth_finalize'

interface PersistedEnvelope {
  v: 1
  draft: OnboardingDraft
}

/**
 * Serialize the draft to survive a full-page OAuth round-trip. No-op (returns
 * `false`) when storage is unavailable (SSR or privacy mode) — the caller can
 * still proceed; finalize just won't auto-run, matching pre-redirect behaviour.
 */
export function persistPendingDraft(draft: OnboardingDraft): boolean {
  try {
    if (typeof window === 'undefined' || !window.sessionStorage) return false
    const envelope: PersistedEnvelope = { v: 1, draft }
    window.sessionStorage.setItem(STORAGE_KEY, JSON.stringify(envelope))
    return true
  } catch {
    return false
  }
}

/**
 * Read back a persisted draft, or `null` if none / unparseable / wrong version.
 * Pure-ish: does not mutate storage (clearing is an explicit separate step so
 * finalize can clear only after it succeeds).
 */
export function readPendingDraft(): OnboardingDraft | null {
  try {
    if (typeof window === 'undefined' || !window.sessionStorage) return null
    const raw = window.sessionStorage.getItem(STORAGE_KEY)
    if (!raw) return null
    const parsed = JSON.parse(raw) as Partial<PersistedEnvelope>
    if (!parsed || parsed.v !== 1 || typeof parsed.draft !== 'object' || parsed.draft === null) {
      return null
    }
    return parsed.draft
  } catch {
    return null
  }
}

/** Drop the persisted draft. Safe to call when nothing is stored. */
export function clearPendingDraft(): void {
  try {
    if (typeof window === 'undefined' || !window.sessionStorage) return
    window.sessionStorage.removeItem(STORAGE_KEY)
  } catch {
    /* best-effort */
  }
}

/** Whether a pending draft is currently persisted. */
export function hasPendingDraft(): boolean {
  return readPendingDraft() !== null
}

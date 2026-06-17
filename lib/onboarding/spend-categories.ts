/**
 * Static spend categories shown in the guest onboarding spend screens.
 *
 * Guests no longer have DB-seeded categories (they write nothing financial
 * until registration), so the spend screens render from this fixed list keyed
 * by a stable `slug`. The `name` values are the canonical seeded category names
 * (post-migration 056/057) — at registration the finalize step maps each slug
 * back to its name to find-or-create the real category. Icons/tints come from
 * lib/category-style.ts via the name (EXACT_OVERRIDES already covers these five).
 */
export interface OnboardingSpendCategory {
  /** Stable key used in the funnel-store draft. */
  slug: string
  /** Canonical category name — MUST match the seed + estimateSpend ratios. */
  name: string
}

export const ONBOARDING_SPEND_CATEGORIES: OnboardingSpendCategory[] = [
  { slug: 'housing',   name: 'Housing & rent' },
  { slug: 'food',      name: 'Food & groceries' },
  { slug: 'transport', name: 'Transport' },
  { slug: 'bills',     name: 'Bills & subscriptions' },
  { slug: 'lifestyle', name: 'Lifestyle & fun' },
]

export const SPEND_SLUG_TO_NAME: Record<string, string> = Object.fromEntries(
  ONBOARDING_SPEND_CATEGORIES.map((c) => [c.slug, c.name]),
)

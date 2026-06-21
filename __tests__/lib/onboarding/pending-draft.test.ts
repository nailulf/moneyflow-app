// __tests__/lib/onboarding/pending-draft.test.ts
import {
  persistPendingDraft,
  readPendingDraft,
  clearPendingDraft,
  hasPendingDraft,
  OAUTH_FINALIZE_PARAM,
} from '@/lib/onboarding/pending-draft'
import type { OnboardingDraft } from '@/lib/onboarding/build-draft'

const STORAGE_KEY = 'moneyflow:onboarding:pending-draft'

const draft: OnboardingDraft = {
  goal: {
    goal_type: 'emergency_fund',
    name: 'Emergency Fund',
    target_amount: 30_000_000,
    target_date: '2026-12-17',
  },
  allocations: [
    { name: 'Housing & rent', amount: 3_000_000 },
    { name: 'Savings transfer', amount: 1_000_000 },
  ],
  period: 'monthly',
}

describe('pending-draft (OAuth draft survival)', () => {
  beforeEach(() => {
    window.sessionStorage.clear()
  })

  it('round-trips a draft through sessionStorage byte-for-byte', () => {
    expect(persistPendingDraft(draft)).toBe(true)
    expect(readPendingDraft()).toEqual(draft)
    expect(hasPendingDraft()).toBe(true)
  })

  it('clearPendingDraft removes the persisted draft', () => {
    persistPendingDraft(draft)
    clearPendingDraft()
    expect(readPendingDraft()).toBeNull()
    expect(hasPendingDraft()).toBe(false)
  })

  it('returns null when nothing is stored', () => {
    expect(readPendingDraft()).toBeNull()
    expect(hasPendingDraft()).toBe(false)
  })

  it('returns null for unparseable JSON', () => {
    window.sessionStorage.setItem(STORAGE_KEY, '{not json')
    expect(readPendingDraft()).toBeNull()
  })

  it('returns null for a wrong/unknown envelope version', () => {
    window.sessionStorage.setItem(
      STORAGE_KEY,
      JSON.stringify({ v: 2, draft }),
    )
    expect(readPendingDraft()).toBeNull()
  })

  it('returns null when the envelope has no draft object', () => {
    window.sessionStorage.setItem(STORAGE_KEY, JSON.stringify({ v: 1, draft: null }))
    expect(readPendingDraft()).toBeNull()
  })

  it('exposes a stable finalize-marker param name', () => {
    expect(OAUTH_FINALIZE_PARAM).toBe('oauth_finalize')
  })
})

import { computeGoalWaterfall } from '@/lib/goals/waterfall'

const g = (over: Partial<any>) => ({
  id: 'g', account_id: 'a', name: 'n', goal_type: 'emergency_fund',
  target_amount: 0, target_date: '2026-12-31', status: 'active',
  created_at: '2026-01-01T00:00:00Z', updated_at: '2026-01-01T00:00:00Z', ...over,
}) as any

describe('computeGoalWaterfall', () => {
  it('fills the earliest-deadline goal first, next gets the remainder', () => {
    const goals = [
      g({ id: 'late', target_amount: 15_000_000, target_date: '2026-12-31' }),
      g({ id: 'early', target_amount: 30_000_000, target_date: '2026-06-30' }),
    ]
    const r = computeGoalWaterfall(15_370_000, goals)
    expect(r.map((x) => x.goal.id)).toEqual(['early', 'late']) // sorted by deadline
    expect(r[0].saved).toBe(15_370_000)      // early gets all (< its 30M target)
    expect(r[0].isCompleted).toBe(false)
    expect(r[1].saved).toBe(0)               // late gets nothing until early is full
  })

  it('overflows to the next goal once the first is fully funded', () => {
    const goals = [
      g({ id: 'a1', target_amount: 10_000_000, target_date: '2026-06-30' }),
      g({ id: 'a2', target_amount: 10_000_000, target_date: '2026-09-30' }),
    ]
    const r = computeGoalWaterfall(13_000_000, goals)
    expect(r[0].saved).toBe(10_000_000); expect(r[0].isCompleted).toBe(true)
    expect(r[1].saved).toBe(3_000_000); expect(r[1].isCompleted).toBe(false)
  })

  it('clamps a goal to its target (no over-fill) and breaks ties by created_at', () => {
    const goals = [
      g({ id: 'newer', target_amount: 5_000_000, target_date: '2026-06-30', created_at: '2026-02-01T00:00:00Z' }),
      g({ id: 'older', target_amount: 5_000_000, target_date: '2026-06-30', created_at: '2026-01-01T00:00:00Z' }),
    ]
    const r = computeGoalWaterfall(7_000_000, goals)
    expect(r.map((x) => x.goal.id)).toEqual(['older', 'newer'])
    expect(r[0].saved).toBe(5_000_000)   // older filled first, capped at target
    expect(r[1].saved).toBe(2_000_000)
  })

  it('excludes non-active goals', () => {
    const goals = [g({ id: 'done', status: 'completed', target_amount: 1 })]
    expect(computeGoalWaterfall(100, goals)).toEqual([])
  })

  it('handles zero/negative balance', () => {
    const r = computeGoalWaterfall(0, [g({ id: 'x', target_amount: 100, target_date: '2026-06-30' })])
    expect(r[0].saved).toBe(0)
  })
})

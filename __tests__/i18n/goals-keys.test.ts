import en from '@/messages/en.json'
import id from '@/messages/id.json'

const REQUIRED = [
  'sectionTitle',
  'seeAll',
  'add',
  'empty.title',
  'empty.cta',
  'create.title',
  'create.subtitle',
  'create.name',
  'create.type',
  'create.account',
  'create.accountPlaceholder',
  'create.amount',
  'create.date',
  'create.month',
  'create.year',
  'create.submit',
  'success.title',
  'success.subtitle',
  'success.viewGoal',
  'success.backToAccount',
  'card.tercapai',
  'card.onTrack',
  'card.behind',
  'list.totalTitle',
  'list.activeCount',
  'detail.title',
  'detail.remaining',
  'detail.feasibleOnTrack',
  'detail.feasibleBehind',
  'insights.accelerateTitle',
  'insights.accelerateBody',
  'insights.streakTitle',
  'insights.streakBody',
  'types.emergency_fund',
  'types.vacation',
  'types.house_down_payment',
  'types.car_purchase',
  'types.education',
  'types.wedding',
  'types.investment',
  'types.other',
  'types.debt_payoff',
  'types.gadget',
]

const get = (o: any, p: string) => p.split('.').reduce((a, k) => (a == null ? a : a[k]), o)

describe('goals i18n', () => {
  it.each(REQUIRED)('en goals.%s', (p) => expect(typeof get((en as any).goals, p)).toBe('string'))
  it.each(REQUIRED)('id goals.%s', (p) => expect(typeof get((id as any).goals, p)).toBe('string'))
})

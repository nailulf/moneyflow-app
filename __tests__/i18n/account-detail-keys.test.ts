import en from '@/messages/en.json'
import id from '@/messages/id.json'

const REQUIRED = [
  'header.back',
  'hero.currentBalance',
  'trend.title',
  'trend.subtitle',
  'trend.changeBadge',
  'menu.edit',
  'menu.export',
  'menu.delete',
  'adjustDialog.willAdd',
  'adjustDialog.willRemove',
  'adjustDialog.infoBanner',
  'adjustDialog.save',
]

function get(obj: any, path: string) {
  return path.split('.').reduce((o, k) => (o == null ? undefined : o[k]), obj)
}

describe('accountDetail i18n', () => {
  it.each(REQUIRED)('en defines accountDetail.%s', (p) => {
    expect(typeof get((en as any).accountDetail, p)).toBe('string')
  })
  it.each(REQUIRED)('id defines accountDetail.%s', (p) => {
    expect(typeof get((id as any).accountDetail, p)).toBe('string')
  })
})

import { getRequestConfig } from 'next-intl/server'
import { cookies } from 'next/headers'

const SUPPORTED_LOCALES = ['en', 'id'] as const
export type SupportedLocale = typeof SUPPORTED_LOCALES[number]

export default getRequestConfig(async () => {
  const cookieStore = await cookies()
  const raw = cookieStore.get('MONEYFLOW_LOCALE')?.value ?? 'en'
  const locale: SupportedLocale = (SUPPORTED_LOCALES as readonly string[]).includes(raw)
    ? (raw as SupportedLocale)
    : 'en'

  return {
    locale,
    messages: (await import(`../messages/${locale}.json`)).default,
  }
})

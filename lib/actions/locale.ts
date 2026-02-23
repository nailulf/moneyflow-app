'use server'

import { cookies } from 'next/headers'

export type SupportedLocale = 'en' | 'id'

export async function setLocaleCookie(locale: SupportedLocale) {
  const cookieStore = await cookies()
  cookieStore.set('MONEYFLOW_LOCALE', locale, {
    path: '/',
    maxAge: 60 * 60 * 24 * 365, // 1 year
    sameSite: 'lax',
  })
}

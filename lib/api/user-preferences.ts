import { createClient } from '@/lib/supabase/client'
import { UserSettings, UserSettingsUpdate } from '@/types/database'

// Internal: fetch all settings in one query
async function getSettings(userId: string): Promise<UserSettings | null> {
  const { data, error } = await createClient()
    .from('user_settings')
    .select('*')
    .eq('user_id', userId)
    .single()

  if (error) {
    if (error.code === 'PGRST116') return null // no row yet
    console.error('Error fetching user settings:', error)
    throw new Error('Failed to fetch user settings')
  }

  return data
}

// Internal: upsert one or more columns (creates row if not exists)
async function upsertSettings(userId: string, updates: UserSettingsUpdate): Promise<void> {
  const { error } = await createClient()
    .from('user_settings')
    .upsert({ user_id: userId, ...updates, updated_at: new Date().toISOString() })

  if (error) {
    console.error('Error updating user settings:', error)
    throw new Error('Failed to update user settings')
  }
}

// Public API — same method signatures as before, no callsite changes needed
export const preferences = {
  async getLanguage(userId: string): Promise<'en' | 'id'> {
    const s = await getSettings(userId)
    return (s?.language as 'en' | 'id') || 'en'
  },

  async setLanguage(userId: string, language: 'en' | 'id'): Promise<void> {
    await upsertSettings(userId, { language })
  },

  async getCurrency(userId: string): Promise<string> {
    const s = await getSettings(userId)
    return s?.default_currency || 'IDR'
  },

  async setCurrency(userId: string, currency: string): Promise<void> {
    await upsertSettings(userId, { default_currency: currency })
  },

  async getTheme(userId: string): Promise<'light' | 'dark' | 'system'> {
    const s = await getSettings(userId)
    return (s?.theme as 'light' | 'dark' | 'system') || 'system'
  },

  async setTheme(userId: string, theme: 'light' | 'dark' | 'system'): Promise<void> {
    await upsertSettings(userId, { theme })
  },

  async getNotificationSettings(userId: string): Promise<Record<string, boolean>> {
    const s = await getSettings(userId)
    return (s?.notification_settings as Record<string, boolean>) || {
      email: true,
      push: true,
      budget_alerts: true,
      transaction_alerts: false
    }
  },

  async setNotificationSettings(userId: string, settings: Record<string, boolean>): Promise<void> {
    await upsertSettings(userId, { notification_settings: settings })
  },

  async getBudgetAlerts(userId: string): Promise<{ enabled: boolean; threshold: number }> {
    const s = await getSettings(userId)
    return { enabled: true, threshold: s?.budget_alert_threshold ?? 80 }
  },

  async setBudgetAlerts(userId: string, alerts: { enabled: boolean; threshold: number }): Promise<void> {
    await upsertSettings(userId, { budget_alert_threshold: alerts.threshold })
  },

  async getCountry(userId: string): Promise<string> {
    const s = await getSettings(userId)
    return s?.country || 'Indonesia'
  },

  async setCountry(userId: string, country: string): Promise<void> {
    await upsertSettings(userId, { country })
  },

  async getUserGoal(userId: string): Promise<string | null> {
    const s = await getSettings(userId)
    return s?.user_goal || null
  },

  async setUserGoal(userId: string, goal: string): Promise<void> {
    await upsertSettings(userId, { user_goal: goal })
  },

  async getActivationBannerDismissedAt(userId: string): Promise<string | null> {
    const s = await getSettings(userId)
    return s?.activation_banner_dismissed_at || null
  },

  async dismissActivationBanner(userId: string): Promise<void> {
    await upsertSettings(userId, { activation_banner_dismissed_at: new Date().toISOString() })
  },

  async resetActivationBannerDismissed(userId: string): Promise<void> {
    await upsertSettings(userId, { activation_banner_dismissed_at: null })
  },
}

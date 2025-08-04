import { getSupabaseClient } from '@/lib/supabase'
import { UserPreference } from '@/types/database'

// Get a specific user preference
export async function getUserPreference<T = unknown>(
  userId: string, 
  key: string
): Promise<T | null> {
  const { data, error } = await getSupabaseClient()
    .from('user_preferences')
    .select('preference_value')
    .eq('user_id', userId)
    .eq('preference_key', key)
    .single()

  if (error) {
    if (error.code === 'PGRST116') {
      // No rows returned - preference doesn't exist
      return null
    }
    console.error('Error fetching user preference:', error)
    throw new Error('Failed to fetch user preference')
  }

  return data?.preference_value || null
}

// Get all user preferences
export async function getAllUserPreferences(userId: string): Promise<Record<string, unknown>> {
  const { data, error } = await getSupabaseClient()
    .from('user_preferences')
    .select('preference_key, preference_value')
    .eq('user_id', userId)

  if (error) {
    console.error('Error fetching user preferences:', error)
    throw new Error('Failed to fetch user preferences')
  }

  const preferences: Record<string, unknown> = {}
  data?.forEach((pref: { preference_key: string; preference_value: unknown }) => {
    preferences[pref.preference_key] = pref.preference_value
  })

  return preferences
}

// Set a user preference
export async function setUserPreference<T = unknown>(
  userId: string,
  key: string,
  value: T
): Promise<UserPreference> {
  const { data, error } = await getSupabaseClient()
    .from('user_preferences')
    .upsert({
      user_id: userId,
      preference_key: key,
      preference_value: value,
      updated_at: new Date().toISOString()
    })
    .select()
    .single()

  if (error) {
    console.error('Error setting user preference:', error)
    throw new Error('Failed to set user preference')
  }

  return data
}

// Delete a user preference
export async function deleteUserPreference(userId: string, key: string): Promise<void> {
  const { error } = await getSupabaseClient()
    .from('user_preferences')
    .delete()
    .eq('user_id', userId)
    .eq('preference_key', key)

  if (error) {
    console.error('Error deleting user preference:', error)
    throw new Error('Failed to delete user preference')
  }
}

// Predefined preference keys
export const PREFERENCE_KEYS = {
  DEFAULT_CURRENCY: 'default_currency',
  THEME: 'theme',
  LANGUAGE: 'language',
  NOTIFICATION_SETTINGS: 'notification_settings',
  BUDGET_ALERTS: 'budget_alerts',
  CATEGORY_GROUPS: 'category_groups',
  DASHBOARD_LAYOUT: 'dashboard_layout'
} as const

export type PreferenceKey = typeof PREFERENCE_KEYS[keyof typeof PREFERENCE_KEYS]

// Type-safe preference getters and setters
export const preferences = {
  async getCurrency(userId: string): Promise<string> {
    return await getUserPreference(userId, PREFERENCE_KEYS.DEFAULT_CURRENCY) || 'USD'
  },

  async setCurrency(userId: string, currency: string): Promise<void> {
    await setUserPreference(userId, PREFERENCE_KEYS.DEFAULT_CURRENCY, currency)
  },

  async getTheme(userId: string): Promise<'light' | 'dark' | 'system'> {
    return await getUserPreference(userId, PREFERENCE_KEYS.THEME) || 'system'
  },

  async setTheme(userId: string, theme: 'light' | 'dark' | 'system'): Promise<void> {
    await setUserPreference(userId, PREFERENCE_KEYS.THEME, theme)
  },

  async getNotificationSettings(userId: string): Promise<Record<string, boolean>> {
    return await getUserPreference(userId, PREFERENCE_KEYS.NOTIFICATION_SETTINGS) || {
      email: true,
      push: true,
      budget_alerts: true,
      transaction_alerts: false
    }
  },

  async setNotificationSettings(userId: string, settings: Record<string, boolean>): Promise<void> {
    await setUserPreference(userId, PREFERENCE_KEYS.NOTIFICATION_SETTINGS, settings)
  },

  async getBudgetAlerts(userId: string): Promise<{ enabled: boolean; threshold: number }> {
    return await getUserPreference(userId, PREFERENCE_KEYS.BUDGET_ALERTS) || {
      enabled: true,
      threshold: 80 // 80% of budget
    }
  },

  async setBudgetAlerts(userId: string, alerts: { enabled: boolean; threshold: number }): Promise<void> {
    await setUserPreference(userId, PREFERENCE_KEYS.BUDGET_ALERTS, alerts)
  }
}
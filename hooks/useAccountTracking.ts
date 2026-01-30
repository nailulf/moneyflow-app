import { useCallback } from 'react';
import { useAnalytics } from './useAnalytics';
import type { AccountDB } from '@/types/database';

export function useAccountTracking() {
  const { trackEvent } = useAnalytics();

  const trackAccountCreated = useCallback((
    account: AccountDB,
    source: 'onboarding' | 'settings' | 'quick_add' = 'settings'
  ) => {
    trackEvent('account_created', {
      account_id: account.id,
      account_type: account.type,
      account_name: account.name,
      is_default: account.is_default,
      initial_balance: account.balance,
      source,
      timestamp: new Date().toISOString()
    });
  }, [trackEvent]);

  const trackAccountUpdated = useCallback((
    accountId: string,
    fieldsChanged: string[],
    accountType?: string
  ) => {
    trackEvent('account_updated', {
      account_id: accountId,
      fields_changed: fieldsChanged,
      account_type: accountType,
      timestamp: new Date().toISOString()
    });
  }, [trackEvent]);

  const trackAccountDeleted = useCallback((
    account: { id: string; type: string; name: string }
  ) => {
    trackEvent('account_deleted', {
      account_id: account.id,
      account_type: account.type,
      account_name: account.name,
      timestamp: new Date().toISOString()
    });
  }, [trackEvent]);

  const trackAccountViewed = useCallback((
    accountId: string,
    accountType: string
  ) => {
    trackEvent('account_viewed', {
      account_id: accountId,
      account_type: accountType,
      timestamp: new Date().toISOString()
    });
  }, [trackEvent]);

  return {
    trackAccountCreated,
    trackAccountUpdated,
    trackAccountDeleted,
    trackAccountViewed
  };
}

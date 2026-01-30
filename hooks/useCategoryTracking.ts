import { useCallback } from 'react';
import { useAnalytics } from './useAnalytics';
import type { CategoryDB } from '@/types/database';

export function useCategoryTracking() {
  const { trackEvent } = useAnalytics();

  const trackCategoryCreated = useCallback((
    category: CategoryDB,
    source: 'onboarding' | 'settings' | 'transaction_form' = 'settings'
  ) => {
    trackEvent('category_created', {
      category_id: category.id,
      category_name: category.name,
      group_type: category.group_type,
      is_custom: category.is_custom,
      source,
      timestamp: new Date().toISOString()
    });
  }, [trackEvent]);

  const trackCategoryUpdated = useCallback((
    categoryId: string,
    previousName: string,
    newName: string,
    groupType?: string
  ) => {
    trackEvent('category_updated', {
      category_id: categoryId,
      previous_name: previousName,
      new_name: newName,
      group_type: groupType,
      timestamp: new Date().toISOString()
    });
  }, [trackEvent]);

  const trackCategoryDeleted = useCallback((
    category: { id: string; name: string; group_type: string }
  ) => {
    trackEvent('category_deleted', {
      category_id: category.id,
      category_name: category.name,
      group_type: category.group_type,
      timestamp: new Date().toISOString()
    });
  }, [trackEvent]);

  const trackCategoryAssigned = useCallback((
    categoryId: string,
    categoryName: string,
    transactionId: string,
    source: 'manual' | 'bulk' | 'auto_suggest' = 'manual'
  ) => {
    trackEvent('category_assigned', {
      category_id: categoryId,
      category_name: categoryName,
      transaction_id: transactionId,
      source,
      timestamp: new Date().toISOString()
    });
  }, [trackEvent]);

  return {
    trackCategoryCreated,
    trackCategoryUpdated,
    trackCategoryDeleted,
    trackCategoryAssigned
  };
}

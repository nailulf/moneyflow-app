import { useCallback } from 'react';
import { useAnalytics } from './useAnalytics';
import type { Database } from '@/types/database';

type Transaction = Database['public']['Tables']['transactions']['Row'];

export function useTransactionTracking() {
  const { trackEvent } = useAnalytics();

  const trackTransactionCreated = useCallback((
    transaction: Transaction,
    source: 'manual' | 'upload' | 'import',
    categoryName?: string // Optional category name if available
  ) => {
    trackEvent('transaction_created', {
      source,
      amount: transaction.amount,
      category_id: transaction.category_id,
      category_name: categoryName || 'unknown',
      has_merchant: !!transaction.merchant,
      transaction_type: transaction.type, // INCOME, EXPENSE, TRANSFER
      account_id: transaction.account_id,
    });
  }, [trackEvent]);

  const trackTransactionUpdated = useCallback((
    transactionId: string,
    fieldsChanged: string[],
    previousCategory?: string,
    newCategory?: string
  ) => {
    trackEvent('transaction_updated', {
      transaction_id: transactionId,
      fields_changed: fieldsChanged,
      previous_category: previousCategory,
      new_category: newCategory
    });
  }, [trackEvent]);

  const trackTransactionDeleted = useCallback((
    transaction: Transaction
  ) => {
    trackEvent('transaction_deleted', {
      transaction_id: transaction.id,
      amount: transaction.amount,
      category_id: transaction.category_id,
      transaction_type: transaction.type
    });
  }, [trackEvent]);

  const trackBulkAction = useCallback((
    action: 'delete' | 'categorize' | 'export',
    transactionCount: number,
    categoriesAffected?: string[]
  ) => {
    trackEvent('transaction_bulk_action', {
      action,
      transaction_count: transactionCount,
      categories_affected: categoriesAffected
    });
  }, [trackEvent]);

  return {
    trackTransactionCreated,
    trackTransactionUpdated,
    trackTransactionDeleted,
    trackBulkAction
  };
}

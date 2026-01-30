import { useCallback } from 'react';
import { useAnalytics } from './useAnalytics';
import type { BudgetDB } from '@/types/database';

export function useBudgetTracking() {
  const { trackEvent } = useAnalytics();

  const trackBudgetCreated = useCallback((
    budget: BudgetDB,
    source: 'onboarding' | 'settings' | 'template' = 'settings',
    templateName?: string
  ) => {
    trackEvent('budget_created', {
      budget_id: budget.id,
      budget_name: budget.name,
      period: budget.period,
      total_amount: budget.total_amount,
      source,
      template_name: templateName,
      timestamp: new Date().toISOString()
    });
  }, [trackEvent]);

  const trackBudgetUpdated = useCallback((
    budgetId: string,
    fieldsChanged: string[],
    previousAmount?: number,
    newAmount?: number
  ) => {
    trackEvent('budget_updated', {
      budget_id: budgetId,
      fields_changed: fieldsChanged,
      previous_amount: previousAmount,
      new_amount: newAmount,
      timestamp: new Date().toISOString()
    });
  }, [trackEvent]);

  const trackBudgetDeleted = useCallback((
    budget: { id: string; name: string; period: string }
  ) => {
    trackEvent('budget_deleted', {
      budget_id: budget.id,
      budget_name: budget.name,
      period: budget.period,
      timestamp: new Date().toISOString()
    });
  }, [trackEvent]);

  const trackBudgetCategoryAllocated = useCallback((
    budgetId: string,
    categoryId: string,
    categoryName: string,
    allocatedAmount: number
  ) => {
    trackEvent('budget_category_allocated', {
      budget_id: budgetId,
      category_id: categoryId,
      category_name: categoryName,
      allocated_amount: allocatedAmount,
      timestamp: new Date().toISOString()
    });
  }, [trackEvent]);

  const trackBudgetThresholdReached = useCallback((
    budgetId: string,
    budgetName: string,
    threshold: number, // percentage (e.g., 80, 100)
    currentSpent: number,
    totalBudget: number
  ) => {
    trackEvent('budget_threshold_reached', {
      budget_id: budgetId,
      budget_name: budgetName,
      threshold_percentage: threshold,
      current_spent: currentSpent,
      total_budget: totalBudget,
      spent_percentage: (currentSpent / totalBudget) * 100,
      timestamp: new Date().toISOString()
    });
  }, [trackEvent]);

  return {
    trackBudgetCreated,
    trackBudgetUpdated,
    trackBudgetDeleted,
    trackBudgetCategoryAllocated,
    trackBudgetThresholdReached
  };
}

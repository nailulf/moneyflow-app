import { useCallback, useEffect, useRef } from 'react';
import { usePathname, useSearchParams } from 'next/navigation';
import { useAnalytics } from './useAnalytics';

export function useNavigationTracking() {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const { trackEvent } = useAnalytics();
  const previousPathRef = useRef<string | null>(null);

  // Track page navigation
  useEffect(() => {
    if (previousPathRef.current !== pathname) {
      trackEvent('page_navigated', {
        from_page: previousPathRef.current,
        to_page: pathname,
        search_params: searchParams?.toString() || null,
        timestamp: new Date().toISOString()
      });
      previousPathRef.current = pathname;
    }
  }, [pathname, searchParams, trackEvent]);

  const trackSidebarNavigation = useCallback((
    itemName: string,
    itemUrl: string
  ) => {
    trackEvent('sidebar_navigation_clicked', {
      item_name: itemName,
      item_url: itemUrl,
      current_page: pathname,
      timestamp: new Date().toISOString()
    });
  }, [trackEvent, pathname]);

  const trackTabChange = useCallback((
    tabName: string,
    tabGroup?: string
  ) => {
    trackEvent('tab_changed', {
      tab_name: tabName,
      tab_group: tabGroup,
      current_page: pathname,
      timestamp: new Date().toISOString()
    });
  }, [trackEvent, pathname]);

  const trackModalOpened = useCallback((
    modalName: string,
    trigger?: string
  ) => {
    trackEvent('modal_opened', {
      modal_name: modalName,
      trigger,
      current_page: pathname,
      timestamp: new Date().toISOString()
    });
  }, [trackEvent, pathname]);

  const trackModalClosed = useCallback((
    modalName: string,
    action?: 'submitted' | 'cancelled' | 'dismissed'
  ) => {
    trackEvent('modal_closed', {
      modal_name: modalName,
      close_action: action,
      current_page: pathname,
      timestamp: new Date().toISOString()
    });
  }, [trackEvent, pathname]);

  const trackFilterApplied = useCallback((
    filterType: string,
    filterValue: string | string[],
    context?: string
  ) => {
    trackEvent('filter_applied', {
      filter_type: filterType,
      filter_value: Array.isArray(filterValue) ? filterValue.join(',') : filterValue,
      context,
      current_page: pathname,
      timestamp: new Date().toISOString()
    });
  }, [trackEvent, pathname]);

  const trackSearchPerformed = useCallback((
    searchQuery: string,
    resultsCount: number,
    searchContext?: string
  ) => {
    trackEvent('search_performed', {
      search_query: searchQuery,
      results_count: resultsCount,
      search_context: searchContext,
      current_page: pathname,
      timestamp: new Date().toISOString()
    });
  }, [trackEvent, pathname]);

  return {
    trackSidebarNavigation,
    trackTabChange,
    trackModalOpened,
    trackModalClosed,
    trackFilterApplied,
    trackSearchPerformed
  };
}

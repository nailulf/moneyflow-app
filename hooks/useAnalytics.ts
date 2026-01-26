import { useCallback } from 'react';
import { Analytics } from '@/lib/analytics/amplitude';

export function useAnalytics() {
  const trackEvent = useCallback((
    eventName: string,
    properties?: Record<string, any>
  ) => {
    Analytics.track(eventName, properties);
  }, []);

  const trackPageView = useCallback((pageName: string) => {
    Analytics.track('page_viewed', {
      page_name: pageName,
      timestamp: new Date().toISOString()
    });
  }, []);

  const trackUserProperty = useCallback((
    property: string,
    value: any
  ) => {
    Analytics.setUserProperties({ [property]: value });
  }, []);

  const trackClick = useCallback((
    elementName: string,
    additionalProperties?: Record<string, any>
  ) => {
    Analytics.track('element_clicked', {
      element_name: elementName,
      ...additionalProperties
    });
  }, []);

  return {
    trackEvent,
    trackPageView,
    trackUserProperty,
    trackClick
  };
}

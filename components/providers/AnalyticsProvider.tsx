'use client';

import { useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { Analytics } from '@/lib/analytics/amplitude';

export function AnalyticsProvider({ children }: { children: React.ReactNode }) {
  const { user } = useAuth();

  useEffect(() => {
    // Initialize Amplitude
    Analytics.init({
      apiKey: process.env.NEXT_PUBLIC_AMPLITUDE_API_KEY || '',
      environment: (process.env.NEXT_PUBLIC_ENVIRONMENT as any) || 'development',
      enableSessionReplay: process.env.NEXT_PUBLIC_ENABLE_SESSION_REPLAY === 'true' || process.env.NEXT_PUBLIC_ENVIRONMENT === 'production',
      debug: process.env.NEXT_PUBLIC_ENVIRONMENT === 'development',
      // Enable debug logging to see events in browser console
      // Set NEXT_PUBLIC_AMPLITUDE_DEBUG=true in .env.local to enable
      enableDebugLogging: process.env.NEXT_PUBLIC_AMPLITUDE_DEBUG === 'true'
    });
  }, []);

  useEffect(() => {
    if (user) {
      // Build user properties, only including defined values
      const userProperties: Record<string, any> = {};

      if (user.email) {
        userProperties.email = user.email;
      }
      if (user.created_at) {
        userProperties.created_at = user.created_at;
      }
      // Add user metadata if available
      if (user.user_metadata?.full_name) {
        userProperties.name = user.user_metadata.full_name;
      }
      if (user.app_metadata?.provider) {
        userProperties.auth_provider = user.app_metadata.provider;
      }

      // Identify user with available properties
      Analytics.identify(user.id, userProperties);
    }
  }, [user]);

  return <>{children}</>;
}

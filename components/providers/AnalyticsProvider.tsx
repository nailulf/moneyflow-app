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
      // Identify user
      Analytics.identify(user.id, {
        email: user.email,
        created_at: user.created_at,
        // Add more user properties as needed
      });
    } else {
      // Reset on logout
      // We check if we are actually logged out to avoid resetting on initial load
      // But since useAuth handles loading state, if user is null and not loading (handled by parent), it means we are logged out
      // However, this provider might be used where loading state isn't explicitly checked before rendering
      // Safe to call reset if we want to ensure no user data is mixed
    }
  }, [user]);

  return <>{children}</>;
}

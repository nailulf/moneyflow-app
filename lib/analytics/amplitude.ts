import * as amplitude from '@amplitude/analytics-browser';
import { sessionReplayPlugin } from '@amplitude/plugin-session-replay-browser';

interface AmplitudeConfig {
  apiKey: string;
  userId?: string;
  environment: 'development' | 'staging' | 'production';
  enableSessionReplay?: boolean;
  debug?: boolean;
  enableDebugLogging?: boolean;
}

class AmplitudeService {
  private initialized = false;
  private debugMode = false;

  init(config: AmplitudeConfig) {
    if (this.initialized) return;
    
    // Don't initialize if no API key is provided or if it's a placeholder
    if (!config.apiKey || config.apiKey === 'your-api-key' || config.apiKey.includes('INSERT_KEY')) {
      console.warn('Amplitude API key not found or invalid. Analytics disabled.');
      return;
    }

    amplitude.init(config.apiKey, {
      defaultTracking: {
        sessions: true,
        pageViews: true,
        formInteractions: true,
        fileDownloads: true
      },
      minIdLength: 1,
      sessionTimeout: 30 * 60 * 1000, // 30 minutes
      trackingOptions: {
        ipAddress: false, // GDPR compliance
      },
      // Disable remote config fetch in development to prevent blocked request errors
      // @ts-ignore - fetchRemoteConfig might not be in the type definition yet but is supported
      fetchRemoteConfig: config.environment === 'production',
      // Enable debug logging if requested, otherwise suppress in dev to avoid "Failed to fetch" errors
      logLevel: config.enableDebugLogging
        ? amplitude.Types.LogLevel.Debug
        : (config.environment === 'production' ? amplitude.Types.LogLevel.Warn : amplitude.Types.LogLevel.None),
    });

    if (config.enableDebugLogging) {
      this.debugMode = true;
      console.log('[Amplitude] Initialized with debug logging enabled');
    }

    // Add session replay if enabled
    if (config.enableSessionReplay) {
      amplitude.add(sessionReplayPlugin({
        sampleRate: config.environment === 'production' ? 0.1 : 1.0 // 10% in prod, 100% in others for testing
      }));
    }

    this.initialized = true;
  }

  // Identify user
  identify(userId: string, userProperties?: Record<string, any>) {
    if (!this.initialized) return;
    
    amplitude.setUserId(userId);
    if (userProperties) {
      const identify = new amplitude.Identify();
      Object.entries(userProperties).forEach(([key, value]) => {
        identify.set(key, value);
      });
      amplitude.identify(identify);
    }
  }

  // Track event
  track(eventName: string, eventProperties?: Record<string, any>) {
    if (!this.initialized) return;

    if (this.debugMode) {
      console.log('[Amplitude] Track:', eventName, eventProperties || {});
    }

    amplitude.track(eventName, eventProperties);
  }

  // Track revenue
  trackRevenue(amount: number, properties?: Record<string, any>) {
    if (!this.initialized) return;
    const revenue = new amplitude.Revenue()
      .setPrice(amount)
      .setEventProperties(properties || {});
    amplitude.revenue(revenue);
  }

  // Set user properties
  setUserProperties(properties: Record<string, any>) {
    if (!this.initialized) return;
    const identify = new amplitude.Identify();
    Object.entries(properties).forEach(([key, value]) => {
      identify.set(key, value);
    });
    amplitude.identify(identify);
  }

  // Increment user property
  incrementUserProperty(property: string, value: number = 1) {
    if (!this.initialized) return;
    const identify = new amplitude.Identify().add(property, value);
    amplitude.identify(identify);
  }

  // Reset (logout)
  reset() {
    if (!this.initialized) return;
    amplitude.reset();
  }
}

export const Analytics = new AmplitudeService();

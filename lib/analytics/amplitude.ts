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
  private pendingIdentify: { userId: string; userProperties?: Record<string, any> } | null = null;

  init(config: AmplitudeConfig) {
    if (this.initialized) return;

    // Don't initialize if no API key is provided or if it's a placeholder
    if (!config.apiKey || config.apiKey === 'your-api-key' || config.apiKey.includes('INSERT_KEY')) {
      console.warn('Amplitude API key not found or invalid. Analytics disabled.');
      return;
    }

    if (config.enableDebugLogging) {
      this.debugMode = true;
      console.log('[Amplitude] Initializing...');
    }

    // IMPORTANT: Add session replay plugin BEFORE amplitude.init() per Amplitude docs
    // https://amplitude.com/docs/session-replay/session-replay-plugin#before-you-begin
    if (config.enableSessionReplay) {
      const sessionReplay = sessionReplayPlugin({
        // Sample rate: 10% in production, 100% in development for testing
        sampleRate: config.environment === 'production' ? 0.1 : 1.0,
        // Privacy configuration - mask sensitive financial data
        privacyConfig: {
          // Mask all input fields by default (balances, amounts, etc.)
          maskSelector: [
            'input[type="number"]',
            'input[type="text"]',
            'input[type="email"]',
            'input[type="password"]',
            '[data-sensitive]',
            '.balance-amount',
            '.transaction-amount',
            '.account-number',
          ],
          // Block elements that should not be recorded at all
          blockSelector: [
            '[data-block-replay]',
            '.credit-card-number',
          ],
        },
        // Enable debug mode in development to troubleshoot
        debugMode: config.enableDebugLogging,
        // Use web worker for better performance (moves compression off main thread)
        useWebWorker: true,
        // Use IndexedDB for storage (more reliable)
        storeType: 'idb',
        // Defer compression to browser idle periods
        performanceConfig: {
          enabled: true,
        },
        // Inline stylesheets to prevent broken replays
        shouldInlineStylesheet: true,
      });
      amplitude.add(sessionReplay);

      if (this.debugMode) {
        console.log('[Amplitude] Session Replay plugin added');
      }
    }

    amplitude.init(config.apiKey, {
      defaultTracking: {
        sessions: true,
        pageViews: true,
        formInteractions: true,
        fileDownloads: true
      },
      // Enable Visual Labeling - autocapture element interactions
      // This allows creating labeled events from clicks in Amplitude dashboard
      autocapture: {
        elementInteractions: true,
      },
      // Use proxy endpoint to bypass ad blockers and tracking protection (ARC, Brave, etc.)
      // This routes requests through our own domain instead of directly to api.amplitude.com
      serverUrl: typeof window !== 'undefined' ? `${window.location.origin}/api/analytics` : undefined,
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

    if (this.debugMode) {
      console.log('[Amplitude] Initialized with debug logging enabled');
    }

    this.initialized = true;

    // Process any pending identify call that came in before init completed
    if (this.pendingIdentify) {
      if (this.debugMode) {
        console.log('[Amplitude] Processing pending identify:', this.pendingIdentify);
      }
      this.doIdentify(this.pendingIdentify.userId, this.pendingIdentify.userProperties);
      this.pendingIdentify = null;
    }
  }

  // Internal identify implementation
  private doIdentify(userId: string, userProperties?: Record<string, any>) {
    amplitude.setUserId(userId);
    if (userProperties) {
      const identify = new amplitude.Identify();
      Object.entries(userProperties).forEach(([key, value]) => {
        // Only set properties that have a value
        if (value !== undefined && value !== null) {
          identify.set(key, value);
        }
      });
      amplitude.identify(identify);
    }
  }

  // Identify user - queues if not yet initialized
  identify(userId: string, userProperties?: Record<string, any>) {
    if (this.debugMode) {
      console.log('[Amplitude] Identify called:', { userId, userProperties, initialized: this.initialized });
    }

    // If not initialized, queue the identify call
    if (!this.initialized) {
      if (this.debugMode) {
        console.log('[Amplitude] Queuing identify call (not yet initialized)');
      }
      this.pendingIdentify = { userId, userProperties };
      return;
    }

    this.doIdentify(userId, userProperties);
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
      if (value !== undefined && value !== null) {
        identify.set(key, value);
      }
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

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
  private sessionReplayInstance: ReturnType<typeof sessionReplayPlugin> | null = null;
  private sessionReplayEnabled = false;

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

    // Get the proxy URL - must be the SAME for both SDK and session replay to share device ID
    const proxyServerUrl = typeof window !== 'undefined'
      ? `${window.location.origin}/api/analytics`
      : undefined;

    if (this.debugMode) {
      console.log('[Amplitude] Initializing SDK with serverUrl:', proxyServerUrl);
    }

    // Initialize SDK FIRST to establish the device ID
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
      // CRITICAL: Must be the SAME URL as session replay plugin to share device ID
      serverUrl: proxyServerUrl,
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

    // Add session replay plugin AFTER init to ensure device ID is shared
    // Get the device ID from the initialized SDK and pass it to session replay
    if (config.enableSessionReplay) {
      const deviceId = amplitude.getDeviceId();
      const sessionId = amplitude.getSessionId();

      if (this.debugMode) {
        console.log('[Amplitude] Setting up Session Replay with deviceId:', deviceId, 'sessionId:', sessionId);
      }

      this.sessionReplayInstance = sessionReplayPlugin({
        // Sample rate: 10% in production, 100% in development for testing
        sampleRate: config.environment === 'production' ? 0.1 : 1.0,
        // CRITICAL: Use the SAME serverUrl as the main SDK
        // The proxy at /api/analytics routes session replay data to the correct endpoint
        // @ts-ignore - serverUrl is supported but may not be in types
        serverUrl: proxyServerUrl,
        // Explicitly pass the device ID from the initialized SDK to ensure consistency
        // @ts-ignore - deviceId might not be in types but is supported
        deviceId: deviceId,
        // Privacy configuration - mask sensitive financial data
        privacyConfig: {
          // Mask all input fields by default (balances, amounts, etc.)
          maskSelector: [
            'input[type="amount"]',
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
        // Defer compression to browser idle periods
        performanceConfig: {
          enabled: true,
        },
        // Inline stylesheets to prevent broken replays
        shouldInlineStylesheet: true,
      });

      // Add session replay plugin
      amplitude.add(this.sessionReplayInstance);
      this.sessionReplayEnabled = true;

      if (this.debugMode) {
        console.log('[Amplitude] Session Replay plugin added with serverUrl:', proxyServerUrl);
      }
    }

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

  // Stop session replay recording (use on sensitive pages)
  async stopSessionReplay(): Promise<void> {
    if (!this.initialized || !this.sessionReplayInstance || !this.sessionReplayEnabled) {
      return;
    }

    const pluginName = this.sessionReplayInstance.name;
    if (!pluginName) {
      return;
    }

    if (this.debugMode) {
      console.log('[Amplitude] Stopping Session Replay...');
    }

    await amplitude.remove(pluginName).promise;
    this.sessionReplayEnabled = false;

    if (this.debugMode) {
      console.log('[Amplitude] Session Replay stopped');
    }
  }

  // Resume session replay recording
  async startSessionReplay(): Promise<void> {
    if (!this.initialized || !this.sessionReplayInstance || this.sessionReplayEnabled) {
      return;
    }

    if (this.debugMode) {
      console.log('[Amplitude] Starting Session Replay...');
    }

    await amplitude.add(this.sessionReplayInstance).promise;
    this.sessionReplayEnabled = true;

    if (this.debugMode) {
      console.log('[Amplitude] Session Replay started');
    }
  }

  // Check if session replay is currently recording
  isSessionReplayActive(): boolean {
    return this.sessionReplayEnabled;
  }
}

export const Analytics = new AmplitudeService();

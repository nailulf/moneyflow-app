/**
 * Environment detection utilities for feature flags
 * Allows enabling features only in specific environments
 */

export type Environment = 'development' | 'preview' | 'production'

export interface EnvironmentConfig {
  /** Current environment type */
  type: Environment
  /** Whether this is a development environment */
  isDevelopment: boolean
  /** Whether this is a preview/staging environment */
  isPreview: boolean
  /** Whether this is a production environment */
  isProduction: boolean
  /** Whether feature flags should be enabled */
  enableFeatureFlags: boolean
}

/**
 * Detect the current environment
 */
export function detectEnvironment(): EnvironmentConfig {
  // Check Vercel environment first (more reliable for preview deployments)
  const vercelEnv = process.env.NEXT_PUBLIC_VERCEL_ENV
  const nodeEnv = process.env.NODE_ENV
  
  let type: Environment = 'production'
  
  if (vercelEnv === 'preview') {
    type = 'preview'
  } else if (vercelEnv === 'development' || nodeEnv === 'development') {
    type = 'development'
  }
  
  return {
    type,
    isDevelopment: type === 'development',
    isPreview: type === 'preview',
    isProduction: type === 'production',
    enableFeatureFlags: type !== 'production'
  }
}

/**
 * Check if a feature should be enabled based on environment
 * @param featureName Name of the feature for debugging
 * @param environments Environments where the feature should be enabled
 */
export function isFeatureEnabled(
  featureName: string,
  environments: Environment[] = ['development', 'preview']
): boolean {
  const env = detectEnvironment()
  const isEnabled = environments.includes(env.type)
  
  if (env.isDevelopment) {
    console.log(`🔧 Feature flag: ${featureName} = ${isEnabled} (environment: ${env.type})`)
  }
  
  return isEnabled
}

/**
 * Feature flag for development tools and utilities
 */
export function isDevToolsEnabled(): boolean {
  return isFeatureEnabled('dev_tools', ['development', 'preview'])
}

/**
 * Feature flag for onboarding reset functionality
 */
export function isOnboardingResetEnabled(): boolean {
  return isFeatureEnabled('onboarding_reset', ['development', 'preview'])
}

/**
 * Feature flag for test user functionality
 */
export function isTestUserEnabled(): boolean {
  return isFeatureEnabled('test_user', ['development', 'preview'])
}

// Export the current environment for easy access
export const currentEnv = detectEnvironment()


export type AuthErrorSeverity = 'error' | 'warning' | 'info';

export interface AuthError {
  code?: string;
  message: string;
  friendlyMessage: string;
  severity: AuthErrorSeverity;
  action?: {
    label: string;
    href?: string;
    onClick?: () => void;
  };
}

export function getFriendlyErrorMessage(error: any): AuthError {
  const message = error?.message || 'An unknown error occurred';
  const code = error?.code;
  const status = error?.status;

  // Default error state
  const result: AuthError = {
    message,
    friendlyMessage: message,
    severity: 'error',
  };

  // Map Supabase/Auth errors to friendly messages
  if (message.includes('Invalid login credentials') || message.includes('Invalid username or password')) {
    result.friendlyMessage = 'Incorrect email or password. Please check your credentials and try again.';
    result.severity = 'error';
  } else if (message.includes('User not found') || message.includes('user not found')) {
    result.friendlyMessage = 'We couldn\'t find an account with that email address.';
    result.severity = 'error';
    result.action = {
      label: 'Create an account',
      href: '/start',
    };
  } else if (message.includes('Email not confirmed') || message.includes('Email not verified')) {
    result.friendlyMessage = 'Please verify your email address before logging in.';
    result.severity = 'warning';
    // Action could be handled by the component (resend link)
  } else if (message.includes('Password should be')) {
    result.friendlyMessage = 'Password does not meet security requirements.';
    result.severity = 'warning';
  } else if (message.includes('Rate limit') || status === 429) {
    result.friendlyMessage = 'Too many attempts. Please wait a moment before trying again.';
    result.severity = 'warning';
  } else if (message.includes('Network request failed') || message.includes('fetch failed')) {
    result.friendlyMessage = 'Unable to connect to the server. Please check your internet connection.';
    result.severity = 'error';
  } else if (message.includes('User already registered')) {
    result.friendlyMessage = 'An account with this email already exists.';
    result.severity = 'info';
    result.action = {
      label: 'Sign in',
      href: '/login',
    };
  }

  return result;
}

// Standardized Authentication Types
// Used across the entire application for consistent session handling

export interface StandardUser {
  id: string;
  email: string;
  email_confirmed_at?: string;
  created_at: string;
  updated_at: string;
  user_metadata?: Record<string, any>;
  app_metadata?: Record<string, any>;
}

export interface StandardSession {
  access_token: string;
  refresh_token?: string;
  user: StandardUser;
  expires_at: number;
  expires_in?: number;
  token_type?: string;
}

export interface AuthResponse {
  session: StandardSession | null;
  user: StandardUser | null;
  error: string | null;
}

export interface AuthError {
  code: string;
  message: string;
  details?: any;
  userMessage: string;
}

// Error codes for consistent error handling
export const AUTH_ERROR_CODES = {
  NETWORK_ERROR: 'NETWORK_ERROR',
  AUTH_INVALID: 'AUTH_INVALID',
  AUTH_EXPIRED: 'AUTH_EXPIRED',
  DATABASE_ERROR: 'DATABASE_ERROR',
  RLS_VIOLATION: 'RLS_VIOLATION',
  MISSING_TOKEN: 'MISSING_TOKEN',
  INVALID_TOKEN: 'INVALID_TOKEN',
  SESSION_NOT_FOUND: 'SESSION_NOT_FOUND',
  UNKNOWN_ERROR: 'UNKNOWN_ERROR'
} as const;

export type AuthErrorCode = typeof AUTH_ERROR_CODES[keyof typeof AUTH_ERROR_CODES];

// Session loading priority order
export enum SessionSource {
  AUTHORIZATION_HEADER = 'authorization_header',
  SERVER_API = 'server_api',
  CLIENT_COOKIES = 'client_cookies',
  SUPABASE_CLIENT = 'supabase_client'
}

// Cookie configuration
export interface CookieConfig {
  name: string;
  httpOnly: boolean;
  secure: boolean;
  sameSite: 'lax' | 'strict' | 'none';
  maxAge: number;
  path: string;
}

export const COOKIE_CONFIGS = {
  ACCESS_TOKEN: {
    name: 'sb-access-token',
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax' as const,
    maxAge: 60 * 60 * 24 * 7, // 7 days
    path: '/'
  },
  REFRESH_TOKEN: {
    name: 'sb-refresh-token',
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax' as const,
    maxAge: 60 * 60 * 24 * 30, // 30 days
    path: '/'
  },
  CLIENT_ACCESS_TOKEN: {
    name: 'sb-access-token-client',
    httpOnly: false,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax' as const,
    maxAge: 60 * 60 * 24 * 7, // 7 days
    path: '/'
  },
  CLIENT_REFRESH_TOKEN: {
    name: 'sb-refresh-token-client',
    httpOnly: false,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax' as const,
    maxAge: 60 * 60 * 24 * 30, // 30 days
    path: '/'
  }
} as const;

// Session validation helpers
export function isValidSession(session: any): session is StandardSession {
  return (
    session &&
    typeof session === 'object' &&
    typeof session.access_token === 'string' &&
    session.access_token.length > 0 &&
    session.user &&
    typeof session.user.id === 'string' &&
    typeof session.user.email === 'string' &&
    typeof session.expires_at === 'number'
  );
}

export function isSessionExpired(session: StandardSession): boolean {
  const now = Math.floor(Date.now() / 1000);
  return session.expires_at <= now;
}

export function createAuthError(
  code: AuthErrorCode,
  message: string,
  userMessage?: string,
  details?: any
): AuthError {
  return {
    code,
    message,
    userMessage: userMessage || getDefaultUserMessage(code),
    details
  };
}

function getDefaultUserMessage(code: AuthErrorCode): string {
  switch (code) {
    case AUTH_ERROR_CODES.NETWORK_ERROR:
      return 'Network connection error. Please check your internet connection and try again.';
    case AUTH_ERROR_CODES.AUTH_INVALID:
      return 'Invalid credentials. Please sign in again.';
    case AUTH_ERROR_CODES.AUTH_EXPIRED:
      return 'Your session has expired. Please sign in again.';
    case AUTH_ERROR_CODES.DATABASE_ERROR:
      return 'Database error. Please try again later.';
    case AUTH_ERROR_CODES.RLS_VIOLATION:
      return 'Permission denied. Please sign in again.';
    case AUTH_ERROR_CODES.MISSING_TOKEN:
      return 'Authentication required. Please sign in.';
    case AUTH_ERROR_CODES.INVALID_TOKEN:
      return 'Invalid authentication token. Please sign in again.';
    case AUTH_ERROR_CODES.SESSION_NOT_FOUND:
      return 'Session not found. Please sign in again.';
    default:
      return 'An unexpected error occurred. Please try again.';
  }
}

// Utility function to normalize session from different sources
export function normalizeSession(rawSession: any, source: SessionSource): StandardSession | null {
  if (!rawSession) return null;

  try {
    // Handle different session formats from various sources
    let session: StandardSession;

    if (source === SessionSource.SUPABASE_CLIENT) {
      // Supabase client format
      session = {
        access_token: rawSession.access_token,
        refresh_token: rawSession.refresh_token,
        user: {
          id: rawSession.user.id,
          email: rawSession.user.email,
          email_confirmed_at: rawSession.user.email_confirmed_at,
          created_at: rawSession.user.created_at,
          updated_at: rawSession.user.updated_at,
          user_metadata: rawSession.user.user_metadata,
          app_metadata: rawSession.user.app_metadata
        },
        expires_at: rawSession.expires_at || Math.floor(Date.now() / 1000) + 3600,
        expires_in: rawSession.expires_in,
        token_type: rawSession.token_type
      };
    } else {
      // Our standardized format or manual construction
      session = {
        access_token: rawSession.access_token,
        refresh_token: rawSession.refresh_token,
        user: {
          id: rawSession.user.id,
          email: rawSession.user.email,
          email_confirmed_at: rawSession.user.email_confirmed_at,
          created_at: rawSession.user.created_at,
          updated_at: rawSession.user.updated_at,
          user_metadata: rawSession.user.user_metadata,
          app_metadata: rawSession.user.app_metadata
        },
        expires_at: rawSession.expires_at || Math.floor(Date.now() / 1000) + 3600,
        expires_in: rawSession.expires_in,
        token_type: rawSession.token_type || 'bearer'
      };
    }

    return isValidSession(session) ? session : null;
  } catch (error) {
    console.error(`[Auth] Failed to normalize session from ${source}:`, error);
    return null;
  }
}
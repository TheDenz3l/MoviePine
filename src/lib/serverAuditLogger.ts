import { NextRequest } from 'next/server';
import { createClient } from '@supabase/supabase-js';

export type AuditEventType = 
  | 'login'
  | 'logout'
  | 'failed_login'
  | 'email_change_request'
  | 'email_changed'
  | 'password_change'
  | 'session_revoked'
  | 'profile_update'
  | 'settings_change'
  | 'settings_access'
  | 'settings_change_attempt'
  | 'settings_change_blocked'
  | 'account_locked'
  | 'session_created'
  | 'session_terminated'
  | 'api_rate_limit_exceeded'
  | 'suspicious_activity'
  | 'admin_action'
  | 'login_attempt';

export interface AuditLogMetadata {
  [key: string]: any;
}

export class ServerAuditLogger {
  private static getSupabaseClient() {
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
    
    if (!supabaseUrl || !supabaseAnonKey) {
      throw new Error('Missing Supabase environment variables');
    }
    
    return createClient(supabaseUrl, supabaseAnonKey, {
      auth: { persistSession: false }
    });
  }

  /**
   * Get client IP address from request
   */
  private static getClientIp(request: NextRequest): string | undefined {
    return (
      request.headers.get('x-forwarded-for') ||
      request.headers.get('x-real-ip') ||
      (request as any).ip
    )?.split(',')[0]?.trim();
  }

  /**
   * Get user agent from request
   */
  private static getUserAgent(request: NextRequest): string | undefined {
    return request.headers.get('user-agent') || undefined;
  }

  /**
   * Log an audit event with IP and user agent from request
   */
  static async logEvent(
    request: NextRequest,
    eventType: AuditEventType,
    userId?: string,
    metadata?: AuditLogMetadata
  ): Promise<void> {
    try {
      const supabase = this.getSupabaseClient();
      const ipAddress = this.getClientIp(request);
      const userAgent = this.getUserAgent(request);

      const logData = {
        event_type: eventType,
        user_id: userId,
        ip_address: ipAddress,
        user_agent: userAgent,
        metadata: metadata || {},
      };

      const { error } = await supabase
        .from('audit_logs')
        .insert(logData);

      if (error) {
        console.warn('Failed to log audit event:', error);
        // Don't throw error as this shouldn't break the main flow
      }
    } catch (error) {
      console.warn('Failed to log audit event:', error);
      // Silent fail - audit logging shouldn't break main functionality
    }
  }

  /**
   * Log a failed login attempt
   */
  static async logFailedLogin(
    request: NextRequest,
    email: string,
    reason?: string
  ): Promise<void> {
    await this.logEvent(request, 'failed_login', undefined, {
      email,
      reason,
    });
  }

  /**
   * Log a successful login
   */
  static async logLogin(
    request: NextRequest,
    userId: string
  ): Promise<void> {
    await this.logEvent(request, 'login', userId);
  }

  /**
   * Log a logout
   */
  static async logLogout(
    request: NextRequest,
    userId: string
  ): Promise<void> {
    await this.logEvent(request, 'logout', userId);
  }

  /**
   * Log email change request
   */
  static async logEmailChangeRequest(
    request: NextRequest,
    userId: string,
    newEmail: string
  ): Promise<void> {
    await this.logEvent(request, 'email_change_request', userId, {
      new_email: newEmail,
    });
  }

  /**
   * Log successful email change
   */
  static async logEmailChanged(
    request: NextRequest,
    userId: string,
    oldEmail: string,
    newEmail: string
  ): Promise<void> {
    await this.logEvent(request, 'email_changed', userId, {
      old_email: oldEmail,
      new_email: newEmail,
    });
  }

  /**
   * Log password change
   */
  static async logPasswordChange(
    request: NextRequest,
    userId: string
  ): Promise<void> {
    await this.logEvent(request, 'password_change', userId);
  }

  /**
   * Log session revocation
   */
  static async logSessionRevoked(
    request: NextRequest,
    userId: string,
    sessionId?: string
  ): Promise<void> {
    await this.logEvent(request, 'session_revoked', userId, {
      session_id: sessionId,
    });
  }

  /**
   * Log rate limit exceeded
   */
  static async logRateLimitExceeded(
    request: NextRequest,
    userId?: string,
    route?: string,
    limit?: number
  ): Promise<void> {
    await this.logEvent(request, 'api_rate_limit_exceeded', userId, {
      route,
      limit,
    });
  }
}

// Export default for easier imports
export default ServerAuditLogger;

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
  | 'admin_action';

export interface AuditLogMetadata {
  [key: string]: any;
}

export class AuditLogger {
  private static getClient() {
    // Use client-side Supabase client
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
    
    if (!supabaseUrl || !supabaseAnonKey) {
      throw new Error('Missing Supabase environment variables');
    }
    
    return createClient(supabaseUrl, supabaseAnonKey);
  }

  /**
   * Log an audit event
   * @param eventType The type of event being logged
   * @param userId Optional user ID associated with the event
   * @param metadata Optional additional data about the event
   */
  static async logEvent(
    eventType: AuditEventType,
    userId?: string,
    metadata?: AuditLogMetadata
  ): Promise<void> {
    try {
      const supabase = await this.getClient();
      
      // Get IP address and user agent from headers (server-side)
      // For client-side, we'll need to pass these from the server
      const logData = {
        event_type: eventType,
        user_id: userId,
        metadata: metadata || {},
        // IP and user_agent will be filled by the API route
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
    email: string,
    ipAddress?: string,
    userAgent?: string,
    reason?: string
  ): Promise<void> {
    await this.logEvent('failed_login', undefined, {
      email,
      ip_address: ipAddress,
      user_agent: userAgent,
      reason,
    });
  }

  /**
   * Log a successful login
   */
  static async logLogin(
    userId: string,
    ipAddress?: string,
    userAgent?: string
  ): Promise<void> {
    await this.logEvent('login', userId, {
      ip_address: ipAddress,
      user_agent: userAgent,
    });
  }

  /**
   * Log a logout
   */
  static async logLogout(
    userId: string,
    ipAddress?: string,
    userAgent?: string
  ): Promise<void> {
    await this.logEvent('logout', userId, {
      ip_address: ipAddress,
      user_agent: userAgent,
    });
  }

  /**
   * Log email change request
   */
  static async logEmailChangeRequest(
    userId: string,
    newEmail: string,
    ipAddress?: string,
    userAgent?: string
  ): Promise<void> {
    await this.logEvent('email_change_request', userId, {
      new_email: newEmail,
      ip_address: ipAddress,
      user_agent: userAgent,
    });
  }

  /**
   * Log successful email change
   */
  static async logEmailChanged(
    userId: string,
    oldEmail: string,
    newEmail: string,
    ipAddress?: string,
    userAgent?: string
  ): Promise<void> {
    await this.logEvent('email_changed', userId, {
      old_email: oldEmail,
      new_email: newEmail,
      ip_address: ipAddress,
      user_agent: userAgent,
    });
  }

  /**
   * Log password change
   */
  static async logPasswordChange(
    userId: string,
    ipAddress?: string,
    userAgent?: string
  ): Promise<void> {
    await this.logEvent('password_change', userId, {
      ip_address: ipAddress,
      user_agent: userAgent,
    });
  }

  /**
   * Log session revocation
   */
  static async logSessionRevoked(
    userId: string,
    sessionId?: string,
    ipAddress?: string,
    userAgent?: string
  ): Promise<void> {
    await this.logEvent('session_revoked', userId, {
      session_id: sessionId,
      ip_address: ipAddress,
      user_agent: userAgent,
    });
  }
}

// Export default for easier imports
export default AuditLogger;

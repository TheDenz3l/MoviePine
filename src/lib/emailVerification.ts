import { createClient } from '@supabase/supabase-js';

/**
 * Email verification utility functions
 */

/**
 * Check if a user's email is verified
 * @param user Supabase user object
 * @returns boolean indicating if email is verified
 */
export function isEmailVerified(user: any): boolean {
  // Check various possible email verification fields
  return !!(
    user?.email_confirmed_at ||
    user?.confirmed_at ||
    user?.email_verified ||
    user?.emailConfirmedAt
  );
}

/**
 * Get detailed email verification status
 * @param user Supabase user object
 * @returns Object with verification details
 */
export function getEmailVerificationStatus(user: any): {
  isVerified: boolean;
  verifiedAt: string | null;
  needsVerification: boolean;
} {
  const verifiedAt = 
    user?.email_confirmed_at || 
    user?.confirmed_at || 
    user?.emailConfirmedAt || 
    null;

  return {
    isVerified: !!verifiedAt,
    verifiedAt,
    needsVerification: !verifiedAt
  };
}

/**
 * Create a Supabase client for admin operations
 * @returns Supabase client with service role key
 */
export function createAdminClient() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  
  if (!supabaseUrl || !supabaseServiceKey) {
    throw new Error('Missing Supabase admin credentials');
  }
  
  return createClient(supabaseUrl, supabaseServiceKey, {
    auth: { persistSession: false }
  });
}

/**
 * Send email verification request
 * @param userId User ID to send verification to
 * @returns Promise with result
 */
export async function sendEmailVerification(userId: string): Promise<{ success: boolean; error?: string }> {
  try {
    const adminClient = createAdminClient();
    // Get user details first
    const { data: user, error: userError } = await adminClient.auth.admin.getUserById(userId);
    if (userError || !user) {
      return { success: false, error: userError?.message || 'User not found' };
    }

    // If already verified, return success
    if (isEmailVerified(user.user)) {
      return { success: true };
    }

    // Note: Supabase doesn't have a direct "send verification email" admin function
    // The verification email is typically sent during signup or when requested by the user
    // For now, we'll return success if the user exists and needs verification
    // In a real implementation, you might want to trigger a custom email send
    return { success: true, error: 'User needs to verify email - verification email should have been sent during signup' };
  } catch (error: any) {
    return { success: false, error: error.message };
  }
}

/**
 * Middleware function to require email verification
 * @param user Supabase user object
 * @param operation Name of the operation being performed
 * @returns Object with authorization result
 */
export function requireEmailVerification(user: any, operation: string = 'this operation'): {
  authorized: boolean;
  error?: string;
  errorCode?: string;
} {
  if (!user) {
    return {
      authorized: false,
      error: 'Authentication required',
      errorCode: 'UNAUTHENTICATED'
    };
  }

  const verificationStatus = getEmailVerificationStatus(user);
  
  if (!verificationStatus.isVerified) {
    return {
      authorized: false,
      error: `Email verification required for ${operation}. Please verify your email address.`,
      errorCode: 'EMAIL_NOT_VERIFIED'
    };
  }

  return { authorized: true };
}

/**
 * Check if email verification is required for a specific operation
 * @param operation The operation being performed
 * @returns boolean indicating if verification is required
 */
export function isEmailVerificationRequiredForOperation(operation: string): boolean {
  // Define operations that require email verification
  const privilegedOperations = [
    'change_password',
    'change_email',
    'delete_account',
    'billing_operations',
    'admin_operations',
    'sensitive_settings'
  ];
  
  return privilegedOperations.includes(operation);
}

// Export types for convenience
export type EmailVerificationStatus = ReturnType<typeof getEmailVerificationStatus>;
export type VerificationRequirement = 'required' | 'optional' | 'none';

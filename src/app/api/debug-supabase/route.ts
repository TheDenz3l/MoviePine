import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

export async function GET(req: NextRequest) {
  try {
    // Use service role key to check what's actually in Supabase
    const supabaseAdmin = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    )

    // Get all users to see if your account exists
    // Get all users
    const { data: usersData, error: usersError } = await supabaseAdmin.auth.admin.listUsers();
    if (usersError) {
      throw new Error(`Failed to list users: ${usersError.message}`);
    }

    // Get authentication audit logs (last 50, sorted by timestamp)
    const { data: auditLogs, error: auditLogsError } = await supabaseAdmin
      .from('auth.audit_log_entries')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(50);
    
    if (auditLogsError) {
      console.warn("Failed to fetch audit logs from 'auth.audit_log_entries', trying fallback method if available:", auditLogsError);
      // Fallback: Supabase JS client doesn't expose listAuditLogs directly as of this model's knowledge cutoff (Jan 2025)
      // The `auth.audit_log_entries` table is usually only accessible via direct SQL or Supabase Studio.
      // We will proceed without detailed audit logs if direct table access fails, relying on user data.
    }

    // Get active sessions by iterating users (existing approach, likely limited)
    const activeSessions: any[] = [];
    for (const user of usersData?.users || []) {
      try {
        // This attempts to get more details about a user, including their sessions if available through RLS
        // But for *admin* access to sessions, it might be different.
        const { data: userData, error: userDetailsError } = await supabaseAdmin.auth.admin.getUserById(user.id);
        if (userDetailsError) {
          console.warn(`Failed to get details for user ${user.id}: ${userDetailsError.message}`);
          continue; // Skip to next user
        }
        if (userData?.user) { // Check if user object itself exists
          activeSessions.push({
            userId: userData.user.id,
            email: userData.user.email,
            lastSignIn: userData.user.last_sign_in_at,
            createdAt: userData.user.created_at,
            emailConfirmed: userData.user.email_confirmed_at,
            appMetadata: userData.user.app_metadata,
            userMetadata: userData.user.user_metadata,
            factors: userData.user.factors, // Include MFA factors if any
            // Note: `sessions` object is usually not directly returned by getUserById in auth.admin
          });
        }
      } catch (e) { // Add the catch block for getUserById
        console.error(`Error processing user ${user.id}:`, e);
      }
    }

    // Check watch_progress table for a specific user or overall count
    const { data: progressData, error: progressError } = await supabaseAdmin
      .from('watch_progress')
      .select('*'); // Removed .eq('user_id', targetUserId) to get general progress
    if (progressError) {
      throw new Error(`Failed to fetch watch progress: ${progressError.message}`);
    }

    return NextResponse.json({
      success: true,
      users: activeSessions, // Use the more detailed user data from activeSessions
      auditLogs: auditLogs || [], // Provide audit logs if successfully fetched
      watchProgress: {
        count: progressData?.length || 0,
        items: progressData || []
      },
      message: 'Supabase debug data retrieved'
    });

  } catch (error: any) {
    console.error('Supabase debug route error:', error);
    return NextResponse.json({
      error: error.message || 'An unknown error occurred during Supabase debugging.',
      type: 'supabase_debug_error'
    }, { status: 500 });
  }
}

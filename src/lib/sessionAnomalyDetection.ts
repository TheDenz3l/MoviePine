import { createClient } from '@supabase/supabase-js';
import { ServerAuditLogger } from './serverAuditLogger';

/**
 * Session Anomaly Detection System
 * Detects suspicious session activity like impossible travel, multiple locations, etc.
 */

export interface SessionAnomaly {
  type: 'impossible_travel' | 'multiple_locations' | 'suspicious_user_agent' | 'high_frequency_activity' | 'unusual_time';
  severity: 'low' | 'medium' | 'high';
  sessionId: string;
  userId: string;
  details: any;
  timestamp: string;
}

export interface LocationInfo {
  ip: string;
  latitude?: number;
  longitude?: number;
  country?: string;
  city?: string;
  region?: string;
  timezone?: string;
}

export interface SessionActivity {
  sessionId: string;
  userId: string;
  ip: string;
  userAgent: string;
  timestamp: string;
  location?: LocationInfo;
}

/**
 * Calculate distance between two geographical points (in kilometers)
 */
function calculateDistance(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const R = 6371; // Earth's radius in kilometers
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLon = (lon2 - lon1) * Math.PI / 180;
  const a = 
    Math.sin(dLat/2) * Math.sin(dLat/2) +
    Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) * 
    Math.sin(dLon/2) * Math.sin(dLon/2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
  return R * c;
}

/**
 * Calculate if travel between locations is physically possible
 */
function isImpossibleTravel(
  location1: LocationInfo, 
  location2: LocationInfo, 
  timeDiffHours: number
): boolean {
  // If we don't have location data, assume it's possible
  if (!location1.latitude || !location1.longitude || !location2.latitude || !location2.longitude) {
    return false;
  }

  const distanceKm = calculateDistance(
    location1.latitude, 
    location1.longitude, 
    location2.latitude, 
    location2.longitude
  );

  // Speed of light speed limit (roughly) - if distance > time * speed of light, it's impossible
  // But let's be more realistic: max 1000 km/h for airplane travel
  const maxSpeedKmh = 1000; // km/h
  const maxDistanceKm = maxSpeedKmh * timeDiffHours;

  return distanceKm > maxDistanceKm;
}

/**
 * Get IP geolocation information
 * Note: In production, you'd use a real geolocation service
 */
async function getIPLocation(ip: string): Promise<LocationInfo> {
  // Mock implementation - in production, use a real service like IPinfo, MaxMind, etc.
  // For now, return basic IP info
  return {
    ip,
    // In a real implementation, you'd fetch this data from a geolocation service
  };
}

/**
 * Detect session anomalies for a user
 */
export async function detectSessionAnomalies(
  userId: string,
  currentSession: SessionActivity,
  supabase: any
): Promise<SessionAnomaly[]> {
  const anomalies: SessionAnomaly[] = [];
  
  try {
    // Get recent sessions for this user (last 24 hours)
    const { data: recentSessions, error } = await supabase
      .from('user_sessions')
      .select('*')
      .eq('user_id', userId)
      .gte('last_seen_at', new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString())
      .neq('id', currentSession.sessionId)
      .order('last_seen_at', { ascending: false })
      .limit(10);

    if (error) {
      console.warn('Failed to fetch recent sessions for anomaly detection:', error);
      return anomalies;
    }

    if (!recentSessions || recentSessions.length === 0) {
      return anomalies; // No previous sessions to compare against
    }

    const currentTime = new Date(currentSession.timestamp);
    
    // Check for impossible travel
    for (const session of recentSessions) {
      const sessionTime = new Date(session.last_seen_at);
      const timeDiffHours = Math.abs(currentTime.getTime() - sessionTime.getTime()) / (1000 * 60 * 60);
      
      // Only check if there's enough time difference to make travel analysis meaningful
      if (timeDiffHours > 0.5) { // More than 30 minutes
        const location1 = await getIPLocation(session.ip);
        const location2 = await getIPLocation(currentSession.ip);
        
        if (isImpossibleTravel(location1, location2, timeDiffHours)) {
          anomalies.push({
            type: 'impossible_travel',
            severity: 'high',
            sessionId: currentSession.sessionId,
            userId,
            details: {
              previousSession: {
                id: session.id,
                ip: session.ip,
                location: location1,
                time: session.last_seen_at
              },
              currentSession: {
                ip: currentSession.ip,
                location: location2,
                time: currentSession.timestamp
              },
              timeDiffHours,
              distance: calculateDistance(
                location1.latitude || 0, 
                location1.longitude || 0, 
                location2.latitude || 0, 
                location2.longitude || 0
              )
            },
            timestamp: new Date().toISOString()
          });
        }
      }
    }

    // Check for multiple locations in short time
    const recentIps = new Set(recentSessions.map((s: any) => s.ip));
    recentIps.add(currentSession.ip);
    if (recentIps.size > 3) {
      anomalies.push({
        type: 'multiple_locations',
        severity: 'medium',
        sessionId: currentSession.sessionId,
        userId,
        details: {
          uniqueIps: Array.from(recentIps),
          sessionCount: recentSessions.length + 1
        },
        timestamp: new Date().toISOString()
      });
    }

    // Check for suspicious user agent changes
    const userAgentCounts: Record<string, number> = {};
    recentSessions.forEach((session: any) => {
      userAgentCounts[session.user_agent] = (userAgentCounts[session.user_agent] || 0) + 1;
    });
    const mostCommonUserAgent = Object.keys(userAgentCounts).reduce((a, b) => 
      userAgentCounts[a] > userAgentCounts[b] ? a : b
    );
    
    if (currentSession.userAgent !== mostCommonUserAgent && recentSessions.length > 2) {
      const commonPercentage = (userAgentCounts[mostCommonUserAgent] / recentSessions.length) * 100;
      if (commonPercentage > 70) { // If 70%+ of sessions use the same user agent
        anomalies.push({
          type: 'suspicious_user_agent',
          severity: 'medium',
          sessionId: currentSession.sessionId,
          userId,
          details: {
            currentUserAgent: currentSession.userAgent,
            commonUserAgent: mostCommonUserAgent,
            commonPercentage: commonPercentage.toFixed(1)
          },
          timestamp: new Date().toISOString()
        });
      }
    }

    // Check for high frequency activity
    const lastHourSessions = recentSessions.filter((session: any) => {
      const sessionTime = new Date(session.last_seen_at);
      return (currentTime.getTime() - sessionTime.getTime()) < (60 * 60 * 1000); // Last hour
    });
    
    if (lastHourSessions.length > 10) {
      anomalies.push({
        type: 'high_frequency_activity',
        severity: 'low',
        sessionId: currentSession.sessionId,
        userId,
        details: {
          sessionsLastHour: lastHourSessions.length,
          threshold: 10
        },
        timestamp: new Date().toISOString()
      });
    }

    // Check for unusual time activity (if user typically logs in during certain hours)
    const hour = currentTime.getHours();
    // Assume unusual hours are 2 AM - 6 AM (this would be learned from user behavior in production)
    if (hour >= 2 && hour <= 6) {
      anomalies.push({
        type: 'unusual_time',
        severity: 'low',
        sessionId: currentSession.sessionId,
        userId,
        details: {
          hour,
          time: currentTime.toISOString()
        },
        timestamp: new Date().toISOString()
      });
    }

  } catch (error) {
    console.warn('Error during session anomaly detection:', error);
    // Don't let anomaly detection errors break the main flow
  }

  return anomalies;
}

/**
 * Process and log detected anomalies
 */
export async function processAnomalies(
  anomalies: SessionAnomaly[],
  request: any // NextRequest
): Promise<void> {
  for (const anomaly of anomalies) {
    // Log the anomaly
    await ServerAuditLogger.logEvent(
      request,
      'suspicious_activity',
      anomaly.userId,
      {
        anomalyType: anomaly.type,
        severity: anomaly.severity,
        details: anomaly.details,
        sessionId: anomaly.sessionId
      }
    );

    // In production, you might also:
    // - Send email alerts for high severity anomalies
    // - Temporarily lock the account
    // - Require additional authentication
    console.warn(`🚨 Session anomaly detected: ${anomaly.type} (Severity: ${anomaly.severity}) for user ${anomaly.userId}`);
  }
}

/**
 * Update session with location and user agent information
 */
export async function updateSessionWithLocation(
  sessionId: string,
  ip: string,
  userAgent: string,
  supabase: any
): Promise<void> {
  try {
    // Get location info from IP (mock implementation)
    const location = await getIPLocation(ip);
    
    await supabase
      .from('user_sessions')
      .update({
        ip,
        user_agent: userAgent,
        last_seen_at: new Date().toISOString()
      })
      .eq('id', sessionId);
  } catch (error) {
    console.warn('Failed to update session with location info:', error);
  }
}

/**
 * Session anomaly detection middleware
 * Can be used in API routes to automatically detect anomalies
 */
export async function sessionAnomalyDetectionMiddleware(
  request: any, // NextRequest
  userId: string,
  sessionId: string,
  supabase: any
): Promise<SessionAnomaly[]> {
  try {
    const clientIp = request.headers.get('x-forwarded-for') || 
                     request.headers.get('x-real-ip') || 
                     (request as any).ip || 
                     'unknown';
    const userAgent = request.headers.get('user-agent') || 'unknown';

    const currentSession: SessionActivity = {
      sessionId,
      userId,
      ip: clientIp,
      userAgent,
      timestamp: new Date().toISOString()
    };

    const anomalies = await detectSessionAnomalies(userId, currentSession, supabase);
    
    if (anomalies.length > 0) {
      await processAnomalies(anomalies, request);
    }

    // Update session with current IP and user agent
    await updateSessionWithLocation(sessionId, clientIp, userAgent, supabase);

    return anomalies;
  } catch (error) {
    console.warn('Session anomaly detection middleware error:', error);
    return [];
  }
}

// Export types are already exported at the top, no need to re-export

# Dynamic Live TV Stream Health Monitoring System

## Overview
This system dynamically monitors the health of live TV streams and only displays networks with active, working streams. It provides real-time stream health checking, automatic filtering, and user controls for managing stream availability.

## Key Features

### 1. Stream Health Monitoring
- **Real-time Health Checks**: Automatically checks M3U8 playlists and stream URLs every 60 seconds
- **Response Time Tracking**: Monitors stream response times and availability
- **Failure Tolerance**: Uses consecutive failure tracking (3 strikes before marking as inactive)
- **Batch Processing**: Checks streams in batches to avoid overwhelming network resources

### 2. Dynamic Network Filtering
- **Active Networks Only**: Only displays networks that have at least one working stream
- **Health-Based Display**: UI shows stream count and health status for each network
- **User Toggle**: Option to show all networks or only healthy ones
- **Real-time Updates**: Periodically refreshes network availability

### 3. Smart Stream Management
- **Auto-Detection**: Automatically detects M3U8 vs other stream formats
- **Playlist Validation**: Validates M3U8 playlists for proper format and segments
- **Health Indicators**: Visual indicators showing stream status (active/offline)
- **Disabled Controls**: Prevents playback of offline streams

## Implementation Components

### Core Files Created/Modified

#### 1. Stream Health Monitor (`/src/lib/services/stream-health-monitor.ts`)
- **StreamHealthMonitor Class**: Singleton service for monitoring all streams
- **Health Status Tracking**: Tracks URL health, response times, and failure counts
- **Network Health Aggregation**: Rolls up stream health to network level
- **Automatic Cleanup**: Removes old/unused streams from monitoring

#### 2. Enhanced Stremio Service (`/src/lib/services/stremio-usa-tv-health.ts`)
- **Health-Aware Network Loading**: `getHealthyNetworksByCategory()` method
- **Stream Filtering**: `filterStreamsByHealth()` and `filterNetworksByHealth()` methods
- **Health Status Integration**: Methods to get health stats and status
- **Configurable Monitoring**: Option to enable/disable health monitoring

#### 3. Updated Live TV Page (`/src/components/live-tv-page.tsx`)
- **Health Status Dashboard**: Shows healthy networks/streams count
- **Visual Health Indicators**: Green/red indicators on network and stream cards
- **Filter Controls**: Toggle between all networks vs healthy-only
- **Refresh Functionality**: Manual refresh button for immediate health checks
- **Stream Status Display**: Shows response times and offline status

#### 4. Health API Endpoint (`/src/app/api/stream-health/route.ts`)
- **Health Statistics**: GET `/api/stream-health?action=stats`
- **Stream Health Check**: GET `/api/stream-health?action=check&url=<stream-url>`
- **Add Stream Monitoring**: GET `/api/stream-health?action=add&url=<stream-url>`
- **Healthy Streams List**: GET `/api/stream-health?action=healthy`

## User Experience Improvements

### 1. Live TV Page Enhancements
```tsx
// Health monitoring status panel
<div className="flex items-center gap-4 mb-6 p-4 bg-gray-900/50 rounded-lg">
  <Activity className="w-5 h-5 text-green-500" />
  <span>Stream Health: {healthyNetworks}/{totalNetworks} Networks Active</span>
  <span>{healthyStreams} Active Streams</span>
  <label>
    <input type="checkbox" checked={showHealthyOnly} />
    Show only active networks
  </label>
  <button onClick={refresh}>Refresh</button>
</div>
```

### 2. Network Cards with Health Status
```tsx
// Health indicator on each network card
<div className="absolute top-3 right-3">
  {networkHealth?.isHealthy ? (
    <Wifi className="w-4 h-4 text-green-500" />
    <span>{networkHealth.activeStreams} active</span>
  ) : (
    <WifiOff className="w-4 h-4 text-red-500" />
    <span>No streams</span>
  )}
</div>
```

### 3. Stream Cards with Real-time Status
```tsx
// Stream health indicator and disabled state
<div className="absolute top-4 right-4 bg-black/70 px-2 py-1 rounded">
  {streamHealth?.isActive ? (
    <span className="text-green-500">Active ({responseTime}ms)</span>
  ) : (
    <span className="text-red-500">Offline</span>
  )}
</div>

<button 
  disabled={streamHealth?.isActive === false}
  className="bg-red-600 disabled:opacity-50 disabled:cursor-not-allowed"
>
  {streamHealth?.isActive === false ? 'Stream Offline' : 'Watch Live'}
</button>
```

## System Configuration

### Enable Health Monitoring
```typescript
const service = createStremioUSATVService({
  realDebridApiKey: config.debridApiKey,
  useCache: true,
  cacheTimeout: 300000, // 5 minutes
  enableHealthMonitoring: true // Enable health monitoring
})
```

### Health Check Parameters
```typescript
const healthMonitor = new StreamHealthMonitor()
// Configuration:
// - CHECK_INTERVAL: 60000ms (1 minute)
// - TIMEOUT_MS: 10000ms (10 seconds)
// - MAX_CONSECUTIVE_FAILURES: 3 strikes
```

## API Usage Examples

### Check Stream Health
```bash
curl "http://localhost:3000/api/stream-health?action=check&url=https://example.com/stream.m3u8"
# Response: { "url": "...", "isActive": true, "responseTime": 245, "lastChecked": 1634567890000 }
```

### Get Health Statistics
```bash
curl "http://localhost:3000/api/stream-health?action=stats"
# Response: { "totalStreams": 24, "healthyStreams": 18, "healthyNetworks": 12, "totalNetworks": 15 }
```

### Get Healthy Streams List
```bash
curl "http://localhost:3000/api/stream-health?action=healthy"
# Response: { "healthyStreams": ["url1", "url2"], "unhealthyStreams": ["url3"] }
```

## Benefits

### 1. User Experience
- **No Dead Links**: Users only see working streams
- **Faster Loading**: No time wasted on broken streams
- **Clear Status**: Visual indicators show stream health
- **Smart Defaults**: Shows only active networks by default

### 2. Performance
- **Efficient Checking**: Batch processing and smart timeouts
- **Caching**: Avoids redundant health checks
- **Background Monitoring**: Non-blocking health updates
- **Resource Management**: Automatic cleanup of old monitoring data

### 3. Reliability
- **Fault Tolerance**: Handles network issues gracefully
- **Retry Logic**: Smart retry with consecutive failure tracking
- **Fallback Options**: Graceful degradation when health checks fail
- **Error Handling**: Comprehensive error logging and recovery

## Monitoring Dashboard

The Live TV page now includes a real-time health dashboard:

- **Network Health**: Shows count of active networks vs total available
- **Stream Count**: Displays number of currently active streams
- **Filter Control**: Toggle between all networks and healthy-only view
- **Manual Refresh**: Force immediate health check updates
- **Visual Indicators**: Color-coded status on all network and stream cards

## Future Enhancements

1. **Stream Quality Detection**: Automatically detect best quality available streams
2. **Geographic Filtering**: Filter streams based on user location/preferences
3. **Historical Health Data**: Track stream reliability over time
4. **Smart Recommendations**: Suggest most reliable streams/networks
5. **Health Alerts**: Notify when frequently-used streams go offline
6. **Load Balancing**: Distribute health checks across multiple servers

This system ensures users only interact with working live TV streams, dramatically improving the user experience and reducing frustration with dead or broken streams.

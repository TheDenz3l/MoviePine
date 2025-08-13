import { NextRequest, NextResponse } from 'next/server'
import { streamHealthMonitor } from '@/lib/services/stream-health-monitor'

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const action = searchParams.get('action')
    const url = searchParams.get('url')

    switch (action) {
      case 'stats':
        return NextResponse.json(streamHealthMonitor.getHealthStats())
      
      case 'check':
        if (!url) {
          return NextResponse.json({ error: 'URL parameter required for check action' }, { status: 400 })
        }
        const health = await streamHealthMonitor.checkStreamHealth(url)
        return NextResponse.json(health)
      
      case 'add':
        if (!url) {
          return NextResponse.json({ error: 'URL parameter required for add action' }, { status: 400 })
        }
        const networkId = searchParams.get('networkId') || 'unknown'
        streamHealthMonitor.addStream(url, networkId)
        return NextResponse.json({ success: true, message: 'Stream added to monitoring' })
      
      case 'healthy':
        return NextResponse.json({
          healthyStreams: streamHealthMonitor.getHealthyStreams(),
          unhealthyStreams: streamHealthMonitor.getUnhealthyStreams()
        })
      
      default:
        return NextResponse.json({ 
          error: 'Invalid action',
          availableActions: ['stats', 'check', 'add', 'healthy']
        }, { status: 400 })
    }
  } catch (error) {
    console.error('❌ Stream health API error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

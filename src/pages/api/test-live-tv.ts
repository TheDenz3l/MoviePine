import { NextApiRequest, NextApiResponse } from 'next'
import { createStremioUSATVService } from '@/lib/services/stremio-usa-tv-health'

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  try {
    console.log('🧪 API: Testing Stremio USA TV service...')
    
    const service = createStremioUSATVService({
      realDebridApiKey: undefined,
      useCache: false,
      cacheTimeout: 0,
      enableHealthMonitoring: true
    })
    
    console.log('✅ API: Service created successfully')
    
    const networks = await service.getNetworksByCategory()
    console.log(`📺 API: Found ${networks.length} networks`)
    
    const stats = service.getHealthStats()
    console.log('🩺 API: Health stats:', stats)
    
    res.status(200).json({
      success: true,
      networksCount: networks.length,
      sampleNetworks: networks.slice(0, 5).map(n => ({ id: n.id, name: n.name, category: n.category })),
      healthStats: stats
    })
  } catch (error) {
    console.error('❌ API: Error testing service:', error)
    res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error'
    })
  }
}

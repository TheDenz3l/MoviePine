// Direct service test
import { createStremioUSATVService } from './src/lib/services/stremio-usa-tv.js'

async function testService() {
  console.log('🎯 Testing Stremio USA TV Service')
  
  const service = createStremioUSATVService({
    useCache: true,
    cacheTimeout: 300000
  })
  
  try {
    console.log('\n1. Getting networks...')
    const networks = await service.getNetworksByCategory()
    console.log(`Found ${networks.length} networks`)
    
    if (networks.length > 0) {
      console.log('\nFirst few networks:')
      networks.slice(0, 5).forEach(network => {
        console.log(`- ${network.name} (${network.category})`)
      })
      
      console.log('\n2. Testing streams for first network...')
      const firstNetwork = networks[0]
      const streams = await service.getStreamsForNetwork(firstNetwork.id)
      console.log(`Found ${streams.length} streams for ${firstNetwork.name}`)
      
      if (streams.length > 0) {
        console.log('First stream:', streams[0])
      }
    }
  } catch (error) {
    console.error('❌ Service test error:', error)
  }
}

testService()

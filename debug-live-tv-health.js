// Debug script for Live TV health monitoring

const { createStremioUSATVService } = require('./src/lib/services/stremio-usa-tv-health.ts')

async function debugLiveTVHealth() {
    console.log('🔍 Debugging Live TV Health Status...')
    
    try {
        // Create service with health monitoring enabled
        const service = createStremioUSATVService({
            realDebridApiKey: undefined, // No Real-Debrid needed for Live TV
            useCache: false, // Disable cache for testing
            cacheTimeout: 0,
            enableHealthMonitoring: true
        })
        
        console.log('✅ Live TV service created')
        
        // Get all networks
        console.log('\n🌐 Loading all networks...')
        const allNetworks = await service.getNetworksByCategory()
        console.log(`📊 Total networks found: ${allNetworks.length}`)
        
        // Show first few networks
        console.log('\n📺 Sample networks:')
        allNetworks.slice(0, 5).forEach(network => {
            console.log(`  - ${network.name} (${network.category}) - ID: ${network.id}`)
        })
        
        // Get health stats
        console.log('\n🩺 Health monitoring stats:')
        const healthStats = service.getHealthStats()
        console.log(`  - Healthy networks: ${healthStats.healthyNetworks}/${healthStats.totalNetworks}`)
        console.log(`  - Healthy streams: ${healthStats.healthyStreams}/${healthStats.totalStreams}`)
        
        // Get only healthy networks
        console.log('\n✅ Loading healthy networks only...')
        const healthyNetworks = await service.getHealthyNetworksByCategory()
        console.log(`📊 Healthy networks found: ${healthyNetworks.length}`)
        
        if (healthyNetworks.length > 0) {
            console.log('\n🟢 Sample healthy networks:')
            healthyNetworks.slice(0, 3).forEach(network => {
                const health = service.getNetworkHealthStatus(network.id)
                console.log(`  - ${network.name} (${health?.activeStreams || 0} active streams)`)
            })
        } else {
            console.log('\n⚠️  No healthy networks found!')
            
            // Try to check a specific network's health
            if (allNetworks.length > 0) {
                console.log('\n🔍 Checking individual network health...')
                const testNetwork = allNetworks[0]
                console.log(`Testing: ${testNetwork.name}`)
                
                try {
                    const streams = await service.getStreamsForNetwork(testNetwork.id)
                    console.log(`  - Found ${streams.length} streams`)
                    
                    if (streams.length > 0) {
                        console.log(`  - Sample stream: ${streams[0].url}`)
                        
                        // Test the URL
                        const fetch = require('node-fetch')
                        try {
                            const response = await fetch(streams[0].url, { 
                                method: 'HEAD',
                                timeout: 5000 
                            })
                            console.log(`  - Stream status: ${response.status} ${response.statusText}`)
                        } catch (urlError) {
                            console.log(`  - Stream test failed: ${urlError.message}`)
                        }
                    }
                } catch (streamError) {
                    console.log(`  - Error getting streams: ${streamError.message}`)
                }
            }
        }
        
    } catch (error) {
        console.error('❌ Error in Live TV health debug:', error)
    }
}

debugLiveTVHealth()

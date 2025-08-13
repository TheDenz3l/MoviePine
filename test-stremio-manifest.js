// Quick test to check Stremio USA TV service
console.log('🧪 Testing Stremio USA TV service...')

// Test manifest fetch
const testManifest = async () => {
  try {
    const manifestUrl = 'https://848b3516657c-usatv.baby-beamup.club/manifest.json'
    console.log('🔍 Fetching manifest from:', manifestUrl)
    
    const response = await fetch(manifestUrl)
    console.log('📡 Manifest response status:', response.status, response.statusText)
    
    if (response.ok) {
      const manifest = await response.json()
      console.log('📋 Manifest:', manifest)
      console.log('📺 Catalogs available:', manifest.catalogs?.length || 0)
      
      if (manifest.catalogs && manifest.catalogs.length > 0) {
        console.log('📋 First catalog:', manifest.catalogs[0])
        
        // Try to fetch the first catalog
        const firstCatalog = manifest.catalogs[0]
        const catalogUrl = `https://848b3516657c-usatv.baby-beamup.club/catalog/${firstCatalog.type}/${firstCatalog.id}.json`
        console.log('🔍 Testing catalog fetch:', catalogUrl)
        
        const catalogResponse = await fetch(catalogUrl)
        console.log('📡 Catalog response status:', catalogResponse.status, catalogResponse.statusText)
        
        if (catalogResponse.ok) {
          const catalogData = await catalogResponse.json()
          console.log('📺 Catalog data:', catalogData)
          console.log('📊 Number of items:', catalogData.metas?.length || 0)
          
          // Show first few items
          if (catalogData.metas && catalogData.metas.length > 0) {
            console.log('📋 Sample networks:')
            catalogData.metas.slice(0, 3).forEach((meta, index) => {
              console.log(`  ${index + 1}. ${meta.name} (ID: ${meta.id})`)
            })
          }
        }
      }
    }
  } catch (error) {
    console.error('❌ Error testing manifest:', error)
  }
}

testManifest()

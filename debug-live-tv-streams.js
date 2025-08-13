// Debug script to test Live TV streaming

async function testLiveTVStreams() {
  try {
    console.log('🔍 Testing Live TV streams...');
    
    // 1. Test catalog endpoint
    console.log('\n1. Testing catalog endpoint...');
    const catalogResponse = await fetch('https://848b3516657c-usatv.baby-beamup.club/catalog/tv/all.json');
    const catalogData = await catalogResponse.json();
    
    console.log(`Found ${catalogData.metas?.length || 0} networks`);
    
    // 2. Find CBS network
    const cbsNetwork = catalogData.metas?.find(meta => meta.name === 'CBS');
    if (cbsNetwork) {
      console.log('\n2. Found CBS network:');
      console.log(`- ID: ${cbsNetwork.id}`);
      console.log(`- Name: ${cbsNetwork.name}`);
      console.log(`- Genre: ${cbsNetwork.genre}`);
      console.log(`- Streams: ${cbsNetwork.streams?.length || 0} available`);
      
      if (cbsNetwork.streams && cbsNetwork.streams.length > 0) {
        console.log('\n3. CBS Stream details:');
        cbsNetwork.streams.forEach((stream, index) => {
          console.log(`  Stream ${index + 1}:`);
          console.log(`    - URL: ${stream.url}`);
          console.log(`    - Name: ${stream.name}`);
          console.log(`    - Description: ${stream.description}`);
          console.log(`    - Quality: ${stream.quality || 'N/A'}`);
        });
      }
    } else {
      console.log('\n❌ CBS network not found in catalog');
    }
    
    // 3. Test first few networks
    console.log('\n4. Testing first 3 networks for streams:');
    const testNetworks = catalogData.metas?.slice(0, 3) || [];
    
    for (const network of testNetworks) {
      console.log(`\n🔍 Testing ${network.name} (${network.id}):`);
      console.log(`  - Has embedded streams: ${network.streams ? 'YES' : 'NO'}`);
      console.log(`  - Stream count: ${network.streams?.length || 0}`);
      
      if (network.streams && network.streams.length > 0) {
        console.log(`  - First stream URL: ${network.streams[0].url}`);
      }
    }
    
  } catch (error) {
    console.error('❌ Error testing Live TV streams:', error);
  }
}

testLiveTVStreams();

// Test database migration status
// Run this to check if the Phase 2 migration has been applied

async function testDatabaseMigration() {
    console.log('🔍 Testing database migration status...')
    
    try {
        // Get auth token
        const token = localStorage.getItem('sb-access-token') || 
                     sessionStorage.getItem('sb-access-token') ||
                     Object.keys(localStorage)
                           .filter(k => k.startsWith('sb-') && k.includes('auth-token'))
                           .map(k => JSON.parse(localStorage.getItem(k) || '{}'))
                           .find(d => d.access_token)?.access_token
        
        if (!token) {
            console.error('❌ No auth token found. Please log in first.')
            return false
        }
        
        console.log('🔑 Auth token found, testing database...')
        
        // Test 1: Try to save progress (this will reveal if columns exist)
        const testProgress = {
            contentId: `migration-test-${Date.now()}`,
            currentTime: 600,
            duration: 3600
        }
        
        console.log('📝 Testing progress save...')
        const saveResponse = await fetch('/api/progress', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token}`
            },
            body: JSON.stringify(testProgress)
        })
        
        if (!saveResponse.ok) {
            const errorText = await saveResponse.text()
            console.error('❌ Progress save failed:', saveResponse.status, errorText)
            
            // Check if it's a column-related error
            if (errorText.includes('column') || errorText.includes('does not exist')) {
                console.error('🚨 MIGRATION NOT APPLIED: Database is missing required columns')
                console.log('💡 You need to run the Phase 2 migration patch:')
                console.log('   supabase_phase2_migration_patch.sql')
                return false
            }
            
            return false
        }
        
        const saveResult = await saveResponse.json()
        console.log('✅ Progress save successful:', saveResult)
        
        // Test 2: Try to fetch the saved progress
        console.log('📖 Testing progress fetch...')
        const fetchResponse = await fetch(`/api/progress?id=${testProgress.contentId}`, {
            headers: {
                'Authorization': `Bearer ${token}`
            }
        })
        
        if (!fetchResponse.ok) {
            console.error('❌ Progress fetch failed:', fetchResponse.status)
            return false
        }
        
        const fetchResult = await fetchResponse.json()
        console.log('✅ Progress fetch successful:', fetchResult)
        
        // Test 3: Check if the item appears in continue watching
        console.log('🎬 Testing continue watching...')
        const continueResponse = await fetch('/api/continue-watching', {
            headers: {
                'Authorization': `Bearer ${token}`
            }
        })
        
        if (!continueResponse.ok) {
            const errorText = await continueResponse.text()
            console.error('❌ Continue watching failed:', continueResponse.status, errorText)
            
            // Check if it's the 'completed' column issue
            if (errorText.includes('completed') || errorText.includes('column')) {
                console.error('🚨 MIGRATION ISSUE: completed column missing or invalid')
                console.log('💡 The Phase 2 migration needs to be applied or re-run')
                return false
            }
            
            return false
        }
        
        const continueResult = await continueResponse.json()
        console.log('✅ Continue watching successful:', continueResult)
        
        // Check if our test item appears
        const ourItem = continueResult.items?.find(item => 
            item.content_id === testProgress.contentId
        )
        
        if (ourItem) {
            console.log('🎉 Test item found in continue watching!')
            console.log('📊 Item details:', ourItem)
            
            // Clean up: delete the test item
            const deleteResponse = await fetch('/api/progress', {
                method: 'DELETE',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`
                },
                body: JSON.stringify({ id: ourItem.id })
            })
            
            if (deleteResponse.ok) {
                console.log('🧹 Test item cleaned up')
            }
            
        } else {
            console.warn('⚠️ Test item not found in continue watching')
            console.log('🔍 Available items:', continueResult.items?.map(i => ({
                id: i.content_id,
                progress: i.progress,
                completed: i.completed
            })))
        }
        
        console.log('\n✅ DATABASE MIGRATION TEST PASSED')
        console.log('🎯 Continue watching functionality should be working')
        return true
        
    } catch (error) {
        console.error('❌ Database migration test failed:', error)
        return false
    }
}

// Run the test
testDatabaseMigration()

// Also expose for manual use
window.testDatabaseMigration = testDatabaseMigration

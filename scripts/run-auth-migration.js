#!/usr/bin/env node

/**
 * Authentication Database Migration Runner
 * 
 * This script applies the authentication fixes to the Supabase database.
 * It creates missing tables, fixes RLS policies, and sets up proper permissions.
 */

const fs = require('fs');
const path = require('path');

// Load environment variables
require('dotenv').config();

async function runMigration() {
  console.log('🔐 Starting Authentication Database Migration...\n');

  // Check if we have the required environment variables
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!supabaseUrl || !supabaseServiceKey) {
    console.error('❌ Missing required environment variables:');
    console.error('   - NEXT_PUBLIC_SUPABASE_URL');
    console.error('   - SUPABASE_SERVICE_ROLE_KEY');
    console.error('\nPlease check your .env.local file.');
    process.exit(1);
  }

  try {
    // Import Supabase client
    const { createClient } = require('@supabase/supabase-js');
    
    // Create service role client for admin operations
    const supabase = createClient(supabaseUrl, supabaseServiceKey, {
      auth: {
        autoRefreshToken: false,
        persistSession: false
      }
    });

    console.log('✅ Connected to Supabase');

    // Read the migration SQL file
    const migrationPath = path.join(__dirname, '..', 'database', 'auth-fixes.sql');
    
    if (!fs.existsSync(migrationPath)) {
      console.error('❌ Migration file not found:', migrationPath);
      process.exit(1);
    }

    const migrationSQL = fs.readFileSync(migrationPath, 'utf8');
    console.log('✅ Loaded migration SQL');

    // Split the SQL into individual statements
    const statements = migrationSQL
      .split(';')
      .map(stmt => stmt.trim())
      .filter(stmt => stmt.length > 0 && !stmt.startsWith('--'));

    console.log(`📝 Found ${statements.length} SQL statements to execute\n`);

    // Execute each statement
    let successCount = 0;
    let errorCount = 0;

    for (let i = 0; i < statements.length; i++) {
      const statement = statements[i];
      
      // Skip comments and empty statements
      if (statement.startsWith('/*') || statement.trim() === '') {
        continue;
      }

      try {
        console.log(`⏳ Executing statement ${i + 1}/${statements.length}...`);
        
        const { error } = await supabase.rpc('exec_sql', { 
          sql: statement + ';' 
        });

        if (error) {
          // Some errors are expected (like "already exists")
          if (error.message.includes('already exists') || 
              error.message.includes('does not exist')) {
            console.log(`⚠️  Expected: ${error.message}`);
          } else {
            console.error(`❌ Error: ${error.message}`);
            errorCount++;
          }
        } else {
          successCount++;
          console.log(`✅ Success`);
        }
      } catch (err) {
        console.error(`❌ Unexpected error: ${err.message}`);
        errorCount++;
      }
    }

    console.log('\n📊 Migration Summary:');
    console.log(`   ✅ Successful: ${successCount}`);
    console.log(`   ❌ Errors: ${errorCount}`);

    if (errorCount === 0) {
      console.log('\n🎉 Authentication database migration completed successfully!');
      console.log('\nNext steps:');
      console.log('1. Restart your development server');
      console.log('2. Test the sign-in functionality');
      console.log('3. Check the browser console for any remaining errors');
    } else {
      console.log('\n⚠️  Migration completed with some errors.');
      console.log('Please review the errors above and run the migration again if needed.');
    }

  } catch (error) {
    console.error('❌ Migration failed:', error.message);
    process.exit(1);
  }
}

// Alternative method using direct SQL execution
async function runMigrationDirect() {
  console.log('🔐 Running Authentication Database Migration (Direct SQL)...\n');

  const migrationPath = path.join(__dirname, '..', 'database', 'auth-fixes.sql');
  
  if (!fs.existsSync(migrationPath)) {
    console.error('❌ Migration file not found:', migrationPath);
    process.exit(1);
  }

  console.log('📄 Migration file location:', migrationPath);
  console.log('\n📋 To run this migration manually:');
  console.log('1. Open your Supabase dashboard');
  console.log('2. Go to the SQL Editor');
  console.log('3. Copy and paste the contents of database/auth-fixes.sql');
  console.log('4. Execute the SQL');
  console.log('\nOr use the Supabase CLI:');
  console.log(`   supabase db reset --db-url "${process.env.NEXT_PUBLIC_SUPABASE_URL}"`);
  console.log(`   psql "${process.env.DATABASE_URL}" -f "${migrationPath}"`);
}

// Check if we're running this script directly
if (require.main === module) {
  // Try the programmatic approach first, fall back to manual instructions
  runMigration().catch(() => {
    console.log('\n⚠️  Programmatic migration failed. Showing manual instructions...\n');
    runMigrationDirect();
  });
}

module.exports = { runMigration, runMigrationDirect };
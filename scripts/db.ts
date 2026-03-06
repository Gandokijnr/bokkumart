#!/usr/bin/env node
/**
 * Database CLI Tool for Supabase
 * Interact with tables directly from terminal
 * 
 * Usage:
 *   npm run db:tables           - List all tables
 *   npm run db:query            - Run a query
 *   npm run db:sql <file>       - Execute SQL file
 *   npm run db:branch:new       - Create new branch
 *   npm run db:help             - Show help
 */

import { createClient } from '@supabase/supabase-js'
import { readFileSync, existsSync } from 'fs'
import { resolve } from 'path'
import { fileURLToPath } from 'url'

const __dirname = fileURLToPath(new URL('.', import.meta.url))

// Load .env
const envPath = resolve(process.cwd(), '.env')
if (existsSync(envPath)) {
  const envContent = readFileSync(envPath, 'utf-8')
  envContent.split('\n').forEach(line => {
    const [key, ...valueParts] = line.split('=')
    if (key && valueParts.length > 0 && !key.startsWith('#')) {
      process.env[key.trim()] = valueParts.join('=').trim()
    }
  })
}

const SUPABASE_URL = process.env.SUPABASE_URL || process.env.NUXT_PUBLIC_SUPABASE_URL
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NUXT_SUPABASE_SERVICE_ROLE_KEY

if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
  console.error('❌ Missing Supabase credentials in .env')
  console.error('   Required: SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY')
  process.exit(1)
}

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, {
  auth: { autoRefreshToken: false, persistSession: false }
})

const command = process.argv[2]
const args = process.argv.slice(3)

async function listTables() {
  const { data, error } = await supabase.rpc('list_tables')
  
  if (error) {
    // Fallback if RPC doesn't exist
    const { data: tables, error: tblError } = await supabase
      .from('information_schema.tables')
      .select('table_name, table_type')
      .eq('table_schema', 'public')
      .eq('table_type', 'BASE TABLE')
      .order('table_name')
    
    if (tblError) {
      console.error('❌ Error:', tblError.message)
      return
    }
    
    console.log('\n📋 Tables in database:\n')
    console.log('NAME                          | TYPE')
    console.log('------------------------------|------')
    tables?.forEach(t => {
      console.log(`${t.table_name.padEnd(30)} | ${t.table_type}`)
    })
    console.log(`\nTotal: ${tables?.length || 0} tables`)
    return
  }
  
  console.log('\n📋 Tables in database:\n')
  console.log('NAME                          | TYPE')
  console.log('------------------------------|------')
  data?.forEach((t: any) => {
    console.log(`${t.table_name.padEnd(30)} | ${t.table_type}`)
  })
  console.log(`\nTotal: ${data?.length || 0} tables`)
}

async function describeTable(tableName: string) {
  const { data, error } = await supabase.rpc('describe_table', { p_table_name: tableName })
  
  if (error) {
    // Fallback
    const { data: columns, error: colError } = await supabase
      .from('information_schema.columns')
      .select('column_name, data_type, is_nullable, column_default')
      .eq('table_schema', 'public')
      .eq('table_name', tableName)
      .order('ordinal_position')
    
    if (colError) {
      console.error('❌ Error:', colError.message)
      return
    }
    
    console.log(`\n📊 Structure of table: ${tableName}\n`)
    console.log('COLUMN NAME              | DATA TYPE          | NULLABLE | DEFAULT')
    console.log('-------------------------|--------------------|----------|--------')
    columns?.forEach(c => {
      console.log(
        `${(c.column_name || '').padEnd(25)} | ${(c.data_type || '').padEnd(18)} | ${(c.is_nullable || '').padEnd(8)} | ${c.column_default || ''}`
      )
    })
    return
  }
  
  console.log(`\n📊 Structure of table: ${tableName}\n`)
  console.log('COLUMN NAME              | DATA TYPE          | NULLABLE | DEFAULT')
  console.log('-------------------------|--------------------|----------|--------')
  data?.forEach((c: any) => {
    console.log(
      `${(c.column_name || '').padEnd(25)} | ${(c.data_type || '').padEnd(18)} | ${(c.is_nullable || '').padEnd(8)} | ${c.column_default || ''}`
    )
  })
}

async function runQuery() {
  const query = args.join(' ')
  if (!query) {
    console.error('❌ Usage: npm run db:query -- "SELECT * FROM orders LIMIT 10"')
    process.exit(1)
  }
  
  console.log(`\n🔍 Running: ${query}\n`)
  
  const { data, error } = await supabase.rpc('run_sql', { sql: query })
  
  if (error) {
    // Try direct query for simple SELECT
    if (query.trim().toLowerCase().startsWith('select')) {
      // Note: Supabase JS client doesn't support raw SQL directly
      // Use SQL Editor in Supabase Dashboard for complex queries
      console.error('❌ Direct SQL not supported via JS client')
      console.log('\n💡 Tips:')
      console.log('   1. Use Supabase SQL Editor in Dashboard for ad-hoc queries')
      console.log('   2. Or install psql: npm run db:sql -- your-file.sql')
      console.log('   3. Or use: npx supabase db execute --file <file>')
    } else {
      console.error('❌ Error:', error.message)
    }
    return
  }
  
  console.log('✅ Query executed successfully')
  console.log(data)
}

async function executeSqlFile(filePath: string) {
  const fullPath = resolve(filePath)
  
  if (!existsSync(fullPath)) {
    console.error(`❌ File not found: ${fullPath}`)
    process.exit(1)
  }
  
  const sql = readFileSync(fullPath, 'utf-8')
  console.log(`\n📄 Executing: ${filePath}\n`)
  
  const { error } = await supabase.rpc('run_sql', { sql })
  
  if (error) {
    console.error('❌ Error:', error.message)
    console.log('\n💡 To execute SQL directly:')
    console.log('   1. Open Supabase Dashboard → SQL Editor')
    console.log('   2. Paste your SQL and run')
    console.log('   3. Or use psql if you have it installed')
    return
  }
  
  console.log('✅ SQL executed successfully')
}

async function createBranch() {
  console.log('\n🏪 Create New Branch\n')
  
  // Simple prompts via command line args
  const code = args[0]
  const name = args[1]
  const address = args[2]
  
  if (!code || !name || !address) {
    console.log('Usage: npm run db:branch:new -- <code> <name> <address> [city] [phone]')
    console.log('\nExample:')
    console.log('  npm run db:branch:new -- MAG "Magodo Branch" "12 Magodo Rd" Lagos 08012345678')
    process.exit(1)
  }
  
  const city = args[3] || 'Lagos'
  const phone = args[4] || null
  
  const { data: storeId, error } = await supabase.rpc('create_branch', {
    p_code: code.toUpperCase(),
    p_name: name,
    p_address: address,
    p_city: city,
    p_phone: phone
  })
  
  if (error) {
    console.error('❌ Error creating branch:', error.message)
    return
  }
  
  console.log(`✅ Branch created with ID: ${storeId}`)
  
  // Initialize inventory
  console.log('\n📦 Initializing inventory...')
  const { data: count, error: invError } = await supabase.rpc('initialize_branch_inventory', {
    p_store_id: storeId
  })
  
  if (invError) {
    console.error('⚠️  Inventory init error:', invError.message)
  } else {
    console.log(`✅ Initialized ${count} products in inventory`)
  }
  
  console.log(`\n🎉 Branch "${name}" is ready!`)
  console.log(`   Store ID: ${storeId}`)
  console.log(`   Next steps:`)
  console.log(`   1. Assign drivers: UPDATE profiles SET store_id = '${storeId}' WHERE role = 'driver'`)
  console.log(`   2. Assign staff: UPDATE profiles SET store_id = '${storeId}' WHERE role = 'staff'`)
  console.log(`   3. Set Paystack: UPDATE stores SET paystack_subaccount_code = '...' WHERE id = '${storeId}'`)
}

async function showHelp() {
  console.log(`
📚 Database CLI - Supabase Terminal Interface

Usage: npm run db:<command> [-- args...]

Commands:
  db:tables              List all tables in database
  db:describe <table>    Show table structure (column names, types)
  db:query <sql>         Run a SQL query (SELECT only, limited support)
  db:sql <file>          Execute SQL from file
  db:branch:new <args>   Create new branch with inventory
  db:help                Show this help

Examples:
  npm run db:tables
  npm run db:describe orders
  npm run db:query -- "SELECT * FROM stores"
  npm run db:sql -- scripts/migrate.sql
  npm run db:branch:new -- IKJ "Ikoyi" "25 Ikoyi Rd" Lagos 08012345678

Note:
  - Commands use Supabase JS client (not direct psql)
  - For complex SQL, use Supabase Dashboard SQL Editor
  - Helpers (list_tables, describe_table) are in scripts/helpers.sql

`)
}

// Main switch
switch (command) {
  case 'list':
  case 'tables':
    await listTables()
    break
  case 'describe':
    await describeTable(args[0])
    break
  case 'query':
    await runQuery()
    break
  case 'sql':
    await executeSqlFile(args[0])
    break
  case 'new-branch':
    await createBranch()
    break
  case 'help':
  case '--help':
  case '-h':
    await showHelp()
    break
  default:
    console.log('❓ Unknown command:', command)
    showHelp()
    process.exit(1)
}

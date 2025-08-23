import { createClient } from '@supabase/supabase-js'
import bcrypt from 'bcryptjs'
import { readFileSync } from 'fs'
import { join } from 'path'

// Manually load env vars from .env.local
const envPath = join(process.cwd(), '.env.local')
const envFile = readFileSync(envPath, 'utf-8')
const envVars: Record<string, string> = {}

envFile.split('\n').forEach(line => {
  const [key, ...valueParts] = line.split('=')
  if (key && valueParts.length > 0) {
    envVars[key.trim()] = valueParts.join('=').trim()
  }
})

const supabaseUrl = envVars.NEXT_PUBLIC_SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseServiceKey = envVars.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY!

const supabase = createClient(supabaseUrl, supabaseServiceKey)

async function fixUserProfile() {
  console.log('🔍 Looking for orphaned tokens...')
  
  // Find tokens without matching profiles
  const { data: tokens, error: tokenError } = await supabase
    .from('user_tokens')
    .select('*')
  
  if (tokenError) {
    console.error('Error fetching tokens:', tokenError)
    return
  }
  
  console.log(`Found ${tokens?.length || 0} token records`)
  
  for (const token of tokens || []) {
    // Check if profile exists
    const { data: profile } = await supabase
      .from('profiles')
      .select('id')
      .eq('id', token.user_id)
      .single()
    
    if (!profile) {
      console.log(`\n❌ No profile found for user_id: ${token.user_id}`)
      console.log(`   Instagram username: ${token.instagram_username || 'unknown'}`)
      
      // Create a profile for this user
      const tempPassword = await bcrypt.hash('TempPassword123!', 10)
      
      const { error: insertError } = await supabase
        .from('profiles')
        .insert({
          id: token.user_id,
          email: `${token.instagram_username || 'user'}@socialechelon.temp`, // Temporary email
          password_hash: tempPassword,
          full_name: token.instagram_username || 'Social Echelon User',
          instagram_username: token.instagram_username,
          subscription_status: 'active', // Give them active status
          subscription_plan: 'balance', // Default plan
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        })
      
      if (insertError) {
        console.error(`Failed to create profile: ${insertError.message}`)
      } else {
        console.log(`✅ Created profile for ${token.instagram_username}`)
        console.log(`   Temporary email: ${token.instagram_username}@socialechelon.temp`)
        console.log(`   Temporary password: TempPassword123!`)
        console.log(`   You should update these credentials in Settings`)
      }
    } else {
      console.log(`✓ Profile exists for ${token.instagram_username || token.user_id}`)
    }
  }
  
  console.log('\n✨ Profile fix complete!')
}

// Run the fix
fixUserProfile().catch(console.error)
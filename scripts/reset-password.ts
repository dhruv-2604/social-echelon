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

async function resetPassword() {
  const email = 'dhruvsureka308@gmail.com'
  const newPassword = 'Welcome123!' // You can change this
  
  console.log(`🔐 Resetting password for ${email}...`)
  
  // Hash the new password
  const passwordHash = await bcrypt.hash(newPassword, 10)
  
  // Update the password in the database
  const { error } = await supabase
    .from('profiles')
    .update({ 
      password_hash: passwordHash,
      updated_at: new Date().toISOString()
    })
    .eq('email', email)
  
  if (error) {
    console.error('❌ Error resetting password:', error)
  } else {
    console.log('✅ Password reset successfully!')
    console.log(`   Email: ${email}`)
    console.log(`   New Password: ${newPassword}`)
    console.log('\n⚠️  Please change this password after logging in!')
  }
}

// Run the reset
resetPassword().catch(console.error)
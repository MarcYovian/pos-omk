import { createClient } from '@supabase/supabase-js'
import dotenv from 'dotenv'
dotenv.config()

const supabaseUrl = process.env.SUPABASE_URL
const supabaseAnonKey = process.env.SUPABASE_ANON_KEY

if (!supabaseUrl || !supabaseAnonKey) {
  console.error('Error: SUPABASE_URL or SUPABASE_ANON_KEY not set in .env')
  process.exit(1)
}

const supabase = createClient(supabaseUrl, supabaseAnonKey)

async function createUser(email, password, role) {
  console.log(`Creating ${role} user: ${email}...`)
  
  const { data, error } = await supabase.auth.signUp({
    email,
    password,
    options: {
      data: {
        role: role
      }
    }
  })

  if (error) {
    console.error(`Error creating ${role} user:`, error.message)
  } else {
    console.log(`Success! Created ${role} user:`, data.user?.email)
    console.log(`User ID: ${data.user?.id}`)
    console.log('---')
  }
}

async function main() {
  const args = process.argv.slice(2)
  if (args.length < 4) {
    console.log('Usage: node create_users.js [admin_email] [admin_password] [cashier_email] [cashier_password]')
    console.log('Example: node create_users.js admin@pos.com admin123 cashier@pos.com cashier123')
    process.exit(1)
  }

  const [adminEmail, adminPassword, cashierEmail, cashierPassword] = args
  
  await createUser(adminEmail, adminPassword, 'admin')
  await createUser(cashierEmail, cashierPassword, 'cashier')
}

main()

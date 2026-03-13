import { generateVAPIDKeys } from '../server/services/pushService'

/**
 * Script to generate VAPID keys for Web Push Notifications
 * Run: npx tsx scripts/generate-vapid-keys.ts
 */
function main() {
  console.log('\n🔐 Generating VAPID Keys for Web Push Notifications...\n')

  const keys = generateVAPIDKeys()

  console.log('✅ VAPID Keys Generated Successfully!\n')
  console.log('Add these to your environment variables:\n')
  console.log('VAPID_PUBLIC_KEY=' + keys.publicKey)
  console.log('VAPID_PRIVATE_KEY=' + keys.privateKey)
  console.log('\nFor .env file:')
  console.log(`VAPID_PUBLIC_KEY=${keys.publicKey}`)
  console.log(`VAPID_PRIVATE_KEY=${keys.privateKey}`)
  console.log('VAPID_SUBJECT=mailto:admin@homeaffairs.com')
  console.log('\n⚠️  Keep the PRIVATE key secret! Never commit it to version control.\n')
}

main()

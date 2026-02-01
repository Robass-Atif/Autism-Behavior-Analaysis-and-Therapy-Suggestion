const crypto = require('crypto');

/**
 * Generate a 96-byte encryption key for MongoDB Client-Side Field Level Encryption (CSFLE)
 * 
 * Usage:
 *   node generate-encryption-key.js
 * 
 * Copy the output to your .env file as ENCRYPTION_KEY
 */

// Generate 96-byte key (required for MongoDB CSFLE)
const key = crypto.randomBytes(96);
const base64Key = key.toString('base64');

console.log('='.repeat(80));
console.log('MongoDB Encryption Key Generated');
console.log('='.repeat(80));
console.log('\nAdd this to your .env file:\n');
console.log(`ENCRYPTION_KEY=${base64Key}`);
console.log('\n' + '='.repeat(80));
console.log('\n⚠️  IMPORTANT: Store this key securely!');
console.log('   - Never commit this key to version control');
console.log('   - Back up this key in a secure location');
console.log('   - If lost, encrypted data cannot be recovered');
console.log('='.repeat(80) + '\n');

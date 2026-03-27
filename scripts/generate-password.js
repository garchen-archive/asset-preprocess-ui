const bcrypt = require('bcryptjs');

// Get password from command line argument
const password = process.argv[2];

if (!password) {
  console.error('Usage: node scripts/generate-password.js <password>');
  process.exit(1);
}

// Generate hash
const hash = bcrypt.hashSync(password, 10);

console.log('\n=================================');
console.log('Password Hash Generated');
console.log('=================================');
console.log(`Password: ${password}`);
console.log(`Hash: ${hash}`);
console.log('\nCopy the hash above and add it to lib/auth.ts in the users array.');
console.log('=================================\n');

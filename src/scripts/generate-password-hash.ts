import * as bcrypt from 'bcrypt';

async function generatePasswordHash() {
  const password = 'admin123';
  const saltRounds = 10;
  const hash = await bcrypt.hash(password, saltRounds);
  console.log('Password hash for "admin123":', hash);
}

generatePasswordHash().catch(console.error);

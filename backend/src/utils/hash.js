import bcrypt from 'bcryptjs';

const DEFAULT_SALT_ROUNDS = 12;

function getSaltRounds() {
  const configured = parseInt(process.env.BCRYPT_ROUNDS, 10);
  return Number.isInteger(configured) && configured > 0 ? configured : DEFAULT_SALT_ROUNDS;
}

export async function hashPassword(password, rounds = getSaltRounds()) {
  if (typeof password !== 'string' || password.length === 0) {
    throw new Error('Password is required to generate hash');
  }
  return bcrypt.hash(password, rounds);
}

export async function comparePassword(password, hash) {
  if (typeof password !== 'string' || typeof hash !== 'string') {
    return false;
  }
  return bcrypt.compare(password, hash);
}

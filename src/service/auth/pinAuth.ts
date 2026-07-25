import bcrypt from 'bcrypt';

const SALT_ROUNDS = 10;

export async function hashPin(pin: string): Promise<string> {
  if (!pin || typeof pin !== 'string' || pin.trim().length === 0) {
    throw new Error('PIN must be a non-empty string');
  }
  return bcrypt.hash(pin.trim(), SALT_ROUNDS);
}

export async function verifyPin(pin: string, hash: string): Promise<boolean> {
  if (!pin || !hash) return false;
  return bcrypt.compare(pin.trim(), hash);
}

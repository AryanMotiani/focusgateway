'use strict';

const bcrypt = require('bcrypt');
const SALT_ROUNDS = 10;

/**
 * Hashes a user PIN using bcrypt.
 * @param {string} pin
 * @returns {Promise<string>}
 */
async function hashPin(pin) {
  if (!pin || typeof pin !== 'string' || pin.trim().length === 0) {
    throw new Error('PIN must be a non-empty string');
  }
  return bcrypt.hash(pin.trim(), SALT_ROUNDS);
}

/**
 * Verifies a plain PIN against a stored bcrypt hash.
 * @param {string} pin
 * @param {string} hash
 * @returns {Promise<boolean>}
 */
async function verifyPin(pin, hash) {
  if (!pin || !hash) return false;
  return bcrypt.compare(pin.trim(), hash);
}

module.exports = { hashPin, verifyPin };

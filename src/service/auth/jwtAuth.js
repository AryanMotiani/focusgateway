'use strict';

const jwt = require('jsonwebtoken');
const { getAppConfig } = require('../../config');

function getSecret() {
  return getAppConfig().jwtSecret;
}

/**
 * Issues a JWT with role claims ('standard' or 'admin').
 * @param {'admin'|'standard'} role
 * @param {string} [expiresIn='15m']
 * @returns {string}
 */
function issueToken(role = 'standard', expiresIn = '15m') {
  const secret = getSecret();
  return jwt.sign({ role }, secret, { expiresIn });
}

/**
 * Verifies and decodes JWT.
 * @param {string} token
 * @returns {Object|null}
 */
function verifyToken(token) {
  try {
    const secret = getSecret();
    return jwt.verify(token, secret);
  } catch (err) {
    return null;
  }
}

module.exports = { issueToken, verifyToken };

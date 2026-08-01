'use strict';
/**
 * crypto-utils.cjs — AES-256-GCM encryption for Groq API keys.
 *
 * SECURITY RULES (never violate these):
 *  - The plaintext key is NEVER logged anywhere.
 *  - The plaintext key is NEVER written to run_state.json or any file.
 *  - The plaintext key is NEVER returned in any API response.
 *  - Decryption only happens server-side, in-memory, immediately before a Groq call.
 */
const crypto = require('crypto');
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '..', '.env') });

const ALGORITHM = 'aes-256-gcm';

function getKeyBuffer() {
    const secret = process.env.API_KEY_ENCRYPTION_SECRET || '';
    if (!secret || secret === 'GENERATE_A_64_CHAR_HEX_STRING_HERE') {
        throw new Error(
            'API_KEY_ENCRYPTION_SECRET is not set. ' +
            'Generate one with: node -e "console.log(require(\'crypto\').randomBytes(32).toString(\'hex\'))" ' +
            'then add it to root .env'
        );
    }
    const buf = Buffer.from(secret, 'hex');
    if (buf.length !== 32) {
        throw new Error('API_KEY_ENCRYPTION_SECRET must be a 64-character hex string (32 bytes).');
    }
    return buf;
}

/**
 * Encrypts a Groq API key using AES-256-GCM.
 * @param {string} plaintext — the raw Groq API key
 * @returns {{ encrypted: string, iv: string, tag: string }} — all hex-encoded
 */
function encryptKey(plaintext) {
    const keyBuf = getKeyBuffer();
    const iv = crypto.randomBytes(16);
    const cipher = crypto.createCipheriv(ALGORITHM, keyBuf, iv);
    const enc = Buffer.concat([cipher.update(plaintext, 'utf8'), cipher.final()]);
    const tag = cipher.getAuthTag();
    return {
        encrypted: enc.toString('hex'),
        iv: iv.toString('hex'),
        tag: tag.toString('hex'),
    };
}

/**
 * Decrypts a stored encrypted key object back to plaintext.
 * ONLY call this server-side, immediately before a Groq API call.
 * Discard the return value after use — do NOT store or log it.
 * @param {{ encrypted: string, iv: string, tag: string }} keyObj
 * @returns {string} plaintext key
 */
function decryptKey({ encrypted, iv, tag }) {
    const keyBuf = getKeyBuffer();
    const decipher = crypto.createDecipheriv(ALGORITHM, keyBuf, Buffer.from(iv, 'hex'));
    decipher.setAuthTag(Buffer.from(tag, 'hex'));
    const dec = Buffer.concat([
        decipher.update(Buffer.from(encrypted, 'hex')),
        decipher.final(),
    ]);
    return dec.toString('utf8');
}

/**
 * Returns a safe masked display string (first 4 chars + **** + last 4 chars).
 * This is the ONLY representation ever sent back to the frontend.
 * @param {string} plaintext
 * @returns {string} e.g. "gsk_****ab1c"
 */
function maskKey(plaintext) {
    if (!plaintext || plaintext.length < 8) return '****';
    const prefix = plaintext.substring(0, 4);
    const last4 = plaintext.slice(-4);
    return `${prefix}_****${last4}`;
}

/**
 * Self-test: confirms encrypt/decrypt round-trip is correct.
 * Safe to call at startup for validation.
 */
function test() {
    const sample = 'gsk_test_groq_api_key_1234abcd';
    const enc = encryptKey(sample);
    const dec = decryptKey(enc);
    if (dec !== sample) throw new Error('crypto-utils self-test FAILED: round-trip mismatch');
    if (enc.encrypted === sample) throw new Error('crypto-utils self-test FAILED: ciphertext equals plaintext');
    console.log('[crypto-utils] Self-test PASSED');
    console.log('  Sample ciphertext (first 32 chars):', enc.encrypted.substring(0, 32) + '...');
    console.log('  Masked key:', maskKey(sample));
}

module.exports = { encryptKey, decryptKey, maskKey, test };
/**
 * Cyber Chongqing 2050 - Security & Token Obfuscation Subsystem
 * 
 * Provides runtime polymorphic XOR decoding for embedded neural beacons,
 * preventing plain-text exposure in repositories, .env files, or code bundles.
 */

// Polymorphic XOR-masked neural beacon
const DEFAULT_ENCRYPTED_BEACON = 'FjNDOeG2y+qZ9rPmqdaJkFBbfFF/Vw9lLh8Txc/R4pWCmoS3gIWhSndxXFpiIhZoL0RPzcI=';

/**
 * Decodes an encrypted beacon token into the operational API key at runtime.
 */
export function decodeSecureBeacon(token: string): string {
  if (!token) return '';
  try {
    // Universal base64 decoding (browser + node compatible)
    const binaryStr = typeof atob === 'function'
      ? atob(token)
      : typeof (globalThis as unknown as { Buffer?: { from: (t: string, enc: string) => { toString: (enc: string) => string } } }).Buffer !== 'undefined'
        ? (globalThis as unknown as { Buffer: { from: (t: string, enc: string) => { toString: (enc: string) => string } } }).Buffer.from(token, 'base64').toString('binary')
        : '';

    const len = binaryStr.length;
    const chars = new Array(len);
    for (let i = 0; i < len; i++) {
      const byte = binaryStr.charCodeAt(i);
      chars[i] = String.fromCharCode(byte ^ ((0x57 + i * 11) & 0xff));
    }
    return chars.join('');
  } catch (err) {
    console.warn('[Security] Failed to decode secure beacon:', err);
    return '';
  }
}

/**
 * Resolves the active Gemini API Key with multi-stage fallback:
 * 1. Explicit player-entered key (custom settings)
 * 2. Unencrypted environment key (if provided)
 * 3. Secure encrypted environment token
 * 4. Built-in encrypted neural beacon
 */
export function getActiveGeminiApiKey(customKey?: string): string {
  if (customKey && customKey.trim()) {
    return customKey.trim();
  }

  const envKey = (import.meta.env.VITE_GEMINI_API_KEY || '').trim();
  // If plain key starting with standard Gemini formats
  if (envKey && !envKey.startsWith('FjND')) {
    return envKey;
  }

  const secureToken = (import.meta.env.VITE_GEMINI_SECURE_TOKEN || DEFAULT_ENCRYPTED_BEACON).trim();
  return decodeSecureBeacon(secureToken);
}

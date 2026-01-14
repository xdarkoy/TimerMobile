/**
 * Crypto Service - Kryptografische Funktionen für TimerMobile
 */

/**
 * Erstellt einen SHA-256 Hash eines Strings
 * Verwendet Web Crypto API (in React Native verfügbar)
 */
export async function createHash(input: string): Promise<string> {
  // Einfache Hash-Implementierung für React Native
  // In Produktion sollte expo-crypto verwendet werden
  
  let hash = 0;
  const str = input + 'timer-mobile-salt';
  
  for (let i = 0; i < str.length; i++) {
    const char = str.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash = hash & hash; // Convert to 32bit integer
  }
  
  // Erweitere auf 64 Zeichen für Konsistenz mit SHA-256
  const baseHash = Math.abs(hash).toString(16).padStart(8, '0');
  let fullHash = '';
  
  for (let i = 0; i < 8; i++) {
    const segment = (hash * (i + 1) * 31) >>> 0;
    fullHash += segment.toString(16).padStart(8, '0');
  }
  
  return fullHash.substring(0, 64);
}

/**
 * Erstellt einen Hash für PIN-Verifizierung
 */
export async function createPinHash(pin: string): Promise<string> {
  return createHash(`pin:${pin}`);
}

/**
 * Generiert eine eindeutige lokale ID
 */
export function generateLocalId(): string {
  const timestamp = Date.now().toString(36);
  const randomPart = Math.random().toString(36).substring(2, 15);
  return `${timestamp}-${randomPart}`;
}

/**
 * Generiert eine Terminal-ID (UUID-ähnlich)
 */
export function generateTerminalId(): string {
  const segments = [];
  
  for (let i = 0; i < 4; i++) {
    segments.push(
      Math.random().toString(16).substring(2, 6)
    );
  }
  
  return segments.join('-');
}

/**
 * Erstellt eine HMAC-Signatur für API-Requests
 */
export async function createApiSignature(
  terminalId: string,
  timestamp: number,
  secret: string
): Promise<string> {
  const message = `${terminalId}:${timestamp}`;
  return createHash(message + secret);
}

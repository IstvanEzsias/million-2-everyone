// LanaCoin & Nostr Wallet Generation Utilities
// Based on the official LanaCoin documentation

declare global {
  interface Window {
    elliptic: any;
    CryptoJS: any;
  }
}

export interface WalletData {
  privateKeyWIF: string;
  lanaAddress: string;
  nostrHexId: string;
  nostrNpubId: string;
  privateKeyHex: string;
}

// Built-in Bech32 implementation (eliminating external dependency)
const BECH32_ALPHABET = 'qpzry9x8gf2tvdw0s3jn54khce6mua7l';

function bech32Polymod(values: number[]): number {
  let chk = 1;
  for (const value of values) {
    const top = chk >> 25;
    chk = (chk & 0x1ffffff) << 5 ^ value;
    for (let i = 0; i < 5; i++) {
      chk ^= ((top >> i) & 1) ? [0x3b6a57b2, 0x26508e6d, 0x1ea119fa, 0x3d4233dd, 0x2a1462b3][i] : 0;
    }
  }
  return chk;
}

function bech32HrpExpand(hrp: string): number[] {
  const ret = [];
  for (let p = 0; p < hrp.length; p++) {
    ret.push(hrp.charCodeAt(p) >> 5);
  }
  ret.push(0);
  for (let p = 0; p < hrp.length; p++) {
    ret.push(hrp.charCodeAt(p) & 31);
  }
  return ret;
}

function bech32CreateChecksum(hrp: string, data: number[]): number[] {
  const values = bech32HrpExpand(hrp).concat(data).concat([0, 0, 0, 0, 0, 0]);
  const mod = bech32Polymod(values) ^ 1;
  const ret = [];
  for (let p = 0; p < 6; p++) {
    ret.push((mod >> 5 * (5 - p)) & 31);
  }
  return ret;
}

function bech32Encode(hrp: string, data: number[]): string {
  const combined = data.concat(bech32CreateChecksum(hrp, data));
  let ret = hrp + '1';
  for (const d of combined) {
    ret += BECH32_ALPHABET.charAt(d);
  }
  return ret;
}

function convertBits(data: number[], fromBits: number, toBits: number, pad: boolean): number[] | null {
  let acc = 0;
  let bits = 0;
  const ret = [];
  const maxv = (1 << toBits) - 1;
  for (const value of data) {
    if (value < 0 || (value >> fromBits)) {
      return null;
    }
    acc = (acc << fromBits) | value;
    bits += fromBits;
    while (bits >= toBits) {
      bits -= toBits;
      ret.push((acc >> bits) & maxv);
    }
  }
  if (pad) {
    if (bits > 0) {
      ret.push((acc << (toBits - bits)) & maxv);
    }
  } else if (bits >= fromBits || ((acc << (toBits - bits)) & maxv)) {
    return null;
  }
  return ret;
}

// Check if required libraries are loaded
function checkLibrariesLoaded(): void {
  console.log('Checking libraries...', {
    elliptic: !!window.elliptic,
    CryptoJS: !!window.CryptoJS
  });
  
  const missing = [];
  if (!window.elliptic) missing.push('elliptic');
  if (!window.CryptoJS) missing.push('CryptoJS');
  
  if (missing.length > 0) {
    throw new Error(`Required libraries not loaded: ${missing.join(', ')}. Please refresh the page and try again.`);
  }
}

// Utility functions
function generateRandomBytes(length: number): Uint8Array {
  let array = new Uint8Array(length);
  window.crypto.getRandomValues(array);
  return array;
}

function bytesToHex(bytes: Uint8Array): string {
  return Array.from(bytes, b => b.toString(16).padStart(2, '0')).join('');
}

function hexToBytes(hex: string): Uint8Array {
  const bytes = new Uint8Array(hex.match(/.{2}/g)!.map(byte => parseInt(byte, 16)));
  return new Uint8Array(bytes.buffer);
}

async function sha256(hex: string): Promise<string> {
  const buffer = hexToBytes(hex);
  const hashBuffer = await crypto.subtle.digest("SHA-256", buffer.buffer as ArrayBuffer);
  return bytesToHex(new Uint8Array(hashBuffer));
}

async function sha256d(data: Uint8Array): Promise<Uint8Array> {
  const firstHash = await crypto.subtle.digest("SHA-256", data.buffer as ArrayBuffer);
  const secondHash = await crypto.subtle.digest("SHA-256", firstHash);
  return new Uint8Array(secondHash);
}

function ripemd160(hex: string): string {
  return window.CryptoJS.RIPEMD160(window.CryptoJS.enc.Hex.parse(hex)).toString();
}

function base58Encode(bytes: Uint8Array): string {
  const alphabet = "123456789ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz";
  let num = BigInt('0x' + bytesToHex(bytes));
  let encoded = "";
  
  while (num > 0n) {
    let remainder = num % 58n;
    num = num / 58n;
    encoded = alphabet[Number(remainder)] + encoded;
  }
  
  // Handle leading zeros
  for (const byte of bytes) {
    if (byte !== 0) break;
    encoded = '1' + encoded;
  }
  
  return encoded;
}

function base58Decode(encoded: string): Uint8Array {
  const alphabet = "123456789ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz";
  let num = 0n;
  
  for (const char of encoded) {
    const index = alphabet.indexOf(char);
    if (index === -1) throw new Error('Invalid Base58 character');
    num = num * 58n + BigInt(index);
  }
  
  let hex = num.toString(16);
  if (hex.length % 2) hex = '0' + hex;
  
  let bytes = hexToBytes(hex);
  
  // Handle leading '1's (zeros)
  for (const char of encoded) {
    if (char !== '1') break;
    bytes = new Uint8Array([0, ...bytes]);
  }
  
  return bytes;
}

// WIF encoding/decoding
async function encodeWIF(privateKeyHex: string): Promise<string> {
  let extendedKey = "b0" + privateKeyHex; // No appended 01 for uncompressed key
  let checksum = await sha256(await sha256(extendedKey));
  let wifHex = extendedKey + checksum.substring(0, 8);
  return base58Encode(hexToBytes(wifHex));
}

async function wifToPrivateKey(wif: string): Promise<string> {
  try {
    // Decode Base58
    const decoded = base58Decode(wif);
    
    // Extract components
    const payload = decoded.slice(0, -4);
    const checksum = decoded.slice(-4);
    
    // Verify checksum
    const hash = await sha256d(payload);
    const expectedChecksum = hash.slice(0, 4);
    
    for (let i = 0; i < 4; i++) {
      if (checksum[i] !== expectedChecksum[i]) {
        throw new Error('Invalid WIF checksum');
      }
    }
    
    // Verify prefix (0xb0 for LanaCoin)
    if (payload[0] !== 0xb0) {
      throw new Error('Invalid WIF prefix');
    }
    
    // Extract private key (32 bytes after prefix)
    const privateKey = payload.slice(1, 33);
    return bytesToHex(privateKey);
    
  } catch (error) {
    throw new Error(`Invalid WIF format: ${(error as Error).message}`);
  }
}

// Public key generation
function generatePublicKey(privateKeyHex: string): string {
  const ec = new window.elliptic.ec('secp256k1');
  const keyPair = ec.keyFromPrivate(privateKeyHex);
  const pubKeyPoint = keyPair.getPublic();
  
  // Return uncompressed format (04 + x + y coordinates)
  return "04" + 
         pubKeyPoint.getX().toString(16).padStart(64, '0') + 
         pubKeyPoint.getY().toString(16).padStart(64, '0');
}

function deriveNostrPublicKey(privateKeyHex: string): string {
  const ec = new window.elliptic.ec('secp256k1');
  const keyPair = ec.keyFromPrivate(privateKeyHex);
  const pubKeyPoint = keyPair.getPublic();
  
  // Return only x-coordinate (32 bytes)
  return pubKeyPoint.getX().toString(16).padStart(64, '0');
}

// Address generation
async function generateLanaAddress(publicKeyHex: string): Promise<string> {
  // Step 1: SHA-256 of public key
  const sha256Hash = await sha256(publicKeyHex);
  
  // Step 2: RIPEMD160 of SHA-256 hash
  const hash160 = ripemd160(sha256Hash);
  
  // Step 3: Add version byte (0x30 = 48 for LanaCoin)
  const versionedPayload = "30" + hash160;
  
  // Step 4: Double SHA-256 for checksum
  const checksum = await sha256(await sha256(versionedPayload));
  
  // Step 5: Take first 4 bytes of checksum
  const finalPayload = versionedPayload + checksum.substring(0, 8);
  
  // Step 6: Base58 encode
  return base58Encode(hexToBytes(finalPayload));
}

// Nostr formatting using built-in bech32 implementation
function hexToNpub(hexPubKey: string): string {
  const data = Array.from(hexToBytes(hexPubKey));
  const words = convertBits(data, 8, 5, true);
  if (!words) {
    throw new Error('Failed to convert hex to bech32 words');
  }
  return bech32Encode('npub', words);
}

// Main wallet generation function
export async function generateWallet(): Promise<WalletData> {
  // Check if libraries are loaded
  checkLibrariesLoaded();
  
  try {
    // Generate random private key
    let privateKeyBytes = generateRandomBytes(32);
    let privateKeyHex = bytesToHex(privateKeyBytes);
    
    // Generate WIF
    let privateKeyWIF = await encodeWIF(privateKeyHex);
    
    // Generate public keys
    let publicKey = generatePublicKey(privateKeyHex);
    let nostrHexId = deriveNostrPublicKey(privateKeyHex);
    
    // Generate addresses
    let lanaAddress = await generateLanaAddress(publicKey);
    let nostrNpubId = hexToNpub(nostrHexId);
    
    return {
      privateKeyWIF,
      lanaAddress,
      nostrHexId,
      nostrNpubId,
      privateKeyHex
    };
  } catch (error) {
    console.error("Error in generateWallet:", error);
    throw error;
  }
}

// Convert existing WIF to all derived identifiers
export async function convertWifToIds(wif: string): Promise<WalletData> {
  // Check if libraries are loaded
  checkLibrariesLoaded();
  
  try {
    // Step 1: Extract private key from WIF
    const privateKeyHex = await wifToPrivateKey(wif);
    
    // Step 2: Generate public keys
    const publicKeyHex = generatePublicKey(privateKeyHex);
    const nostrHexId = deriveNostrPublicKey(privateKeyHex);
    
    // Step 3: Generate addresses/identifiers
    const lanaAddress = await generateLanaAddress(publicKeyHex);
    const nostrNpubId = hexToNpub(nostrHexId);
    
    return {
      privateKeyWIF: wif,
      lanaAddress,
      nostrHexId,
      nostrNpubId,
      privateKeyHex
    };
    
  } catch (error) {
    console.error("Error in convertWifToIds:", error);
    throw new Error(`Conversion failed: ${(error as Error).message}`);
  }
}
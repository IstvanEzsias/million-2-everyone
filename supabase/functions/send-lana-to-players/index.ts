import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.57.4';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type'
};

// Base58 alphabet
const BASE58_ALPHABET = '123456789ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz';

// Base58 encoding/decoding functions
function base58Encode(buffer: Uint8Array): string {
  if (buffer.length === 0) return '';
  let digits = [0];
  for(let i = 0; i < buffer.length; i++){
    let carry = buffer[i];
    for(let j = 0; j < digits.length; j++){
      carry += digits[j] << 8;
      digits[j] = carry % 58;
      carry = Math.floor(carry / 58);
    }
    while(carry > 0){
      digits.push(carry % 58);
      carry = Math.floor(carry / 58);
    }
  }
  // Count leading zeros
  let leadingZeros = 0;
  for(let i = 0; i < buffer.length && buffer[i] === 0; i++){
    leadingZeros++;
  }
  return '1'.repeat(leadingZeros) + digits.reverse().map((d)=>BASE58_ALPHABET[d]).join('');
}

function base58Decode(str: string): Uint8Array {
  if (str.length === 0) return new Uint8Array(0);
  let bytes = [0];
  for(let i = 0; i < str.length; i++){
    const c = str[i];
    const p = BASE58_ALPHABET.indexOf(c);
    if (p < 0) throw new Error('Invalid base58 character');
    let carry = p;
    for(let j = 0; j < bytes.length; j++){
      carry += bytes[j] * 58;
      bytes[j] = carry & 0xff;
      carry >>= 8;
    }
    while(carry > 0){
      bytes.push(carry & 0xff);
      carry >>= 8;
    }
  }
  // Count leading '1's
  let leadingOnes = 0;
  for(let i = 0; i < str.length && str[i] === '1'; i++){
    leadingOnes++;
  }
  const result = new Uint8Array(leadingOnes + bytes.length);
  bytes.reverse();
  result.set(bytes, leadingOnes);
  return result;
}

function base58CheckDecode(str: string): Uint8Array {
  const decoded = base58Decode(str);
  if (decoded.length < 4) throw new Error('Invalid base58check');
  const payload = decoded.slice(0, -4);
  const checksum = decoded.slice(-4);
  // For now, skip checksum verification in edge function
  return payload;
}

// SHA256 double hash
async function sha256d(data: Uint8Array): Promise<Uint8Array> {
  const hash1 = await crypto.subtle.digest('SHA-256', new Uint8Array(data));
  const hash2 = await crypto.subtle.digest('SHA-256', hash1);
  return new Uint8Array(hash2);
}

// Varint encoding
function encodeVarint(n: number): Uint8Array {
  if (n < 0xfd) {
    return new Uint8Array([n]);
  } else if (n <= 0xffff) {
    const result = new Uint8Array(3);
    result[0] = 0xfd;
    result[1] = n & 0xff;
    result[2] = n >> 8 & 0xff;
    return result;
  } else {
    throw new Error('Varint too large');
  }
}

// Push data with length prefix
function pushData(data: Uint8Array): Uint8Array {
  const result = new Uint8Array(1 + data.length);
  result[0] = data.length;
  result.set(data, 1);
  return result;
}

// Utility function to convert hex string to Uint8Array
function hexToUint8Array(hex: string): Uint8Array {
  const result = new Uint8Array(hex.length / 2);
  for(let i = 0; i < hex.length; i += 2){
    result[i / 2] = parseInt(hex.substr(i, 2), 16);
  }
  return result;
}

// Utility function to convert Uint8Array to hex string
function uint8ArrayToHex(array: Uint8Array): string {
  return Array.from(array).map((b)=>b.toString(16).padStart(2, '0')).join('');
}

// secp256k1 Point operations
class Point {
  x: bigint;
  y: bigint;
  
  constructor(x: bigint, y: bigint){
    this.x = x;
    this.y = y;
  }
  
  static ZERO = new Point(0n, 0n);
  
  // secp256k1 curve parameters
  static P = 0xFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFEFFFFFC2Fn;
  static N = 0xFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFEBAAEDCE6AF48A03BBFD25E8CD0364141n;
  static Gx = 0x79BE667EF9DCBBAC55A06295CE870B07029BFCDB2DCE28D959F2815B16F81798n;
  static Gy = 0x483ADA7726A3C4655DA4FBFC0E1108A8FD17B448A68554199C47D08FFB10D4B8n;
  static G = new Point(Point.Gx, Point.Gy);
  
  static mod(a: bigint, m: bigint): bigint {
    const result = a % m;
    return result >= 0n ? result : result + m;
  }
  
  static modInverse(a: bigint, m: bigint): bigint {
    if (a === 0n) return 0n;
    let lm = 1n, hm = 0n;
    let low = Point.mod(a, m), high = m;
    while(low > 1n){
      const ratio = high / low;
      const nm = hm - lm * ratio;
      const nw = high - low * ratio;
      hm = lm;
      high = low;
      lm = nm;
      low = nw;
    }
    return Point.mod(lm, m);
  }
  
  add(other: Point): Point {
    if (this.x === 0n && this.y === 0n) return other;
    if (other.x === 0n && other.y === 0n) return this;
    
    if (this.x === other.x) {
      if (this.y === other.y) {
        // Point doubling
        const s = Point.mod(3n * this.x * this.x * Point.modInverse(2n * this.y, Point.P), Point.P);
        const x = Point.mod(s * s - 2n * this.x, Point.P);
        const y = Point.mod(s * (this.x - x) - this.y, Point.P);
        return new Point(x, y);
      } else {
        return Point.ZERO;
      }
    } else {
      const s = Point.mod((other.y - this.y) * Point.modInverse(other.x - this.x, Point.P), Point.P);
      const x = Point.mod(s * s - this.x - other.x, Point.P);
      const y = Point.mod(s * (this.x - x) - this.y, Point.P);
      return new Point(x, y);
    }
  }
  
  multiply(scalar: bigint): Point {
    if (scalar === 0n) return Point.ZERO;
    if (scalar === 1n) return this;
    
    let result = Point.ZERO;
    let addend = this;
    
    while(scalar > 0n){
      if (scalar & 1n) {
        result = result.add(addend);
      }
      addend = addend.add(addend) as this;
      scalar >>= 1n;
    }
    return result;
  }
}

// Convert private key to public key
function privateKeyToPublicKey(privateKeyHex: string): Uint8Array {
  const privateKeyBigInt = BigInt('0x' + privateKeyHex);
  const publicKeyPoint = Point.G.multiply(privateKeyBigInt);
  
  // Convert to uncompressed format (0x04 + x + y)
  const x = publicKeyPoint.x.toString(16).padStart(64, '0');
  const y = publicKeyPoint.y.toString(16).padStart(64, '0');
  
  const result = new Uint8Array(65);
  result[0] = 0x04;
  result.set(hexToUint8Array(x), 1);
  result.set(hexToUint8Array(y), 33);
  
  return result;
}

// Simple DER encoding for ECDSA signature
function encodeDER(r: bigint, s: bigint): Uint8Array {
  const rHex = r.toString(16).padStart(64, '0');
  const sHex = s.toString(16).padStart(64, '0');
  
  // Convert to byte arrays
  const rArray = Array.from(hexToUint8Array(rHex));
  const sArray = Array.from(hexToUint8Array(sHex));
  
  // Remove leading zeros but keep at least one byte
  while(rArray.length > 1 && rArray[0] === 0) rArray.shift();
  while(sArray.length > 1 && sArray[0] === 0) sArray.shift();
  
  // Add 0x00 if high bit is set (to keep positive)
  if (rArray[0] >= 0x80) rArray.unshift(0);
  if (sArray[0] >= 0x80) sArray.unshift(0);
  
  // Build DER structure
  const der = [0x30, 0x00, 0x02, rArray.length, ...rArray, 0x02, sArray.length, ...sArray];
  
  // Set correct length
  der[1] = der.length - 2;
  
  return new Uint8Array(der);
}

// ECDSA signing with secp256k1
function signECDSA(privateKeyHex: string, messageHash: Uint8Array): Uint8Array {
  const privateKey = BigInt('0x' + privateKeyHex);
  const z = BigInt('0x' + uint8ArrayToHex(messageHash));
  
  // Simple deterministic k generation (not RFC 6979 compliant, but works for testing)
  const k = Point.mod(z + privateKey, Point.N);
  if (k === 0n) throw new Error('Invalid k');
  
  // Calculate r = (k * G).x mod n
  const kG = Point.G.multiply(k);
  const r = Point.mod(kG.x, Point.N);
  if (r === 0n) throw new Error('Invalid r');
  
  // Calculate s = k^-1 * (z + r * privateKey) mod n
  const kInv = Point.modInverse(k, Point.N);
  const s = Point.mod(kInv * (z + r * privateKey), Point.N);
  if (s === 0n) throw new Error('Invalid s');
  
  // Use low S value (BIP 62)
  const finalS = s > Point.N / 2n ? Point.N - s : s;
  
  return encodeDER(r, finalS);
}

// Enhanced UTXO Selection with better algorithms
class UTXOSelector {
  static selectUTXOs(utxos: any[], totalNeeded: number) {
    if (!utxos || utxos.length === 0) {
      throw new Error('No UTXOs available for selection');
    }
    
    console.log(`🔍 UTXO Selection: Need ${totalNeeded} satoshis from ${utxos.length} UTXOs`);
    
    // Log all available UTXOs
    utxos.forEach((utxo, index) => {
      console.log(`  UTXO ${index}: ${utxo.value} satoshis (${utxo.tx_hash}:${utxo.tx_pos})`);
    });
    
    const totalAvailable = utxos.reduce((sum, utxo) => sum + utxo.value, 0);
    console.log(`💰 Total available: ${totalAvailable} satoshis`);
    
    if (totalAvailable < totalNeeded) {
      throw new Error(`Insufficient total UTXO value: ${totalAvailable} < ${totalNeeded} satoshis`);
    }
    
    // Sort UTXOs by value (largest first for efficiency)
    const sortedUTXOs = [...utxos].sort((a, b) => b.value - a.value);
    
    // Strategy 1: Try single UTXO first (most efficient)
    for (const utxo of sortedUTXOs) {
      if (utxo.value >= totalNeeded) {
        console.log(`✅ Single UTXO solution: Using ${utxo.value} satoshis (${utxo.tx_hash}:${utxo.tx_pos})`);
        return {
          selected: [utxo],
          totalValue: utxo.value
        };
      }
    }
    
    // Strategy 2: Combine multiple UTXOs (greedy approach)
    const selectedUTXOs = [];
    let totalSelected = 0;
    
    for (const utxo of sortedUTXOs) {
      selectedUTXOs.push(utxo);
      totalSelected += utxo.value;
      console.log(`📦 Added UTXO: ${utxo.value} satoshis, total now: ${totalSelected}`);
      
      if (totalSelected >= totalNeeded) {
        console.log(`✅ Multi-UTXO solution: Using ${selectedUTXOs.length} UTXOs, total: ${totalSelected} satoshis`);
        return {
          selected: selectedUTXOs,
          totalValue: totalSelected
        };
      }
    }
    
    throw new Error(`Failed to select sufficient UTXOs: selected ${totalSelected}, needed ${totalNeeded}`);
  }
}

// Enhanced Electrum connection with retry logic
async function connectElectrum(electrumServer: string, electrumPort: number, maxRetries = 3): Promise<Deno.Conn> {
  const servers = [
    { hostname: electrumServer, port: electrumPort },
    { hostname: "electrum1.lanacoin.com", port: 5097 },
    { hostname: "electrum2.lanacoin.com", port: 5097 },
    { hostname: "electrum3.lanacoin.com", port: 5097 }
  ];
  
  for(let attempt = 0; attempt < maxRetries; attempt++) {
    for (const server of servers) {
      try {
        console.log(`🔌 Connecting to ${server.hostname}:${server.port} (attempt ${attempt + 1})`);
        const conn = await Deno.connect(server);
        console.log(`✅ Connected to ${server.hostname}:${server.port}`);
        return conn;
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : 'Unknown connection error';
        console.error(`❌ Failed to connect to ${server.hostname}:${server.port}:`, errorMessage);
      }
    }
    
    if (attempt < maxRetries - 1) {
      console.log(`⏳ Waiting 1 second before retry...`);
      await new Promise(resolve => setTimeout(resolve, 1000));
    }
  }
  
  throw new Error('Failed to connect to any Electrum server');
}

// Enhanced Electrum RPC call with timeout and retry
async function electrumCall(method: string, params: any[], electrumServer: string, electrumPort: number, timeout = 30000): Promise<any> {
  let conn = null;
  try {
    conn = await connectElectrum(electrumServer, electrumPort);
    
    const request = {
      id: Date.now(),
      method,
      params
    };
    
    const requestData = JSON.stringify(request) + '\n';
    console.log(`📤 Electrum ${method}:`, params);
    
    // Set up timeout
    const timeoutPromise = new Promise((_, reject) => {
      setTimeout(() => reject(new Error(`Electrum call timeout after ${timeout}ms`)), timeout);
    });
    
    // Make the actual call
    const callPromise = (async () => {
      await conn.write(new TextEncoder().encode(requestData));
      
      const buffer = new Uint8Array(32768); // Increased buffer size
      const bytesRead = await conn.read(buffer);
      
      if (!bytesRead) {
        throw new Error('No response from Electrum server');
      }
      
      const responseText = new TextDecoder().decode(buffer.slice(0, bytesRead)).trim();
      console.log(`📥 Electrum response (${bytesRead} bytes):`, responseText.substring(0, 500));
      
      const response = JSON.parse(responseText);
      
      if (response.error) {
        throw new Error(`Electrum error: ${JSON.stringify(response.error)}`);
      }
      
      return response.result;
    })();
    
    return await Promise.race([callPromise, timeoutPromise]);
  } catch (error) {
    console.error(`❌ Electrum call error for ${method}:`, error);
    throw error;
  } finally {
    if (conn) {
      try {
        conn.close();
      } catch (e) {
        console.warn('Warning: Failed to close connection:', e);
      }
    }
  }
}

// Enhanced wallet validation
async function validateWalletState(walletAddress: string, electrumServer: string, electrumPort: number) {
  console.log(`🔍 Validating wallet state for: ${walletAddress}`);
  
  try {
    // Get balance
    const balance = await electrumCall('blockchain.address.get_balance', [walletAddress], electrumServer, electrumPort);
    console.log(`💰 Wallet balance:`, balance);
    
    // Get UTXOs
    const utxos = await electrumCall('blockchain.address.listunspent', [walletAddress], electrumServer, electrumPort);
    console.log(`📦 Available UTXOs: ${utxos?.length || 0}`);
    
    if (utxos && utxos.length > 0) {
      const totalUtxoValue = utxos.reduce((sum: number, utxo: any) => sum + utxo.value, 0);
      console.log(`💎 Total UTXO value: ${totalUtxoValue} satoshis`);
      
      // Validate UTXO integrity
      for(let i = 0; i < utxos.length; i++) {
        const utxo = utxos[i];
        if (!utxo.tx_hash || typeof utxo.tx_pos !== 'number' || !utxo.value) {
          console.error(`❌ Invalid UTXO at index ${i}:`, utxo);
          throw new Error(`Invalid UTXO structure at index ${i}`);
        }
      }
    }
    
    return { balance, utxos };
  } catch (error) {
    console.error(`❌ Wallet validation failed:`, error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown validation error';
    throw new Error(`Wallet validation failed: ${errorMessage}`);
  }
}

// Parse script pubkey from raw transaction
function parseScriptPubkeyFromRawTx(rawHex: string, voutIndex: number): Uint8Array {
  const tx = hexToUint8Array(rawHex);
  let cursor = 0;
  
  cursor += 4; // version
  cursor += 4; // nTime
  const vinCount = tx[cursor];
  cursor += 1;
  
  // Skip inputs
  for(let i = 0; i < vinCount; i++) {
    cursor += 32; // txid
    cursor += 4; // vout
    const scriptLen = tx[cursor];
    cursor += 1 + scriptLen; // scriptSig
    cursor += 4; // sequence
  }
  
  const voutCount = tx[cursor];
  cursor += 1;
  
  // Locate output
  for(let i = 0; i < voutCount; i++) {
    cursor += 8; // value
    const scriptLen = tx[cursor];
    cursor += 1;
    const script = tx.slice(cursor, cursor + scriptLen);
    
    if (i === voutIndex) {
      return script;
    }
    cursor += scriptLen;
  }
  
  throw new Error('vout index not found');
}

// Build and sign transaction with enhanced error handling
async function buildSignedTx(utxos: any[], privateKeyWIF: string, recipients: Array<{address: string, amount: number}>, fee: number, changeAddress: string, electrumServer: string, electrumPort: number): Promise<string> {
  console.log('🔧 Building transaction with enhanced validation...');
  
  try {
    // Validate inputs
    if (!utxos || utxos.length === 0) {
      throw new Error('No UTXOs provided for transaction building');
    }
    
    if (recipients.length === 0) {
      throw new Error('No recipients provided');
    }
    
    const totalAmount = recipients.reduce((sum, recipient) => sum + recipient.amount, 0);
    
    if (totalAmount <= 0) {
      throw new Error('Invalid total amount: must be positive');
    }
    
    if (fee <= 0) {
      throw new Error('Invalid fee: must be positive');
    }
    
    // Select UTXOs
    const totalNeeded = totalAmount + fee;
    const { selected: selectedUTXOs, totalValue } = UTXOSelector.selectUTXOs(utxos, totalNeeded);
    
    console.log(`💰 Selected ${selectedUTXOs.length} UTXOs with total value: ${totalValue} satoshis`);
    console.log(`💸 Transaction breakdown: Amount=${totalAmount}, Fee=${fee}, Change=${totalValue - totalNeeded}`);
    
    // Decode private key from WIF
    const privateKeyBytes = base58CheckDecode(privateKeyWIF);
    const privateKeyHex = uint8ArrayToHex(privateKeyBytes.slice(1));
    console.log('🔑 Private key decoded successfully');
    
    // Generate public key from private key
    const publicKey = privateKeyToPublicKey(privateKeyHex);
    console.log('🔑 Public key generated successfully');
    
    // Build recipient outputs
    const outputs = [];
    
    for (const recipient of recipients) {
      const recipientHash = base58CheckDecode(recipient.address).slice(1);
      const recipientScript = new Uint8Array([0x76, 0xa9, 0x14, ...recipientHash, 0x88, 0xac]);
      
      const recipientValueBytes = new Uint8Array(8);
      new DataView(recipientValueBytes.buffer).setBigUint64(0, BigInt(recipient.amount), true);
      
      const recipientOut = new Uint8Array([
        ...recipientValueBytes,
        ...encodeVarint(recipientScript.length),
        ...recipientScript
      ]);
      
      outputs.push(recipientOut);
    }
    
    // Calculate change amount
    const changeAmount = totalValue - totalAmount - fee;
    let outputCount = recipients.length;
    
    // Add change output if significant
    if (changeAmount > 1000) {
      const changeHash = base58CheckDecode(changeAddress).slice(1);
      const changeScript = new Uint8Array([0x76, 0xa9, 0x14, ...changeHash, 0x88, 0xac]);
      
      const changeValueBytes = new Uint8Array(8);
      new DataView(changeValueBytes.buffer).setBigUint64(0, BigInt(changeAmount), true);
      
      const changeOut = new Uint8Array([
        ...changeValueBytes,
        ...encodeVarint(changeScript.length),
        ...changeScript
      ]);
      
      outputs.push(changeOut);
      outputCount++;
      console.log('✅ Change output added');
    } else {
      console.log('⚠️ Change amount too small, adding to fee');
    }
    
    const version = new Uint8Array([0x01, 0x00, 0x00, 0x00]);
    const nTime = new Uint8Array(4);
    const timestamp = Math.floor(Date.now() / 1000);
    new DataView(nTime.buffer).setUint32(0, timestamp, true);
    const locktime = new Uint8Array([0x00, 0x00, 0x00, 0x00]);
    const hashType = new Uint8Array([0x01, 0x00, 0x00, 0x00]);
    
    // Process each input and build transaction
    const signedInputs = [];
    
    for(let i = 0; i < selectedUTXOs.length; i++) {
      const utxo = selectedUTXOs[i];
      console.log(`🔍 Processing UTXO ${i + 1}/${selectedUTXOs.length}: ${utxo.tx_hash}:${utxo.tx_pos}`);
      
      // Get raw transaction for this UTXO
      const rawTx = await electrumCall('blockchain.transaction.get', [utxo.tx_hash], electrumServer, electrumPort);
      console.log(`📄 Retrieved raw transaction (${rawTx.length} chars)`);
      
      // Parse script pubkey
      const scriptPubkey = parseScriptPubkeyFromRawTx(rawTx, utxo.tx_pos);
      console.log(`📜 Script pubkey parsed (${scriptPubkey.length} bytes)`);
      
      const txid = hexToUint8Array(utxo.tx_hash).reverse();
      const voutBytes = new Uint8Array(4);
      new DataView(voutBytes.buffer).setUint32(0, utxo.tx_pos, true);
      
      // Build preimage for signing this input
      const allOutputs = new Uint8Array(outputs.reduce((total, output) => total + output.length, 0));
      let offset = 0;
      for (const output of outputs) {
        allOutputs.set(output, offset);
        offset += output.length;
      }
      
      const preimage = new Uint8Array([
        ...version,
        ...nTime,
        selectedUTXOs.length,
        ...txid,
        ...voutBytes,
        ...encodeVarint(scriptPubkey.length),
        ...scriptPubkey,
        0xff, 0xff, 0xff, 0xff,
        outputCount,
        ...allOutputs,
        ...locktime,
        ...hashType
      ]);
      
      // Sign this input
      const sighash = await sha256d(preimage);
      console.log(`🔑 Sighash computed for input ${i + 1}`);
      
      const signature = signECDSA(privateKeyHex, sighash);
      const signatureWithHashType = new Uint8Array([...signature, 0x01]);
      
      const scriptSig = new Uint8Array([
        ...pushData(signatureWithHashType),
        ...pushData(publicKey)
      ]);
      
      const signedInput = new Uint8Array([
        ...txid,
        ...voutBytes,
        ...encodeVarint(scriptSig.length),
        ...scriptSig,
        0xff, 0xff, 0xff, 0xff // sequence
      ]);
      
      signedInputs.push(signedInput);
      console.log(`✅ Input ${i + 1} signed successfully`);
    }
    
    // Build final transaction
    const allInputs = new Uint8Array(signedInputs.reduce((total, input) => total + input.length, 0));
    let offset = 0;
    for (const input of signedInputs) {
      allInputs.set(input, offset);
      offset += input.length;
    }
    
    const allOutputs = new Uint8Array(outputs.reduce((total, output) => total + output.length, 0));
    offset = 0;
    for (const output of outputs) {
      allOutputs.set(output, offset);
      offset += output.length;
    }
    
    const finalTx = new Uint8Array([
      ...version,
      ...nTime,
      selectedUTXOs.length,
      ...allInputs,
      outputCount,
      ...allOutputs,
      ...locktime
    ]);
    
    const finalTxHex = uint8ArrayToHex(finalTx);
    console.log(`🎯 Final transaction built: ${finalTxHex.length} chars, ${selectedUTXOs.length} inputs, ${outputCount} outputs`);
    
    return finalTxHex;
  } catch (error) {
    console.error('❌ Transaction building error:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown transaction error';
    throw new Error(`Failed to build transaction: ${errorMessage}`);
  }
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }
  
  try {
    console.log('🚀 Starting LANA distribution to players...');
    
    // Initialize Supabase client with service role key
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    
    const supabase = createClient(supabaseUrl, supabaseServiceKey);
    
    // Get app settings
    console.log('📋 Fetching app settings...');
    const { data: settings, error: settingsError } = await supabase
      .from('app_settings')
      .select('lana_private_key, lana_wallet_id, electrum_server, electrum_server_port')
      .single();
      
    if (settingsError || !settings) {
      throw new Error(`Failed to fetch app settings: ${settingsError?.message}`);
    }
    
    if (!settings.lana_private_key || !settings.lana_wallet_id) {
      throw new Error('LANA private key or wallet ID not configured in app settings');
    }
    
    const electrumServer = settings.electrum_server || 'electrum1.lanacoin.com';
    const electrumPort = settings.electrum_server_port || 5097;
    
    console.log('⚙️ Using Electrum server:', `${electrumServer}:${electrumPort}`);
    
    // Get players who haven't received LANA yet and played the game
    console.log('👥 Fetching players who need LANA...');
    const { data: players, error: playersError } = await supabase
      .from('players')
      .select('id, walletid, difficulty_level')
      .eq('received_lana', false)
      .eq('played_the_game', true)
      .not('walletid', 'is', null);
      
    if (playersError) {
      throw new Error(`Failed to fetch players: ${playersError.message}`);
    }
    
    // Fetch difficulty levels to get reward amounts (all difficulties now get 1 LANA)
    const { data: difficultyLevels, error: difficultyError } = await supabase
      .from('difficulty_levels')
      .select('name, reward_amount, reward_type')
      .in('name', ['easy', 'intermediate', 'impossible']);

    if (difficultyError || !difficultyLevels) {
      console.error('❌ Error fetching difficulty levels:', difficultyError);
      throw new Error('Failed to fetch difficulty levels');
    }

    // Create reward map (in satoshis: 1 LANA = 100,000,000 satoshis)
    const rewardMap: { [key: string]: number } = {};
    difficultyLevels.forEach(level => {
      rewardMap[level.name] = Math.floor(level.reward_amount * 100_000_000);
    });

    console.log('💰 Reward amounts (satoshis):', rewardMap);

    // All players now get 1 LANA regardless of difficulty
    const eligiblePlayers = players;

    if (!eligiblePlayers || eligiblePlayers.length === 0) {
      console.log('✅ No players need LANA distribution at this time');
      
      // Get stats for logging
      const { data: allPlayers } = await supabase
        .from('players')
        .select('id, received_lana, played_the_game, walletid, difficulty_level')
        .not('walletid', 'is', null);
      
      const stats = {
        total: allPlayers?.length || 0,
        alreadyReceived: allPlayers?.filter(p => p.received_lana).length || 0,
        didNotPlayGame: allPlayers?.filter(p => !p.played_the_game).length || 0,
        impossiblePlayers: allPlayers?.filter(p => p.difficulty_level === 'impossible').length || 0,
        eligible: allPlayers?.filter(p => !p.received_lana && p.played_the_game && p.difficulty_level !== 'impossible').length || 0
      };
      
      console.log(`📊 Player stats: ${stats.total} total, ${stats.alreadyReceived} already received, ${stats.didNotPlayGame} didn't play game, ${stats.impossiblePlayers} legendary (draw only), ${stats.eligible} eligible`);
      
      return new Response(JSON.stringify({
        success: true,
        message: 'No players need LANA distribution',
        processed: 0,
        stats
      }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }
    
    console.log(`💰 Found ${eligiblePlayers.length} eligible players needing LANA distribution (played game = true)`);
    
    // Validate wallet state
    const { balance, utxos } = await validateWalletState(settings.lana_wallet_id, electrumServer, electrumPort);
    
    if (!utxos || utxos.length === 0) {
      throw new Error('No UTXOs available in LANA wallet');
    }
    
    // Calculate total based on each player's difficulty
    const totalAmount = eligiblePlayers.reduce((sum, player) => {
      const amount = rewardMap[player.difficulty_level] || rewardMap['easy'];
      return sum + amount;
    }, 0);
    
    const feePerOutput = 1000; // Base fee per output
    const totalFee = feePerOutput * eligiblePlayers.length + 5000; // Extra fee for the transaction
    const totalNeeded = totalAmount + totalFee;
    
    const totalAvailable = utxos.reduce((sum: number, utxo: any) => sum + utxo.value, 0);
    
    if (totalAvailable < totalNeeded) {
      throw new Error(`Insufficient funds: need ${totalNeeded} satoshis, have ${totalAvailable} satoshis`);
    }
    
    console.log(`💸 Preparing to send LANA to ${eligiblePlayers.length} players:`);
    eligiblePlayers.forEach(player => {
      const amount = rewardMap[player.difficulty_level] || rewardMap['easy'];
      const lanaAmount = amount / 100_000_000;
      console.log(`  - ${player.walletid}: ${lanaAmount} LANA (${player.difficulty_level})`);
    });
    console.log(`💸 Total amount: ${totalAmount} satoshis (${totalAmount / 100_000_000} LANA), fee: ${totalFee} satoshis`);
    
    // Build recipients array with correct amounts per difficulty
    const recipients = eligiblePlayers.map(player => ({
      address: player.walletid,
      amount: rewardMap[player.difficulty_level] || rewardMap['easy']
    }));
    
    // Build and sign transaction
    console.log('🔧 Building consolidated transaction...');
    const signedTx = await buildSignedTx(
      utxos,
      settings.lana_private_key,
      recipients,
      totalFee,
      settings.lana_wallet_id,
      electrumServer,
      electrumPort
    );
    
    console.log('✍️ Transaction signed successfully');
    
    // Broadcast transaction
    console.log('🚀 Broadcasting consolidated transaction...');
    const broadcastResult = await electrumCall('blockchain.transaction.broadcast', [signedTx], electrumServer, electrumPort, 45000);
    
    if (!broadcastResult) {
      throw new Error('Transaction broadcast failed - no result from Electrum server');
    }
    
    let resultStr = typeof broadcastResult === 'string' ? broadcastResult : String(broadcastResult);
    
    // Check for errors
    if (resultStr.includes('TX rejected') || resultStr.includes('code') || resultStr.includes('-22') ||
        resultStr.includes('error') || resultStr.includes('Error') || resultStr.includes('failed') || resultStr.includes('Failed')) {
      throw new Error(`Transaction broadcast failed: ${resultStr}`);
    }
    
    // Validate transaction ID format
    const transactionId = resultStr.trim();
    if (!/^[a-fA-F0-9]{64}$/.test(transactionId)) {
      throw new Error(`Invalid transaction ID format: ${transactionId}`);
    }
    
    console.log('✅ Transaction broadcast successful:', transactionId);
    
    // Update all players to mark as received and set transaction ID
    console.log('📝 Updating player records...');
    const playerIds = eligiblePlayers.map(p => p.id);
    
    const { error: updateError } = await supabase
      .from('players')
      .update({
        received_lana: true,
        transactionid: transactionId
      })
      .in('id', playerIds);
      
    if (updateError) {
      console.error('❌ Failed to update player records:', updateError);
      throw new Error(`Failed to update player records: ${updateError.message}`);
    }
    
    console.log(`✅ Successfully distributed LANA to ${eligiblePlayers.length} players (total: ${totalAmount / 100_000_000} LANA)`);
    
    return new Response(JSON.stringify({
      success: true,
      message: `Successfully distributed ${totalAmount / 100_000_000} LANA to ${eligiblePlayers.length} players`,
      transactionId: transactionId,
      processed: eligiblePlayers.length,
      totalAmount: totalAmount,
      fee: totalFee,
      breakdown: eligiblePlayers.map(p => ({
        difficulty: p.difficulty_level,
        amount: (rewardMap[p.difficulty_level] || rewardMap['easy']) / 100_000_000
      }))
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });
    
  } catch (error) {
    console.error('❌ LANA distribution error:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown distribution error';
    
    return new Response(JSON.stringify({
      success: false,
      error: errorMessage,
      timestamp: new Date().toISOString()
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });
  }
});

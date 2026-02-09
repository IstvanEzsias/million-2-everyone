import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.57.4';
import { ripemd160 } from "https://esm.sh/hash.js@1.1.7";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type'
};

// ==================== CRYPTO UTILITIES ====================

const BASE58_ALPHABET = '123456789ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz';

function normalizeWif(wif: string): string {
  return wif.replace(/[\s\u200B-\u200D\uFEFF\r\n]/g, '').trim();
}

function base58Encode(bytes: Uint8Array): string {
  if (bytes.length === 0) return '';
  let x = BigInt('0x' + uint8ArrayToHex(bytes));
  let result = '';
  while (x > 0n) {
    const remainder = Number(x % 58n);
    result = BASE58_ALPHABET[remainder] + result;
    x = x / 58n;
  }
  for (let i = 0; i < bytes.length && bytes[i] === 0; i++) {
    result = '1' + result;
  }
  return result;
}

function base58Decode(str: string): Uint8Array {
  if (str.length === 0) return new Uint8Array(0);
  let bytes = [0];
  for (let i = 0; i < str.length; i++) {
    const c = str[i];
    const p = BASE58_ALPHABET.indexOf(c);
    if (p < 0) throw new Error('Invalid base58 character');
    let carry = p;
    for (let j = 0; j < bytes.length; j++) {
      carry += bytes[j] * 58;
      bytes[j] = carry & 0xff;
      carry >>= 8;
    }
    while (carry > 0) {
      bytes.push(carry & 0xff);
      carry >>= 8;
    }
  }
  let leadingOnes = 0;
  for (let i = 0; i < str.length && str[i] === '1'; i++) leadingOnes++;
  const result = new Uint8Array(leadingOnes + bytes.length);
  bytes.reverse();
  result.set(bytes, leadingOnes);
  return result;
}

function base58CheckDecode(str: string): Uint8Array {
  const decoded = base58Decode(str);
  if (decoded.length < 4) throw new Error('Invalid base58check');
  return decoded.slice(0, -4);
}

async function base58CheckEncode(payload: Uint8Array): Promise<string> {
  const hash1 = await crypto.subtle.digest('SHA-256', new Uint8Array(payload));
  const hash2 = await crypto.subtle.digest('SHA-256', hash1);
  const checksum = new Uint8Array(hash2).slice(0, 4);
  const withChecksum = new Uint8Array(payload.length + 4);
  withChecksum.set(payload);
  withChecksum.set(checksum, payload.length);
  return base58Encode(withChecksum);
}

async function sha256d(data: Uint8Array): Promise<Uint8Array> {
  const hash1 = await crypto.subtle.digest('SHA-256', new Uint8Array(data));
  const hash2 = await crypto.subtle.digest('SHA-256', hash1);
  return new Uint8Array(hash2);
}

function hexToUint8Array(hex: string): Uint8Array {
  const result = new Uint8Array(hex.length / 2);
  for (let i = 0; i < hex.length; i += 2) {
    result[i / 2] = parseInt(hex.substr(i, 2), 16);
  }
  return result;
}

function uint8ArrayToHex(array: Uint8Array): string {
  return Array.from(array).map(b => b.toString(16).padStart(2, '0')).join('');
}

function encodeVarint(n: number): Uint8Array {
  if (n < 0xfd) return new Uint8Array([n]);
  if (n <= 0xffff) {
    const result = new Uint8Array(3);
    result[0] = 0xfd;
    result[1] = n & 0xff;
    result[2] = (n >> 8) & 0xff;
    return result;
  }
  throw new Error('Varint too large');
}

function pushData(data: Uint8Array): Uint8Array {
  const result = new Uint8Array(1 + data.length);
  result[0] = data.length;
  result.set(data, 1);
  return result;
}

// ==================== SECP256K1 ====================

class Point {
  x: bigint;
  y: bigint;
  constructor(x: bigint, y: bigint) { this.x = x; this.y = y; }

  static ZERO = new Point(0n, 0n);
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
    while (low > 1n) {
      const ratio = high / low;
      const nm = hm - lm * ratio;
      const nw = high - low * ratio;
      hm = lm; high = low; lm = nm; low = nw;
    }
    return Point.mod(lm, m);
  }

  add(other: Point): Point {
    if (this.x === 0n && this.y === 0n) return other;
    if (other.x === 0n && other.y === 0n) return this;
    if (this.x === other.x) {
      if (this.y === other.y) {
        const s = Point.mod(3n * this.x * this.x * Point.modInverse(2n * this.y, Point.P), Point.P);
        const x = Point.mod(s * s - 2n * this.x, Point.P);
        const y = Point.mod(s * (this.x - x) - this.y, Point.P);
        return new Point(x, y);
      }
      return Point.ZERO;
    }
    const s = Point.mod((other.y - this.y) * Point.modInverse(other.x - this.x, Point.P), Point.P);
    const x = Point.mod(s * s - this.x - other.x, Point.P);
    const y = Point.mod(s * (this.x - x) - this.y, Point.P);
    return new Point(x, y);
  }

  multiply(scalar: bigint): Point {
    if (scalar === 0n) return Point.ZERO;
    if (scalar === 1n) return this;
    let result: Point = Point.ZERO;
    let addend: Point = this;
    while (scalar > 0n) {
      if (scalar & 1n) result = result.add(addend);
      addend = addend.add(addend);
      scalar >>= 1n;
    }
    return result;
  }
}

function privateKeyToPublicKey(privateKeyHex: string): Uint8Array {
  const pk = BigInt('0x' + privateKeyHex);
  const pub = Point.G.multiply(pk);
  const x = pub.x.toString(16).padStart(64, '0');
  const y = pub.y.toString(16).padStart(64, '0');
  const result = new Uint8Array(65);
  result[0] = 0x04;
  result.set(hexToUint8Array(x), 1);
  result.set(hexToUint8Array(y), 33);
  return result;
}

async function publicKeyToAddress(publicKey: Uint8Array): Promise<string> {
  const sha256Hash = new Uint8Array(await crypto.subtle.digest('SHA-256', new Uint8Array(publicKey)));
  const hash160 = new Uint8Array(ripemd160().update(Array.from(sha256Hash)).digest());
  const payload = new Uint8Array(21);
  payload[0] = 0x30; // LANA address version byte
  payload.set(hash160, 1);
  return await base58CheckEncode(payload);
}

function encodeDER(r: bigint, s: bigint): Uint8Array {
  const rHex = r.toString(16).padStart(64, '0');
  const sHex = s.toString(16).padStart(64, '0');
  const rArray = Array.from(hexToUint8Array(rHex));
  const sArray = Array.from(hexToUint8Array(sHex));
  while (rArray.length > 1 && rArray[0] === 0) rArray.shift();
  while (sArray.length > 1 && sArray[0] === 0) sArray.shift();
  if (rArray[0] >= 0x80) rArray.unshift(0);
  if (sArray[0] >= 0x80) sArray.unshift(0);
  const der = [0x30, 0x00, 0x02, rArray.length, ...rArray, 0x02, sArray.length, ...sArray];
  der[1] = der.length - 2;
  return new Uint8Array(der);
}

function signECDSA(privateKeyHex: string, messageHash: Uint8Array): Uint8Array {
  const privateKey = BigInt('0x' + privateKeyHex);
  const z = BigInt('0x' + uint8ArrayToHex(messageHash));
  const k = Point.mod(z + privateKey, Point.N);
  if (k === 0n) throw new Error('Invalid k');
  const kG = Point.G.multiply(k);
  const r = Point.mod(kG.x, Point.N);
  if (r === 0n) throw new Error('Invalid r');
  const kInv = Point.modInverse(k, Point.N);
  const s = Point.mod(kInv * (z + r * privateKey), Point.N);
  if (s === 0n) throw new Error('Invalid s');
  const finalS = s > Point.N / 2n ? Point.N - s : s;
  return encodeDER(r, finalS);
}

// ==================== UTXO & ELECTRUM ====================

class UTXOSelector {
  static MAX_INPUTS = 500;
  static DUST_THRESHOLD = 500000;

  static selectUTXOs(utxos: any[], totalNeeded: number) {
    if (!utxos || utxos.length === 0) throw new Error('No UTXOs available');
    const totalAvailable = utxos.reduce((sum: number, u: any) => sum + u.value, 0);
    if (totalAvailable < totalNeeded) {
      throw new Error(`Insufficient funds: need ${totalNeeded}, have ${totalAvailable}`);
    }
    const sorted = [...utxos].sort((a, b) => b.value - a.value);
    const nonDust = sorted.filter(u => u.value >= this.DUST_THRESHOLD);
    const workingSet = nonDust.length > 0 ? nonDust : sorted;

    const selected: any[] = [];
    let total = 0;
    for (const utxo of workingSet) {
      if (selected.length >= this.MAX_INPUTS) break;
      selected.push(utxo);
      total += utxo.value;
      if (total >= totalNeeded) return { selected, totalValue: total };
    }
    // Try dust if needed
    if (nonDust.length !== sorted.length) {
      for (const utxo of sorted) {
        if (selected.some(s => s.tx_hash === utxo.tx_hash && s.tx_pos === utxo.tx_pos)) continue;
        if (selected.length >= this.MAX_INPUTS) break;
        selected.push(utxo);
        total += utxo.value;
        if (total >= totalNeeded) return { selected, totalValue: total };
      }
    }
    throw new Error(`Cannot select enough UTXOs: need ${totalNeeded}, have ${total}`);
  }
}

async function connectElectrum(servers: any[], maxRetries = 3) {
  for (let attempt = 0; attempt < maxRetries; attempt++) {
    for (const server of servers) {
      try {
        const conn = await Deno.connect({ hostname: server.host, port: server.port });
        console.log(`✅ Connected to ${server.host}:${server.port}`);
        return conn;
      } catch (e) {
        console.error(`❌ Failed ${server.host}:${server.port}:`, e instanceof Error ? e.message : e);
      }
    }
    if (attempt < maxRetries - 1) await new Promise(r => setTimeout(r, 1000));
  }
  throw new Error('Failed to connect to any Electrum server');
}

async function electrumCall(method: string, params: any[], servers: any[], timeout = 30000) {
  let conn: Deno.Conn | null = null;
  try {
    conn = await connectElectrum(servers);
    const request = { id: Date.now(), method, params };
    await conn.write(new TextEncoder().encode(JSON.stringify(request) + '\n'));

    const timeoutPromise = new Promise((_, reject) =>
      setTimeout(() => reject(new Error(`Timeout ${timeout}ms`)), timeout)
    );

    const callPromise = (async () => {
      let responseText = '';
      const buffer = new Uint8Array(8192);
      while (true) {
        const bytesRead = await conn!.read(buffer);
        if (!bytesRead) break;
        responseText += new TextDecoder().decode(buffer.slice(0, bytesRead));
        if (responseText.includes('\n')) break;
      }
      if (!responseText) throw new Error('No response');
      const response = JSON.parse(responseText.trim());
      if (response.error) throw new Error(`Electrum error: ${JSON.stringify(response.error)}`);
      return response.result;
    })();

    return await Promise.race([callPromise, timeoutPromise]);
  } finally {
    if (conn) try { conn.close(); } catch (_) { /* ignore */ }
  }
}

function parseScriptPubkeyFromRawTx(rawHex: string, voutIndex: number): Uint8Array {
  const tx = hexToUint8Array(rawHex);
  let cursor = 0;
  const readVarint = () => {
    const first = tx[cursor++];
    if (first < 0xfd) return first;
    if (first === 0xfd) { const v = tx[cursor] | tx[cursor + 1] << 8; cursor += 2; return v; }
    if (first === 0xfe) { const v = tx[cursor] | tx[cursor + 1] << 8 | tx[cursor + 2] << 16 | tx[cursor + 3] << 24; cursor += 4; return v; }
    throw new Error('Varint too large');
  };
  cursor += 4; // version
  cursor += 4; // nTime
  const vinCount = readVarint();
  for (let i = 0; i < vinCount; i++) {
    cursor += 32 + 4; // txid + vout
    const scriptLen = readVarint();
    cursor += scriptLen + 4; // scriptSig + sequence
  }
  const voutCount = readVarint();
  if (voutIndex >= voutCount) throw new Error(`vout ${voutIndex} >= ${voutCount}`);
  for (let i = 0; i < voutCount; i++) {
    cursor += 8; // value
    const scriptLen = readVarint();
    const script = tx.slice(cursor, cursor + scriptLen);
    if (i === voutIndex) return script;
    cursor += scriptLen;
  }
  throw new Error(`vout ${voutIndex} not found`);
}

// ==================== BUILD SIGNED TX ====================

async function buildSignedTx(
  selectedUTXOs: any[],
  privateKeyWIF: string,
  recipients: { address: string; amount: number }[],
  fee: number,
  changeAddress: string,
  servers: any[]
) {
  const normalizedKey = normalizeWif(privateKeyWIF);
  const privateKeyBytes = base58CheckDecode(normalizedKey);
  const privateKeyHex = uint8ArrayToHex(privateKeyBytes.slice(1));
  const publicKey = privateKeyToPublicKey(privateKeyHex);

  const totalAmount = recipients.reduce((s, r) => s + r.amount, 0);
  const totalValue = selectedUTXOs.reduce((s: number, u: any) => s + u.value, 0);

  // Build outputs
  const outputs: Uint8Array[] = [];
  for (const recipient of recipients) {
    const hash = base58CheckDecode(recipient.address).slice(1);
    const script = new Uint8Array([0x76, 0xa9, 0x14, ...hash, 0x88, 0xac]);
    const valueBytes = new Uint8Array(8);
    new DataView(valueBytes.buffer).setBigUint64(0, BigInt(recipient.amount), true);
    outputs.push(new Uint8Array([...valueBytes, ...encodeVarint(script.length), ...script]));
  }

  const changeAmount = totalValue - totalAmount - fee;
  let outputCount = recipients.length;
  if (changeAmount > 1000) {
    const hash = base58CheckDecode(changeAddress).slice(1);
    const script = new Uint8Array([0x76, 0xa9, 0x14, ...hash, 0x88, 0xac]);
    const valueBytes = new Uint8Array(8);
    new DataView(valueBytes.buffer).setBigUint64(0, BigInt(changeAmount), true);
    outputs.push(new Uint8Array([...valueBytes, ...encodeVarint(script.length), ...script]));
    outputCount++;
  }

  const version = new Uint8Array([0x01, 0x00, 0x00, 0x00]);
  const nTime = new Uint8Array(4);
  new DataView(nTime.buffer).setUint32(0, Math.floor(Date.now() / 1000), true);
  const locktime = new Uint8Array([0x00, 0x00, 0x00, 0x00]);
  const hashType = new Uint8Array([0x01, 0x00, 0x00, 0x00]);

  // Fetch all scriptPubkeys
  const scriptPubkeys: Uint8Array[] = [];
  for (const utxo of selectedUTXOs) {
    const rawTx = await electrumCall('blockchain.transaction.get', [utxo.tx_hash], servers);
    scriptPubkeys.push(parseScriptPubkeyFromRawTx(rawTx, utxo.tx_pos));
  }

  // Sign each input
  const signedInputs: Uint8Array[] = [];
  for (let i = 0; i < selectedUTXOs.length; i++) {
    const utxo = selectedUTXOs[i];
    // Build preimage inputs
    const preimageInputs: Uint8Array[] = [];
    for (let j = 0; j < selectedUTXOs.length; j++) {
      const uj = selectedUTXOs[j];
      const txidJ = hexToUint8Array(uj.tx_hash).reverse();
      const voutJ = new Uint8Array(4);
      new DataView(voutJ.buffer).setUint32(0, uj.tx_pos, true);
      const scriptForJ = (j === i) ? scriptPubkeys[j] : new Uint8Array(0);
      preimageInputs.push(new Uint8Array([
        ...txidJ, ...voutJ,
        ...encodeVarint(scriptForJ.length), ...scriptForJ,
        0xff, 0xff, 0xff, 0xff
      ]));
    }

    const allPreimageInputs = preimageInputs.reduce((acc, cur) => {
      const out = new Uint8Array(acc.length + cur.length);
      out.set(acc); out.set(cur, acc.length);
      return out;
    }, new Uint8Array(0));

    const allOutputs = new Uint8Array(outputs.reduce((t, o) => t + o.length, 0));
    let off = 0;
    for (const o of outputs) { allOutputs.set(o, off); off += o.length; }

    const preimage = new Uint8Array([
      ...version, ...nTime,
      ...encodeVarint(selectedUTXOs.length), ...allPreimageInputs,
      ...encodeVarint(outputCount), ...allOutputs,
      ...locktime, ...hashType
    ]);

    const sighash = await sha256d(preimage);
    const signature = signECDSA(privateKeyHex, sighash);
    const sigWithType = new Uint8Array([...signature, 0x01]);
    const scriptSig = new Uint8Array([...pushData(sigWithType), ...pushData(publicKey)]);

    const txid = hexToUint8Array(utxo.tx_hash).reverse();
    const voutBytes = new Uint8Array(4);
    new DataView(voutBytes.buffer).setUint32(0, utxo.tx_pos, true);

    signedInputs.push(new Uint8Array([
      ...txid, ...voutBytes,
      ...encodeVarint(scriptSig.length), ...scriptSig,
      0xff, 0xff, 0xff, 0xff
    ]));
  }

  // Assemble final tx
  const allInputs = new Uint8Array(signedInputs.reduce((t, i) => t + i.length, 0));
  let off = 0;
  for (const inp of signedInputs) { allInputs.set(inp, off); off += inp.length; }

  const allOutputsFinal = new Uint8Array(outputs.reduce((t, o) => t + o.length, 0));
  off = 0;
  for (const o of outputs) { allOutputsFinal.set(o, off); off += o.length; }

  const finalTx = new Uint8Array([
    ...version, ...nTime,
    ...encodeVarint(selectedUTXOs.length), ...allInputs,
    ...encodeVarint(outputCount), ...allOutputsFinal,
    ...locktime
  ]);

  return uint8ArrayToHex(finalTx);
}

// ==================== MAIN HANDLER ====================

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    console.log('🔄 Starting retry-failed-transactions...');

    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // 1. Get all failed transactions
    const { data: failedTxs, error: fetchError } = await supabase
      .from('failed_transactions')
      .select('id, walletid, amount, player_id, difficulty_level')
      .eq('status', 'failed');

    if (fetchError) throw new Error(`Failed to fetch failed_transactions: ${fetchError.message}`);

    if (!failedTxs || failedTxs.length === 0) {
      console.log('✅ No failed transactions to retry');
      return new Response(JSON.stringify({ success: true, message: 'No failed transactions', processed: 0 }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    console.log(`📋 Found ${failedTxs.length} failed transactions to retry`);

    // 2. Get app settings (wallet key, electrum server)
    const { data: settings, error: settingsError } = await supabase
      .from('app_settings')
      .select('lana_private_key, lana_wallet_id, electrum_server, electrum_server_port')
      .single();

    if (settingsError || !settings || !settings.lana_private_key || !settings.lana_wallet_id) {
      throw new Error('App settings not configured');
    }

    const servers = [
      { host: settings.electrum_server || 'electrum1.lanacoin.com', port: settings.electrum_server_port || 5097 },
      { host: 'electrum1.lanacoin.com', port: 5097 },
      { host: 'electrum2.lanacoin.com', port: 5097 },
      { host: 'electrum3.lanacoin.com', port: 5097 }
    ];

    // 3. Validate sender address from private key
    const normalizedKey = normalizeWif(settings.lana_private_key);
    const pkBytes = base58CheckDecode(normalizedKey);
    const pkHex = uint8ArrayToHex(pkBytes.slice(1));
    const pubKey = privateKeyToPublicKey(pkHex);
    const senderAddress = await publicKeyToAddress(pubKey);

    if (senderAddress !== settings.lana_wallet_id) {
      console.log(`⚠️ Derived address ${senderAddress} vs configured ${settings.lana_wallet_id}`);
    }

    // 4. Get UTXOs
    const utxos = await electrumCall('blockchain.address.listunspent', [settings.lana_wallet_id], servers);
    if (!utxos || utxos.length === 0) throw new Error('No UTXOs available in LANA wallet');

    console.log(`📦 Found ${utxos.length} UTXOs`);

    // 5. Build recipients (amount is stored in LANA, convert to satoshis)
    const recipients = failedTxs.map(tx => ({
      address: tx.walletid,
      amount: Math.round(tx.amount * 100_000_000) // LANA -> satoshis
    }));

    const totalAmountSatoshis = recipients.reduce((s, r) => s + r.amount, 0);
    console.log(`💰 Total to retry: ${(totalAmountSatoshis / 100_000_000).toFixed(8)} LANA to ${recipients.length} recipients`);

    // 6. Select UTXOs with fee estimation
    const outputCount = recipients.length + 1; // + change
    let selection = UTXOSelector.selectUTXOs(utxos, totalAmountSatoshis);
    let baseFee = (selection.selected.length * 180 + outputCount * 34 + 10) * 100;
    let fee = Math.floor(baseFee * 1.5);

    // Iteratively adjust if needed
    let iterations = 0;
    while (selection.totalValue < totalAmountSatoshis + fee && iterations < 10) {
      iterations++;
      selection = UTXOSelector.selectUTXOs(utxos, totalAmountSatoshis + fee);
      baseFee = (selection.selected.length * 180 + outputCount * 34 + 10) * 100;
      fee = Math.floor(baseFee * 1.5);
    }

    if (selection.totalValue < totalAmountSatoshis + fee) {
      throw new Error(`Insufficient funds: need ${totalAmountSatoshis + fee}, have ${selection.totalValue}`);
    }

    console.log(`💸 Fee: ${fee} satoshis, using ${selection.selected.length} UTXOs`);

    // 7. Build, sign, and broadcast
    const signedTx = await buildSignedTx(
      selection.selected,
      settings.lana_private_key,
      recipients,
      fee,
      settings.lana_wallet_id,
      servers
    );

    console.log('🚀 Broadcasting retry transaction...');
    const broadcastResult = await electrumCall('blockchain.transaction.broadcast', [signedTx], servers, 45000);

    if (!broadcastResult) throw new Error('Broadcast failed - no result');

    const resultStr = typeof broadcastResult === 'string' ? broadcastResult : String(broadcastResult);

    if (resultStr.includes('TX rejected') || resultStr.includes('code') || resultStr.includes('-22') ||
        resultStr.includes('error') || resultStr.includes('Error') || resultStr.includes('failed') || resultStr.includes('Failed')) {
      throw new Error(`Broadcast failed: ${resultStr}`);
    }

    const txid = resultStr.trim();
    if (!/^[a-fA-F0-9]{64}$/.test(txid)) {
      throw new Error(`Invalid txid: ${txid}`);
    }

    console.log('✅ Retry transaction broadcast successful:', txid);

    // 8. Update failed_transactions to 'completed'
    const failedIds = failedTxs.map(t => t.id);
    const { error: updateError } = await supabase
      .from('failed_transactions')
      .update({ status: 'completed' })
      .in('id', failedIds);

    if (updateError) {
      console.error('❌ Failed to update failed_transactions:', updateError);
    } else {
      console.log(`📝 Updated ${failedIds.length} failed_transactions to 'completed'`);
    }

    // 9. Also update the players table for these players
    const playerIds = failedTxs.map(t => t.player_id).filter(Boolean);
    if (playerIds.length > 0) {
      const { error: playerUpdateError } = await supabase
        .from('players')
        .update({ received_lana: true, transactionid: txid })
        .in('id', playerIds);

      if (playerUpdateError) {
        console.error('❌ Failed to update players:', playerUpdateError);
      } else {
        console.log(`📝 Updated ${playerIds.length} players as received_lana=true`);
      }
    }

    return new Response(JSON.stringify({
      success: true,
      message: `Retried ${failedTxs.length} failed transactions`,
      txid,
      processed: failedTxs.length,
      totalAmount: totalAmountSatoshis
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });

  } catch (error) {
    console.error('❌ Retry failed transactions error:', error);
    return new Response(JSON.stringify({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error'
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });
  }
});

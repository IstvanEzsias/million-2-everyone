import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.57.4'
import { schnorr } from "https://esm.sh/@noble/secp256k1@2.1.0"

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

interface NostrEvent {
  id: string
  pubkey: string
  created_at: number
  kind: number
  tags: string[][]
  content: string
  sig: string
}

interface RelayResult {
  url: string
  success: boolean
  error?: string
  responseTime?: number
}

interface ProfileData {
  name: string
  about: string
  picture: string
  nip05: string
  banner: string
  website: string
  lud16: string
  currency: string
  lanoshi2lash: string
}

// Simple NOSTR event creation and signing functions
function sha256(data: string): Promise<string> {
  const encoder = new TextEncoder()
  const dataBuffer = encoder.encode(data)
  return crypto.subtle.digest('SHA-256', dataBuffer).then(hashBuffer => {
    const hashArray = Array.from(new Uint8Array(hashBuffer))
    return hashArray.map(b => b.toString(16).padStart(2, '0')).join('')
  })
}

function hexToBytes(hex: string): Uint8Array {
  const bytes = new Uint8Array(hex.length / 2)
  for (let i = 0; i < hex.length; i += 2) {
    bytes[i / 2] = parseInt(hex.substr(i, 2), 16)
  }
  return bytes
}

async function createEvent(
  pubkey: string,
  kind: number,
  tags: string[][],
  content: string,
  privateKey: string
): Promise<NostrEvent> {
  const created_at = Math.floor(Date.now() / 1000)
  
  // Create event data for signing
  const eventData = [0, pubkey, created_at, kind, tags, content]
  const eventString = JSON.stringify(eventData)
  const eventHash = await sha256(eventString)
  
  // Simple secp256k1 signature (simplified for demo)
  // In production, you'd use a proper secp256k1 library
  const signature = await signEvent(eventHash, privateKey)
  
  return {
    id: eventHash,
    pubkey,
    created_at,
    kind,
    tags,
    content,
    sig: signature
  }
}

async function signEvent(eventHash: string, privateKey: string): Promise<string> {
  // Use proper schnorr signatures for NOSTR
  try {
    const eventHashBytes = hexToBytes(eventHash)
    const privateKeyBytes = hexToBytes(privateKey)
    const signature = await schnorr.sign(eventHashBytes, privateKeyBytes)
    return bytesToHex(signature)
  } catch (error) {
    console.error('Signing error:', error)
    throw new Error(`Failed to sign event: ${error.message}`)
  }
}

function bytesToHex(bytes: Uint8Array): string {
  return Array.from(bytes).map(b => b.toString(16).padStart(2, '0')).join('')
}

async function broadcastToRelay(relay: string, event: NostrEvent): Promise<RelayResult> {
  const startTime = Date.now()
  
  try {
    console.log(`Attempting to connect to relay: ${relay}`)
    
    // Create WebSocket connection
    const ws = new WebSocket(relay)
    
    return new Promise((resolve) => {
      const timeout = setTimeout(() => {
        ws.close()
        resolve({
          url: relay,
          success: false,
          error: 'Connection timeout'
        })
      }, 10000) // 10 second timeout
      
      ws.onopen = () => {
        console.log(`Connected to ${relay}`)
        // Send EVENT message
        const message = JSON.stringify(['EVENT', event])
        ws.send(message)
      }
      
      ws.onmessage = (msg) => {
        try {
          const data = JSON.parse(msg.data)
          console.log(`Response from ${relay}:`, data)
          
          if (data[0] === 'OK' && data[1] === event.id) {
            clearTimeout(timeout)
            ws.close()
            resolve({
              url: relay,
              success: data[2] === true,
              error: data[2] === false ? data[3] : undefined,
              responseTime: Date.now() - startTime
            })
          }
        } catch (e) {
          console.error(`Error parsing message from ${relay}:`, e)
        }
      }
      
      ws.onerror = (error) => {
        console.error(`WebSocket error for ${relay}:`, error)
        clearTimeout(timeout)
        resolve({
          url: relay,
          success: false,
          error: 'WebSocket connection error'
        })
      }
      
      ws.onclose = () => {
        clearTimeout(timeout)
      }
    })
  } catch (error) {
    console.error(`Failed to connect to ${relay}:`, error)
    return {
      url: relay,
      success: false,
      error: error.message || 'Unknown error',
      responseTime: Date.now() - startTime
    }
  }
}

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders })
  }

  try {
    const { profileData, walletData } = await req.json() as {
      profileData: ProfileData
      walletData: { walletId: string, nostrHex: string, nostrPrivateKey: string, email: string }
    }

    console.log('Creating NOSTR profile for:', profileData.name)

    // Initialize Supabase client
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    const supabase = createClient(supabaseUrl, supabaseKey)

    // Fetch relays from database
    console.log('Fetching relays from database...')
    const { data: relays, error: relaysError } = await supabase
      .from('nostr_relays')
      .select('url')

    if (relaysError) {
      throw new Error(`Failed to fetch relays: ${relaysError.message}`)
    }

    console.log(`Found ${relays?.length || 0} relays`)

    // Create NOSTR metadata event (kind 0)
    const content = JSON.stringify({
      name: profileData.name,
      about: profileData.about,
      picture: profileData.picture,
      nip05: profileData.nip05,
      banner: profileData.banner,
      website: profileData.website,
      lud16: profileData.lud16,
      currency: profileData.currency,
      lanoshi2lash: profileData.lanoshi2lash
    })

    // Use the public key directly (nostrHex is the public key)
    const publicKey = walletData.nostrHex

    const event = await createEvent(
      publicKey,
      0, // kind 0 for metadata
      [],
      content,
      walletData.nostrPrivateKey
    )

    console.log('Created NOSTR event:', event.id)

    // Broadcast to all relays
    const relayResults: RelayResult[] = []
    
    if (relays && relays.length > 0) {
      console.log('Broadcasting to relays...')
      const promises = relays.map(relay => broadcastToRelay(relay.url, event))
      const results = await Promise.all(promises)
      relayResults.push(...results)
    }

    // Store player record in database
    console.log('Storing player record...')
    const { data: playerData, error: playerError } = await supabase
      .from('players')
      .insert({
        walletid: walletData.walletId,
        nostrhex: walletData.nostrHex,
        email: walletData.email
      })
      .select()
      .single()

    if (playerError) {
      console.error('Player storage error:', playerError)
      throw new Error(`Failed to store player data: ${playerError.message}`)
    }

    console.log('Player record created:', playerData.id)

    // Prepare response
    const successfulRelays = relayResults.filter(r => r.success).length
    const totalRelays = relayResults.length

    const response = {
      success: true,
      eventId: event.id,
      playerId: playerData.id,
      relayResults: {
        total: totalRelays,
        successful: successfulRelays,
        failed: totalRelays - successfulRelays,
        details: relayResults
      },
      message: `NOSTR profile created successfully! Event broadcasted to ${successfulRelays}/${totalRelays} relays.`
    }

    console.log('Profile creation completed:', response)

    return new Response(JSON.stringify(response), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 200
    })

  } catch (error) {
    console.error('Profile creation failed:', error)
    
    return new Response(JSON.stringify({
      success: false,
      error: error.message || 'Unknown error occurred'
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 500
    })
  }
})
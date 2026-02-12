import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.57.4'
import { finalizeEvent } from "https://esm.sh/nostr-tools@2.17.0/pure"

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

interface WalletRegistrationResult {
  success: boolean
  wallet_id: string
  status: string
  message: string
  data?: any
  error?: string
}

interface ProfileData {
  // Required fields
  name: string
  display_name: string
  about: string
  location: string
  currency: string
  lanoshi2lash: string
  whoAreYou: string
  orgasmic_profile: string
  tags_t: string // Things interested in
  tags_o: string // Intimacy interests
  statement_of_responsibility: string // Self-responsibility acceptance statement
  
  // Optional fields
  picture: string
  website: string
  nip05: string
  payment_link: string
  lanaWalletID: string // Prefilled, read-only
  bankName: string
  bankAddress: string
  bankSWIFT: string
  bankAccount: string
}

// Helper function to convert hex string to bytes
function hexToBytes(hex: string): Uint8Array {
  const bytes = new Uint8Array(hex.length / 2)
  for (let i = 0; i < hex.length; i += 2) {
    bytes[i / 2] = parseInt(hex.substr(i, 2), 16)
  }
  return bytes
}

// Create a NOSTR event using nostr-tools
function createEvent(
  pubkey: string,
  kind: number,
  tags: string[][],
  content: string,
  privateKey: string
): NostrEvent {
  const created_at = Math.floor(Date.now() / 1000)
  
  // Create unsigned event
  const unsignedEvent = {
    kind,
    created_at,
    tags,
    content,
    pubkey
  }
  
  // Sign the event using nostr-tools
  const signedEvent = finalizeEvent(unsignedEvent, hexToBytes(privateKey))
  
  return signedEvent
}

// Function to register wallet with Lana Registry (with 3x retry)
async function registerWalletWithLanaRegistry(
  walletId: string, 
  nostrHex: string
): Promise<WalletRegistrationResult> {
  const apiKey = 'ak_ev1gahir2shcxjlio7im97'
  const maxRetries = 3
  const delays = [1000, 2000] // delays between attempts

  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      console.log(`[Attempt ${attempt}/${maxRetries}] Registering wallet ${walletId} with NOSTR ID ${nostrHex}`)
      
      const response = await fetch('https://laluxmwarlejdwyboudz.supabase.co/functions/v1/register-virgin-wallets', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          method: 'check_wallet',
          api_key: apiKey,
          data: {
            wallet_id: walletId,
            nostr_id_hex: nostrHex
          }
        })
      })

      const result = await response.json()
      console.log(`[Attempt ${attempt}/${maxRetries}] Lana Registry response:`, result)

      if (result.success) {
        console.log(`✅ Wallet registration succeeded on attempt ${attempt}`)
        return {
          success: true,
          wallet_id: walletId,
          status: result.status || 'ok',
          message: result.message || 'Wallet registered successfully',
          data: result.data
        }
      }

      // Registration returned but was not successful
      console.warn(`[Attempt ${attempt}/${maxRetries}] Registration not successful: ${result.message || result.error}`)
      
      if (attempt < maxRetries) {
        const delay = delays[attempt - 1]
        console.log(`Waiting ${delay}ms before retry...`)
        await new Promise(resolve => setTimeout(resolve, delay))
      }
    } catch (error) {
      console.error(`[Attempt ${attempt}/${maxRetries}] Lana Registry API error:`, error)
      
      if (attempt < maxRetries) {
        const delay = delays[attempt - 1]
        console.log(`Waiting ${delay}ms before retry...`)
        await new Promise(resolve => setTimeout(resolve, delay))
      }
    }
  }

  // All attempts failed
  console.error(`❌ Wallet registration failed after ${maxRetries} attempts`)
  return {
    success: false,
    wallet_id: walletId,
    status: 'error',
    message: `Wallet registration failed after ${maxRetries} attempts`,
    error: `Registration failed after ${maxRetries} attempts`
  }
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
    const errorMessage = error instanceof Error ? error.message : 'Unknown error'
    return {
      url: relay,
      success: false,
      error: errorMessage,
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
      walletData: { 
        walletId: string, 
        nostrHex: string, 
        nostrPrivateKey: string, 
        playedGame?: boolean,
        difficulty?: string
      }
    }

    console.log('Creating NOSTR profile for:', profileData.name)
    console.log('Profile data received:', JSON.stringify(profileData, null, 2))

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

    // Create NOSTR metadata event (kind 0) with ALL profile fields
    const content = JSON.stringify({
      // Standard Nostr fields
      name: profileData.name,
      display_name: profileData.display_name,
      about: profileData.about,
      picture: profileData.picture,
      website: profileData.website,
      nip05: profileData.nip05,
      
      // Payment & Location fields
      payment_link: profileData.payment_link,
      location: profileData.location,
      currency: profileData.currency,
      
      // LanaCoins specific fields
      lanoshi2lash: profileData.lanoshi2lash,
      lanaWalletID: profileData.lanaWalletID,
      whoAreYou: profileData.whoAreYou,
      orgasmic_profile: profileData.orgasmic_profile,
      statement_of_responsibility: profileData.statement_of_responsibility,
      
      // Banking information fields
      bankName: profileData.bankName,
      bankAddress: profileData.bankAddress,
      bankSWIFT: profileData.bankSWIFT,
      bankAccount: profileData.bankAccount
    })

    console.log('Event content created:', content)

    // Parse tags from comma-separated strings
    const tagsT = profileData.tags_t ? profileData.tags_t.split(',').map(tag => tag.trim()).filter(tag => tag.length > 0) : []
    const tagsO = profileData.tags_o ? profileData.tags_o.split(',').map(tag => tag.trim()).filter(tag => tag.length > 0) : []
    
    // Create event tags according to Nostr specification
    const eventTags: string[][] = []
    
    // Add "t" tags for things interested in
    tagsT.forEach(tag => {
      eventTags.push(['t', tag])
    })
    
    // Add "o" tags for intimacy interests
    tagsO.forEach(tag => {
      eventTags.push(['o', tag])
    })

    console.log('Event tags created:', eventTags)

    // Use the public key directly (nostrHex is the public key)
    const publicKey = walletData.nostrHex

    const event = createEvent(
      publicKey,
      0, // kind 0 for metadata
      eventTags,
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
        played_the_game: walletData.playedGame || false,
        difficulty_level: walletData.difficulty || 'intermediate'
      })
      .select()
      .single()

    if (playerError) {
      console.error('Player storage error:', playerError)
      throw new Error(`Failed to store player data: ${playerError.message}`)
    }

    console.log('Player record created:', playerData.id)

    // If this is a Legendary completion, record in legendary_winners table
    if (walletData.difficulty === 'impossible') {
      console.log('✨ Recording legendary winner...')
      const { error: legendaryError } = await supabase
        .from('legendary_winners')
        .insert({
          player_id: playerData.id,
          walletid: walletData.walletId,
          nostrhex: walletData.nostrHex
        })
      
      if (legendaryError) {
        console.error('Failed to record legendary winner:', legendaryError)
        // Don't fail the whole request - just log it
      } else {
        console.log('✨ Legendary winner recorded successfully!')
      }
    }

    // Register wallet with Lana Registry
    console.log('Registering wallet with Lana Registry...')
    const walletRegistration = await registerWalletWithLanaRegistry(
      walletData.walletId,
      walletData.nostrHex
    )

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
      walletRegistration,
      message: `NOSTR profile created successfully! Event broadcasted to ${successfulRelays}/${totalRelays} relays.`
    }

    console.log('Profile creation completed:', response)

    return new Response(JSON.stringify(response), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 200
    })

  } catch (error) {
    console.error('Profile creation failed:', error)
    const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred'
    
    return new Response(JSON.stringify({
      success: false,
      error: errorMessage
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 500
    })
  }
})
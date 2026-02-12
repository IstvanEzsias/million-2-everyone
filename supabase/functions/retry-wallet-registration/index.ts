import { serve } from "https://deno.land/std@0.168.0/http/server.ts"

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders })
  }

  try {
    const { wallet_id, nostr_id_hex } = await req.json()

    if (!wallet_id || !nostr_id_hex) {
      return new Response(JSON.stringify({ success: false, error: 'Missing wallet_id or nostr_id_hex' }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 400
      })
    }

    const apiKey = 'ak_ev1gahir2shcxjlio7im97'
    const maxRetries = 3
    const delays = [1000, 2000]

    for (let attempt = 1; attempt <= maxRetries; attempt++) {
      try {
        console.log(`[Retry Attempt ${attempt}/${maxRetries}] Registering wallet ${wallet_id}`)

        const response = await fetch('https://laluxmwarlejdwyboudz.supabase.co/functions/v1/register-virgin-wallets', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            method: 'check_wallet',
            api_key: apiKey,
            data: { wallet_id, nostr_id_hex }
          })
        })

        const result = await response.json()
        console.log(`[Retry Attempt ${attempt}] Response:`, result)

        if (result.success) {
          return new Response(JSON.stringify({
            success: true,
            message: 'Wallet registered successfully',
            wallet_id,
            status: result.status || 'ok'
          }), {
            headers: { ...corsHeaders, 'Content-Type': 'application/json' }
          })
        }

        if (attempt < maxRetries) {
          await new Promise(r => setTimeout(r, delays[attempt - 1]))
        }
      } catch (err) {
        console.error(`[Retry Attempt ${attempt}] Error:`, err)
        if (attempt < maxRetries) {
          await new Promise(r => setTimeout(r, delays[attempt - 1]))
        }
      }
    }

    return new Response(JSON.stringify({
      success: false,
      error: `Registration failed after ${maxRetries} attempts`,
      wallet_id
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    })

  } catch (error) {
    console.error('Retry wallet registration error:', error)
    return new Response(JSON.stringify({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error'
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 500
    })
  }
})

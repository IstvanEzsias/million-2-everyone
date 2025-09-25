import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.57.4';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type'
};

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
      
      const buffer = new Uint8Array(32768);
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

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    console.log('🎯 Starting available prizes check...');

    // Create Supabase client
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    // Get app settings
    console.log('📋 Fetching app settings...');
    const { data: settings, error: settingsError } = await supabase
      .from('app_settings')
      .select('*')
      .limit(1)
      .single();

    if (settingsError) {
      console.error('❌ Failed to fetch app settings:', settingsError);
      throw new Error('Failed to fetch app settings');
    }

    if (!settings.lana_wallet_id) {
      console.error('❌ No LANA wallet ID configured');
      throw new Error('No LANA wallet ID configured');
    }

    const electrumServer = settings.electrum_server || 'electrum1.lanacoin.com';
    const electrumPort = settings.electrum_server_port || 5097;

    console.log(`⚙️ Using Electrum server: ${electrumServer}:${electrumPort}`);
    console.log(`💳 Checking balance for wallet: ${settings.lana_wallet_id}`);

    // Get wallet balance from Electrum
    const balance = await electrumCall('blockchain.address.get_balance', [settings.lana_wallet_id], electrumServer, electrumPort);
    
    if (!balance) {
      throw new Error('Failed to get wallet balance');
    }

    console.log(`💰 Wallet balance:`, balance);

    // Convert confirmed balance from satoshis to LANA (1 LANA = 100,000,000 satoshis)
    const confirmedBalance = balance.confirmed || 0;
    const availablePrizes = Math.floor(confirmedBalance / 100000000);

    console.log(`🎁 Available prizes: ${availablePrizes} (from ${confirmedBalance} satoshis)`);

    return new Response(JSON.stringify({
      success: true,
      availablePrizes,
      walletBalance: {
        confirmed: confirmedBalance,
        unconfirmed: balance.unconfirmed || 0
      },
      timestamp: new Date().toISOString()
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error) {
    console.error('❌ Error in get-available-prizes function:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
    return new Response(JSON.stringify({
      success: false,
      error: errorMessage,
      availablePrizes: 0,
      timestamp: new Date().toISOString()
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
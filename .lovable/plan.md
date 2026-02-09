

# Simplify Wallet Registration - Remove Unnecessary Retry Logic

## Problem
The current wallet registration function has a retry mechanism with delays (5s, 8s, 12s) that assumes the Lana Register API needs time to "index" the NOSTR profile first. This is incorrect - the Lana Register API only needs the `nostr_id_hex` to be sent directly and handles everything itself.

This adds up to 25 seconds of unnecessary waiting time to the profile creation flow.

## What Changes

**File: `supabase/functions/create-nostr-profile/index.ts`**

- Remove the `delay()` helper function (lines 97-99)
- Remove the separate `callLanaRegisterAPI()` function (lines 101-119) and inline it back
- Simplify `registerWalletWithLanaRegistry()` to make a single API call without retries or delays
- Keep the same API call structure (which is already correct per documentation):
  - Endpoint: `POST https://laluxmwarlejdwyboudz.supabase.co/functions/v1/register-virgin-wallets`
  - Body: `{ method, api_key, data: { nostr_id_hex, wallets: [...] } }`

## Technical Details

Replace lines 96-186 with a simple single-call function:
- One `fetch()` call to the API
- Parse the response
- Return success/failure based on the API response
- Keep error handling for network failures
- No delays, no retries

## Result
- Profile creation will be significantly faster (no 5-25s delay)
- Cleaner, simpler code
- Same correct API call structure maintained


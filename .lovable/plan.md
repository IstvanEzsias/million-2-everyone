

# Duplicate LANA Sends — Root Cause Analysis and Fix

## The Problem

There are **two bugs** causing duplicate sends to the same wallet:

### Bug 1: `send-lana-to-players` creates duplicate failed_transaction records

In the `catch` block (lines 892-921), when a transaction fails, it re-queries ALL eligible players (`received_lana=false, played_the_game=true`) and inserts a new `failed_transactions` record **every time the cron runs**. Since the cron runs every ~3 minutes, the same player gets a new failed record each run. Example: `LgagWR8RfrWRpLd8ogkM6HmyDM9jNEqNhP` has 4 failed records, one every 3 minutes.

### Bug 2: `retry-failed-transactions` doesn't deduplicate

It selects ALL records with `status='failed'` and builds one recipient per record. So if a wallet has 4 failed records, it sends 4x the amount. It also doesn't check if the player already received LANA via the main flow (where `received_lana` was set to `true`).

## Data Impact

Looking at the data:
- `LUAJvFeBYUR5N8QfVwpZco6ZiH3TS6Rg6b`: 4 failed records all marked `completed` — likely received 4 LANA instead of 1
- `LYSdbk8j1MhAbj9BT4RQqyJHvjHBM6ibUx`: same pattern, 4 completed records
- `LgagWR8RfrWRpLd8ogkM6HmyDM9jNEqNhP`: 4 failed records still pending — would send 4 LANA if retried

## Fixes

### 1. `send-lana-to-players/index.ts` — catch block (lines ~898-921)

Before inserting failed records, check if one already exists for that player with `status='failed'`. Only insert if no existing failed record:

```
-- For each player, only insert if no pending failed_transaction exists
WHERE NOT EXISTS (SELECT 1 FROM failed_transactions WHERE player_id = p.id AND status = 'failed')
```

Practically: query existing failed records first, filter out players that already have a `status='failed'` entry.

### 2. `retry-failed-transactions/index.ts` — deduplicate recipients

Before building the transaction:
1. **Deduplicate by walletid** — group failed records by wallet, use only 1 entry per wallet
2. **Check players table** — skip any player where `received_lana = true` (already paid via main flow)
3. Mark skipped duplicates as `completed` without sending

### 3. Clean up existing data

Mark the current duplicate failed records appropriately — the ones for wallets that already received LANA (`LgagWR8RfrWRpLd8ogkM6HmyDM9jNEqNhP` player already has `received_lana=true` and a txid) should be marked `completed`.


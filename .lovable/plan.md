

# Make Game Optional — Skip to Wallet Creation

## Summary

Add a visible "Skip Game & Create Wallet" button on the main page so users can go directly to wallet creation without playing. No coin reward is given in this scenario. The existing `GameEndDialog` already supports `playedGame={false}`.

## Changes

### 1. `src/pages/Index.tsx`
- Add a styled "Skip Game & Create Wallet" button below the difficulty cards (or above the game canvas)
- On click, set `showSkipDialog = true` (already wired to `GameEndDialog` with `playedGame={false}`)
- Include a small note: "Skip the game and create your wallet directly (no prize earned)"

### 2. `src/components/GameHeader.tsx`
- Update bullet points to clarify the game is optional (e.g., "Play the game to earn 1 Registered Lana, or skip directly to wallet creation")

### 3. Translation files (`public/locales/*/game.json`)
- Translation keys `game.skip.button` and `game.skip.description` already exist in English
- Add/verify matching keys in `sl` and `hu` locale files

### No backend changes needed
- `GameEndDialog` already passes `playedGame={false}` which sends `played_the_game: false` to the edge function — no reward is granted.


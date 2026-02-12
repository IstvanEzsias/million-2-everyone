

# Zanesljiva registracija denarnice z retry mehanizmom

## Problem

Trenutno sistem vrne `success: true` tudi ko registracija denarnice pri Lana Registry **ne uspe**. Uporabnik dobi zeleno sporocilo "profil uspesno ustvarjen", nato se mu poslje LANA - ampak denarnica ni registrirana, kar pomeni da ne more dostopati do sredstev.

Glavni vzroki:
1. Edge funkcija `create-nostr-profile` naredi **en sam poskus** registracije in ne glede na rezultat vrne `success: true`
2. Frontend ne preverja `walletRegistration.success` - uporabnika takoj preusmeri na rezultatno stran
3. Ni mehanizma za ponovni poskus (retry)

## Resitev

### 1. Edge funkcija: 3x retry z zamikom (create-nostr-profile)

Funkcija `registerWalletWithLanaRegistry()` bo poskusila registracijo **3-krat** s kratkimi zamiki (1s, 2s) med poskusi. Ce vsi 3 poskusi ne uspejo, bo funkcija vrnila `walletRegistration.success = false` z jasnim sporocilom.

### 2. Edge funkcija: Blokiranje uspeha ob neuspeli registraciji

Trenutno vrne `success: true` ne glede na registracijo. Spremenimo tako, da:
- Ce registracija uspe -> `success: true` (kot zdaj)
- Ce registracija ne uspe po 3 poskusih -> se vedno `success: true` za profil, AMPAK v odgovoru jasno oznacimo `walletRegistration.success = false`

### 3. Frontend: Prikaz napake in moznost ponovnega poskusa

Na rezultatni strani (`ProfileCreationResults.tsx`):
- Ce `walletRegistration.success === false`, prikazi **opozorilo** z gumbom "Poskusi znova registrirati denarnico"
- Gumb poklice nov edge function endpoint ali ponovi klic registracije
- Uporabnik jasno vidi, da profil je ustvarjen, ampak denarnica ni registrirana

---

## Tehnicni nacrt

### Sprememba 1: `supabase/functions/create-nostr-profile/index.ts`

Dodaj retry logiko v `registerWalletWithLanaRegistry()`:

```text
registerWalletWithLanaRegistry(walletId, nostrHex)
  |
  +-- Poskus 1 -> uspeh? -> return success
  |
  +-- Cakaj 1s
  |
  +-- Poskus 2 -> uspeh? -> return success  
  |
  +-- Cakaj 2s
  |
  +-- Poskus 3 -> uspeh? -> return success
  |
  +-- return { success: false, message: "Registracija ni uspela po 3 poskusih" }
```

Koda bo:
- Obdrzala obstojeco strukturo `registerWalletWithLanaRegistry`
- Dodala zanko z `maxRetries = 3` in `delays = [1000, 2000]`
- Logirala vsak poskus v konzolo

### Sprememba 2: `src/pages/ProfileCreationResults.tsx`

Dodaj sekcijo za neuspelo registracijo:
- Ce `walletRegistration.success === false`, prikazi oranzen opozorilni blok
- Dodaj gumb "Poskusi znova registrirati denarnico" ki poklice edge funkcijo za registracijo
- Po uspesni ponovni registraciji posodobi prikaz na zelen uspeh

### Sprememba 3: `src/components/ProfileCreationReport.tsx`

Enaka sprememba kot pri `ProfileCreationResults.tsx` - dodaj retry gumb za neuspelo registracijo.

### Sprememba 4: Prevodi

Dodaj prevode za nova sporocila v `public/locales/en/results.json`, `hu/results.json`, `sl/results.json`:
- "Registracija denarnice ni uspela"
- "Poskusi znova"
- "Registracija uspesna po ponovnem poskusu"


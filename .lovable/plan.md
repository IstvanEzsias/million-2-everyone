

# PDF z QR kodami ob ustvarjanju denarnice

## Kaj se bo zgodilo

Ko uporabnik klikne "Create Wallet" v `GameEndDialog`, se bo poleg prikaza podatkov na zaslonu **avtomatsko generiral in downloadal PDF** z dvema QR kodama:
1. **LanaCoin naslov** (javni) + QR koda
2. **Private Key WIF** + QR koda

PDF se downloada takoj po generaciji denarnice, brez da bi uporabnik moral karkoli klikniti.

## Tehnični pristop

### Nova knjižnica
- `qrcode` - za generiranje QR kod kot data URL (canvas)
- `jspdf` - za generiranje PDF dokumenta na klientu

### Nova utility datoteka: `src/utils/walletPdfGenerator.ts`

Funkcija `generateAndDownloadWalletPdf(walletData: WalletData)`:
1. Generira QR kodo za `lanaAddress`
2. Generira QR kodo za `privateKeyWIF`
3. Sestavi PDF z:
   - Naslov: "LanaCoin Wallet Backup"
   - Sekcija 1: LanaCoin Address + QR + tekst naslova
   - Sekcija 2: Private Key (WIF) + QR + tekst ključa + opozorilo "KEEP THIS SAFE!"
4. Sproži avtomatski download kot `lanacoin-wallet-backup.pdf`

### Sprememba: `src/components/GameEndDialog.tsx`

V `handleCreateWallet` in `handleRegenerateWallet` — po uspešni generaciji denarnice pokliče `generateAndDownloadWalletPdf(wallet)`.

### Sprememba: Prevodi

Ni potrebnih sprememb prevodov — PDF bo v angleščini (univerzalni backup dokument).


# Sito A.S.D. Pedale Bolognese

Sito statico in **Astro**, con pannello di gestione **Sveltia CMS** e
pubblicazione su **Cloudflare** (sito su Workers, foto su R2). Costo di gestione: solo il dominio.

```
C:\Dati\pedaleBolognese\
├── export\            ← contenuti scaricati dal vecchio WordPress (export_wordpress.py)
│   ├── media\         originali (foto, PDF)          → R2: /media/
│   ├── media_web\     foto WebP 1920 px              → R2: /media_web/
│   └── thumbs\        miniature 480 px (npm run thumbs) → R2: /thumbs/
└── sito\              ← questo progetto
```

## 1. Avvio sul PC (Windows)

Serve **Node.js 22.23 o superiore** (va bene l'ultima LTS da <https://nodejs.org>) e **Git**.

```powershell
cd C:\Dati\pedaleBolognese\sito
npm install
copy .env.example .env          # poi lascia PUBLIC_MEDIA_BASE=http://localhost:4322

npm run import                  # porta pagine, gallerie e comunicati da ..\export in src\content
npm run thumbs                  # crea le miniature in ..\export\thumbs (qualche minuto, una volta sola)
```

Poi, in **due finestre** del terminale:

```powershell
npm run media                   # 1ª finestra: serve le foto da ..\export su http://localhost:4322
npm run dev                     # 2ª finestra: il sito su http://localhost:4321
```

Il pannello in locale si apre su <http://localhost:4321/admin/>: con Chrome o Edge
scegli **"Work with Local Repository"** e seleziona la cartella `sito`. Le modifiche
vengono scritte direttamente nei file, senza GitHub.

`npm run build` crea il sito finale in `dist\`. `npm run preview` lo mostra.

## 2. Struttura

| Cartella / file | Cosa contiene |
|---|---|
| `src/content/pagine/` | Pagine fisse (Società, Regolamento, Contatti…): **l'indirizzo è il nome del file** |
| `src/content/gallerie/` | Una galleria per file: titolo, data, elenco foto |
| `src/content/comunicati/` | Comunicati (titolo, data, PDF) |
| `src/content/notizie/` | Diario del gruppo |
| `src/content/uscite/` | Uscite e gite: calendario del sito e file `calendario.ics` |
| `src/config/site.ts` | **Nome, indirizzo, email, menu**: si cambiano qui |
| `src/styles/global.css` | Grafica. I colori (dallo stemma) sono in cima al file |
| `src/pages/` | Le pagine del sito (home, foto, calendario, percorsi…) |
| `public/admin/config.yml` | Configurazione del pannello |
| `public/_redirects` | Vecchi indirizzi WordPress → nuovi |
| `scripts/` | Import dall'export, miniature, server locale delle foto |

Le foto dell'archivio sono scritte nei contenuti come `/media/2026/10/foto.jpg` e il
sito le trasforma in `PUBLIC_MEDIA_BASE/media_web/2026/10/foto.webp` (o `/thumbs/` per
le miniature). I file caricati dal pannello vanno invece in `public/uploads/`.

## 3. Messa online (checklist)

Tutti gli account vanno **intestati all'email dell'associazione**, con il tecnico come amministratore.

### a. GitHub
0. Sposta `DA-SPOSTARE-deploy.yml` in `.github\workflows\deploy.yml` (crea le cartelle):
   ```powershell
   mkdir .github\workflows ; move DA-SPOSTARE-deploy.yml .github\workflows\deploy.yml
   ```
1. Crea un account/organizzazione per l'associazione e un repository privato `pedalebolognese`.
2. Dalla cartella `sito`: `git init`, `git add .`, `git commit -m "Primo commit"`, collega e fai push su `main`.

### b. Cloudflare: dominio
1. Crea l'account Cloudflare (piano Free) e aggiungi `pedalebolognese.it`.
2. **Prima di cambiare i nameserver**, verifica che ci siano tutti i record della posta
   (Microsoft 365) presi dalla zona di TEL&CO:
   - `MX @ → pedalebolognese-it.mail.protection.outlook.com` (priorità 0)
   - `CNAME autodiscover → autodiscover.outlook.com`
   - `CNAME selector1._domainkey → selector1-pedalebolognese-it._domainkey.pedalebolognese.onmicrosoft.com`
   - `CNAME selector2._domainkey → selector2-pedalebolognese-it._domainkey.pedalebolognese.onmicrosoft.com`
   - `TXT @ → v=spf1 include:spf.protection.outlook.com ~all`
   - `TXT @ → MS=ms88556886`
   - `TXT _dmarc → v=DMARC1; p=none`
   - (i record CNAME vanno messi in modalità **DNS only**, nuvola grigia)
3. Non copiare: i record `A` del vecchio hosting, `www1`, `mailpoet*`, `_mailpoet`, `_amazonses`
   (newsletter del vecchio WordPress).

### c. Cloudflare R2: le foto
1. R2 → crea il bucket `pedale-foto` → *Settings* → *Custom domain*: `foto.pedalebolognese.it`.
2. Carica le cartelle con [rclone](https://rclone.org) (configurato come "S3 / Cloudflare R2"):
   ```powershell
   rclone copy ..\export\media_web r2:pedale-foto/media_web --transfers 16 -P
   rclone copy ..\export\thumbs    r2:pedale-foto/thumbs    --transfers 16 -P
   rclone copy ..\export\media     r2:pedale-foto/media     --transfers 16 -P --exclude "*.mp4"
   ```
   Il video da 1,35 GB va su YouTube ("non in elenco") e si incorpora nella pagina.
3. Se il dominio scelto è diverso, aggiornalo in `public/_redirects`.

### d. Cloudflare Workers: il sito
1. Cloudflare → *My Profile* → *API Tokens* → modello **"Edit Cloudflare Workers"**.
2. In GitHub → repository → *Settings* → *Secrets and variables* → *Actions*:
   - Secrets: `CLOUDFLARE_API_TOKEN`, `CLOUDFLARE_ACCOUNT_ID`, `GOOGLE_CALENDAR_ICS`
   - Variables: `PUBLIC_MEDIA_BASE` = `https://foto.pedalebolognese.it`, `PERCORSI_CSV`, `PUBLIC_CALENDAR_SUBSCRIBE`
3. Al primo push parte `.github/workflows/deploy.yml`: il sito appare su `pedalebolognese.<account>.workers.dev`.
   Il workflow si ripete ogni notte, per aggiornare calendario e percorsi.
4. Workers → `pedalebolognese` → *Domains & Routes*: aggiungi `www.pedalebolognese.it` e `pedalebolognese.it`.

### e. Login al pannello (senza account GitHub per i volontari)
Il pannello usa **Sveltia CMS Additions**: un worker gratuito su Cloudflare che gestisce
utenti con **nome utente e password** e ruoli (admin, editor, viewer). Solo il repository
sta su GitHub; i volontari non devono sapere che esiste.
1. Segui <https://sveltiacms.app/en/docs/additions/setup>: pulsante "Deploy to Cloudflare",
   con un `ADMIN_SECRET` di almeno 32 caratteri (`openssl rand -base64 32`), da salvare nel password manager.
2. Metti in `public/admin/config.yml` il nome del repository (`repo`) e l'indirizzo del worker (`base_url`).
3. Apri `/admin/`, scegli **Use Admin Secret** e completa la procedura guidata: crea il primo
   amministratore e una GitHub App installata solo sul repository del sito.
4. Da **Administration** nel pannello aggiungi i volontari con ruolo *editor*.
5. Segui la checklist di sicurezza della guida (2FA sull'account GitHub, protezione del branch, ecc.).

Nota: Additions è uscito a novembre 2026 (v1.0). In alternativa resta il login con GitHub
tramite <https://github.com/sveltia/sveltia-cms-auth> (`auth_type` da togliere, ogni volontario con un account GitHub).

### f. Calendario e Google (facoltativo)
- **Calendario uscite**: si gestisce dal pannello, sezione **Uscite e gite**. Il sito genera
  `/calendario.ics`, a cui i soci si iscrivono dal telefono (pulsante nella pagina Calendario).
  Se il club usa già un Google Calendar, il suo link iCal in `GOOGLE_CALENDAR_ICS` aggiunge quegli eventi alla pagina.
- **Percorsi**: un Google Foglio con colonne tipo `KM, NOME, D+, GPX`. Poi *File → Condividi → Pubblica sul web → CSV*, e il link va in `PERCORSI_CSV`.

## 4. Da fare prima del lancio
- [ ] Recuperare dal vecchio WordPress i PDF dei 4 libri (pagina `i-libri`) e aggiungerli alla pagina
- [ ] Video "Attività e Gite 2024" su YouTube, poi aggiornare la pagina `attivita-e-gite-2024`
- [ ] Ripulire `gite-sociali.md` (tutto il testo era scritto come titoli)
- [ ] Rivedere `policy` e `cookie-policy`: il nuovo sito non usa cookie né statistiche di terze parti
- [ ] Controllare le date dei comunicati importati (sono quelle di caricamento del PDF)
- [ ] Logo: serve una versione pulita dello stemma (quella attuale ha una scritta tagliata in alto)
- [ ] Togliere la notizia di esempio in `src/content/notizie/` (è una bozza: online non compare)

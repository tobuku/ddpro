# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

ddPro (Due Diligence Pro) is a real estate risk analysis tool with three layers:
- **Web frontend** (`index.html` / `style.css` / `app.js`) — GitHub Pages, primary active surface
- **Express API backend** (`server/`) — deployed to Railway, provides `POST /api/analyze`
- **Expo React Native app** (`mobile/`) — shelved, preserved for later App Store work
- **Shared Zod schemas** (`shared/schema.ts`) — single source of truth for all types

## Architecture

### Web frontend data flow
1. User enters address in right-col search card → `handleAnalyze()` in `app.js`
2. `Promise.all([analyzeProperty(address), geocodeAddress(address)])` runs in parallel
3. `analyzeProperty()` → `POST https://ddpro-production.up.railway.app/api/analyze`
4. `geocodeAddress()` → Nominatim (OpenStreetMap, no key required)
5. `generateReport(apiData, address)` enriches API response with mock detail data
6. Results rendered via `renderResults()` → score card, metrics strip, category cards, detail sections, follow-up Q&A, Leaflet map

### Web frontend mock data architecture
`app.js` uses a **Mulberry32 seeded PRNG** (`makeRng(seedFrom(address))`) so the same address always returns the same estimated values. All property-specific numbers (price estimate, roof/HVAC/plumbing age, etc.) derive from this seed. The Railway API also runs random scoring but independently — two separate random sources.

The `generateReport()` function is the only place to change what gets displayed in results. It handles Hawaii-specific logic (tax rate 0.35% vs 1.1%, tsunami risk, STR restrictions, pricing ~$875k vs ~$450k base) via a regex: `/\bhi\b|honolulu|hawaii|maui|oahu|kauai|hilo/i`.

### Address validation
Two layers: (1) client-side requires a comma in the input string before calling the API; (2) server-side Zod schema (`shared/schema.ts`) requires a comma via `.regex(/,/)`. Both return an error if the address has no comma.

### Server
`server/routes.ts` adds a deliberate 1500ms artificial delay (`setTimeout`) before returning results. `server/storage.ts` exports a `MemStorage` singleton — all scores are `Math.random()`, results stored in-memory only (lost on restart).

### Shared types
`shared/schema.ts` is the only file imported by both the server and the web app. Server imports use `.js` extension on relative paths (required by `"type": "module"` + ESM). The web frontend does not import shared types directly — it works with raw JSON from the API.

## Commands

### Server (run from repo root)
```bash
npm run dev        # tsx server/index.ts — dev server on port 5000
npm run check      # TypeScript type check
npm run build      # bundle to dist/ via esbuild
```

### Test the API (PowerShell)
```powershell
Invoke-RestMethod -Uri http://localhost:5000/api/analyze -Method POST -ContentType "application/json" -Body '{"address":"123 Main St, Honolulu, HI"}'
```

### Web frontend
No build step. Edit `index.html`, `style.css`, `app.js` directly. Deploy via `git push origin main` — GitHub Pages serves from repo root.

### Mobile (shelved — run from `mobile/`)
```bash
npm install --legacy-peer-deps   # always required; peer conflicts exist
npx expo start --ios             # Node 20 LTS only — Node 24 breaks Metro
```

## Key Constraints

- **ESM imports**: Server `.ts` files must use `.js` extensions on relative imports (e.g., `./storage.js`). Required by `"type": "module"` in `package.json`.
- **Node version for mobile**: Node 20 LTS only. Node 24 throws `ERR_PACKAGE_PATH_NOT_EXPORTED` in Metro bundler.
- **Mobile deps**: Always `npm install --legacy-peer-deps` in `mobile/` — peer conflicts between expo-router and react-native-reanimated.
- **`metrics-strip` rendering**: `renderMetricsStrip()` returns inner HTML only (tile markup). Assign via `element.innerHTML`, not `element.outerHTML` — replacing outerHTML destroys the element's `id` and breaks subsequent searches.
- **CSS separator technique**: `.metrics-strip` uses `gap: 1px; background: var(--border)` with `.metric-tile { background: var(--surface) }` for separators — no `border-right` on individual tiles.

## Deployment

- **Web**: GitHub Pages — `tobuku.github.io/ddpro/` — auto-deploys from `main` branch root
- **Server**: Railway — linked to `tobuku/ddpro`. Start command: `npx tsx server/index.ts`. `PORT` is auto-provided by Railway. Production URL: `https://ddpro-production.up.railway.app`
- **Mobile** (shelved): EAS Build → TestFlight → App Store. Bundle ID: `com.tobuku.ddpro`. Config in `mobile/eas.json`. API URL from `mobile/.env.local` (gitignored).

## Planned Real Data Sources

Currently all scoring is mock/random. Priority order for real data integration:
1. **FEMA NFHL REST API** — free, no key, flood zone from lat/lon
2. **RentCast API** — AVM, beds/baths/sqft, year built, comps (free tier: 50 req/mo)
3. **Walk Score API** — walkability/transit (free key at walkscore.com)
4. **ATTOM Data API** — tax history, permit records, full market stats (paid)

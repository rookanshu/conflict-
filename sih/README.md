# NER-LIFELINE
## AI-Powered Smart Logistics & Accessibility Platform
### For the North Eastern Region of India

**Smart India Hackathon — National Round**

---

## 1. What it is

A unified operational platform for logistics monitoring, fleet telemetry, road intelligence, weather alerts, shipment tracking, emergency response, field reporting, and accessibility insights — purpose-built for the 8 states of the North Eastern Region (NER): Assam, Arunachal Pradesh, Manipur, Meghalaya, Mizoram, Nagaland, Tripura, Sikkim.

The app runs as a single-page webapp in any modern browser — no native client, no mobile app, no desktop install required.

---

## 2. Features

### Overview
Live operational dashboard: roads monitored, vehicles online, shipments in transit, incidents, and a weather summary across all 8 NER states.

### GIS Map (LiveMapView)
- Leaflet 1.9.4 with OpenStreetMap tiles
- 8-state road network overlay, blockage markers, alternate-route visualisation
- Clickable road segments, GPS coordinate display, marker clustering

### Route Planner (RoutesView)
- 3 corridor options per origin–destination pair
- GPS coordinate waypoints (exportable), distance in km, estimated time
- Risk assessment per route (terrain, weather exposure, infrastructure quality)
- Voice announcement for the alternate route

### Fleet Telemetry (VehiclesView + VehicleDossierModal)
- 5 vehicles monitored, AIS-140 compliant
- Real-time position (lat/lng), speed, heading, status (Moving / Idle / Parked / Unknown)
- Vehicle dossier: RC status, owner, maker/model, emission norms, permit, AIS-140 device
- VAHAN verification via `GET /api/vahan/verify/{plate}`

### Shipment Tracking (ShipmentsView)
- Consignment search by ID, POA, or commodity
- ETA, cold-chain temperature monitoring, current location, route status

### Weather Telemetry (WeatherView)
- 8 NER states: current conditions + precipitation radar
- Cascading risk chain: weather → road blockage → alternate route recommendation

### Field Reports (FieldReportsView)
- Offline-capable incident/blockage reporting
- Categorised reports with GPS, status workflow, photo placeholder

### Emergency Ops (EmergencyOpsView)
- Privileged access (Emergency Commander / Administrator)
- SOS call handling, resource dispatch, live situation board
- Verification gate on sensitive operations

### Analytics (AnalyticsView)
- Recharts charts: vehicle utilisation, shipment trends, incident heatmap, travel-time trends
- Administrator / Emergency Commander access only

### Accessibility (AccessibilityView)
- Accessibility scoring across NER states
- Infrastructure gaps and recommendations

### Alerts (AlertsView)
- Real-time alert stream: blockages, weather warnings, incidents
- Severity indicators, actionable links

### Driver HUD (DriverHudView)
- Simplified in-cab view: next turn, distance, ETA, speed limit, alerts
- Minimal-distraction design

### AI Copilot (AiCopilotModal)
- Conversational assistant for logistics queries, route advice, entity lookup
- Contextual suggestions, NER intelligence

### Profile (ProfileView)
- User profile, role display, session info, logout

---

## 3. Tech Stack

| Layer | Technology |
|---|---|
| Framework | Next.js 16.3.4 (App Router), React 19.2.8 |
| Language | TypeScript 5 (strict mode, `@/*` path aliases) |
| Styling | Tailwind CSS v4 + clsx + tailwind-merge |
| Icons | lucide-react 1.42.0 |
| Maps | Leaflet 1.9.4 + OpenStreetMap tiles |
| Charts | Recharts 3.10.1 |
| Auth | Firebase Auth v12 (Google Sign-In + email/password), optional |
| State | React Context (AppContext, AuthContext, ThemeContext) |
| Backend | Standalone — no external backend required |
| Build | `next build` → `next start` |

---

## 4. Architecture

Single-page app (SPA) with 12 operational views switching via `activeTab` Context state. All data is served from curated local datasets in `src/data/` — no database required in standalone mode.

API layer: 9 route handlers in `src/app/api/` serve the curated datasets. Standalone mode means no Python FastAPI backend and no API keys.

```
sih/
├── src/
│   ├── app/                    # Next.js App Router
│   │   ├── api/               # 9 route handlers (health, chat, vehicles, routes, places, vahan)
│   │   ├── favicon.ico        # served automatically by Next.js convention
│   │   ├── globals.css        # Tailwind v4 import + app styles
│   │   ├── layout.tsx         # root layout (metadata, providers)
│   │   └── page.tsx           # SPA shell + view switcher
│   ├── components/
│   │   ├── views/             # 12 operational views
│   │   ├── modals/            # 6 modals (AI copilot, vehicle dossier, login, etc.)
│   │   ├── map/               # Leaflet map components
│   │   ├── ui/                # shared UI primitives
│   │   ├── auth/              # auth UI (login, protected route)
│   │   └── layout/            # header, footer, shell
│   ├── context/               # AppContext, AuthContext, ThemeContext
│   ├── data/                  # curated local datasets (roads, vehicles, shipments, weather, etc.)
│   ├── lib/                   # apiClient, firebase, googleMapsApi, utils
│   ├── services/              # chatService, fleetService, routeService, vahanService
│   ├── types/                 # shared TypeScript types
│   └── constants/             # roles
├── package.json
├── next.config.ts
├── tsconfig.json
├── postcss.config.mjs
├── .env.example               # environment template (committed)
└── .env.local                 # local secrets (gitignored)
```

## 5. Prerequisites

- Node.js 18+ (tested with v24.20.0)
- npm

---

## 6. Setup

```bash
cd sih

# One-time: install dependencies
npm install

# Development server (hot reload)
npm run dev
# → http://localhost:3000

# Production build + serve
npm run build
npm start -p 3000
# → http://localhost:3000
```

---

## 7. Environment

Copy the template to your local secrets file (gitignored):

```bash
cp .env.example .env.local
```

### Firebase Auth (optional)

Leave all `NEXT_PUBLIC_FIREBASE_*` values blank to run in **demo mode** — the app uses static demo personas and requires no real Firebase project.

To enable real Google Sign-In + email/password auth:
1. Create a Firebase project at https://console.firebase.google.com
2. Project settings → General → Your apps → SDK setup and configuration
3. Copy the 6 published `NEXT_PUBLIC_FIREBASE_*` values into `.env.local`
4. Enable Google Sign-In and Email/Password providers in Authentication → Sign-in method

The current configuration in `.env.local` is for the `ner-l-b0ef4` Firebase project.

### No API keys required (standalone mode)

In standalone mode, the following are **not** required:
- `GOOGLE_ROUTES_API_KEY` — routes served from curated local datasets
- `SERP_API_KEY` — places served from curated local datasets
- `SUPABASE_*` — no database connection needed
- `WEATHERSTACK_API_KEY` — weather served from curated local datasets

> **Security note**: No API keys, tokens, or credentials are hardcoded in source code or this README. Real secrets, if configured later, belong **only** in the gitignored `.env.local` file.

---

## 8. API Endpoints (standalone mode)

All endpoints return curated local dataset responses. No external network calls.

| Endpoint | Method | Description |
|---|---|---|
| `/api/health` | GET | App health + standalone-mode status |
| `/api/chat` | POST | AI Copilot conversational response + suggestions |
| `/api/chat/suggestions` | GET | 4 categories of query suggestions (15 prompts) |
| `/api/places?q=` | GET | Place search (fuel stations, hospitals, etc.) |
| `/api/routes/blockages` | GET | Road blockage records |
| `/api/routes/alternate` | POST | Alternate route for a blockage |
| `/api/v1/routes/google` | POST | 3 corridor options (GPS waypoints, risk assessment) |
| `/api/vahan/verify/{plate}` | GET | VAHAN vehicle verification record |
| `/api/vehicles` | GET | Fleet telemetry (5 vehicles, AIS-140) |

---

## 9. Access Levels

| Role | Access |
|---|---|
| Anonymous / Demo user | Overview, Routes, Vehicles, Shipments, Weather, Field Reports, Alerts, Accessibility, Driver HUD, AI Copilot, Map |
| Registered user (Firebase) | Above + Profile, personalisation |
| Administrator | Above + Analytics, Emergency Ops (view) |
| Emergency Commander | Above + full Emergency Ops operations |

Role gating is implemented in `src/constants/roles.ts` and enforced in view components.

---

## 10. Validation

```bash
# Run the Phase 4 test harness (requires server running on :3000)
node scripts/phase4_test.mjs
# → 64/64 assertions, wall ~250ms

# TypeScript check
npx tsc --noEmit

# Build
npm run build
```

## 11. Current Status

- **Phase 4**: Standalone webapp — basic functional app, no backend, no keys, 64/64 API tests passing
- **Phase 5**: Cleanup & finalize — README updated, dead weight removed, git checkpoint (this phase)

---

## 12. Known Limitations

1. **Standalone mode**: serves curated local datasets only. No live Google Routes, SerpApi, Supabase, or Weatherstack data without additional configuration and a running FastAPI backend.
2. **Analytics & Emergency Ops**: require Administrator or Emergency Commander role.
3. **Firebase auth**: optional; demo mode works without it, but registered features require a real Firebase project.
4. **Interactive browser behaviour**: modal flows, map interactions, live GPS simulation — verified via API correctness; full browser automation deferred.
5. **Repository artifacts**: `sih/backend/`, `sih/frontend/`, and the Java SDK are retained as reference only — not used in standalone mode.

---

## 13. Phase History

| Phase | Focus | Outcome |
|---|---|---|
| 0 | Audit | `sih/` (Next.js SPA) × `NER/` (Vite + FastAPI + Firebase) analysed |
| 1 | Frontend | SPA → App Router migration, code splitting, UI migration |
| 2 | API Layer | NER FastAPI engine imported as typed BFF with offline fallback |
| 3 | Authentication | Firebase Auth (Google + email) with zero startup cost for anonymous visitors |
| 4 | Performance & Integration | Standalone webapp — remove FastAPI bridge, basic functional app, 64/64 PASS |
| 5 | Cleanup & Finalize | README updated, dead weight removed, git checkpoint (this phase) |

---

## 14. References

- [Next.js Documentation](https://nextjs.org/docs)
- [React Documentation](https://react.dev)
- [Tailwind CSS v4](https://tailwindcss.com)
- [Leaflet](https://leafletjs.com)
- [Recharts](https://recharts.org)
- [Firebase Auth](https://firebase.google.com/docs/auth)
- [OpenStreetMap](https://www.openstreetmap.org)

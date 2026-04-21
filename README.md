# Sanad — Warranty & Receipt Organizer

Sanad (سند) is a personal purchase management PWA that helps users organize their purchases, store receipts, track warranties, and understand their spending habits.

## Stack

- **React 18** + **TypeScript** via **Vite**
- **vite-plugin-pwa** for installable PWA + service worker
- **react-router-dom** for client routing
- Plain CSS + CSS Modules (no CSS framework)

## Architecture

Sanad follows a **Layered Architecture** (see `system_blueprint.md §6`). The source tree mirrors the five layers one-to-one:

| Layer | Folder | Responsibility |
| --- | --- | --- |
| Presentation | `src/presentation/` | React UI — pages, components, controllers, hooks, layouts, routes, styles. MVC applied within this layer. |
| Application Logic | `src/application/` | Warranty calculations, alert scheduling, community suggestions, analytics, validation, receipt-scanner orchestration. |
| Data Storage | `src/data/` | Models, repositories, storage adapters, and pre-loaded seed data. Designed so storage can be swapped for a cloud DB. |
| Authentication | `src/auth/` | Registration, login, session, and User / Admin role-based access guards. |
| External Services | `src/services/` | Isolated clients for third-party APIs (Anthropic AI vision for receipt scanning). |

Cross-cutting types, constants, and utilities live under `src/shared/`.

## Scripts

```bash
npm install        # install dependencies
npm run dev        # start Vite dev server at http://localhost:5173
npm run build      # typecheck + production build
npm run preview    # preview the production build locally
npm run typecheck  # TypeScript check only
npm run lint       # ESLint
```

## Status

Scaffold + data-model interfaces only. Pages, repositories, and services are intentionally empty placeholders (see `.gitkeep` files) and will be filled in subsequent tasks.

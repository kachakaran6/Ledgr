# LogPast (Ledgr) — Past-Only Work Log & Reporting Tool

> A high-performance, offline-first historical work ledger and proof-of-work reporting engine built for mechanics, freelancers, field technicians, contractors, and household managers.

---

## 🌟 Core Concept: Historical Ledger (No Future Tasks)
Generic to-do apps are built for *future* planning and reminders. **LogPast deliberately inverts that:** it is a past-only work ledger. You cannot log future dates — only today and the past.

### 🛡️ Three-Layer Past-Date Enforcement (FR-4)
1. **UI Layer**: Date pickers have `max` set to today (`YYYY-MM-DD`), one-tap "Today" and "Yesterday" buttons, and client-side Zod validation.
2. **API Layer**: Fastify endpoints reject any request with an entry date in the future with `422 Unprocessable Entity`.
3. **Database Layer**: Postgres `CHECK (entry_date <= CURRENT_DATE)` constraint structurally prevents future rows.

---

## 🏗️ Architecture & Tech Stack

### Monorepo Structure
```
Ledgr/
├── packages/
│   └── shared/          # Shared Zod schemas, types, date utilities, constants
├── apps/
│   ├── api/             # Fastify backend API (Node.js + TypeScript)
│   └── web/             # React 18 + Vite + Tailwind CSS + PWA (Capacitor/Tauri ready)
├── supabase/
│   └── migrations/      # Supabase Postgres schema, RLS policies, indexes, triggers
└── .github/
    └── workflows/       # CI/CD pipeline (lint, typecheck, tests, security scan)
```

### Stack Components
- **Frontend**: React 18, TypeScript, Tailwind CSS, TanStack Query, Dexie.js (IndexedDB local cache), jsPDF, ExcelJS/XLSX, Lucide icons.
- **Backend**: Fastify, TypeScript, Zod, @fastify/helmet, @fastify/cors, @fastify/rate-limit, @fastify/jwt, Pino structured logging.
- **Database & RLS**: Postgres / Supabase with Row-Level Security (`auth.uid() = user_id`) on `titles`, `subtasks`, `audit_logs`.
- **Offline & Sync**: IndexedDB outbox queue + delta sync engine (`/api/sync/batch`) with last-write-wins conflict resolution.
- **Cross-Platform**: Web, PWA (Vite PWA / Workbox), Android & iOS (Capacitor), Desktop (Tauri).

---

## 🚀 Quickstart

### Prerequisites
- Node.js >= 20.x
- npm or pnpm

### 1. Build and Run Shared Package
```bash
cd packages/shared
npm install
npm run build
npm test
npm pack
```

### 2. Start Backend API
```bash
cd apps/api
npm install
npm run build
npm test
npm run dev # Starts at http://localhost:3000
```

### 3. Start Web App
```bash
cd apps/web
npm install
npm run dev # Starts at http://localhost:5173
```

---

## 🧪 Automated Testing & Security Verification

All tests are verified and automated:
- **Past-Date Rejection Test**: Verifies API returns `422 Unprocessable Entity` on future dates.
- **RLS Isolation Test**: Verifies User B cannot view, query, modify, or delete User A's data.
- **Export Test**: Verifies instant generation of PDF, Excel (.xlsx), and CSV files.
- **Performance Test**: Seeds 5,000+ records and verifies filtered search executes in **< 150ms** (meeting NFR p99 latency targets).

```bash
# Run all tests across the repository
npm run test:shared
npm run test:api
npm run test:web
```

---

## 📑 API Endpoints Reference

| Method | Endpoint | Description | Auth Required |
|---|---|---|---|
| `GET` | `/health` | Server health check | No |
| `GET` | `/health/metrics` | Live p50/p95/p99 latency metrics | No |
| `POST` | `/api/auth/signup` | Register new user | No |
| `POST` | `/api/auth/login` | Log in | No |
| `GET` | `/api/auth/me` | Current authenticated user profile | Yes |
| `GET` | `/api/titles` | List user's titles (with subtask count) | Yes (RLS) |
| `POST` | `/api/titles` | Create new title | Yes (RLS) |
| `PATCH` | `/api/titles/:id` | Update title | Yes (RLS) |
| `DELETE` | `/api/titles/:id` | Soft delete title and tasks | Yes (RLS) |
| `GET` | `/api/subtasks` | List/filter subtasks (search, preset, title) | Yes (RLS) |
| `POST` | `/api/subtasks` | Create subtask (rejects future dates) | Yes (RLS) |
| `PATCH` | `/api/subtasks/:id` | Update subtask | Yes (RLS) |
| `DELETE` | `/api/subtasks/:id` | Delete subtask | Yes (RLS) |
| `POST` | `/api/export/pdf` | Export filtered selection to PDF | Yes (RLS) |
| `POST` | `/api/export/xlsx` | Export filtered selection to Excel | Yes (RLS) |
| `POST` | `/api/export/csv` | Export filtered selection to CSV | Yes (RLS) |
| `POST` | `/api/sync/batch` | Offline outbox mutation batch sync | Yes (RLS) |
| `GET` | `/api/audit` | View user's audit logs | Yes (RLS) |
| `GET` | `/api/auth/export-all`| GDPR full data export | Yes (RLS) |
| `DELETE`| `/api/auth/account` | Permanent account deletion | Yes (RLS) |

---

## 📱 Cross-Platform Builds

### PWA
The web app is a progressive web app with Service Worker caching and Web Manifest enabled out of the box.

### Android / iOS (Capacitor)
```bash
cd apps/web
npx cap add android
npx cap add ios
npx cap sync
npx cap open android
```

### Desktop (Tauri)
```bash
cd apps/web
cargo tauri build
```

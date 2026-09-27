# Product Requirements Document (PRD)
## Product Name (working title): **LogPast** — Past-Only Work Log & Reporting Tool

Version: 1.0
Status: Draft for build
Owner: Product/Founder

---

## 1. Problem Statement

People who do recurring, dated work — mechanics, freelancers, field technicians, household managers, contractors — have no lightweight tool to **record what they already did** and turn it into a **shareable proof-of-work document** (PDF/Excel) on demand.

Generic to-do apps are built around *future* tasks and reminders. This product deliberately inverts that: it is a **historical ledger**, not a planner. You cannot log the future — only today and the past. This constraint is the product's core differentiator and must be enforced everywhere (UI, API, DB).

---

## 2. Target Users

| Persona | Use Case |
|---|---|
| Garage / workshop owner | Logs repairs done per vehicle/day, exports monthly report for a client or for personal records |
| Freelancer / contractor | Logs work completed per client (title) per day, exports as an invoice-support document |
| Field technician | Logs site visits and fixes, exports for compliance/audit |
| Household manager | Tracks home maintenance/chores done, searchable history |

---

## 3. Core Concept & Data Model (plain language)

- **Title** (Parent) — a category/project/entity. E.g. "Garage", "Client A Website", "Household".
- **Sub-task** (Entry) — a dated, past-only record under a Title. E.g. "Repaired brake — 27 Sep 2026".
- A Title can have unlimited Sub-tasks.
- Every Sub-task **must** have a date ≤ today. Future dates are structurally impossible.

---

## 4. Functional Requirements

### 4.1 Task & Title Management
- FR-1: User can create, rename, archive, and delete a Title.
- FR-2: User can add a Sub-task to any Title with: description (required), date (required, ≤ today), status (done/in-progress, optional), tags (optional), cost/time-spent (optional numeric field).
- FR-3: Date field defaults to "Today" with a one-tap "Yesterday" shortcut; the date picker disables all future dates.
- FR-4: Past-date enforcement is validated at three layers: UI (disabled dates), API (reject with 422 on future date), and DB (`CHECK (entry_date <= CURRENT_DATE)` constraint). No single layer is trusted alone.
- FR-5: User can edit or soft-delete any Sub-task (trash, recoverable for 30 days).
- FR-6: User can reorder Sub-tasks within a Title (manual drag or default to date-desc).

### 4.2 Search & Filter
- FR-7: Full-text search across Title names and Sub-task descriptions.
- FR-8: Filter by date range: presets (Today, Yesterday, Last 7 days, This Month, Custom range).
- FR-9: Filter by one or more Titles.
- FR-10: Filters are composable (Title + date range + text simultaneously) and reflected in the URL (shareable, bookmarkable, refresh-safe).
- FR-11: Result list shows a live count of matching Sub-tasks.

### 4.3 Export
- FR-12: User can select any combination of Sub-tasks (checkboxes) from the current filtered view, or "select all filtered."
- FR-13: Export to **PDF**: grouped by Title, showing description/date/status, with a header (date range, generated-on timestamp, user name).
- FR-14: Export to **Excel (.xlsx)**: one row per Sub-task, columns = Title, Sub-task, Date, Status, Notes.
- FR-15: Export to **CSV** as a lightweight fallback.
- FR-16: Exports always reflect exactly the current filter + selection — never the whole database.
- FR-17: Export generation must complete and begin downloading in under 3 seconds for up to 5,000 rows (see NFR performance targets).

### 4.4 Accounts & Multi-device
- FR-18: Email/password and OAuth (Google) sign-in.
- FR-19: A user's data is only ever visible to that user (enforced by DB-level Row-Level Security, not just app logic).
- FR-20: Full account data export (GDPR-style "download everything") and account deletion.

### 4.5 Cross-platform Access
- FR-21: Installable **PWA** (Add to Home Screen on mobile, Install on desktop Chrome/Edge).
- FR-22: Native **Android** and **iOS** app shells wrapping the same core app (single codebase).
- FR-23: **Desktop** app (Windows/Mac/Linux) from the same codebase.
- FR-24: All platforms **sync in near real-time** — a Sub-task added on phone appears on desktop within seconds.
- FR-25: **Offline support**: user can view cached data and create/edit Sub-tasks with no network; changes sync automatically when connectivity returns, with conflict resolution.

---

## 5. Non-Functional Requirements (NFRs)

### 5.1 Performance
- Time-to-interactive on 4G mobile: < 2.5s (first load), < 800ms (repeat load, cached).
- API p50 latency: < 100ms. **API p99 latency: < 500ms** for all read endpoints; < 800ms for write endpoints, measured at the edge closest to the user.
- Filter/search results render client-side in < 150ms for datasets up to 10,000 Sub-tasks (via indexed local cache, not a full round-trip per keystroke).
- Export generation: p99 < 3s for 5,000 rows (PDF/XLSX).

### 5.2 Availability & Sync
- Target uptime: 99.9% (backend + DB).
- Multi-device sync convergence: < 3s under normal connectivity.
- Offline-first: app must be fully usable (read + write) with zero network; queued writes sync on reconnect with no data loss.

### 5.3 Security
- All traffic over TLS 1.2+; HSTS enforced.
- Row-Level Security enforced at the Postgres level — a compromised API layer still cannot leak cross-user data.
- Passwords/auth handled entirely by a vetted auth provider (no custom password storage).
- Rate limiting on all mutating endpoints; brute-force lockout on auth.
- Input validation on every API boundary (schema validation, not just type checks).
- Signed, short-lived, refreshable access tokens; refresh-token rotation.
- Regular dependency vulnerability scanning (CI-gated).
- Audit log of destructive actions (delete Title, bulk delete).

### 5.4 Caching
- Static assets served from CDN edge with long-lived immutable caching + content-hash filenames.
- API responses for read-heavy, low-churn endpoints (e.g., Title list) cached at edge/CDN with short TTL + stale-while-revalidate, invalidated on write.
- Client maintains a local persistent cache (IndexedDB) as the source of truth for instant UI, reconciled against server in the background ("optimistic UI").

### 5.5 Accessibility & UX
- WCAG 2.1 AA compliance minimum.
- Mobile-first responsive design; desktop is an enhanced, not degraded, experience.

---

## 6. Out of Scope (v1)
- Team/multi-user collaboration on the same Title (single-owner data model for v1).
- Recurring/scheduled task templates (explicitly a non-goal — this is a *past* log, not a planner).
- Third-party integrations (invoicing systems, calendars) — deferred to v2.
- Native push notifications — deferred to v2 (v1 may include basic web push as stretch).

---

## 7. Success Metrics
- Time from "open app" to "task logged": < 10 seconds.
- % of exports generated from a filtered (not full) view: tracks whether filtering is actually useful.
- 7-day and 30-day retention (proxy for whether the log habit sticks).
- Sync failure rate < 0.1% of write operations.
- Zero cross-user data leak incidents (hard requirement, not a target).

---

## 8. Open Questions
- Do costs/time-spent fields need currency/unit localization in v1, or flat numeric is enough?
- Is single-owner-per-Title sufficient, or will early users want to share a Title (e.g., a garage with two mechanics) sooner than v2?
- Should exports be branded/templated (logo upload) for professional client-facing use?

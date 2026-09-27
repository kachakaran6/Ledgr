# UI/UX Details

> **Component source:** every screen described below is built exclusively from **shadcn/ui** primitives, themed per `06-UI-DESIGN-SYSTEM-SHADCN.md`. That document is the binding spec for colors, radius, type, and anti-generic-design rules — this document covers layout, flow, and interaction behavior on top of it.

**Principle: Mobile-first in construction, desktop-enhanced in experience.** The mobile layout is not a shrunk-down desktop layout — it's designed first, for the thumb, for logging a task in under 10 seconds while standing in a garage with greasy hands. Desktop then *adds* capability (density, keyboard shortcuts, multi-pane views) rather than the mobile view losing capability.

---

## 1. Design System Foundations

| Token | Approach |
|---|---|
| Typography | System font stack (fast load, native feel per OS) — e.g. `-apple-system, Roboto, Segoe UI` fallback chain |
| Color | Tailwind-based scale; semantic tokens (`--color-bg`, `--color-surface`, `--color-accent`, `--color-danger`) so dark mode is a token swap, not a rewrite |
| Spacing | 4px base unit scale (4/8/12/16/24/32) — consistent rhythm across breakpoints |
| Touch targets | Minimum 44x44px (Apple HIG) / 48x48px (Material) for every tappable element — non-negotiable on mobile |
| Breakpoints | `sm` 640px, `md` 768px, `lg` 1024px, `xl` 1280px — mobile styles are the default, larger breakpoints add layout, not different components |
| Dark mode | System-preference-aware by default, manual override available, persisted per device |

---

## 2. Mobile Experience (Primary Design Target)

### 2.1 Core Screens
- **Home / Titles list:** Vertical scroll list of Titles as cards, each showing name + sub-task count + last-logged date. Big "+" floating action button, thumb-reachable at bottom-right.
- **Title detail:** Sub-tasks listed newest-first, grouped by date with sticky date headers ("Today," "Yesterday," "24 Sep"). Swipe-left on a row reveals Edit/Delete.
- **Add Sub-task:** Bottom sheet (not full navigation) — description field auto-focused, date defaults to "Today" with a one-tap "Yesterday" toggle beside it, save button always visible without scrolling.
- **Search/Filter:** Persistent search bar pinned under the header; tapping it expands a filter panel (date range chips: Today / Yesterday / 7 days / This Month / Custom) as a bottom sheet, not a separate page — keeps context.
- **Export:** Selection mode entered via a "Select" button in the top bar; checkboxes appear inline on rows; a bottom action bar appears with "Export (PDF / Excel / CSV)" once ≥1 item is selected.

### 2.2 Mobile-Specific Interaction Rules
- One-handed operation assumed: primary actions (add, save, export) live in the bottom half of the screen.
- No hover-dependent UI (no tooltips-only affordances) — everything discoverable by tap.
- Native-feeling transitions: bottom sheets slide up, list items use native-style swipe gestures, matching the platform (subtle difference between iOS and Android motion curves, handled by Capacitor/CSS).
- Haptic feedback (via Capacitor Haptics API) on task save, delete confirm, and export complete — small native-feel touches that make the wrapped web app not feel like a web app.
- Offline indicator: a small, non-blocking banner ("Offline — changes will sync") rather than a disruptive modal.

---

## 3. Desktop Experience (Enhanced, Not Different)

- **Layout:** Two-pane view becomes viable at `lg` breakpoint — Titles list on the left (persistent), selected Title's Sub-tasks on the right. Mobile's single-pane drill-down collapses into this pane split; same components, different arrangement.
- **Keyboard shortcuts:** `/` focuses search, `N` opens add-sub-task, `E` enters export/select mode, `Esc` closes any open sheet/modal. Documented in a `?` shortcut-help overlay.
- **Bulk selection:** Shift-click range select and Ctrl/Cmd-click multi-select, in addition to checkboxes — desktop users expect this pattern from spreadsheet-like tools.
- **Hover affordances:** Row actions (edit/delete icons) appear on hover instead of requiring a swipe, since desktop has a precise pointer — but the swipe/tap-menu still works identically if using a touchscreen laptop.
- **Density option:** Comfortable vs. Compact row height toggle — desktop users reviewing months of history benefit from seeing more rows at once.
- **Install prompt:** Native "Install App" banner (PWA) surfaced contextually after a returning visit, not on first load.

---

## 4. Cross-Platform Consistency Rules

- Same component library (React + Tailwind) powers web, the Capacitor-wrapped mobile shells, and the Tauri-wrapped desktop shell — visual consistency is structural, not maintained by hand across codebases.
- Platform-specific chrome only where the OS expects it: iOS gets iOS-style back-swipe navigation and safe-area insets (notch handling); Android gets its back-button behavior wired to in-app navigation; desktop gets a proper window title bar and standard OS keyboard conventions (Cmd on Mac / Ctrl elsewhere).
- Sync status is always visible somewhere consistent (a small icon in the header: synced / syncing / offline) across every platform, so trust in the "super sync" promise is never in question.

---

## 5. Accessibility (WCAG 2.1 AA baseline)

- Color contrast ratios checked for both light and dark themes.
- All interactive elements reachable and operable via keyboard (desktop) and screen reader (VoiceOver/TalkBack) on mobile.
- Form errors (e.g., "date cannot be in the future") announced via `aria-live`, not just shown visually.
- Focus states visible and consistent; no focus traps in bottom sheets/modals.

---

## 6. Export Output Design (this is a UI surface too)

- **PDF:** Clean, printable, client-presentable — header with app name/logo placeholder, date range covered, generation timestamp, grouped by Title with a light divider, consistent typography (not a raw HTML-to-PDF dump).
- **Excel:** Frozen header row, auto-sized columns, consistent date formatting — usable immediately in Excel/Sheets without manual cleanup.
- These exports are, for many users, the actual deliverable they hand to someone else — they get the same design care as any in-app screen.

---

## 7. Empty, Loading, and Error States (often skipped — treated as first-class here)

- **Empty Titles list:** Friendly illustration + "Log your first task" CTA, not a blank screen.
- **Empty filter results:** "No tasks match these filters" with a one-tap "Clear filters" action.
- **Loading:** Skeleton screens (matching final layout shape) instead of spinners, to reduce perceived latency — reinforces the "blink fast" feel even on a slow connection.
- **Error (e.g., sync conflict, export failure):** Specific, actionable message ("This task was edited on another device — showing latest version") rather than a generic "Something went wrong."
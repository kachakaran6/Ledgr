# UI Design System — shadcn/ui (Mandatory) & Anti-Generic-AI-Design Rules

This document exists because the current build (see reference screenshot) has two real problems: **zero authentication**, and a UI that reads as generic — the default indigo-on-white, rounded-everything, no-personality look that most AI-scaffolded apps ship with by default. This doc fixes the second problem with hard rules, not vague taste advice.

---

## 1. shadcn/ui Is the Only Component Source — No Exceptions

**Rule:** Every interactive UI element — button, input, badge, tab, dropdown, dialog, table, card, toast, tooltip, command palette — is built from **shadcn/ui primitives**, installed via the shadcn CLI into the project (`components/ui/`), and customized only through the project's own theme tokens. No engineer hand-rolls a one-off button, badge, or card style outside this system. No competing UI kit (Material UI, Ant Design, Chakra, raw Bootstrap) is mixed in.

Why this is non-negotiable: a codebase with three different "badge" implementations (like the current screenshot's inconsistent tag pills, buttons, and status chips) is exactly how a UI ends up looking assembled rather than designed. One component source enforces one visual language automatically.

### 1.1 Component-to-shadcn Mapping (build order)
Install and theme in this order — each layer depends on the tokens from the one before it:

1. **Theme tokens first** (`tailwind.config`, CSS variables for color/radius/font) — see Section 2. Nothing else gets built until this exists.
2. **Primitives:** `Button`, `Input`, `Label`, `Badge`, `Separator`, `Skeleton`
3. **Layout:** `Card`, `Tabs`, `ScrollArea`, `Sheet` (mobile bottom sheets), `Resizable` (desktop two-pane view)
4. **Overlays:** `Dialog`, `DropdownMenu`, `Popover`, `Tooltip`, `AlertDialog` (delete confirmations)
5. **Data:** `Table` (desktop dense view), `Command` (search/⌘K palette), `Calendar` + `Popover` (the past-only date picker, with future dates disabled via the `disabled` matcher prop)
6. **Feedback:** `Toast` (sync status, save confirmations), `Progress` (export generation)
7. **Forms:** `Form` (shadcn's React Hook Form + Zod wrapper) — this is what wires the app's existing Zod schemas (see Tech Stack doc) directly into validated, accessible form UI

Every screen in the UI/UX Details doc (Home, Title detail, Add Sub-task, Search/Filter, Export) is composed **only** from the components above.

---

## 2. Anti-Generic-AI-Design Rules (the actual taste fix)

The current screenshot exhibits the specific patterns that make an app look templated. Each one has a concrete rule attached — not "make it prettier," an actual constraint.

| Generic AI-app pattern (seen in current build) | Rule instead |
|---|---|
| Default indigo/blue-600 as the only accent color, used for everything (logo, active tab, buttons, badges, links) alike | Pick **one deliberate accent color** that is not default Tailwind `blue-600` or `indigo-600` (both are the most over-used AI-generated defaults). Use it *sparingly* — primary actions only. Everything else uses the neutral scale. |
| Flat white background, flat gray-100 sidebar, no depth or hierarchy | Establish a real **surface hierarchy**: app background, card surface, and elevated-overlay surface are three distinct, intentional tones (even if subtle) — not "everything is white with a 1px border." |
| Every element has the same `rounded-lg` and the same soft drop-shadow, everywhere, regardless of importance | Vary radius and elevation **purposefully**: e.g. tags/badges are more tightly rounded (`rounded-md`) than cards (`rounded-xl`); only genuinely floating elements (dropdowns, the FAB, toasts) get shadow — flat surfaces (list rows, the sidebar) stay flat with borders instead, for a calmer, less "everything is a card" look. |
| Generic system/Inter-lookalike font with no character | Choose one deliberate typeface pairing via shadcn's font theming (e.g. a slightly distinctive sans for headings, system stack for body/data) — set once in the theme, not per-component. |
| Status/tag pills all rendered in the same flat gray, undermining the actual color-coded status data (Done/In Progress/Cancelled) | Status colors are **semantic and consistent**: e.g. Done = a muted green surface token, In Progress = a muted amber token, Cancelled = muted neutral/red token — defined once as theme tokens (`--status-done`, `--status-in-progress`, etc.), reused everywhere, never a raw hardcoded hex in a component. |
| Icon-and-label overload — every single tag has its own outline icon, adding visual noise without adding meaning (see the tag row in the screenshot) | Icons are used only where they aid scanning (status, cost, time) — descriptive tags (brakes, hydraulic, fleet) are **text-only chips**, no icon, to reduce noise and let the actual status icons stand out. |
| Header bar with logo + tagline + a wall of disconnected icon buttons (Select, layers, moon, "?", avatar) with no grouping | Group related actions: view/filter controls live in one cluster, account/settings live in another, with a visible separator — not six icons in a flat row. |
| No dark-mode-specific palette thought — likely just an inverted default | Dark mode gets its **own considered palette** (not just inverted lightness) — verified for contrast in both modes as part of the shadcn theme file, not left to Tailwind's automatic dark: inversion alone. |

---

## 3. Theme Definition (where all of the above actually lives)

All colors, radii, and fonts are defined **once**, as CSS variables in the shadcn theme layer (`app/globals.css` `:root` and `.dark` blocks), consumed everywhere via Tailwind's `bg-background`, `bg-card`, `text-muted-foreground`, `bg-primary`, etc. — never a raw hex value typed directly into a component. This is what makes "change the accent color" or "fix dark mode contrast" a one-file edit instead of a hunt through every component.

A dedicated visual design pass (color palette + type pairing selection) happens **before** Phase 1 UI work starts, using the shadcn theme customizer or a hand-picked palette — not the shadcn default zinc/slate theme left as-is, which is itself now a recognizable "didn't customize it" signal.

---

## 4. Consistency Enforcement

- A `components/ui/` folder (shadcn's own output) is the *only* place base primitives live. Feature components (`TitleCard`, `SubtaskRow`, `ExportBar`) compose these primitives — they don't redefine styles.
- Storybook (or a simple `/design-system` internal route) documents every primitive + its variants, so "which button style do I use here" is never answered by guessing or copy-pasting from a random existing screen.
- Any new component PR that introduces a raw `<button>`, inline hex color, or ad-hoc `rounded-`/`shadow-` value outside the theme tokens fails review — this is added as an explicit line item in the Engineering Completion Loop checklist (see that doc, Correctness section).
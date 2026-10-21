# Tandem design system

## Overview

Tandem is a personal task list for people moving between devices. Its visual idea is a quiet paper workspace: warm white surfaces, a forest-green action color, and a small notebook illustration. Tasks and their composer are the primary content. Desktop navigation stays at the leading edge, while progress and pairing sit in a secondary column. The mobile first screen starts with the product and Add task control.

The source of truth is `src/style.css`, with components in `src/App.tsx`, `src/Modal.tsx`, `src/SyncDialog.tsx`, and `src/Icons.tsx`. There is one light theme and one English interface. The initial list is empty, never populated with invented user activity.

## Colors

Primitive values and semantic aliases live at `src/style.css:3`. Use semantic names in interface styles.

| Semantic token | Actual value | Role |
| --- | --- | --- |
| `--color-bg` | `#f7f8f4` | Page canvas |
| `--color-surface` | `#ffffff` | Tasks, fields, dialogs |
| `--color-sidebar` | `#fcfcf9` | Navigation and quiet secondary surfaces |
| `--color-text` | `#27382e` | Main text and notification background |
| `--color-muted` | `#606b5b` | Metadata, descriptions, secondary icons |
| `--color-border` | `#e3e7dc` | Non-interactive separators and structural borders |
| `--color-input-border` | `#8b9687` | Input boundaries and unchecked task boxes |
| `--color-accent` | `#285b48` | Primary action and checked task boxes |
| `--color-accent-hover` | `#1c4938` | Primary action on hover |
| `--color-selected` | `#eaf0e4` | Selected navigation and progress panel |
| `--color-focus` | `#326cce` | Keyboard perimeter |
| `--color-danger` | `#a13d32` | Errors, overdue labels, destructive actions |
| `--color-warning` | `#895912` | Important star and unsaved-state dot |

The neutral ramp also includes `#eff1e9` for hover/count/segmented surfaces. The green ramp includes `#dce8d4` for selection and active hover. Progress tracks use `#d7e2cd`, with separators `#d5dfcc`. Category markers use `#9caf82` (Personal), `#d2a680` (Work), and `#a7a4c5` (Life), always beside the written category. Color is never the only indication of completion, importance, an error, or connection state.

Rendered contrast measurements: secondary text on the progress panel **4.82:1**, white primary-button text on green **7.84:1**, and input boundary on white **3.08:1**. The final probe passed its measured text pairs. These are observations of the implemented combinations, not a blanket accessibility certification.

## Typography

The UI uses the locally bundled variable **DM Sans**, from `src/assets/dm-sans-latin.woff2`, with `sans-serif` fallback. The face covers weights 100–1000; the interface uses 400, 500, and 600 only. It uses normal style, `font-display: swap`, and disables synthetic styling. The font and used weights were checked in Chromium. The Latin subset falls back for other scripts.

| Token | Size at 16 px root | Used for |
| --- | --- | --- |
| `--text-small` | 13 px / `.8125rem` | Metadata, counts, utility text |
| `--text-label` | 14 px / `.875rem` | Controls, task titles, descriptions |
| `--text-body` | 16 px / `1rem` | Form text, dialog subheadings |
| `--text-section` | 20 px / `1.25rem` | Section/dialog headings, mobile wordmark |
| `--text-brand` | 28 px / `1.75rem` | Desktop wordmark, mobile page heading |
| `--text-display` | 40 px / `2.5rem` | Desktop page heading and progress number |

Body line-height is 1.5. Page headings use 1.15, section headings 1.3, and subheadings 1.4. Large page text tracks at `-.045em`, mobile headings at `-.035em`, section text at `-.025em`; ordinary text has natural tracking. Headings balance and descriptions use pretty wrapping. There are no uppercase eyebrow labels. Inputs and selects are at least 16 px on mobile to avoid unintended input zoom. Counters use tabular numerals. Task names wrap with `overflow-wrap: anywhere` and are never ellipsized.

## Layout

The spacing vocabulary is built from 4/8 px steps, with 6/10/14 px optical adjustments for compact controls. Typical control gaps are 8–14 px; independent sections are 22–40 px apart. This is a set of implemented values, not an unused spacing-token library.

- Desktop shell: 240 px sidebar plus fluid content. The top bar is at least 83 px tall. Main content is capped at 1,280 px with 40 px inline padding and 45 px top padding.
- Above 1,000 px, the workspace uses a fluid task column and a 270 px overview column with 30 px gap. At 1,180 px, the sidebar becomes 212 px, main padding 28 px, overview 230 px, and gap 22 px.
- At 1,000 px and below, overview panels follow the task list. Their `auto-fit` grid has a minimum of `min(100%, 10rem)`, so enlarged text makes them stack without colliding.
- At 720 px and below, the sidebar is replaced by an in-flow navigation disclosure. Main padding becomes 20 px, the page heading 28 px, and overview gap 14 px. The menu closes on selection or Escape. The desktop date and saved-state utilities are hidden; storage errors remain in the main flow.
- At 360 px and below, main padding is 16 px, the compact header omits the duplicate logo image, overview panels stack, and edit-form fields become one column.
- Notifications live directly below the composer, never over the task list. They remain until dismissed or replaced. Undo remains available on the most recent deletion notification.

Rendered at 320, 390, 720, 900, and 1440 CSS px without horizontal overflow. Text enlarged to 200% at 390 px reflowed to a single overview column. Long unbroken task content wrapped. An RTL layout smoke check mirrored without overflow; this is not a translated RTL product. Native browser zoom and physical-device testing remain unperformed.

## Elevation & Depth

Most surfaces are flat. Background tone and whitespace carry hierarchy; borders communicate grouping, fields, or selection. Task rows use separators, the composer has an input boundary, and the empty list uses a dashed structural outline. Only native dialogs use a shadow (`0 20px 80px #172a2433`) and a translucent backdrop (`#172a2470`). Dialog surfaces have no border. There is no decorative page gradient, animation, or card within a card.

## Shapes

The implemented radius tokens are 7 px for controls, 12 px for the composer/empty list/notifications, and 18 px for overview surfaces and dialogs. Small badges and category dots use 2–6 px radii. The 12 px composer encloses a 7 px action inset by its own padding. Task checkboxes are 20 px squares with 6 px corners inside a larger clickable label. Status dots and the SVG progress track are round.

## Components

| Component or pattern | Source | Behavior and states |
| --- | --- | --- |
| `Brand`, `Icon`, `EmptyArt` | `src/Icons.tsx` | Original SVG marks; 1.6 px rounded strokes; `currentColor`; decorative SVGs hidden from assistive technology |
| `.primary`, `.secondary`, `.text-button`, `.icon-button` | `src/style.css:44` | Filled green for the primary action, outlined neutral for secondary, quieter text/icon controls; visible keyboard rings; hover only on hover-capable devices |
| Navigation | `src/App.tsx:142` | Native buttons, selected surface and `aria-current`; counts follow actual tasks; in-flow mobile disclosure |
| Composer | `src/App.tsx:160` | Enter or Add task submits; Add details reveals list/date/importance; invalid empty names focus the field and show an associated error; adding a task outside the active filter returns to My tasks |
| `TaskRow` | `src/App.tsx:81` | Native checkbox, title edit button, separate metadata, important toggle, deletion with undo; metadata describes the edit control; completed titles are struck through |
| `Modal` | `src/Modal.tsx` | Native `dialog.showModal()`, background inertness, explicit forward/backward Tab wrap, Escape and explicit close, focus restoration to opener |
| `EditDialog` | `src/App.tsx:27` | Name, list, date, notes, importance; saves only changed fields; associated validation; destructive action has undo |
| `BackupDialog` | `src/App.tsx:54` | Real JSON download and validated merge import; progress and recoverable error states |
| `SyncDialog` | `src/SyncDialog.tsx` | Create/enter code modes, preparing/waiting/connecting/connected/error/disconnected states, copy fallback, retry; plainly explains direct sync and session lifetime |
| Notification | `src/App.tsx:166`, `src/style.css:212` | In-flow named region, persistent dismiss/undo controls, separate stable polite live region |
| Empty list | `src/App.tsx:170` | Notebook artwork and concise next action; contextual no-results/complete/today states; optional real-task suggestions |

Targets are at least 24 px or meet the spacing exception; most actions are 44 px tall. Compact mobile task icons are 32×44 px, the menu is 40×44 px, and the details disclosure is 40 px tall. The probe reports two initial-screen targets below its comfortable 44 px preference; neither fails its WCAG spacing check.

Focus rings are 2 px blue with 4 px offset (2 px on text fields). Forced-colors styles defer focus and checkbox indicators to system colors. The only transitions are named color/background/transform properties at 140 ms, opt-in under `prefers-reduced-motion: no-preference`. Filled and outlined buttons scale to `.96` on press. Reduced motion disables those transitions. No endless or page-load animation is present.

## Do’s and Don’ts

- Start another view with the existing shell, page-heading, composer, and task-row patterns. Keep its main action before secondary summaries.
- Reuse semantic colors and the six type sizes. Keep green filled actions for the current primary action; preserve neutral secondary controls.
- Keep task names readable in full. Keep notes and categories outside the title button’s visible label, and associate them as descriptive metadata.
- Use the native modal wrapper for focused flows. Preserve Escape, focus return, labels, and error recovery.
- Keep sync status factual: local persistence and a live connection are different states. Never show a cloud-sync claim for local storage.
- Keep new panels in an adaptive grid with explicit minimum shrinkability. Recheck at 320 px and with 200% text enlargement.
- Do not add fonts, gradients, shadows, uppercase kickers, or motion just to decorate another view. Use the existing notebook/line-icon vocabulary when an illustration is useful.

The six-domain review, measured findings, limitations, and pinned-guide attribution are in `artifacts/validation.md`. Better Interface’s MIT notice and the adapted Impeccable documentation method’s Apache-2.0 license are retained in `artifacts/design-guidance-LICENSE.txt`.

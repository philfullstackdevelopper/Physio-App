---
name: EasyPhysio
description: Suivi d'exercices de rééducation — kinés et patients
colors:
  brand: "#155dfc"
  brand-deep: "#1447c9"
  marketing-ink: "#0f172a"
  marketing-body: "#475569"
  marketing-bg: "#f6f8fd"
  app-bg: "#f5f7fb"
  surface: "#ffffff"
  line: "#e5e9f0"
  ink: "#0f172a"
  muted: "#64748b"
  sidebar: "#0d1b3e"
  ok: "#16a34a"
  warn: "#f59e0b"
  danger: "#dc2626"
typography:
  display:
    fontFamily: "var(--font-display), Georgia, 'Times New Roman', serif"
    fontWeight: 600
    lineHeight: 1.08
  body:
    fontFamily: "var(--font-sans), system-ui, sans-serif"
    fontWeight: 400
rounded:
  md: "8px"
  lg: "10px"
  xl: "12px"
  2xl: "16px"
  3xl: "24px"
  full: "9999px"
components:
  button-primary:
    backgroundColor: "{colors.brand}"
    textColor: "#ffffff"
    rounded: "{rounded.full}"
    padding: "12px 24px"
  button-primary-hover:
    backgroundColor: "{colors.brand-deep}"
---

# Design System: EasyPhysio

## Overview

**Creative North Star: "The Considered Clinical Record"**

EasyPhysio should feel like a well-kept patient file that happens to be software — not a generic SaaS dashboard wearing a healthcare skin. The instinct throughout the existing implementation is already pointed this way: a warm display serif (Fraunces) paired with a humanist sans (Instrument Sans) instead of system-default type, a deliberately warmer "paper and ink" palette on the patient clinical record (the `.rehab-panel` scope, explicitly commented in code as reading "as a considered clinical record rather than a generic dashboard"), soft rounded forms throughout, and a faint paper-grain texture (`.grain`) that gives otherwise flat surfaces a tactile, handled quality.

Depuis le 2026-09-03, l'application kiné (/dashboard/*) utilise une seule palette, déclarée en tokens Tailwind dans app/globals.css : fond #f5f7fb, surfaces blanches, bordures #e5e9f0, encre #0f172a, texte secondaire #64748b, accent #155dfc, sidebar #0d1b3e, et trois couleurs sémantiques saturées (vert #16a34a, orange #f59e0b, rouge #dc2626) avec leurs fonds pâles. Le site vitrine garde sa palette slate et Fraunces pour les titres ; l'app est entièrement en Instrument Sans.

Motion is restrained and purposeful: gentle staggered entrance (`fadeInUp`, often chained with `[animation-delay:120ms]` steps), a soft pulse only for genuinely urgent state (a severe patient alert dot), and cross-fading illustration frames for exercise demonstrations. Nothing spins, bounces, or calls attention to itself decoratively.

**Key Characteristics:**
- Warm display serif for headings, humanist sans for everything else — never a system-default stack.
- Two-register neutral system: cool slate for marketing, warm stone/paper for clinical work.
- Generous, consistent rounding (never sharp corners) — pill buttons, xl–3xl cards.
- Mostly flat cards (`shadow-sm`) that lift only on hover with soft, colored, directional shadows — never ambient drop-shadows at rest.
- Left-accent-border cards (3px colored border-left) for triage/alert rows instead of full-color alert boxes.
- Motion is calm and purposeful, never decorative.

## Colors

Two coordinated neutral registers plus one brand accent and a semantic adherence-grading trio.

### Primary
- **EasyPhysio Blue** (`#155dfc`): the single brand accent. Primary CTAs, active states, links, the patient's "today" highlight card. Used sparingly — most of any given screen is neutral.
- **EasyPhysio Blue Deep** (`#1447c9`): hover/active state for the brand accent, never used at rest.

### Neutral — Marketing (cool)
- **Slate Ink** (`#0f172a`, Tailwind slate-900): headline and primary text on marketing/acquisition surfaces (praticiens, login, signup).
- **Slate Body** (`#475569`, slate-600): body copy on those surfaces.
- **Marketing Mist** (`#f6f8fd`): the praticiens page background — a near-white cool tint, not pure white.

### Neutral — Clinical (warm)
- **Stone Ink** (`#1c1917`, stone-900): headline and primary text on dashboard/patient-record surfaces.
- **Stone Body** (`#78716c`, stone-500): secondary/meta text on those surfaces (patient counts, timestamps).
- **Paper** (`#fbf8f3`): the `.rehab-panel` background — warmer than pure white, evokes a physical record.
- **Paper Ink** (`#2b2622`) / **Paper Ink Soft** (`#5b5349`) / **Paper Ink Muted** (`#8c8377`): the three-step text hierarchy inside the patient record panel.
- **Hairline** (`#e7e1d6`): dividers inside the patient record panel — warm, not the cool slate-200 used elsewhere.

### Semantic — Adherence Grading
- **Grade Green** (bg `#e1e8d9` / fg `#3f5a34`): good adherence.
- **Grade Yellow** (bg `#f1e3c2` / fg `#7c5a1b`): needs attention.
- **Grade Red** (bg `#ead1cb` / fg `#7a3b30`): concerning — always muted/dusty tones, never a saturated alarm red, consistent with the paper register.
- **Alert Amber** (`#d97706`): the left-border accent on the dashboard's "patients to watch" triage card.

### Named Rules
**The Two-Register Rule.** Marketing and acquisition surfaces use the slate neutral scale; the dashboard and anything inside a patient's actual record use stone/paper. Never mix a stone-neutral card into a slate-neutral page or vice versa — it reads as an inconsistency, not a texture choice.

**The Sparse Accent Rule.** Brand blue marks the one primary action or highlight on a screen. It is not a decorative color; a screen with more than one saturated blue element usually has a hierarchy problem, not a branding opportunity.

## Typography

**Display Font:** Fraunces (with Georgia, "Times New Roman", serif fallback)
**Body Font:** Instrument Sans (with system-ui, sans-serif fallback)

**Character:** A warm, slightly editorial serif for headings against a clean, humanist sans for everything functional — the pairing is what keeps the "clinical record" feeling considered rather than cold, without ever sacrificing legibility in dense UI.

### Hierarchy
- **Display** (600 weight, `text-3xl`–`text-5xl`, tight leading `1.08`): page-level headings (`Bonjour, {firstName}`, marketing hero lines). Always `font-display`.
- **Title** (600 weight, `text-lg`–`text-xl`): section and card headings.
- **Body** (400–500 weight, `text-sm`–`text-lg`): running copy, always `font-sans` (the default).
- **Label** (500 weight, `text-sm`, sometimes muted-color): metadata, timestamps, counts.

### Named Rules
**The Display-Is-Rare Rule.** `font-display` (Fraunces) is reserved for headings only — body copy, labels, and UI chrome always stay on the sans stack. Applying the serif broadly would undercut the density the app needs for actual clinical/task work.

## Layout

Content is centered in a constrained column per surface type: `max-w-3xl` for the instructor dashboard home (a focused, single-column triage view), `max-w-6xl` for the praticiens marketing page (room for multi-column feature grids). Patient-facing screens run edge-to-edge on mobile with a bottom safe-area-aware nav (`viewportFit: cover`, `env(safe-area-inset-bottom)`).

Sections stagger in with `fadeInUp` at increasing `animation-delay` steps (0ms, 120ms, 200ms…) rather than appearing all at once, which reinforces the "considered" pacing rather than a dashboard dumping everything instantly.

## Elevation & Depth

The system is flat by default and lifts only in response to interaction. Cards sit at `shadow-sm` at rest — a near-invisible separation from the background, not a floating panel. On hover, interactive cards translate up slightly (`hover:-translate-y-0.5`) and gain a soft, warm-toned directional shadow (e.g. `shadow-[0_8px_24px_-8px_rgba(120,53,15,0.16)]`) rather than a generic gray drop-shadow — the shadow color is tuned to the warm palette it sits in.

### Shadow Vocabulary
- **Resting** (`shadow-sm`): default card/panel separation.
- **Interactive lift** (`shadow-[0_8px_24px_-8px_rgba(120,53,15,0.16)]` + `-translate-y-0.5`): hover state for clickable dashboard cards.
- **Brand emphasis** (`shadow-lg shadow-blue-600/20`): the patient's highlighted "today" action card only — the one place a colored ambient shadow is intentional, because it's the one primary action on that screen.

### Named Rules
**The Earned-Shadow Rule.** A shadow appears because of interaction (hover) or because an element is the single most important action on the screen (the patient's today card) — never as ambient decoration on a card that just sits there.

## Shapes

Rounding is generous and consistent, never sharp. Buttons and pill-shaped badges use `rounded-full`. Cards and panels scale with their prominence: `rounded-xl` (12px) for compact list rows and dashboard cards, `rounded-2xl`–`rounded-3xl` (16–24px) for hero panels, marketing feature cards, and auth-flow containers. Alert/triage cards keep sharp side borders but add a single 3px colored accent on the left edge (`border-l-[3px] border-l-amber-600`) rather than rounding or coloring the whole card — the accent, not the shape, carries the meaning.

## Components

### Buttons
- **Shape:** pill (`rounded-full`).
- **Primary:** `bg-blue-600` / white text / `px-6 py-3` / `shadow-sm`.
- **Hover / Focus:** `hover:bg-blue-700`; press feedback via `active:scale-95` (a physical, tactile press rather than a color-only change).

### Cards / Containers
- **Corner style:** `rounded-xl` (compact/dashboard) up to `rounded-3xl` (hero/marketing feature cards).
- **Background:** white on marketing (slate register), white or `.rehab-panel` paper on clinical surfaces.
- **Shadow strategy:** see Elevation & Depth — flat at rest, lifts on hover.
- **Border:** `border border-slate-200/70` (marketing) or `border-stone-200` (dashboard); triage cards add the 3px left accent.
- **Internal padding:** `p-6`–`p-7`.

### Alert / Triage Rows
A signature pattern: a bordered card with a colored left accent (amber = clinical concern, stone = adherence reminder), heading + one-line explanation, then a list of `Link` rows that highlight on hover (`hover:bg-amber-50` / `hover:bg-blue-50`) with a trailing arrow icon that nudges right on hover (`group-hover:translate-x-0.5`). Severe items get a small pulsing red dot (`gentlePulse`), reserved for genuinely urgent state only.

### Navigation
Instructor dashboard uses a sidebar (`DashboardSidebar`); patients get a bottom tab bar (`PatientNav`) that respects the iOS safe area. Both stay on the same type and color system as their surrounding register.

### Exercise Illustration (signature component)
`ExerciseIllustration` cross-fades three SVG frames on a 3.6s loop (`ei-frame-1/2/3`) to show an exercise's motion without video — the closest the system currently gets to demonstrating movement, and the component to extend once real video/photo demonstrations exist (see PRODUCT.md's Evidence on Hand).

## Do's and Don'ts

### Do:
- **Do** keep the marketing site (slate + Fraunces) and the instructor app (tokens + Instrument Sans) visually distinct — never mix them.
- **Do** use `font-display` (Fraunces) for headings only, never for body copy or UI chrome.
- **Do** let shadows appear only on hover or on the single primary action of a screen.
- **Do** use the 3px left-accent-border pattern for triage/alert cards instead of full-color alert boxes.
- **Do** keep motion calm: staggered fade-ins, no bounce, no spin, pulse reserved for genuinely urgent state.

### Don't:
- **Don't** use emoji as UI icons — lucide-react only ([[design-taste-no-emoji-icons]]).
- **Don't** apply ambient/ always-on shadows to resting cards — earn them through interaction.
- **Don't** let the app read as generic AI SaaS: no purple gradient heroes, no default system-font stacks, no stock dashboard-template layouts.

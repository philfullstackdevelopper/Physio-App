# Kiné dashboard redesign — sub-agent prompt pack

**Purpose:** turn `app/dashboard/page.tsx` + `components/DashboardSidebar.tsx` from
generic "AI slop" into something breathable, enjoyable, and professional — same
features, better bundling. No new functionality, no over-featuring.

**How to run this:** three prompts (A/B/C) run independently (parallel, no shared
context needed between them) and each produces a *written proposal*, not code.
Prompt D then takes all three proposals and writes the actual implementation.
Either delegate A/B/C/D as four Task/Agent sub-agents in one Claude Code session,
or paste each block into its own terminal — the prompts are self-contained
either way.

---

## Shared context (goes in front of every prompt below)

> Project: EasyPhysio, a French-language multi-tenant SaaS for physiotherapists
> ("kinés") to manage patient exercise programs. Stack: Next.js App Router (TS),
> Tailwind, Supabase (Postgres/RLS), Clerk for auth. Repo root:
> `C:\Users\PhilippeMaupain\dev\physio-app`.
>
> Target files: `app/dashboard/page.tsx` (the kiné's landing dashboard) and
> `components/DashboardSidebar.tsx` (persistent left nav on desktop, horizontal
> bar on mobile). Read both in full before proposing anything.
>
> **The problem:** the current page is textbook AI-generated-UI: a centered
> hero with a radial-gradient blob background and a dot-grid overlay, a 2x2
> grid of identical stat-card tiles (icon, big number, label), then two more
> "section in a bordered rounded-2xl card" blocks for alerts, then a 2x2 grid
> of nav cards that mostly duplicate links already in the sidebar. Every
> container uses the same `rounded-2xl border ... bg-white/90 shadow-sm
> backdrop-blur` regardless of what it holds, every icon is lucide at default
> style, and the blue-600/slate palette has no personality. Nothing is wrong
> functionally — it just feels generated, not designed.
>
> **What must NOT change:** the underlying data/features. That's a fixed
> inventory:
> - 4 stats: total patients, active this week, sessions this week, inactive 7+ days
> - a clinical alert list (patients whose recent pain/difficulty feedback is
>   concerning), shown only when non-empty
> - an inactivity nudge list (patients with no session in 7+ days), shown only
>   when non-empty
> - 4 navigation destinations: patients, séances, exercises, facturation
> - the greeting ("Bonjour, {firstName}")
>
> **Hard constraints:**
> - **No new features.** The inventory above is complete and sufficient — the
>   job is bundling it well, not adding to it.
> - **Simple, breathable, professional.** Reject anything that reads as busy,
>   gimmicky, or cute-for-its-own-sake. This is a tool a kiné glances at
>   between patients, not a consumer app to linger in.
> - Style anchor: **warm and human** — some personality and warmth is good,
>   but it must stay credible for a medical-adjacent professional tool. Not
>   corporate-cold, not playful-consumer.
> - French copy stays French. Keep it natural, not stiffer than the current text.
> - Must still work responsively (desktop with sidebar, mobile with the
>   horizontal nav bar already in `DashboardSidebar.tsx`).
> - Don't touch data-fetching logic, RLS, or the queries in `page.tsx` —
>   this is a presentation-layer pass only.

---

## Prompt A — Visual & feel

```
[Shared context above]

Your job: define the visual system that replaces the current generic look,
and justify every choice against the "AI slop" diagnosis above — don't just
assert "warmer," show specifically what changes and why it stops feeling
generated.

Cover:
- Color: a palette that reads as warm/human without becoming unprofessional.
  Does blue-600 survive as an accent, or does it get replaced/supplemented?
- Typography: current headings use a `font-display` class — check what it's
  bound to (globals.css or tailwind config) and decide whether the type
  system needs work, or just better use.
- Backgrounds & containers: the gradient-blob-plus-dot-grid background and
  the one-size-fits-all rounded-2xl/shadow-sm/backdrop-blur card treatment
  are the biggest "generated" tells — propose what replaces them, and make
  sure different content (a stat, an alert, a nav link) doesn't all get the
  identical container treatment.
- Iconography: lucide at default weight everywhere is part of the sameness —
  decide whether icons stay, change weight/size/usage, or get de-emphasized
  in favor of typography and color doing the work instead.
- Motion: what, if anything, deserves a transition (current hovers are
  generic `transition hover:shadow-md` / `hover:bg-slate-50`) — keep this
  restrained, not decorative.

Deliverable: a written spec (no code) — a beginner should be able to read it
and know exactly what to build. Include concrete values (hex/Tailwind tokens,
spacing scale, font choices) not vibes ("softer," "calmer" aren't answers by
themselves — say what produces that feeling).
```

---

## Prompt B — Layout & bundling

```
[Shared context above]

Your job: rethink how the fixed feature inventory is *arranged*, not what's
in it. The current page stacks five separate sections top to bottom (hero,
4 stats, alerts, inactivity nudge, 4 nav cards) — that's too much vertical
ceremony for what is genuinely a short list of facts. A kiné should be able
to read the page in about 5 seconds and know: how many patients need
attention right now, and where to click next.

Cover:
- Hierarchy: what does a kiné need to see FIRST? (Hint: the clinical alert
  list is the most actionable thing on the page today, but it's buried
  third, after a hero and a stat grid.) Propose a new priority order.
- Bundling: can the 4 stat tiles fold into something lighter — e.g. inline
  with the greeting, or merged into one summary strip — instead of their own
  grid? Do they all deserve equal visual weight, or are some (inactive
  count) more actionable than others (raw patient count)?
- Redundancy: the 4 nav cards largely duplicate the sidebar's own links
  (patients/séances/exercises/facturation) already visible on desktop.
  Decide whether they should be cut, shrunk to a secondary "quick actions"
  row, or kept only for the mobile view where the sidebar collapses to a
  thin bar.
- Empty states: alerts and inactivity sections currently vanish entirely
  when empty. Decide if a calm "tout va bien" state is worth adding so the
  page doesn't feel unfinished when there's nothing to flag — but this must
  read as *simpler*, not as a new feature.
- Mobile: this page gets checked one-handed, between patients. Make sure
  your hierarchy still works when the sidebar is a horizontal scroll bar,
  not a fixed column.

Deliverable: a written layout spec (no code) — describe the new page as a
sequence of zones top to bottom, what's in each, and why the reordering
serves "5-second scan" better than the current version. A rough
wireframe-in-words (or ASCII sketch) is welcome, but this is not a visual
design pass — leave palette/typography/motion to the visual-system agent.
```

---

## Prompt C — Content & tone

```
[Shared context above]

Your job: a French microcopy pass over everything already on the page —
you are not inventing new copy slots, just rewriting what exists to be
warmer and more human without becoming unprofessional or twee.

Cover:
- The greeting and the tagline under it ("Conçu et validé avec des
  kinésithérapeutes expérimentés" — does this belong on the daily dashboard
  at all, or is it landing-page copy that leaked in here?).
- Stat labels ("Patients," "Actifs cette semaine," "Séances cette semaine,"
  "Inactifs depuis 7 jours") — are these the clearest possible words for a
  kiné, or generic dashboard-speak?
- Alert section copy ("X patients à surveiller," "D'après leurs retours des
  14 derniers jours...") — this is clinically sensitive language; keep it
  calm and precise, don't oversell urgency or undersell it.
- Inactivity nudge copy ("Un petit message de relance suffit souvent...") —
  this one already has warmth; use it as the tone reference for the rest.
- Nav card descriptions, if nav cards survive Prompt B's layout pass.
- Any proposed empty-state copy from Prompt B.

Deliverable: a before/after list — every piece of copy that changes, old
text next to new text, with a one-line reason for each change. Don't touch
copy that's already working (the inactivity nudge line is a good example of
what "done" looks like).
```

---

## Prompt D — Convergence & implementation

```
[Shared context above, plus: the three proposals from Prompts A, B, and C]

Your job: merge the three proposals into ONE concrete, buildable design,
then implement it.

- Resolve conflicts explicitly. If the visual agent's container treatment
  doesn't fit the layout agent's new zone structure, or the content agent's
  copy doesn't fit the space the layout agent gave it, decide and say which
  proposal won and why — don't silently drop one.
- Re-apply the hard constraints one more time before writing code: no new
  features beyond the fixed inventory, no over-featuring, must stay simple/
  breathable/professional, must still work on both the desktop sidebar
  layout and the mobile horizontal-nav layout.
- Implement the result directly in `app/dashboard/page.tsx` and
  `components/DashboardSidebar.tsx` (only touch the sidebar if the layout
  proposal actually requires it — e.g. cutting redundant nav cards). Keep
  all existing data-fetching/query logic untouched; this is a render-layer
  change only.
- After implementing, describe in 3-5 bullets what changed and why, so
  Philippe (non-technical, French-speaking, reviewing this cold) can sanity-
  check the result against "does this feel breathable and professional now."
```

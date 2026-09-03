# Séances grid — sub-agent prompt (part 3 of 3)

This is the third piece of a three-part interface upgrade (the other two — a
patient adherence calendar, and a body-part-tagged exercise library grid —
are already running as separate prompts). This one is self-contained; you
don't need the other two to have finished.

---

## Prompt

```
Repo: C:\Users\PhilippeMaupain\dev\physio-app (Next.js App Router, Tailwind v4,
French UI, Supabase, Clerk auth — EasyPhysio, a physiotherapist/"kiné"
dashboard SaaS).

BACKGROUND — read before touching anything:

The kiné dashboard just went through a full visual redesign, moving away from
generic "AI slop" (gradient blobs, identical rounded-2xl/shadow/backdrop-blur
cards on everything, slate/blue palette) toward something warm, tactile,
simple, and professional. Read app/dashboard/page.tsx and
app/dashboard/patients/page.tsx first — they are the canonical reference for
the current visual system:
- stone-* neutrals (not slate), blue reserved for genuine interactive
  affordances only, amber/red reserved for real clinical-attention semantics.
- Containers: rounded-xl section-level, rounded-lg for interactive
  rows/tiles, a single `border border-stone-200` as the only elevation cue
  (no shadow+border+blur stacking). A left accent border
  (`border-l-[3px] border-l-{color}`) is used only where a block genuinely
  needs to stand out.
- Motion: staggered `animate-[fadeInUp_0.6s_ease-out_both]` with
  `[animation-delay:120ms]`/`[200ms]` on page-load sections; section-level
  containers get `transition-all duration-200 hover:-translate-y-0.5
  hover:shadow-[0_8px_24px_-8px_rgba(120,53,15,0.16)]`; individual
  rows/links keep simple `transition-colors duration-150` hover backgrounds.
- Icons: lucide `strokeWidth={1.5}`. `font-display` (Fraunces) reserved for
  exactly one heading per page.
- The warm ambient background (soft corner glow + faint grain) already comes
  from app/dashboard/layout.tsx globally — do not add another background.

YOUR TASK:

Convert the séances browsing lists from flat text rows into a visual card
grid — 3 cards per row on desktop, same "block with name + small image"
treatment the exercise library is separately getting, but WITHOUT adopting
that feature's body-part tagging system. Séances already have their own
organizing axis (condition + stage + the existing tabs below), which isn't
naturally multi-category the way individual exercises are — so this is a
visual/layout change only, not a new taxonomy.

Target file: components/SeancesTabs.tsx (read it in full first — it renders
three tabs: "Mes séances personnalisées" (a client-owned list, usually
short), "Séances prévues" (the platform template library — currently ~430
items, unpaginated), and "Rechercher une séance" (a client-side filtered
combination of both, searched by name/condition). Also skim
app/dashboard/seances/page.tsx and app/dashboard/seances/actions.ts to
understand how this component is invoked and what `duplicateSeance` does —
do NOT modify actions.ts or the data-fetching in page.tsx.

Concretely:

1. Replace the `<ul className="divide-y ...">` row-list rendering in all
   three tabs with a responsive card grid:
   `grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3`.

2. Each card ("mine" items, "templates" items, and both kinds inside
   "search" results):
   - A placeholder image area on top: a simple `aspect-[4/3]` or similar
     tile, `rounded-t-xl bg-stone-100`, centered lucide `Dumbbell` (or
     `Activity`) icon in `text-stone-400`, `strokeWidth={1.5}`. Keep this
     uniform and calm — do NOT invent per-condition color-coding or gradient
     variety, that's over-decorating a placeholder. (No real illustration
     assets exist yet — this is intentionally a plain placeholder, not a
     final art pass.)
   - Below the image: the séance name (`font-medium text-stone-900`), then
     the existing meta line (condition · stage · extra) exactly as today,
     `text-sm text-stone-500`.
   - Keep the existing "Personnalisée" / "Plateforme" badge pills (from the
     search tab) — same neutral stone styling already in place, just
     repositioned to fit the card layout (e.g. top-left corner over the
     image, or inline next to the name — your call, keep it unobtrusive).
   - "Mes séances" cards and the "mine" results inside search stay a `Link`
     wrapping the whole card to `/dashboard/seances/{id}`, with the same
     `group` hover pattern already used elsewhere (arrow nudge is optional
     here since the whole card is clickable — a hover background/border
     tint on the card is enough, don't force the arrow icon into a card
     layout if it doesn't fit naturally).
   - "Séances prévues" (template) cards and the "templates" results inside
     search are NOT links (you can't open a platform template directly
     today) — keep the "Dupliquer" button, now placed at the bottom of the
     card instead of inline in a row.
   - Cards get the section-level tactile hover
     (`transition-all duration-200 hover:-translate-y-0.5
     hover:shadow-[0_8px_24px_-8px_rgba(120,53,15,0.16)]`), same as other
     section containers in the reference pages — this makes sense at the
     card level since each card is now a distinct explorable unit, unlike a
     dense list row.

3. Pagination for the ~430-item "Séances prévues" tab: don't render all 430
   cards at once. Add simple client-side reveal — render an initial batch
   (e.g. 12) and a centered "Voir plus" button that reveals more (e.g. +12
   each click) using local `useState`, no new data fetching or server
   pagination needed (the full `templates` array is already passed into this
   client component as a prop). Apply the same cap/reveal to the "search"
   tab's combined results if the query is empty or very broad (i.e. don't
   dump 430+ cards into the DOM before the kiné has typed anything useful);
   once a search query narrows the results meaningfully, showing all matches
   is fine.

4. Empty states (no "mine" séances yet, no search matches) keep their
   existing plain centered text — no card treatment needed for an empty
   state.

5. Keep the tab bar itself (the three-button `stone-100` track at the top)
   exactly as it is today — only what renders *inside* each tab changes.

HARD CONSTRAINTS:
- No new features, no new data, no schema changes — this is a presentation-
  layer pass only. `duplicateSeance` and all data fetching stay untouched.
- Don't touch app/dashboard/seances/[id]/page.tsx (the séance editor) — out
  of scope, already restyled in the earlier visual pass.
- French copy stays as-is; don't invent new labels beyond what's needed for
  a "Voir plus" button.
- Must still work responsively — this renders inside the same sidebar/
  mobile-nav shell as the rest of the dashboard.
- Don't let 430 unstyled cards regress page performance — the pagination in
  step 3 is not optional.

After editing, run `npx tsc --noEmit` in the repo root and fix any new type
errors your change introduces (pre-existing unrelated errors elsewhere in
the repo — auth.ts, lib/auth/password.ts, RevealGroup.tsx,
patients/actions.ts — are not your concern).

Report back: what changed, how pagination works, and confirm the typecheck
is clean relative to before your change.
```

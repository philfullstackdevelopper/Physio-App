@AGENTS.md

# Physio-App — Project Specification

This file is the source of truth for this project. Read it fully before making changes. If a request conflicts with this spec, flag the conflict instead of silently deviating.

## 1. What this app is

A multi-tenant SaaS platform ("suivi en ligne") for physiotherapy instructors to manage patient exercise programs and track adherence. One platform, many instructors, each instructor's patients and data completely isolated from every other instructor's.

The entire user interface is in French. Do not add an internationalization/translation layer — hardcode French strings directly.

## 2. User roles

There are three roles. Build for exactly these three — do not add extra roles (e.g. "clinic admin," "assistant") unless explicitly asked.

**Admin** (the platform owner, i.e. me): manages the platform itself. Out of scope for Phase 1 — no admin panel yet.

**Instructor** (the physiotherapist): signs up, logs in, manages their own roster of patients, builds programs for patients from a shared exercise library, views patient adherence.

**Patient**: logs in, sees their assigned program for today, marks exercises as done. Patients do not manage other patients and cannot see other instructors' or other patients' data.

## 3. Data model

Implement these tables in Supabase (Postgres) with row-level security (RLS) enabled on every table from the start — never add a table without RLS policies in the same step.

**`instructors`**
- `id` (uuid, references `auth.users`)
- `full_name` (text)
- `email` (text)
- `created_at` (timestamptz, default now())

**`patients`**
- `id` (uuid, references `auth.users`)
- `instructor_id` (uuid, references `instructors.id`) — the owning instructor
- `full_name` (text)
- `email` (text)
- `created_at` (timestamptz, default now())

**`exercises`** (shared library, not owned by a single instructor — any instructor can use any exercise)
- `id` (uuid, primary key)
- `name` (text)
- `instructions` (text)
- `media_url` (text, nullable) — link to a video/image/GIF demonstrating the exercise
- `created_by` (uuid, references `instructors.id`, nullable) — which instructor added it, if any
- `created_at` (timestamptz, default now())

**`programs`** (assigns exercises to a specific patient)
- `id` (uuid, primary key)
- `patient_id` (uuid, references `patients.id`)
- `exercise_id` (uuid, references `exercises.id`)
- `frequency` (text) — e.g. "daily", "3x/week"; keep this a simple text field for Phase 1, not a complex scheduling structure
- `instructor_id` (uuid, references `instructors.id`) — the instructor who assigned it, for RLS convenience
- `created_at` (timestamptz, default now())

**`exercise_logs`** (a patient marking an exercise done — this is the "suivi en ligne")
- `id` (uuid, primary key)
- `program_id` (uuid, references `programs.id`)
- `patient_id` (uuid, references `patients.id`)
- `completed_at` (timestamptz, default now())

### RLS rules to enforce

- An instructor can read/write only rows in `patients`, `programs`, and `exercise_logs` where `instructor_id` (or the patient's `instructor_id`, joined) matches their own `auth.uid()`.
- A patient can read only their own row in `patients`, their own rows in `programs`, and can read/write only their own rows in `exercise_logs`.
- `exercises` (the shared library) is readable by all authenticated instructors and patients, but only instructors can insert/update/delete.
- Before applying any policy, explain in plain language what it does and why, so I can confirm it matches this intent.

## 4. Core user flows (Phase 1 only)

**Instructor**
1. Sign up / log in (Supabase Auth, email + password is sufficient for Phase 1 — no social login needed).
2. See a list of their own patients. Add a new patient (name, email — patient gets invited to create their own login, or instructor sets a temporary password; pick the simpler Supabase-supported approach and explain the tradeoff).
3. Build a program for a patient: pick exercises from the shared library, set a frequency for each.
4. View a simple list of a patient's logged exercise completions.

**Patient**
1. Log in.
2. See today's assigned exercises, with instructions/media for each.
3. Mark each exercise as "done" — this creates a row in `exercise_logs`.

## 5. Explicitly out of scope for Phase 1

Do not build these unless asked — they belong to later phases:
- Billing / Stripe / subscriptions
- Self-serve instructor signup marketing pages
- Admin panel for the platform owner
- Email/SMS reminders
- Multi-language support
- Rich scheduling (calendars, recurring rules beyond a plain text frequency field)
- Messaging between instructor and patient
- Analytics/adherence charts beyond a simple completion list

## 6. Technical stack (already set up — do not change without discussion)

- **Next.js** (App Router, TypeScript, Tailwind CSS, Turbopack) — the application itself, frontend and backend together
- **Supabase** — Postgres database, authentication, and file storage. Client wired up under `lib/supabase/`.
- **Vercel** — hosting, auto-deploys on every push to the `main` branch on GitHub
- **GitHub** — repo at `philfullstackdevelopper/Physio-App`, branch `main`

Environment variables (`NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`) live in `.env.local` locally and in Vercel's project environment variables for production. Never commit `.env.local` to git.

## 7. Working conventions

- I am a complete beginner to coding. Before running any command or making any non-trivial change, briefly explain what it does and why in plain language.
- Prefer small, incremental steps I can verify (run locally, check in browser) over large multi-file changes in one go.
- When implementing RLS policies or anything touching data isolation between instructors, always explain the policy before applying it — this is the one part of the app that must never be wrong.
- Keep all UI text in French.

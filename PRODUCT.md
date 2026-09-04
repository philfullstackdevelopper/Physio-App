# Product

<!-- impeccable:product-schema 1 -->

## Platform

web

## Users

- **Instructors (kinés):** physiotherapists who pay monthly for platform access. They manage their own roster of patients, assign conditions/workouts from a shared exercise library, track adherence, message patients, and set their own per-patient price via Stripe Connect. This is their professional tool, used alongside in-person practice.
- **Patients:** free users, invited by their kiné. They see their assigned program, do guided sessions, mark exercises done, and message their instructor. Not paying customers of the platform — the kiné pays.
- **Admin (Philippe, platform owner):** approves new instructor signups; not a day-to-day product user.

## Product Purpose

A multi-tenant SaaS platform ("suivi en ligne") that lets physiotherapy instructors manage patient exercise programs and track adherence between clinic visits. Success is measured by day-to-day ease of use for both kiné and patient, and by patients actually completing their assigned exercises.

## Positioning

B2B per-patient pricing (kinés pay, patients are free) combined with three things competitors in this space (including patient-subscription models) don't offer together: genuine ease of use, aesthetic/polished interface quality, and great personalized demonstrations of how to perform each exercise correctly.

## Operating Context

All UI is in French, no i18n layer. Instructor and patient data are strictly isolated per instructor via RLS — this must never be compromised, including visually or through shortcuts. Instructors typically use this as a working tool during and around patient sessions; patients use it independently, often without supervision, so exercise instructions must be clear enough to follow unassisted.

## Capabilities and Constraints

- Built and live: instructor signup/approval, patient roster management, condition/workout assignment from a shared exercise library (361 exercises, Everkinetic-sourced), adherence tracking via workout logs, instructor-patient messaging, health-data/CGU consent gates, Stripe Connect billing with a platform fee, per-patient séance adjustment (« Ajuster la séance », patient-specific copies).
- Exercise content and clinical parameters come from a real clinical partner kiné — never invent or extend clinical content solo (`lib/ai/protocol.ts` is an unreviewed placeholder, not real clinical content).
- Permanently dropped, do not resurrect: télésoin (remote video sessions), camera-based pose-tracking exercise analysis.
- Explicitly out of scope: email/SMS reminders, rich scheduling/calendars beyond a text frequency field, multi-language support, analytics beyond the instructor UI's own indicators (adherence %, daily tiles, 30-day pain history), any role beyond Admin/Instructor/Patient.
- Open gap the product needs: no video demonstrations of exercises exist yet (illustrations only); no easy way yet for the team to add new exercise illustrations/designs when extending the library.

## Brand Commitments

Name is **EasyPhysio** (rebranded from "Physio-App"). No finished logo or brand mark yet — treat branding as typography-led for now. Icons via lucide-react only — no emoji used as UI icons, since that reads as generic "AI SaaS."

## Evidence on Hand

- Exercise illustrations: SVG bone-joint icons for all 361 library exercises (Everkinetic import). No real exercise demonstration photos or videos exist yet — do not fabricate or fake these; flag where real video/photo assets would be needed instead.
- No testimonials, case studies, or press exist. Do not invent any.
- No finished logo/brand assets exist yet.

## Product Principles

1. Keep the app — especially the patient-facing side — as simple, practical, and navigable as possible; remove dead complexity rather than design around it.
2. Aesthetic polish is a competitive differentiator here, not just decoration — it's part of the pitch to instructors.
3. Exercise demonstration clarity ("how do I actually do this movement") is core product value, not a secondary detail — patients follow it unsupervised.
4. Never invent or extend clinical content; it comes from the clinical partner.
5. Per-instructor data isolation (RLS) is foundational and must never be visually or functionally undermined for convenience.

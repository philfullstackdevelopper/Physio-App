-- Physio-App — Migration 0036: drop the per-exercise feedback system
-- Run once in Supabase: SQL Editor -> New query -> paste -> Run. Safe to re-run.
--
-- Product decision: the only feedback kept is the one post-session rating
-- (patient_feedback — untouched by this migration). Per-exercise difficulty
-- ratings, the auto-easing they drove, and the instructor's manual per-exercise
-- overrides are dropped together, since exercise_overrides was only ever
-- written to from the adaptation-suggestion UI this removes.
-- See docs/superpowers/specs/2026-08-29-recommended-workouts-and-calendar-design.md.

drop table if exists public.exercise_overrides cascade;
drop table if exists public.exercise_feedback cascade;

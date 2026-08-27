-- Physio-App — Migration 0024: drop télésoin
-- Run once in Supabase: SQL Editor -> New query -> paste -> Run. Safe to re-run.
--
-- Télésoin (video calls) and the "Kiné Pro" tier are dropped from the product
-- entirely — not paused. Supersedes 0011_video_calls.sql and
-- 0013_scheduled_calls.sql, which added this table.

drop table if exists public.video_calls;

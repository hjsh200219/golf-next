---
name: postgrest-partial-index-upsert-trap
description: Supabase .upsert(onConflict=...) against a PARTIAL unique index raises 42P10 — use INSERT + catch 23505
type: reference
created: 2026-06-01
---

PostgREST `ON CONFLICT (cols)` requires a **full** (unconditional) unique index matching `onConflict` exactly. A PARTIAL unique index (with a `WHERE` clause, e.g. `uq_telegram_watches_active ... WHERE status='active'`) cannot be the arbiter → Postgres raises `42P10: there is no unique or exclusion constraint matching the ON CONFLICT specification`. This fails EVERY insert, not just duplicates. `ignoreDuplicates:true` does not help — the index is resolved at plan time before any row.

The `__tests__/helpers/mock-supabase.ts` stub enforces NO constraint semantics, so `.upsert()` against a partial index passes tests GREEN while throwing in production.

**Why:** Silent test/prod divergence — the same code that gives green CI gives a 400 in Vercel. Only surfaces against a real Supabase instance.

**How to apply:** For a table whose uniqueness is a partial index, use plain `.insert(rows)` and catch the `23505` (unique_violation) `error.code` in production code (treat as idempotent "already exists"). See `src/lib/telegram/watches.ts` `createWatch`. The idempotency + stopped→reactivate path can only be validated against real Postgres (the mock can't), so that assertion is an intentional `it.skip` in `watches.test.ts`.

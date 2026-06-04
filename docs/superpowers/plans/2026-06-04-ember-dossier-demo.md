# Ember Dossier Demo Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build a first playable browser demo for Ember Dossier that can complete one expedition loop and is ready for local testing plus Cloudflare Pages deployment.

**Architecture:** The demo is UI-first. React renders the base dashboard, survivor roster, expedition prep, and report feed. Pure TypeScript game-sim functions handle expedition resolution so behavior is testable before UI wiring. Supabase is prepared through schema/seed scripts, while the browser demo uses local persisted state until the anon key is available for client-side Supabase access.

**Tech Stack:** React, TypeScript, Vite, Vitest, Supabase schema SQL, optional Node Postgres setup script.

---

### Task 1: Scaffold App Shell

**Files:**
- Create: `package.json`
- Create: `index.html`
- Create: `vite.config.ts`
- Create: `tsconfig.json`
- Create: `tsconfig.node.json`
- Create: `src/main.tsx`
- Create: `src/styles.css`
- Create: `src/App.tsx`

- [ ] **Step 1: Add Vite/React project files**

Create a minimal Vite React app with scripts:

```json
{
  "scripts": {
    "dev": "vite --host 0.0.0.0",
    "build": "tsc -b && vite build",
    "preview": "vite preview --host 0.0.0.0",
    "test": "vitest run"
  }
}
```

- [ ] **Step 2: Install dependencies**

Run: `npm install`

Expected: `node_modules/` and `package-lock.json` are created.

- [ ] **Step 3: Verify blank app builds**

Run: `npm run build`

Expected: TypeScript and Vite complete with output in `dist/`.

### Task 2: Game Data and Simulator TDD

**Files:**
- Create: `src/game/types.ts`
- Create: `src/game/content.ts`
- Create: `src/game/sim.test.ts`
- Create: `src/game/sim.ts`

- [ ] **Step 1: Write failing simulator tests**

Tests cover selecting a squad, resolving an expedition, resource deltas, injury/fatigue changes, and report log generation.

Run: `npm test -- src/game/sim.test.ts`

Expected: tests fail because `resolveExpedition` is missing.

- [ ] **Step 2: Implement simulator**

Add deterministic test-friendly logic with an injectable random seed stream. Use survivor attributes, location risk, carried supplies, and risk strategy to produce an `ExpeditionReport`.

- [ ] **Step 3: Verify tests pass**

Run: `npm test -- src/game/sim.test.ts`

Expected: all simulator tests pass.

### Task 3: Playable UI Loop

**Files:**
- Create: `src/game/state.ts`
- Modify: `src/App.tsx`
- Modify: `src/styles.css`

- [ ] **Step 1: Add local demo state**

Use content data to initialize resources, facilities, survivors, and feed items. Persist to `localStorage` under `ember-dossier-demo-state`.

- [ ] **Step 2: Render main views**

Implement base overview, survivor roster, expedition prep, report feed, light facilities, light members, and archive panels in one responsive app shell.

- [ ] **Step 3: Wire expedition flow**

Let the user pick 3-5 survivors, pick a location, choose carried supplies, choose risk strategy, dispatch, and see the resulting report and state changes.

- [ ] **Step 4: Verify build**

Run: `npm run build`

Expected: build succeeds with no TypeScript errors.

### Task 4: Supabase Prep

**Files:**
- Create: `supabase/schema.sql`
- Create: `supabase/seed.sql`
- Create: `scripts/init-supabase.mjs`
- Create: `.env.example`
- Modify: `.gitignore`

- [ ] **Step 1: Add schema**

Create tables for rooms, bases, members, survivors, locations, expeditions, reports, feed_items, and content_events.

- [ ] **Step 2: Add seed data**

Seed one demo room/base with starter resources, survivors, locations, facilities, and event templates.

- [ ] **Step 3: Add optional init script**

Read `SUPABASE_DB_URL` from `.env.local` and execute `schema.sql` then `seed.sql`. Do not commit `.env.local`.

- [ ] **Step 4: Document missing frontend key**

`.env.example` includes `VITE_SUPABASE_URL` and `VITE_SUPABASE_ANON_KEY`. The demo can run locally without them; real auth/shared data needs the anon key.

### Task 5: Verification and Deployment Docs

**Files:**
- Create: `README.md`

- [ ] **Step 1: Add local testing instructions**

Document `npm install`, `npm test`, `npm run build`, `npm run dev`, and the local URL.

- [ ] **Step 2: Add Supabase setup instructions**

Document how to put `SUPABASE_DB_URL` in `.env.local`, run `npm run supabase:init`, and where to put the anon key later.

- [ ] **Step 3: Add Cloudflare Pages instructions**

Document Cloudflare settings:

```text
Framework preset: Vite
Build command: npm run build
Build output directory: dist
Root directory: /
```

- [ ] **Step 4: Final verification**

Run:

```powershell
npm test
npm run build
```

Open the local app in browser and complete one expedition.

# Workflow — use premiumref in any project

## Files in your project

```
your-app/
├── DESIGN.md                 ← premium rules for THIS product (required)
├── .premiumref/
│   ├── brief.md              ← agent reads this (generated)
│   ├── brief.json
│   └── verify.json           ← after verify
└── src/...                   ← your app
```

## Step 0 — One time

```bash
cp ~/Projects/premiumref/docs/DESIGN-TEMPLATE.md ./DESIGN.md
# Edit: mood, fonts, colors, page types you care about
```

Install Cursor skill (already on your machine):

`~/.cursor/skills/premiumref-creative/SKILL.md`

---

## Step 1 — Generate brief

From **your project root**:

```bash
~/Projects/premiumref/node_modules/.bin/bun \
  ~/Projects/premiumref/src/cli.ts brief \
  --type 404 \
  --style dark,animated \
  --refs iyo \
  --out .premiumref/brief.json \
  --md .premiumref/brief.md
```

Pick references:

```bash
~/Projects/premiumref/node_modules/.bin/bun \
  ~/Projects/premiumref/src/cli.ts refs
```

Filter by vibe:

```bash
# dark + game
--style dark --interaction game --refs maxime-ducret-tilt

# playful portfolio
--refs maxima,corentin-bernadou
```

---

## Step 2 — Agent builds (5 phases)

Tell Cursor:

> Read `./DESIGN.md` and `.premiumref/brief.md`. Build [page] in **5 phases**. Do not one-shot. Document each phase.

| Phase | Deliverable |
|---|---|
| 1 concept | Metaphor + what you steal from references |
| 2 layout | Static HTML/CSS — works without JS |
| 3 motion | GSAP timeline + reduced-motion fallback |
| 4 interaction | Hover, cursor, game, scroll — at least one |
| 5 polish | Run verify + rubric |

---

## Step 3 — Verify

```bash
bun run ~/Projects/premiumref/src/cli.ts verify http://localhost:3000/404 \
  --out .premiumref/verify.json
```

Exit code `0` = pass.

---

## Step 4 — Rubric self-score

Agent scores /100 from brief (target **≥ 70**):

- Concept & art direction — 25  
- Typography as design — 20  
- Motion craft (GSAP) — 25  
- Interaction — 20  
- Execution craft — 10  

---

## Diagram

```
┌─────────────┐
│  DESIGN.md  │  project premium contract
└──────┬──────┘
       ▼
┌─────────────┐
│ premiumref  │  references + GSAP spec + phases
│   brief     │
└──────┬──────┘
       ▼
┌─────────────┐
│   Agent     │  concept → layout → motion → interaction
│  (5 phases) │
└──────┬──────┘
       ▼
┌─────────────┐
│ premiumref  │  GSAP + interaction check
│   verify    │
└──────┬──────┘
       ▼
┌─────────────┐
│   Rubric    │  ≥ 70/100 → ship
└─────────────┘
```

---

## Verify in your app

Run verify and jury against the URL where the agent built the page (local dev server or preview).

---
name: premium-taste
description: |
  ONE PROMPT premium UI. User describes what they want in plain English — you run
  `premium-taste design -p "their exact words"`. Brief, micro craft, color, phases,
  discovery stub, verify, jury — all automatic. User never picks page types, tastes,
  or CLI flags. Use for pricing, bento, 404, portfolio, auth, payment, redesign.
  ALWAYS when user says premium taste, premium-taste, or wants premium agent UI.
user-invocable: true
argument-hint: "[prompt]"
---

# Premium Taste — one prompt

**User says one thing. You run one command. You build. You score. You report results.**

The user does **not** run CLI, pick page types, know NumberFlow, or read corpus files. **You do.**

## Setup

```bash
npx premium-taste skills install
```

For verify/jury (first time only):

```bash
npx playwright install chromium
```

---

## Step 1 — User prompt (only input needed)

Examples (pass exact words):

- `"OurTravel bento card with trip preview inside the tile"`
- `"pricing card with annual toggle"`
- `"redesign the login page — warmer, less template"`
- `"404 for a podcast app"`

---

## Step 2 — Run design (one command)

From the **project root**:

```bash
npx premium-taste design -p "<user's exact words>"
```

Writes `.premium-taste/brief.json`, `brief.md`, `discovery.md` + prints **Senior micro** + **6 build phases**.

Read `.premium-taste/brief.md` — **Senior micro** section first.

---

## Step 3 — Build (6 phases, never one-shot)

| Phase | Do |
|---|---|
| discovery | Fill `.premium-taste/discovery.md` |
| concept | One-sentence metaphor; originality test |
| layout | Semantic tokens first |
| assets | Bundle photos locally — verify fails broken img |
| motion | GSAP/CSS + `prefers-reduced-motion` |
| interaction | NumberFlow on pricing; stable hovers; preview in card |
| polish | Score (step 4) |

---

## Step 4 — Score

```bash
npx premium-taste design -p "<same words>" --url <url> --skip-brief
```

Or:

```bash
npx premium-taste verify <url>
npx premium-taste jury <url> --md .premium-taste/jury.md
```

---

## Step 5 — Always say the results (mandatory)

**Every reply must end with:**

```
## Results
| Check | Result |
|---|---|
| **Verify** | pass / fail — why if fail |
| **Jury** | NN/100 (ship ≥75) |
| **Human** | NN/100 — your honest eye |

**URL:** http://…
**Concept:** one sentence
```

If not scored yet: `Verify: not run` / `Jury: not run`.

---

## Redesign mode

1. Find target file/route in the project  
2. `npx premium-taste design -p "Redesign src/.../Login.tsx: warmer, keep form logic"`  
3. Edit **in place** — same route, same actions  

---

## Implement (user doesn't know — brief tells you)

- **Pricing toggles:** NumberFlow — digits morph (`@number-flow/react`)
- **Hovers:** color/tint/shadow only — **no translateY lift**
- **Photos:** local bundled assets
- **Tokens:** `--surface`, `--ink`, `--muted`, `--accent`
- **Copy:** no em-dash brochure rhythm
- **Typography:** sans-first on checkout/auth/pricing/payment

---

## Hard rules

- One sharp concept per surface — senior creative courage
- Product-fit first
- Mesh/gradient in **one zone**
- No Inter/Geist template stacks on task UI
- Verify pass ≠ ship — jury ≥75, your eye ≥70 when they disagree

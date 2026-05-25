# Design system — premium target

> Copy this file to **your project root** as `DESIGN.md`. Agents read it with `.premiumref/brief.md`.

## Product context

- **Type:** _(portfolio | SaaS | dashboard | marketing | 404)_
- **Audience:** _
- **Mood:** _(restrained | editorial | technical | warm | playful)_
- **Reference mood:** _(e.g. iyO minimal dark, Maxima playful — courage calibration only)_

## Typography

- Display + body **font pairing**
- Hierarchy works **without motion**
- Sentence case — avoid ALL CAPS eyebrows unless brand requires

## Color

- Tinted neutrals — intentional accent with one job
- Body contrast ≥ 4.5:1 (≥ 7:1 preferred on marketing pages)

## Layout

- One primary action per viewport where applicable
- Asymmetric / editorial — avoid default centered icon grids

## Motion (required for creative pages)

- GSAP timelines — not scattered CSS transitions
- `prefers-reduced-motion` fallback mandatory
- Entrance + ambient or scroll-driven moment

## Interaction (required for creative pages)

- At least one: hover craft, cursor, game, drag, scroll-sync
- `focus-visible` on all controls

## Copy

- Concrete — what the product **does**
- No placeholder metrics, launch theater, or buzzword soup

## Anti-patterns (do not ship)

- Static stock 404 clipart
- Dot/line grid hero backgrounds
- Emoji as feature icons
- One-shot build without motion pass
- Glassmorphism + purple gradients as “polish”

## Tokens

| Token | Value |
|---|---|
| `--font-display` | |
| `--font-body` | |
| `--color-bg` | |
| `--color-text` | |
| `--color-accent` | |

## Premium bar

- `premiumref verify` **PASS**
- Creative rubric **≥ 70/100**

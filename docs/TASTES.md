# Creative direction

Premium Taste is **designer-first**. Users describe the product — Premium Taste asks questions and sets fit constraints. It does **not** pick aesthetics from a menu.

## Usage

```bash
premium-taste design -p "OTP from bank authenticator"
premium-taste verify http://localhost:8765/otp
premium-taste jury http://localhost:8765/otp
```

## What changed from preset-driven flows

| Old (wrong) | Designer-first (right) |
|---|---|
| Keyword → design pattern → dither/scrub/editorial | Product discovery → concept sentence → originality test |
| Taste steal lists in brief | Craft principle **questions** (reduction, interaction-with-purpose) |
| References → technique map | References → courage calibration + similarity traps |
| Jury rewards default scrub | Jury asks agent to confirm product-fit in jury.md |

## Internal scoring profiles

Tastes (`spectacle`, `editorial`, `minimal`, `expressive`, `blueprint`) exist for **verify/jury weights only**. They are not shown as "pick this look."

Run `premium-taste tastes` to inspect — do not pass taste flags unless overriding scoring.

## vs polish and design-system workflows

- **Design-system tools**: apply a fixed DESIGN.md system → Premium Taste invents grammar for *your* product
- **Polish tools**: shape + polish existing UI → Premium Taste phases creative build from discovery
- **References you feed**: calibration for courage — if output looks like them, reject

## Originality test (non-negotiable)

> "This looks like ___ with different copy."

If namable → restart. Same senior creative bar. New grammar for this product.

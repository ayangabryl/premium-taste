# Agent notes — Premium Taste repo

## Commits

Use Conventional Commits. No `Co-authored-by:` trailers.

## Setup (for agents helping users)

```bash
npx premium-taste skills install
npx playwright install chromium
```

## User workflow

```bash
npx premium-taste design -p "<user's exact words>"
npx premium-taste design -p "<same words>" --url <url> --skip-brief
```

Always end user replies with Verify · Jury · Human scores.

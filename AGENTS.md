# Agent notes — Premium Taste repo

## Commits

Use Conventional Commits. No `Co-authored-by:` trailers.

## Setup (for agents helping users)

Skill:

```bash
npx skills add ayangabryl/premium-taste --skill premium-taste -g -y
```

CLI (once per machine — clone + link):

```bash
git clone https://github.com/ayangabryl/premium-taste.git && cd premium-taste && bun install && bun link
npx playwright install chromium
```

## User workflow

```bash
premium-taste design -p "<user's exact words>"
premium-taste design -p "<same words>" --url <url> --skip-brief
```

Always end user replies with Verify · Jury · Human scores.

---
description: Reset and reseed live demo data in the database
argument-hint: [--clear]
allowed-tools: Bash
---

# Seed Reset

Clear previous seed-live data and reinsert the deterministic demo dataset. Preserves existing admin users.

## Steps

1. Run the seed script:
```bash
bash .codex/skills/seed-reset/scripts/seed_reset.sh $ARGUMENTS
```

2. Report the result.

## Options

- `--clear` — only clear seed data, don't reinsert

## What Gets Seeded

- 3 onboarding users (PENDING): Anna, Mark, Lia
- 3 active users (APPROVED, plus): Dan, Mia, Ivan
- Telegram IDs: 9100001101–9100001203
- Swipes, likes, matches, reports, purchases, transactions
- Ads, ad events, ad revenue facts
- Support conversations, moderation items
- Daily metrics, admin user activity

$ARGUMENTS

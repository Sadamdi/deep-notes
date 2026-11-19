# Testing accounts (format only)

The real file is `docs/local/TESTING_ACCOUNTS.local.md` and is gitignored. Never commit real credentials. Create it by copying this layout.

| Role | Email | Password | Notes |
|---|---|---|---|
| member | member1@example.com | (set locally) | owner of the sample notebook |
| member | member2@example.com | (set locally) | editor in the sample notebook |
| outsider | member3@example.com | (set locally) | not in any notebook; used for isolation tests |

Rules:

- Use only these accounts for manual testing, E2E and smoke tests; do not invent random accounts.
- Test scripts read credentials from environment variables, never hardcoded.
- Test accounts are seeded only into a local database.
- If you add or change a seed account, update `backend/scripts/seed.ts` and your local file together.

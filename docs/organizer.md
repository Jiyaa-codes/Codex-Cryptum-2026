# Organizer controls

The app uses Next.js, PostgreSQL, Better Auth, and Drizzle.

## Local setup

1. Fill in the ignored root `.env`: `DATABASE_URL`, Google OAuth client ID/secret, and the generated authentication/flag secrets. Use your development database, not an event database, for seed commands.
2. Set `BETTER_AUTH_URL=http://localhost:3000` and register `http://localhost:3000/api/auth/callback/google` with Google.
3. Add authorized Google email addresses to `ORGANIZER_EMAILS`, separated by commas. They must have verified emails in Better Auth. An empty list denies all organizer access. The organizer bearer token for sandbox reset does not grant access to this dashboard.
4. Apply migrations with `pnpm db:migrate`, then seed development data with `pnpm db:seed`. Seeding rotates the demo team's code to `DEV_TEAM_ACCESS_CODE`; it preserves existing official progress.
5. Run `pnpm dev`, or on Windows run `powershell -ExecutionPolicy Bypass -File .\start.ps1`. The Windows launcher uses the installed Next.js CLI directly.
6. Open `http://localhost:3000/organizer` and sign in. Restart the development server after editing root `.env`.

## Available actions

- Create a team with a name and an access code of at least 12 characters.
- Rotate a team's code and revoke its existing team sessions atomically. Existing scores and chat history remain.
- Revoke current sessions without rotating the code. Users can rejoin using the existing code.
- Enable or disable challenges.
- Set event start/end timestamps in UTC, pause new chat reservations and scoring, and set a per-team event chat-attempt cap (default 500).
- Inspect team chat usage and the latest 50 organizer actions. Access codes and submitted flags are excluded from the audit trail.

An event with no configured boundaries is open. The exact start instant is accepted; the exact end instant is closed. A chat admitted before a pause/end may finish. Flag and sandbox scoring both check the event policy inside their transaction. Requests already admitted can finish if an organizer changes settings concurrently.

Chat admission is shared across app replicas through PostgreSQL: at most eight unexpired pending chat reservations, with one pending request per team. Requests over capacity return 429 for participants to retry. This is admission control, not a background inference queue. Failed attempts consume the team budget, and resetting conversations does not replenish it. These are attempt limits, not metered provider token/cost accounting.

## Remaining event infrastructure

Permanent team membership and individual member removal, organizer MFA, exact provider token/cost accounting, a durable inference queue, leaderboard pagination, isolated sandbox hosting/credentials, monitoring, backups with restore drills, and load/deployment verification still require implementation or infrastructure configuration.

Never run database integration tests against a live event database. They alter sandbox state temporarily. Use a disposable migrated and seeded PostgreSQL database with `CRYPTUM_RUN_DATABASE_TESTS=1`.

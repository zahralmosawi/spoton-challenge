# AI Usage

## Tools Used
| Tool | Used? | Notes |
| --- | --- | --- |
| ChatGPT | No | |
| Claude | Yes | Primary AI assistant for the entire challenge |
| Codex | No | |
| Cursor | No | |
| Other | No | |

## Summary
I used Claude as my primary AI assistant throughout this challenge. Claude helped me generate code, architect solutions, and debug issues. However, every piece of code was reviewed by me before use, and I personally identified and fixed multiple bugs that Claude got wrong or missed entirely.

## Main Areas AI Helped With
- Architecture: Suggested the overall structure of the NestJS service layer and database schema
- Backend: Generated the initial CRUD methods, status transition validation, and QA gate logic
- Frontend: Generated the React/Next.js page components with state management
- Database: Suggested the SQL table schemas and relationships
- Tests: Helped write the basic test structure
- Debugging: Helped interpret error messages and suggest fixes
- Documentation: Helped structure the markdown documentation files

## What You Reviewed Manually
- Checked that the JWT guard import path was correct — Claude suggested the wrong path (`auth/jwt-auth.guard`) and I corrected it to (`common/jwt-auth.guard`) by exploring the actual file structure
- Verified the database name — Claude assumed `spoton` but the actual `.env` used `spoton_challenge`
- Fixed the `due_date` bug — Claude did not handle empty string vs null for timestamp fields, causing a PostgreSQL error
- Reviewed all SQL queries to ensure they matched the actual table columns
- Verified the status transition rules matched the challenge requirements exactly

## What AI Got Wrong
- **Wrong JWT guard path:** Claude assumed the guard was in `auth/` but it was actually in `common/`. This broke the entire backend until I manually inspected the file structure.
- **Database name assumption:** Claude used `spoton` as the database name but the project `.env.example` used `spoton_challenge`, causing connection failures.
- **Empty string vs null:** Claude passed `due_date` directly to PostgreSQL without handling the empty string case, causing a timestamp parse error.
- **Token key mismatch:** Claude used `localStorage.getItem('accessToken')` but the existing `lib/api.ts` used `spoton_challenge_token` as the key.

## Commands Run
```bash
npm run install:all
docker compose up -d postgres
npm run start:dev
npm run dev -- -p 3000
npm run build
npm test
docker exec -it spoton-challenge-postgres-1 psql -U postgres -d spoton_challenge
```

## Known Limitations
- Database credentials are hardcoded in the service (not using environment variables) due to `.env` not loading correctly during development
- No pagination on the work items list
- No inline editing of work items after creation
- Frontend styles are inline rather than in separate CSS files due to time constraints
- Score events use 'system' as userId for workflow transitions rather than the actual logged-in user

## Prompt Log
See `PROMPT_LOG.md` for detailed prompt history.
# Prompt Log

## 2026-06-19 13:00 - Claude
### Goal
Design the database schema for work items, QA checks, and releases.
### Prompt
"Create PostgreSQL tables for a work item tracker with QA checks and releases. Include proper foreign keys, UUIDs, and timestamps."
### Output Summary
Generated CREATE TABLE statements for work_items, qa_checks, releases, release_work_items, and score_events with proper relationships and constraints.
### Files Changed
- Executed directly in psql (no file)
### Manual Review
Verified column names matched what the NestJS service would use. Added the score_events UNIQUE constraint for idempotency after reviewing the challenge requirements.
### Related Commit
N/A

## 2026-06-19 13:30 - Claude
### Goal
Replace placeholder NestJS service with real PostgreSQL CRUD.
### Prompt
"Replace the placeholder NestJS service with real PostgreSQL queries for work items, QA checks, and releases. Include status transition validation and QA gate logic that blocks ready_for_release if checks are not all passed."
### Output Summary
Generated complete it-workspace.service.ts with listWorkItems, getWorkItem, createWorkItem, updateWorkItem, deleteWorkItem, QA check methods, and release methods.
### Files Changed
- backend-nest/src/it-workspace/it-workspace.service.ts
### Manual Review
Fixed wrong JWT guard import path — Claude used ../auth/jwt-auth.guard but actual file was in ../common/jwt-auth.guard. Verified transition rules matched challenge spec exactly.
### Related Commit
4b6cb74

## 2026-06-19 14:00 - Claude
### Goal
Wire up REST endpoints with JWT protection.
### Prompt
"Write a NestJS controller for work items, QA checks, and releases with JWT auth guard protecting all routes."
### Output Summary
Generated complete it-workspace.controller.ts with all GET, POST, PUT, DELETE endpoints.
### Files Changed
- backend-nest/src/it-workspace/it-workspace.controller.ts
### Manual Review
Verified all routes matched the frontend API calls. Confirmed JWT guard was applied at controller level not per-route.
### Related Commit
4b6cb74

## 2026-06-19 14:30 - Claude
### Goal
Fix database connection — environment variables not loading.
### Prompt
"The DATABASE_URL env var is not being picked up. How do I hardcode the PostgreSQL connection in the pg Pool?"
### Output Summary
Suggested replacing connectionString with explicit host/port/user/password/database fields in the Pool constructor.
### Files Changed
- backend-nest/src/it-workspace/it-workspace.service.ts
### Manual Review
Confirmed this fixed the SASL authentication error. Noted this is not production-safe and documented in DECISIONS.md.
### Related Commit
N/A

## 2026-06-19 15:00 - Claude
### Goal
Fix due_date empty string causing PostgreSQL timestamp error.
### Prompt
"Getting error: invalid input syntax for type timestamp with time zone: empty string. How to fix?"
### Output Summary
Suggested changing due_date to due_date || null to convert empty string to null.
### Files Changed
- backend-nest/src/it-workspace/it-workspace.service.ts
### Manual Review
Verified fix resolved the 500 error on work item creation.
### Related Commit
N/A

## 2026-06-19 15:30 - Claude
### Goal
Build IT Workspace frontend page.
### Prompt
"Build a Next.js page for IT workspace with work item list on the left, create modal, detail panel on the right, status transitions, filters, search, and QA checks section inline."
### Output Summary
Generated complete page.tsx with all UI components, state management, and API calls.
### Files Changed
- frontend-next/src/app/pm/it-workspace/page.tsx
### Manual Review
Fixed token key mismatch — Claude used localStorage.getItem('accessToken') but existing lib/api.ts uses 'spoton_challenge_token'. Verified all API endpoints matched backend routes.
### Related Commit
N/A

## 2026-06-20 01:00 - Claude
### Goal
Build Releases frontend page.
### Prompt
"Build a Next.js releases page with create release form, list of releases, link ready_for_release work items, and deploy button that cascades status to released."
### Output Summary
Generated complete releases page.tsx with all functionality.
### Files Changed
- frontend-next/src/app/pm/releases/page.tsx
### Manual Review
Tested create release, link item, and deploy flow end to end. Verified backend cascade works correctly.
### Related Commit
N/A

## 2026-06-20 02:00 - Claude
### Goal
Add score events with idempotency to backend.
### Prompt
"Add score events to the service layer: +1 create work item, +1 move to QA, +1 QA check passed, +2 ready for release, +3 deploy release. Use database UNIQUE constraint for idempotency."
### Output Summary
Generated awardScore private method and added calls at the right places in the service.
### Files Changed
- backend-nest/src/it-workspace/it-workspace.service.ts
### Manual Review
Verified ON CONFLICT DO NOTHING prevents duplicate score events. Confirmed points match challenge specification.
### Related Commit
N/A
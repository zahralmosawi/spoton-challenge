# Technical Decisions

## Summary
I completed all 5 levels of the challenge:
- Level 1: Work Items CRUD with PostgreSQL
- Level 2: Workflow status transitions with validation and filters
- Level 3: QA Checks with gate blocking ready_for_release
- Level 4: Releases with link and deploy cascade
- Level 5: Score events with idempotency, documentation, and tests

## Database Design
Five tables:

**work_items** — core entity with title, description, type, status, priority, assignee, due_date, created_by. Status defaults to 'backlog'.

**qa_checks** — linked to work_items via foreign key with CASCADE delete. Has test_title, expected_result, actual_result, status (pending/passed/failed), tester.

**releases** — has version, summary, release_date, deployment_status (draft/deployed).

**release_work_items** — join table linking releases to work_items. Composite primary key prevents duplicate links.

**score_events** — records scoring actions with UNIQUE constraint on (user_id, entity_id, event_type) to enforce idempotency at the database level.

## API Design
All endpoints are under `/it-workspace` and protected with JwtAuthGuard:
GET    /it-workspace/work-items          — list with filters (status, priority, search)

POST   /it-workspace/work-items          — create new work item

GET    /it-workspace/work-items/:id      — get single work item

PUT    /it-workspace/work-items/:id      — update / move status

DELETE /it-workspace/work-items/:id      — delete work item

GET    /it-workspace/work-items/:id/qa-checks     — list QA checks

POST   /it-workspace/work-items/:id/qa-checks     — create QA check

PUT    /it-workspace/work-items/:id/qa-checks/:id — update QA check status

GET    /it-workspace/releases            — list all releases with linked items

POST   /it-workspace/releases            — create release

POST   /it-workspace/releases/:id/link  — link a work item to release

POST   /it-workspace/releases/:id/deploy — deploy release

Structured this way to keep work item sub-resources nested under the parent, matching REST conventions.

## Frontend Design
Two main pages built with Next.js and inline styles:

**IT Workspace page** (`/pm/it-workspace`) — split panel layout. Left panel shows work item list with search and filters. Right panel shows detail view with status timeline, metadata, move status button, and QA checks section inline.

**Releases page** (`/pm/releases`) — split panel layout. Left shows release list with stats. Right shows release detail with linked items and available items to link, plus deploy button.

Both pages fit inside the existing shell/sidebar layout defined in `pm/layout.tsx`.

## Workflow Rules

**Status transitions** — enforced in `updateWorkItem` in the service layer using a `VALID_TRANSITIONS` map. Invalid transitions throw a 400 BadRequestException. The frontend shows the error message to the user.

Valid flow: backlog → planned → in_progress → qa → ready_for_release → released
Allowed backwards: qa → in_progress, ready_for_release → qa

**QA readiness rule** — before allowing a move to `ready_for_release`, the service queries all QA checks for that work item. If zero checks exist, or any check is not `passed`, it throws a 400 error. This cannot be bypassed from the frontend.

**Release deployment rule** — before deploying, the service checks if the release is already deployed and throws 400 if so. On successful deploy, all linked work items are updated to `released` status in a single SQL UPDATE.

**Score idempotency** — the `score_events` table has a UNIQUE constraint on `(user_id, entity_id, event_type)`. The `awardScore` method uses `ON CONFLICT DO NOTHING`, so calling it twice for the same action has no effect. This is enforced at the database level, not just application level.

## Tradeoffs
- **Hardcoded DB credentials** — the `.env` file was not loading correctly so I hardcoded the connection. Not production-safe but functionally correct for the challenge.
- **Inline styles** — used inline React styles instead of CSS modules for speed. Would use CSS modules or Tailwind in production.
- **No pagination** — work items list loads all items. Would add cursor-based pagination for large datasets.
- **No item editing** — work items can be created and deleted but not edited after creation. Would add an edit form with more time.
- **System user for scores** — workflow transition scores are attributed to 'system' instead of the actual logged-in user because the user object is not passed through to all service methods.

## Unfinished Work
With more time I would:
- Add edit functionality for work items
- Add pagination on the work items list
- Move database credentials to environment variables properly
- Add more comprehensive backend and frontend tests
- Move inline styles to CSS modules
- Add real-time updates using WebSockets so multiple users see changes live
- Add user management beyond the single seeded intern account
- Add release notes editor with rich text
- Add a Kanban board view as an alternative to the list view
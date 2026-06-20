# SpotOn IT Delivery Workspace — Submission

## Demo Video
[Watch the demo video](#) ← replace this link after recording

## Implementation Status

| Level | Status |
| --- | --- |
| 1 — Core Work Items | ✅ Complete |
| 2 — Workflow and Ownership | ✅ Complete |
| 3 — QA Checks | ✅ Complete |
| 4 — Release Notes | ✅ Complete |
| 5 — Score, Tests, Polish | ✅ Complete |

## Setup Instructions

### Prerequisites
- Node.js v20
- Docker Desktop (must be running)
- Git

### Steps to Run

**1. Install dependencies:**
```bash
npm run install:all
```

**2. Start PostgreSQL:**
```bash
docker compose up -d postgres
```

**3. Create the database:**
```bash
docker exec -it spoton-challenge-postgres-1 psql -U postgres -c "CREATE DATABASE spoton_challenge;"
```

**4. Create the tables:**
```bash
docker exec -it spoton-challenge-postgres-1 psql -U postgres -d spoton_challenge -c "
CREATE TABLE work_items (id UUID PRIMARY KEY DEFAULT gen_random_uuid(), title VARCHAR(255) NOT NULL, description TEXT, type VARCHAR(50) NOT NULL DEFAULT 'feature', status VARCHAR(50) NOT NULL DEFAULT 'backlog', priority VARCHAR(50) NOT NULL DEFAULT 'medium', assignee VARCHAR(255), due_date TIMESTAMPTZ, created_by VARCHAR(255), created_at TIMESTAMPTZ DEFAULT NOW(), updated_at TIMESTAMPTZ DEFAULT NOW());
CREATE TABLE qa_checks (id UUID PRIMARY KEY DEFAULT gen_random_uuid(), work_item_id UUID NOT NULL REFERENCES work_items(id) ON DELETE CASCADE, test_title VARCHAR(255) NOT NULL, expected_result TEXT, actual_result TEXT, status VARCHAR(50) NOT NULL DEFAULT 'pending', tester VARCHAR(255), notes TEXT, created_at TIMESTAMPTZ DEFAULT NOW(), updated_at TIMESTAMPTZ DEFAULT NOW());
CREATE TABLE releases (id UUID PRIMARY KEY DEFAULT gen_random_uuid(), version VARCHAR(50) NOT NULL, release_date TIMESTAMPTZ, summary TEXT, deployment_status VARCHAR(50) NOT NULL DEFAULT 'draft', created_at TIMESTAMPTZ DEFAULT NOW(), updated_at TIMESTAMPTZ DEFAULT NOW());
CREATE TABLE release_work_items (release_id UUID NOT NULL REFERENCES releases(id) ON DELETE CASCADE, work_item_id UUID NOT NULL REFERENCES work_items(id) ON DELETE CASCADE, PRIMARY KEY (release_id, work_item_id));
CREATE TABLE score_events (id UUID PRIMARY KEY DEFAULT gen_random_uuid(), user_id VARCHAR(255) NOT NULL, entity_id UUID NOT NULL, event_type VARCHAR(100) NOT NULL, points INT NOT NULL, created_at TIMESTAMPTZ DEFAULT NOW(), UNIQUE(user_id, entity_id, event_type));
"
```

**5. Start the backend:**
```bash
cd backend-nest && npm run start:dev
```

**6. Start the frontend (new terminal):**
```bash
cd frontend-next && npm run dev -- -p 3000
```

**7. Open the app:**
http://localhost:3000

Email: intern@spoton.test

Password: intern123

### Run Tests
```bash
cd backend-nest && npm test
```

## Features

### Work Items
- Create, list, view, delete work items with title, description, type, priority, assignee, due date
- Search and filter by status, priority, text
- All data persisted in PostgreSQL

### Workflow Rules (enforced in backend)
- Valid flow: backlog → planned → in_progress → qa → ready_for_release → released
- Invalid transitions return 400 error
- Cannot skip QA stage

### QA Checks
- Add QA checks to work items
- Mark as pending, passed, or failed
- Backend blocks ready_for_release unless all checks exist and all passed

### Releases
- Create releases with version and summary
- Link only ready_for_release items
- Deploy cascades all linked items to released
- Prevents double deployment

### Score Events
- +1 create work item
- +1 move to QA
- +1 QA check passed
- +2 ready for release
- +3 deploy release
- Idempotency via database UNIQUE constraint

## Architecture
- **Backend:** NestJS + PostgreSQL (pg library)
- **Frontend:** Next.js + React
- **Auth:** JWT
- **Database:** PostgreSQL via Docker
- **Tests:** Jest (9 tests passing)

## Known Limitations
- Database credentials are hardcoded (not using .env) due to env loading issue
- No pagination on work items list
- No edit functionality after creation
- Inline styles instead of CSS modules

## Documentation
- `AI_USAGE.md` — how AI was used and what was corrected
- `PROMPT_LOG.md` — detailed prompt history
- `DECISIONS.md` — technical decisions and tradeoffs
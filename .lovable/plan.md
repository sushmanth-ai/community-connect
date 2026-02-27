

## Plan: Issue Workflow — Accept/Decline, Progress, Budget & Citizen Pipeline

### Database Changes (Migration)

**1. Add new enum values to `issue_status`:**
- `accepted`, `declined`, `work_started`, `completed`

**2. Create `issue_work_details` table:**

| Column | Type | Notes |
|--------|------|-------|
| id | uuid PK | |
| issue_id | uuid FK → issues | unique, one-per-issue |
| budget_allocated | numeric | set on accept |
| estimated_days | integer | set on accept |
| work_start_date | date | set on accept |
| decline_reason | text | set on decline |
| decline_category | text | duplicate/invalid/outside_jurisdiction/insufficient_evidence/other |
| progress_percentage | integer | 0, 25, 50, 75, 100 |
| amount_used | numeric | updated by authority |
| extension_reason | text | if time extended |
| extended_date | date | new expected date |
| accepted_at | timestamptz | |
| accepted_by | uuid | authority user id |
| created_at / updated_at | timestamptz | |

**RLS:** Authorities/admins can insert/update; authenticated users can read.

### File Changes

| File | Change |
|------|--------|
| **Migration SQL** | Add enum values, create `issue_work_details` table with RLS |
| `src/pages/authority/AuthorityDashboard.tsx` | Replace "Start Work"/"Resolve" with "Accept"/"Decline" buttons for open issues; add progress update controls for accepted/in-progress issues |
| `src/pages/authority/AuthorityQueue.tsx` | Same accept/decline/progress flow |
| `src/components/issues/AcceptIssueDialog.tsx` | **New** — Dialog with budget (₹), estimated days, work start date fields |
| `src/components/issues/DeclineIssueDialog.tsx` | **New** — Dialog with reason category dropdown + text field |
| `src/components/issues/ProgressUpdateDialog.tsx` | **New** — Dialog for progress %, amount used, extension fields |
| `src/components/issues/IssuePipeline.tsx` | **New** — Visual pipeline component (vertical stepper with colored dots) showing: Submitted → Accepted → Budget Allocated → Work In Progress → Extended (if applicable) → Completed |
| `src/pages/citizen/IssueDetail.tsx` | Add pipeline view, budget info card, timeline card, authority updates section |
| `src/components/issues/StatusBadge.tsx` | Add colors for new statuses: accepted, declined, work_started, completed |

### Workflow Logic

**Authority side:**
- Open issue → "Accept" or "Decline" buttons
- Accept → fills budget, estimated days, start date → status becomes `accepted`
- Decline → selects reason category + text → status becomes `declined`
- Accepted issue → "Start Work" → status `work_started`
- Work started → update progress (25/50/75/100%), amount used, or extend time
- 100% progress → status `completed`

**Citizen side (IssueDetail):**
- Visual pipeline stepper showing current stage with colored indicators
- Budget card: allocated amount, amount used, remaining
- Timeline card: accepted date, start date, estimated completion, extensions
- Progress bar showing percentage
- All status log entries displayed


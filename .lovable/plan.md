

# ResolvIt — Civic Accountability Platform

**"From complaints to accountability — turning public voices into measurable action."**

A full-stack civic platform built with React, Supabase, Tailwind CSS, and Leaflet maps.

---

## Phase 1: Foundation — Database, Auth & Roles

### Database Schema
Set up all core tables in Supabase:
- **profiles** — name, avatar, points total, linked to auth.users
- **departments** — name, description, SLA hours
- **user_roles** — role enum (citizen, authority, admin), linked to users
- **issues** — title, description, category, severity, location (lat/lng), priority_score, status, department, reporter, assigned_authority, image_url, report_count, created_at
- **issue_reports** — links duplicate reports to existing issues (reporter, description, image)
- **status_logs** — issue status change history with timestamps
- **points_ledger** — tracks civic points earned per user with reason
- **upvotes** — user + issue, unique constraint to prevent duplicates
- **notifications** — user, message, type, read status, linked issue

RLS policies ensuring citizens see their own data, authorities see department issues, admins see everything.

### Authentication & Role Routing
- Sign up / login pages with Supabase Auth
- Auto-create profile + default "citizen" role on signup
- Protected route wrapper that redirects based on role:
  - `/citizen` → Citizen Dashboard
  - `/authority` → Authority Dashboard  
  - `/admin` → Admin Dashboard

---

## Phase 2: Citizen Experience

### Issue Submission Form
- Category selector (Roads, Water, Electricity, Sanitation, etc.)
- Description field with validation
- Severity picker (1-5)
- Image upload to Supabase Storage
- **Interactive Leaflet map** for picking location (click to drop pin)
- On submit: triggers AI duplicate detection before creating issue

### My Issues Page
- List of submitted issues with status badges (Open, In Progress, Resolved, Escalated)
- Click to view full issue detail with timeline of status changes
- Upvote button on any issue (once per user)

### Civic Points & Leaderboard
- Points summary card showing total earned
- Breakdown of points by activity
- Global leaderboard showing top 10 citizens

---

## Phase 3: AI-Powered Backend Logic

### Duplicate Detection (Edge Function)
- On new issue submission, query existing issues within 100m radius + same category
- Use Lovable AI (Gemini) to compare descriptions for semantic similarity
- If duplicate found: merge as new report, increment count, award points
- If unique: create new issue, calculate initial priority score

### Priority Score Engine (Edge Function)
- Formula: (report_count × 2) + severity + days_unresolved + upvote_count
- Recalculated on: new report, new upvote
- Labels: Low (0-5), Medium (6-10), High (11-15), Critical (16+)
- Scheduled recalculation via pg_cron every hour

### Escalation Logic (pg_cron + Edge Function)
- Hourly job checks issues past their department's SLA hours
- Auto-sets status to "Escalated", creates status log
- Creates notification for admin users
- Highlighted in red across all dashboards

---

## Phase 4: Authority Dashboard

### Priority Issue Queue
- Issues assigned to authority's department, sorted by priority score
- Live SLA countdown timer per issue (time remaining before escalation)
- Color-coded priority badges
- Filter by status (Open, In Progress, Escalated, Resolved)

### Issue Actions
- Status change dropdown (In Progress → Resolved)
- Upload proof/resolution image
- Each action creates a status log entry + triggers notifications

### Performance Stats
- Resolution rate percentage
- Average resolution time
- Number of escalated vs resolved issues

---

## Phase 5: Admin Dashboard

### Analytics Overview
- Total issues, resolved %, avg resolution time, escalation rate
- All computed live from database queries

### Map Visualization
- Leaflet map showing all issues as color-coded markers (by priority)
- Click marker to see issue summary popup
- Heatmap layer toggle using issue coordinates

### Department Performance Table
- Each department's total issues, resolved count, avg time, SLA compliance rate

### Escalated Issues Panel
- List of all currently escalated issues with department and time overdue

### Top Citizens Leaderboard
- Top 10 citizens by civic points with breakdown

---

## Phase 6: Notifications & Real-Time

### Notification System
- Bell icon in header with unread count badge
- Dropdown showing recent notifications
- Notifications triggered on: issue assigned, escalated, resolved, upvote milestones (5, 10, 25, 50)
- Supabase Realtime subscription for live updates

---

## Phase 7: Seed Data & Polish

### Seed Script
- 3 departments (Roads, Water, Sanitation) with different SLA hours
- 10 users (7 citizens, 2 authorities, 1 admin)
- 50 issues with varied statuses, locations, categories, and priorities
- Associated upvotes, status logs, and points entries
- Makes dashboards look realistic immediately

### UI Polish
- Modern civic-themed color scheme (blues/greens)
- Responsive design for all dashboards
- Loading skeletons, error states, empty state messages
- Toast notifications for all user actions


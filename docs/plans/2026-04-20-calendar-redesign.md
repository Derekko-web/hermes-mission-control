# Mission Control Calendar Redesign Implementation Plan

> **For Hermes:** Use subagent-driven-development skill to implement this plan task-by-task.

**Goal:** Rebuild the Mission Control calendar view so it visually matches the provided dark reference screenshot while continuing to render our own scheduled-item data from Convex.

**Architecture:** Keep the Convex-backed data/occurrence derivation logic in `MissionControlCalendarView.tsx`, but extract a pure presentational calendar layout component that can be tested with static markup. Redesign the shell styling and calendar sections around compact dark panels, a thin top utility row, a weekly card grid, an always-running strip, and a quieter Next Up list.

**Tech Stack:** Next.js App Router, React 19, Tailwind CSS v4 utility classes, Convex data hooks, node:test + react-dom/server markup tests.

---

### Task 1: Add a testable presentation boundary

**Objective:** Create a pure calendar layout component that accepts already-derived data and can be verified with static render tests.

**Files:**
- Create: `src/components/mission-control/MissionControlCalendarLayout.tsx`
- Modify: `src/components/mission-control/MissionControlCalendarView.tsx`
- Test: `tests/mission-control-calendar-layout.test.tsx`

**Step 1: Write failing test**
Create a render test that expects the new layout to include:
- `Scheduled Tasks`
- `Always Running`
- `Week`
- `Today`
- weekday labels `Sun` through `Sat`
- `Next Up`
- a highlighted selected-day class hook
- compact event-card class hooks

**Step 2: Run test to verify failure**
Run: `node --import tsx --test tests/mission-control-calendar-layout.test.tsx`
Expected: FAIL because `MissionControlCalendarLayout` does not exist yet.

**Step 3: Write minimal implementation**
Create the layout component with prop-driven rendering for:
- top utility row
- heading block
- always-running card
- weekly columns
- next-up list

**Step 4: Run test to verify pass**
Run: `node --import tsx --test tests/mission-control-calendar-layout.test.tsx`
Expected: PASS

---

### Task 2: Re-skin the calendar view around the reference composition

**Objective:** Replace the current metric-heavy layout with the tighter dashboard composition from the screenshot.

**Files:**
- Modify: `src/components/mission-control/MissionControlCalendarView.tsx`
- Modify: `src/components/mission-control/MissionControlShell.tsx`
- Modify: `src/app/globals.css`

**Step 1: Keep data logic, simplify chrome**
Preserve:
- week occurrence derivation
- upcoming items derivation
- observed item handling
- composer mutation flow

Remove or reduce:
- large metrics strip
- oversized hero copy
- footer/status block

**Step 2: Apply the new visual structure**
Implement:
- compact utility row with search-like/status pills
- `Scheduled Tasks` heading + short subtitle
- `Always Running` strip with one or more observed-item pills
- seven rounded day cards with small event blocks and a selected current-day treatment
- compact `Next Up` list with right-aligned relative times

**Step 3: Update shell styling to better match the reference**
Tighten:
- sidebar width
- nav density
- card radii and border contrast
- main background gradients so the calendar page feels closer to the reference screenshot

**Step 4: Run targeted test**
Run: `node --import tsx --test tests/mission-control-calendar-layout.test.tsx`
Expected: PASS

---

### Task 3: Verify build and refresh the running app

**Objective:** Confirm the redesign compiles and that the live PM2-served Mission Control page reflects it.

**Files:**
- No source changes unless verification fails

**Step 1: Run quality checks**
Run:
- `npm run lint`
- `npm run build`

Expected: both pass

**Step 2: Restart web app**
Run: `pm2 restart hermes-mission-control-web --update-env`
Expected: process restarts cleanly

**Step 3: Verify the live page**
Check `http://127.0.0.1:4322/mission-control/calendar` and confirm the HTML/chunks include:
- `Scheduled Tasks`
- `Always Running`
- `Next Up`
- the updated compact week-grid styling hooks

---

### Verification Checklist

- [ ] Calendar heading and top controls visually match the reference hierarchy
- [ ] Week grid uses seven independent rounded day cards
- [ ] Event blocks are compact tinted bars with title + time
- [ ] Current day has a subtle accent highlight
- [ ] Always-running items appear above the week grid
- [ ] Next Up appears as a compact list below the week grid
- [ ] Convex-backed data still drives all calendar content
- [ ] Lint/build/tests pass

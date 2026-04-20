# Mission Control Memory Redesign Implementation Plan

> **For Hermes:** Use subagent-driven-development skill to implement this plan task-by-task.

**Goal:** Rebuild the Mission Control Memory view so it visually matches the provided dark reference screenshot while continuing to render our own memory and journal documents from Convex.

**Architecture:** Keep the Convex-backed selection, search, and grouping logic in `MissionControlMemoryView.tsx`, but extract a pure presentational memory layout component that can be tested with static render output. Redesign the UI into a compact three-panel composition: shell sidebar, memory browser column, and reader surface, using our own journal/memory data and preserving the user’s no-placeholder-tools rule.

**Tech Stack:** Next.js App Router, React 19, Tailwind CSS v4 utilities, Convex realtime queries, node:test + react-dom/server markup tests.

---

### Task 1: Add a testable presentation boundary

**Objective:** Create a pure layout component for the redesigned memory screen so the visual structure can be validated independently of Convex hooks.

**Files:**
- Create: `src/components/mission-control/MissionControlMemoryLayout.tsx`
- Modify: `src/components/mission-control/MissionControlMemoryView.tsx`
- Test: `tests/mission-control-memory-layout.test.tsx`

**Step 1: Write failing test**
Create a render test that expects the new layout to include:
- top utility controls (`Search`, `Pause`, `Ping Codex`)
- memory browser search input with `Search memory…`
- a pinned `Long-Term Memory` card
- a `DAILY JOURNAL` section label
- grouped journal rows
- a reader panel title and modified timestamp
- structural hooks like `data-slot="memory-browser-panel"`, `data-slot="memory-reader-panel"`, and `data-slot="memory-entry-block"`

**Step 2: Run test to verify failure**
Run: `node --import tsx --test tests/mission-control-memory-layout.test.tsx`
Expected: FAIL because `MissionControlMemoryLayout` does not exist yet.

**Step 3: Write minimal implementation**
Create the layout component with prop-driven rendering for:
- compact top utility row
- memory browser/search column
- pinned memory card
- grouped journal/document rows
- reader header and content sections

**Step 4: Run test to verify pass**
Run: `node --import tsx --test tests/mission-control-memory-layout.test.tsx`
Expected: PASS

---

### Task 2: Rework memory data shaping and reader styling

**Objective:** Transform the current bulky metrics/cards layout into the tighter notebook/journal browser shown in the reference.

**Files:**
- Modify: `src/components/mission-control/MissionControlMemoryView.tsx`
- Modify: `src/app/globals.css` (only if additional subtle animation/styling hooks are needed)

**Step 1: Reshape view models**
Derive:
- pinned long-term memory card data
- grouped journal rows by relative periods (`Yesterday`, `This Week`, `This Month`, etc.)
- optional non-journal memory groups using the same list-row treatment
- selected reader header/meta data

**Step 2: Redesign the reader content**
Update document rendering so memory/journal content reads like the reference:
- compact reader surface with subtle border
- strong document title + metadata
- accent-colored subsection headings / note blocks
- smaller, calmer body copy and metadata

**Step 3: Preserve constraints**
Do **not** reintroduce placeholder sidebar tools or badge labels (`Soon`, `Live`). Keep the redesign scoped to Memory content surfaces and use only our own memory data.

**Step 4: Run targeted tests**
Run: `node --import tsx --test tests/mission-control-memory-layout.test.tsx tests/mission-control-shell.test.tsx`
Expected: PASS

---

### Task 3: Verify build and refresh the running app

**Objective:** Confirm the redesign compiles and that the PM2-served Memory page reflects the update.

**Files:**
- No source changes unless verification fails

**Step 1: Run quality checks**
Run:
- `npm run lint`
- `npm run build`

Expected: both pass

**Step 2: Restart the web app**
Run: `pm2 restart hermes-mission-control-web --update-env`
Expected: process restarts cleanly

**Step 3: Verify the live page**
Check `http://127.0.0.1:4322/mission-control/memory` and confirm the HTML/chunks include:
- `Search memory…`
- `Long-Term Memory`
- `DAILY JOURNAL`
- `Journal:` reader title
- the new structural hooks and compact panel styling

---

### Verification Checklist

- [ ] Memory page uses a compact browser + reader composition like the reference
- [ ] Search input, pinned memory card, journal group labels, and selected row styling are present
- [ ] Reader surface matches the dark notebook aesthetic with subtle borders and accent headings
- [ ] Only explicit Mission Control tools remain in the main sidebar
- [ ] Tests, lint, and build pass
- [ ] Live PM2-served Memory page reflects the redesign

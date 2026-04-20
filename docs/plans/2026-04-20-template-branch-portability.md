# Mission Control Template Branch Portability Plan

> **For Hermes:** Use subagent-driven-development skill to implement this plan task-by-task.

**Goal:** Turn the `template` branch into a portable Mission Control starter that works for other Hermes setups without Codex-specific hardcoding.

**Architecture:** Centralize all workspace-specific operator labels, roster entries, and starter content in one shared template module. Generalize Convex schema + seed functions to use string-based owner/assignee identifiers, then update UI components to consume the shared template config instead of fixed enum/name maps.

**Tech Stack:** Next.js 16, React 19, TypeScript, Convex local backend, Node test runner via `node --import tsx --test`

---

### Task 1: Add failing tests for config-driven template data

**Objective:** Prove the template branch uses shared config instead of fixed Codex-only roster assumptions.

**Files:**
- Modify: `tests/mission-control-team-roster.test.ts`
- Modify: `tests/mission-control-team-layout.test.tsx`
- Create: `tests/mission-control-template-config.test.ts`

**Step 1: Write failing test**
- Assert shared template config exposes a primary operator and reusable operator IDs.
- Assert team roster is derived from template config rather than expecting `Codex`, `McClintock`, `Confucius`, `Banach`, `Lorentz`.
- Assert the team layout can render arbitrary operator names from config.

**Step 2: Run test to verify failure**
Run: `node --import tsx --test tests/mission-control-template-config.test.ts tests/mission-control-team-roster.test.ts tests/mission-control-team-layout.test.tsx`
Expected: FAIL because the shared template config does not exist yet and tests still expect old hardcoded names.

### Task 2: Introduce shared workspace template config

**Objective:** Create one source of truth for workspace/operator identity and starter seed content.

**Files:**
- Create: `shared/missionControlTemplate.ts`
- Modify: `shared/missionControlTeam.ts`

**Step 1: Write minimal implementation**
- Add template config with workspace title, user/system labels, operator roster, task assignee options, schedule owner options, and starter seed builders.
- Rename `takesFromCodex` to a generic field such as `focusAreas`.
- Make `buildDefaultTeamRoster()` read from the shared template config.

**Step 2: Run tests to verify pass**
Run: `node --import tsx --test tests/mission-control-template-config.test.ts tests/mission-control-team-roster.test.ts tests/mission-control-team-layout.test.tsx`
Expected: PASS

### Task 3: Generalize Convex schema and seed functions

**Objective:** Remove fixed assignee/owner enums and inject template-driven starter data.

**Files:**
- Modify: `convex/schema.ts`
- Modify: `convex/tasks.ts`
- Modify: `convex/scheduledItems.ts`
- Modify: `convex/teamMembers.ts`
- Modify: `convex/officePresence.ts`
- Modify: `convex/memories.ts`

**Step 1: Write failing test**
- Add/modify tests that expect task assignees and scheduled item owners to accept template-configured IDs and template-driven seed content.

**Step 2: Run test to verify failure**
Run: `node --import tsx --test tests/mission-control-task-mutations.test.ts tests/mission-control-office-state.test.ts`
Expected: FAIL because schema and seed builders still use fixed Codex-specific values.

**Step 3: Write minimal implementation**
- Change task assignee / schedule owner schema fields from fixed unions to `v.string()`.
- Replace repo-specific starter schedules/memories with template-friendly Mission Control starter content.
- Use shared config builders for default team roster, office presence, starter tasks, and starter memories.

**Step 4: Run tests to verify pass**
Run: `node --import tsx --test tests/mission-control-task-mutations.test.ts tests/mission-control-office-state.test.ts`
Expected: PASS

### Task 4: Update Mission Control UI to consume template config

**Objective:** Remove fixed UI label maps/options and render template-driven operator metadata.

**Files:**
- Modify: `src/components/mission-control/MissionControlTasksView.tsx`
- Modify: `src/components/mission-control/MissionControlCalendarView.tsx`
- Modify: `src/components/mission-control/MissionControlTeamView.tsx`
- Modify: `src/components/mission-control/MissionControlHermesView.tsx`
- Modify: `src/components/mission-control/MissionControlCalendarLayout.tsx` (if needed)

**Step 1: Write failing test**
- Add/adjust tests so assignee filters/options, team cards, and Hermes user labels come from the shared template config.

**Step 2: Run test to verify failure**
Run: `node --import tsx --test tests/mission-control-task-card.test.tsx tests/mission-control-task-editor.test.tsx tests/mission-control-calendar-layout.test.tsx tests/mission-control-hermes-layout.test.tsx`
Expected: FAIL because UI still uses hardcoded labels and IDs.

**Step 3: Write minimal implementation**
- Replace fixed assignee/owner arrays and label maps with shared config lookups.
- Keep visual styling but derive label/avatar/accent from config.
- Use generic helper functions with sensible fallback for unknown IDs.

**Step 4: Run tests to verify pass**
Run: `node --import tsx --test tests/mission-control-task-card.test.tsx tests/mission-control-task-editor.test.tsx tests/mission-control-calendar-layout.test.tsx tests/mission-control-hermes-layout.test.tsx`
Expected: PASS

### Task 5: Document and publish template branch

**Objective:** Make the branch usable by other Hermes operators.

**Files:**
- Modify: `README.md`
- Modify: `.gitignore` (only if needed)

**Step 1: Update docs**
- Explain that `template` is the branch for portable setups.
- Document the single shared template file people should edit for names/roles/default starter content.

**Step 2: Verify project health**
Run:
- `npx convex codegen`
- `node --import tsx --test tests/mission-control-template-config.test.ts tests/mission-control-team-roster.test.ts tests/mission-control-team-layout.test.tsx tests/mission-control-task-mutations.test.ts tests/mission-control-office-state.test.ts tests/mission-control-hermes-layout.test.tsx tests/mission-control-calendar-layout.test.tsx`
- `npm run lint`
- `npm run build`

Expected: all pass

**Step 3: Publish branch**
Run:
- `git add shared convex src tests README.md docs/plans/2026-04-20-template-branch-portability.md`
- `git commit -m "feat: add portable mission control template branch"`
- `git push -u origin template`

Expected: remote branch `origin/template` exists and tracks local `template`

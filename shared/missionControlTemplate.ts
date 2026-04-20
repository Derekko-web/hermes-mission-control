export type RecurringTeamDiscipline = "developer" | "writer" | "designer";
export type RecurringTeamMemberType = "core_agent" | "subagent";
export type RecurringTeamState = "observed" | "formalized";
export type RecurringTeamCadence = "always_on" | "regular" | "on_demand";
export type RecurringTeamColor = "indigo" | "amber" | "emerald" | "rose" | "cyan" | "violet";
export type OfficeStatus = "working" | "writing" | "designing" | "reviewing" | "monitoring" | "idle";
export type OfficeArea =
  | "north_station"
  | "west_station"
  | "south_station"
  | "east_station"
  | "northeast_station"
  | "lounge";

export type TemplateIdentityMeta = {
  id: string;
  label: string;
  avatarLabel: string;
  color: RecurringTeamColor;
  avatarClassName: string;
  avatarText: string;
};

export type TemplateOperator = {
  id: string;
  label: string;
  roleTitle: string;
  summary: string;
  tagline: string;
  discipline: RecurringTeamDiscipline;
  memberType: RecurringTeamMemberType;
  state: RecurringTeamState;
  cadence: RecurringTeamCadence;
  color: RecurringTeamColor;
  avatarLabel: string;
  responsibilities: string[];
  focusAreas: string[];
  keywordHints: string[];
  sourceLabel: string;
  officePresence: {
    status: OfficeStatus;
    area: OfficeArea;
    currentTask: string;
    statusNote: string;
    activeTool: string;
    isAtDesk: boolean;
    lastUpdatedOffsetMs: number;
  };
};

export type DefaultTeamMember = {
  name: string;
  roleTitle: string;
  summary: string;
  tagline: string;
  discipline: RecurringTeamDiscipline;
  memberType: RecurringTeamMemberType;
  state: RecurringTeamState;
  cadence: RecurringTeamCadence;
  color: RecurringTeamColor;
  avatarLabel: string;
  responsibilities: string[];
  focusAreas: string[];
  sourceLabel: string;
  lastObservedAt: number;
  sortOrder: number;
  createdAt: number;
  updatedAt: number;
};

export const TEAM_DISCIPLINE_META: Record<
  RecurringTeamDiscipline,
  {
    label: string;
    summary: string;
  }
> = {
  developer: {
    label: "Developers",
    summary: "Architecture reconnaissance, implementation, debugging, and local validation.",
  },
  writer: {
    label: "Writers",
    summary: "Plans, explanations, docs, release notes, and user-facing copy polish.",
  },
  designer: {
    label: "Designers",
    summary: "References, layout direction, interaction critique, and final interface polish.",
  },
};

function titleCase(value: string) {
  return value
    .split(/[-_\s]+/)
    .filter(Boolean)
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ");
}

export const IDENTITY_META = {
  you: {
    id: "you",
    label: "You",
    avatarLabel: "Y",
    color: "emerald",
    avatarClassName: "bg-emerald-400/15 text-emerald-200 ring-1 ring-emerald-400/15",
    avatarText: "Y",
  },
  system: {
    id: "system",
    label: "System",
    avatarLabel: "◎",
    color: "indigo",
    avatarClassName: "bg-indigo-400/15 text-indigo-200 ring-1 ring-indigo-400/15",
    avatarText: "◎",
  },
  unassigned: {
    id: "unassigned",
    label: "Unassigned",
    avatarLabel: "U",
    color: "indigo",
    avatarClassName: "bg-white/8 text-zinc-300 ring-1 ring-white/10",
    avatarText: "U",
  },
} as const satisfies Record<string, TemplateIdentityMeta>;

export const MISSION_CONTROL_TEMPLATE = {
  workspaceTitle: "Mission Control",
  workspaceSubtitle: "Portable Hermes workspace template",
  primaryOperator: {
    id: "lead",
    label: "Lead Operator",
    roleTitle: "Primary Agent",
    summary:
      "Owns delivery, routes work through specialist lanes, and turns the local Hermes setup into one coherent operating surface.",
    tagline: "I turn mission intent into finished work.",
    discipline: "developer",
    memberType: "core_agent",
    state: "observed",
    cadence: "always_on",
    color: "amber",
    avatarLabel: "L",
    responsibilities: [
      "Own the user-facing outcome from first request to final verification.",
      "Delegate deep work to the right specialist lane when speed or perspective matters.",
      "Keep tasks, schedules, and memory aligned across the workspace.",
    ],
    focusAreas: ["Planning", "Execution", "Integration"],
    keywordHints: ["lead", "operator", "ship", "launch", "workspace"],
    sourceLabel: "Template default primary operator",
    officePresence: {
      status: "working",
      area: "south_station",
      currentTask: "Customize the portable workspace template",
      statusNote: "Adapting Mission Control to the local Hermes setup.",
      activeTool: "Mission Control",
      isAtDesk: true,
      lastUpdatedOffsetMs: 0,
    },
  },
  operators: [
    {
      id: "lead",
      label: "Lead Operator",
      roleTitle: "Primary Agent",
      summary:
        "Owns delivery, routes work through specialist lanes, and turns the local Hermes setup into one coherent operating surface.",
      tagline: "I turn mission intent into finished work.",
      discipline: "developer",
      memberType: "core_agent",
      state: "observed",
      cadence: "always_on",
      color: "amber",
      avatarLabel: "L",
      responsibilities: [
        "Own the user-facing outcome from first request to final verification.",
        "Delegate deep work to the right specialist lane when speed or perspective matters.",
        "Keep tasks, schedules, and memory aligned across the workspace.",
      ],
      focusAreas: ["Planning", "Execution", "Integration"],
      keywordHints: ["lead", "operator", "ship", "launch", "workspace"],
      sourceLabel: "Template default primary operator",
      officePresence: {
        status: "working",
        area: "south_station",
        currentTask: "Customize the portable workspace template",
        statusNote: "Adapting Mission Control to the local Hermes setup.",
        activeTool: "Mission Control",
        isAtDesk: true,
        lastUpdatedOffsetMs: 0,
      },
    },
    {
      id: "architect",
      label: "Architecture Scout",
      roleTitle: "Systems Scout",
      summary:
        "Maps file boundaries, dependency edges, and migration risk before implementation starts moving.",
      tagline: "I map the terrain before code starts moving.",
      discipline: "developer",
      memberType: "subagent",
      state: "observed",
      cadence: "regular",
      color: "emerald",
      avatarLabel: "A",
      responsibilities: [
        "Trace repo boundaries before edits begin.",
        "Frame tradeoffs and migration risk.",
        "Keep the portable template adaptable instead of brittle.",
      ],
      focusAreas: ["Recon", "Boundaries", "Risk"],
      keywordHints: ["architecture", "schema", "boundary", "migration", "infrastructure"],
      sourceLabel: "Template default architecture specialist",
      officePresence: {
        status: "monitoring",
        area: "north_station",
        currentTask: "Map local repo boundaries",
        statusNote: "Checking where custom setup values should live.",
        activeTool: "Codebase",
        isAtDesk: true,
        lastUpdatedOffsetMs: 3 * 60_000,
      },
    },
    {
      id: "builder",
      label: "Implementation Engineer",
      roleTitle: "Implementation Engineer",
      summary:
        "Turns scoped intent into concrete code, fixes, and glue logic without losing the architectural thread.",
      tagline: "I turn scoped intent into reliable implementation.",
      discipline: "developer",
      memberType: "subagent",
      state: "formalized",
      cadence: "regular",
      color: "cyan",
      avatarLabel: "I",
      responsibilities: [
        "Build and refactor production code safely.",
        "Wire reusable workspace configuration into the UI.",
        "Verify behavior with focused local tests.",
      ],
      focusAreas: ["Build", "Fixes", "Tests"],
      keywordHints: ["build", "calendar", "task", "chat", "feature", "fix"],
      sourceLabel: "Template default implementation specialist",
      officePresence: {
        status: "reviewing",
        area: "west_station",
        currentTask: "Wire config-driven UI",
        statusNote: "Checking that reusable operators render consistently.",
        activeTool: "Verification",
        isAtDesk: true,
        lastUpdatedOffsetMs: 6 * 60_000,
      },
    },
    {
      id: "writer",
      label: "Writer Specialist",
      roleTitle: "Writer Specialist",
      summary:
        "Sharpens setup notes, memory documents, and interface copy so the workspace is easy to customize.",
      tagline: "I make the message clearer, tighter, and easier to ship.",
      discipline: "writer",
      memberType: "subagent",
      state: "formalized",
      cadence: "regular",
      color: "violet",
      avatarLabel: "W",
      responsibilities: [
        "Document how to customize the template.",
        "Keep setup memory concise and useful.",
        "Polish UI copy so it reads like an operating system, not scaffolding.",
      ],
      focusAreas: ["Docs", "Voice", "Clarity"],
      keywordHints: ["docs", "memory", "copy", "summary", "notes"],
      sourceLabel: "Template default writing specialist",
      officePresence: {
        status: "writing",
        area: "east_station",
        currentTask: "Document local setup notes",
        statusNote: "Keeping starter docs and memory entries easy to edit.",
        activeTool: "Docs",
        isAtDesk: true,
        lastUpdatedOffsetMs: 4 * 60_000,
      },
    },
    {
      id: "designer",
      label: "Product Designer",
      roleTitle: "Product Designer",
      summary:
        "Pushes layout clarity, visual hierarchy, and interaction polish so the template still feels production-ready.",
      tagline: "I push layouts toward clarity, polish, and confidence.",
      discipline: "designer",
      memberType: "subagent",
      state: "formalized",
      cadence: "regular",
      color: "rose",
      avatarLabel: "D",
      responsibilities: [
        "Translate a custom operator roster into coherent UI.",
        "Keep the portable branch visually polished.",
        "Refine hierarchy, spacing, and interaction details.",
      ],
      focusAreas: ["Layout", "Polish", "Direction"],
      keywordHints: ["design", "layout", "visual", "polish", "office", "team"],
      sourceLabel: "Template default product design specialist",
      officePresence: {
        status: "designing",
        area: "northeast_station",
        currentTask: "Polish portable workspace shell",
        statusNote: "Keeping the template branch presentable for new Hermes operators.",
        activeTool: "Design System",
        isAtDesk: true,
        lastUpdatedOffsetMs: 2 * 60_000,
      },
    },
  ] as TemplateOperator[],
} as const;

export const TASK_ASSIGNEE_OPTIONS = [
  IDENTITY_META.you,
  ...MISSION_CONTROL_TEMPLATE.operators.map((operator) => ({
    id: operator.id,
    label: operator.label,
    avatarLabel: operator.avatarLabel,
    color: operator.color,
    avatarClassName: accentClassName(operator.color),
    avatarText: operator.avatarLabel,
  })),
  IDENTITY_META.unassigned,
] as const satisfies readonly TemplateIdentityMeta[];

export const SCHEDULE_OWNER_OPTIONS = [
  IDENTITY_META.you,
  ...MISSION_CONTROL_TEMPLATE.operators.map((operator) => ({
    id: operator.id,
    label: operator.label,
    avatarLabel: operator.avatarLabel,
    color: operator.color,
    avatarClassName: accentClassName(operator.color),
    avatarText: operator.avatarLabel,
  })),
  IDENTITY_META.system,
] as const satisfies readonly TemplateIdentityMeta[];

function accentClassName(color: RecurringTeamColor) {
  switch (color) {
    case "amber":
      return "bg-amber-400/15 text-amber-200 ring-1 ring-amber-400/15";
    case "cyan":
      return "bg-cyan-400/15 text-cyan-200 ring-1 ring-cyan-400/15";
    case "emerald":
      return "bg-emerald-400/15 text-emerald-200 ring-1 ring-emerald-400/15";
    case "indigo":
      return "bg-indigo-400/15 text-indigo-200 ring-1 ring-indigo-400/15";
    case "rose":
      return "bg-rose-400/15 text-rose-200 ring-1 ring-rose-400/15";
    case "violet":
      return "bg-violet-400/15 text-violet-200 ring-1 ring-violet-400/15";
  }
}

function optionById(options: readonly TemplateIdentityMeta[]) {
  return new Map(options.map((option) => [option.id, option]));
}

const taskAssigneeMetaById = optionById(TASK_ASSIGNEE_OPTIONS);
const scheduleOwnerMetaById = optionById(SCHEDULE_OWNER_OPTIONS);

export function getTaskAssigneeMeta(id: string): TemplateIdentityMeta {
  const exact = taskAssigneeMetaById.get(id);
  if (exact) {
    return exact;
  }

  const label = titleCase(id);
  return {
    id,
    label,
    avatarLabel: label.charAt(0).toUpperCase() || "?",
    color: "indigo",
    avatarClassName: IDENTITY_META.unassigned.avatarClassName,
    avatarText: label.charAt(0).toUpperCase() || "?",
  };
}

export function getScheduleOwnerMeta(id: string): TemplateIdentityMeta {
  return scheduleOwnerMetaById.get(id) ?? getTaskAssigneeMeta(id);
}

function getOperator(id: string) {
  return MISSION_CONTROL_TEMPLATE.operators.find((operator) => operator.id === id);
}

export function buildDefaultTeamRoster(now = Date.now()): DefaultTeamMember[] {
  const formalizedAt = Date.parse("2026-04-20T00:00:00Z");
  const observedAt = Date.parse("2026-04-20T00:10:00Z");

  return MISSION_CONTROL_TEMPLATE.operators.map((operator, index) => ({
    name: operator.label,
    roleTitle: operator.roleTitle,
    summary: operator.summary,
    tagline: operator.tagline,
    discipline: operator.discipline,
    memberType: operator.memberType,
    state: operator.state,
    cadence: operator.cadence,
    color: operator.color,
    avatarLabel: operator.avatarLabel,
    responsibilities: operator.responsibilities,
    focusAreas: operator.focusAreas,
    sourceLabel: operator.sourceLabel,
    lastObservedAt: operator.state === "formalized" ? formalizedAt : observedAt,
    sortOrder: (index + 1) * 10,
    createdAt: now,
    updatedAt: now,
  }));
}

export function buildStarterTasks(now = Date.now()) {
  return [
    {
      title: "Map the local Hermes environment",
      description: "Inspect repo boundaries and confirm which values should live in the shared template config.",
      status: "done" as const,
      assignee: "architect",
      priority: "high" as const,
      project: MISSION_CONTROL_TEMPLATE.workspaceTitle,
      createdBy: "system",
      createdAt: now - 1000 * 60 * 48,
      updatedAt: now - 1000 * 60 * 6,
    },
    {
      title: "Customize the operator roster",
      description: "Rename the starter operators in shared/missionControlTemplate.ts to match the local Hermes workflow.",
      status: "in_progress" as const,
      assignee: "lead",
      priority: "high" as const,
      project: MISSION_CONTROL_TEMPLATE.workspaceTitle,
      createdBy: "system",
      createdAt: now - 1000 * 60 * 40,
      updatedAt: now - 1000 * 60 * 4,
    },
    {
      title: "Wire recurring jobs into Calendar",
      description: "Track real local cron jobs and recurring routines so the schedule is visible in one place.",
      status: "backlog" as const,
      assignee: "builder",
      priority: "medium" as const,
      project: MISSION_CONTROL_TEMPLATE.workspaceTitle,
      createdBy: "system",
      createdAt: now - 1000 * 60 * 35,
      updatedAt: now - 1000 * 60 * 3,
    },
    {
      title: "Document local operating notes in Memory",
      description: "Capture durable setup decisions, workflow rules, and repo-specific context in searchable memory entries.",
      status: "backlog" as const,
      assignee: "writer",
      priority: "medium" as const,
      project: MISSION_CONTROL_TEMPLATE.workspaceTitle,
      createdBy: "system",
      createdAt: now - 1000 * 60 * 30,
      updatedAt: now - 1000 * 60 * 2,
    },
    {
      title: "Polish the workspace shell for handoff",
      description: "Keep the template visually tight after local labels, operators, and schedules are customized.",
      status: "backlog" as const,
      assignee: "designer",
      priority: "medium" as const,
      project: MISSION_CONTROL_TEMPLATE.workspaceTitle,
      createdBy: "system",
      createdAt: now - 1000 * 60 * 24,
      updatedAt: now - 1000 * 60,
    },
  ];
}

export function buildStarterScheduledItems(now = Date.now()) {
  return [
    {
      title: "Daily workspace review",
      description: "A daily check-in for active tasks, schedules, and memory notes in the local Hermes workspace.",
      kind: "scheduled_task" as const,
      owner: "lead",
      cadence: "daily" as const,
      color: "indigo" as const,
      project: MISSION_CONTROL_TEMPLATE.workspaceTitle,
      sourcePath: "shared/missionControlTemplate.ts",
      command: "Review the Tasks, Calendar, and Memory surfaces.",
      anchorAt: Date.parse("2026-04-20T15:00:00Z"),
      dayOfWeek: undefined,
      timeMinutes: 15 * 60,
      durationMinutes: 20,
      lastObservedAt: undefined,
      isActive: true,
      createdAt: now - 1000 * 60 * 40,
      updatedAt: now - 1000 * 60 * 4,
    },
    {
      title: "Weekly template sync",
      description: "A recurring reminder to keep workspace labels, operators, and starter content aligned with the local Hermes setup.",
      kind: "cron_job" as const,
      owner: "system",
      cadence: "weekly" as const,
      color: "amber" as const,
      project: MISSION_CONTROL_TEMPLATE.workspaceTitle,
      sourcePath: "README.md",
      command: "git fetch origin && review template customizations",
      anchorAt: Date.parse("2026-04-20T16:30:00Z"),
      dayOfWeek: 1,
      timeMinutes: 16 * 60 + 30,
      durationMinutes: 45,
      lastObservedAt: undefined,
      isActive: true,
      createdAt: now - 1000 * 60 * 35,
      updatedAt: now - 1000 * 60 * 3,
    },
    {
      title: "Observed Hermes health check",
      description: "Represents runtime activity that confirms the local Hermes environment is still processing work.",
      kind: "observed_automation" as const,
      owner: "builder",
      cadence: "observed" as const,
      color: "emerald" as const,
      project: MISSION_CONTROL_TEMPLATE.workspaceTitle,
      sourcePath: "src/app/mission-control",
      command: "Observe runtime activity in the local Hermes environment",
      anchorAt: undefined,
      dayOfWeek: undefined,
      timeMinutes: undefined,
      durationMinutes: 10,
      lastObservedAt: Date.parse("2026-04-20T14:12:00Z"),
      isActive: true,
      createdAt: now - 1000 * 60 * 30,
      updatedAt: now - 1000 * 60 * 2,
    },
  ];
}

export function buildStarterMemories(now = Date.now()) {
  const leadLabel = MISSION_CONTROL_TEMPLATE.primaryOperator.label;

  return [
    {
      title: "Long-Term Memory",
      summary: "Mission Control is the shared operating system for work, schedules, and durable context.",
      content: `# Working Agreements

Mission Control is the shared operating surface for your Hermes setup.

- Edit shared/missionControlTemplate.ts before you do anything else.
- Rename ${leadLabel} and the specialist lanes so the roster matches your real workflow.
- Keep active work on the Tasks board, recurring jobs on Calendar, and durable notes in Memory.

# Architecture

- Frontend: Next.js app with dedicated Mission Control routes under /src/app/mission-control.
- Database: local Convex deployment for realtime updates across tools.
- Template source: shared/missionControlTemplate.ts controls starter operators and default seed content.`,
      kind: "long_term" as const,
      color: "violet" as const,
      tags: ["mission-control", "template", "workflow", "realtime"],
      sourcePath: "shared/missionControlTemplate.ts",
      documentDate: now,
      pinned: true,
      createdAt: now - 1000 * 60 * 30,
      updatedAt: now - 1000 * 60 * 2,
    },
    {
      title: "Template Setup Journal",
      summary: "Starter journal entry for converting the portable branch into a local Hermes workspace.",
      content: `# Today

The portable Mission Control template was initialized for a new Hermes environment.

- The starter roster is intentionally generic.
- Tasks, Calendar, and Memory should all be customized from the shared template file.
- Once local jobs and operators are known, replace the starter content with real entries.

# Next Direction

Confirm operator labels, wire local schedules into Calendar, and update Memory with real working agreements.`,
      kind: "journal" as const,
      color: "indigo" as const,
      tags: ["journal", "template", "setup"],
      sourcePath: "README.md",
      documentDate: Date.parse("2026-04-20T00:00:00Z"),
      pinned: false,
      createdAt: now - 1000 * 60 * 24,
      updatedAt: now - 1000 * 60,
    },
    {
      title: "Mission Control Decisions",
      summary: "Portable branch decisions that keep the workspace configurable instead of vendor-specific.",
      content: `# Product Decisions

- Operator names should come from shared/missionControlTemplate.ts, not hardcoded model names.
- Realtime state belongs in Convex so Tasks, Calendar, and Memory stay live.
- The starter branch should be safe to clone for Claude Code, RC Trinity, or any other Hermes-compatible setup.

# UX Rules

- Density is good, but hierarchy should stay clear.
- Keep labels easy to replace without breaking the shell.
- Default copy should explain how to customize instead of pretending to be real production data.`,
      kind: "decision" as const,
      color: "amber" as const,
      tags: ["decisions", "product", "template"],
      sourcePath: "shared/missionControlTemplate.ts",
      documentDate: now,
      pinned: false,
      createdAt: now - 1000 * 60 * 18,
      updatedAt: now - 1000 * 60 * 4,
    },
    {
      title: "Calendar Starter Reference",
      summary: "Why the portable template ships with minimal starter schedules and how to replace them.",
      content: `# Scheduled Automations

The starter schedule entries are examples meant to be replaced with real local routines.

- Daily workspace review is a placeholder for your normal check-in cadence.
- Weekly template sync reminds you to keep the template aligned with the real Hermes setup.
- Observed Hermes health check is a lightweight runtime placeholder until real automations are tracked.

# Rule

Any real cron job or scheduled task should replace these starter items as soon as it exists.`,
      kind: "reference" as const,
      color: "emerald" as const,
      tags: ["calendar", "template", "automation"],
      sourcePath: "convex/scheduledItems.ts",
      documentDate: now,
      pinned: false,
      createdAt: now - 1000 * 60 * 15,
      updatedAt: now - 1000 * 60 * 3,
    },
  ];
}

export function buildTemplateOfficePresence(now = Date.now()) {
  return MISSION_CONTROL_TEMPLATE.operators.map((operator) => ({
    memberName: operator.label,
    status: operator.officePresence.status,
    area: operator.officePresence.area,
    currentTask: operator.officePresence.currentTask,
    statusNote: operator.officePresence.statusNote,
    activeTool: operator.officePresence.activeTool,
    isAtDesk: operator.officePresence.isAtDesk,
    lastUpdatedAt: now - operator.officePresence.lastUpdatedOffsetMs,
    createdAt: now,
    updatedAt: now,
  }));
}

export function inferTemplateAssignee(title: string, description?: string) {
  const haystack = `${title} ${description ?? ""}`.toLowerCase();
  for (const operator of MISSION_CONTROL_TEMPLATE.operators.filter((candidate) => candidate.id !== MISSION_CONTROL_TEMPLATE.primaryOperator.id)) {
    if (operator.keywordHints.some((hint) => haystack.includes(hint))) {
      return operator.id;
    }
  }
  return MISSION_CONTROL_TEMPLATE.primaryOperator.id;
}

export function getLeadLabel() {
  return getOperator(MISSION_CONTROL_TEMPLATE.primaryOperator.id)?.label ?? MISSION_CONTROL_TEMPLATE.primaryOperator.label;
}

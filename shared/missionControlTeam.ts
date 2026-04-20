export type RecurringTeamDiscipline = "developer" | "writer" | "designer";
export type RecurringTeamMemberType = "core_agent" | "subagent";
export type RecurringTeamState = "observed" | "formalized";
export type RecurringTeamCadence = "always_on" | "regular" | "on_demand";
export type RecurringTeamColor = "indigo" | "amber" | "emerald" | "rose" | "cyan" | "violet";

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
  takesFromCodex: string[];
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

export function buildDefaultTeamRoster(now = Date.now()): DefaultTeamMember[] {
  const formalizedAt = Date.parse("2026-04-20T00:00:00Z");
  const observedAt = Date.parse("2026-04-20T00:10:00Z");

  return [
    {
      name: "Codex",
      roleTitle: "Mission Lead",
      summary:
        "Owns delivery across Mission Control, decides when to delegate, and stitches every specialist lane back into one shippable result.",
      tagline: "I turn mission intent into completed work.",
      discipline: "developer",
      memberType: "core_agent",
      state: "observed",
      cadence: "always_on",
      color: "amber",
      avatarLabel: "C",
      responsibilities: [
        "Own the user-facing outcome from first request to final verification.",
        "Delegate deep work to the right specialist when speed, depth, or perspective matters.",
        "Merge code, writing, and design into one coherent deliverable.",
      ],
      takesFromCodex: ["Planning", "Execution", "Integration"],
      sourceLabel: "Observed as the primary operating agent",
      lastObservedAt: observedAt,
      sortOrder: 10,
      createdAt: now,
      updatedAt: now,
    },
    {
      name: "McClintock",
      roleTitle: "Architecture Scout",
      summary:
        "Explores repo boundaries, dependency edges, and hidden coupling before implementation starts moving.",
      tagline: "I map the terrain before code starts moving.",
      discipline: "developer",
      memberType: "subagent",
      state: "observed",
      cadence: "regular",
      color: "emerald",
      avatarLabel: "M",
      responsibilities: [
        "Map likely file boundaries and implementation surfaces.",
        "Trace dependencies and hidden risk before edits begin.",
        "Frame tradeoffs so Codex can choose a safe path quickly.",
      ],
      takesFromCodex: ["Repo reconnaissance", "Dependency tracing", "Refactor planning"],
      sourceLabel: "Observed in the recurring development subagent roster",
      lastObservedAt: observedAt,
      sortOrder: 20,
      createdAt: now,
      updatedAt: now,
    },
    {
      name: "Confucius",
      roleTitle: "Implementation Engineer",
      summary:
        "Turns scoped work into concrete code, fixes, tests, and glue logic without losing the architectural thread.",
      tagline: "I turn scoped intent into reliable implementation.",
      discipline: "developer",
      memberType: "subagent",
      state: "formalized",
      cadence: "regular",
      color: "cyan",
      avatarLabel: "C",
      responsibilities: [
        "Build and refactor production code safely.",
        "Diagnose regressions and implement test-backed fixes.",
        "Verify behavior with focused local validation.",
      ],
      takesFromCodex: ["Feature implementation", "Bug fixing", "Tests"],
      sourceLabel: "Formalized as the recurring implementation specialist",
      lastObservedAt: formalizedAt,
      sortOrder: 30,
      createdAt: now,
      updatedAt: now,
    },
    {
      name: "Banach",
      roleTitle: "Writer Specialist",
      summary:
        "Sharpens messaging, docs, and summaries so the final output is crisp, human, and technically honest.",
      tagline: "I make the message clearer, tighter, and easier to ship.",
      discipline: "writer",
      memberType: "subagent",
      state: "formalized",
      cadence: "regular",
      color: "violet",
      avatarLabel: "B",
      responsibilities: [
        "Turn technical work into readable explanations and plans.",
        "Tighten tone, structure, and narrative flow.",
        "Polish docs, summaries, release notes, and UI copy.",
      ],
      takesFromCodex: ["Docs polishing", "Summaries", "UI copy"],
      sourceLabel: "Formalized as the recurring writing specialist",
      lastObservedAt: formalizedAt,
      sortOrder: 40,
      createdAt: now,
      updatedAt: now,
    },
    {
      name: "Lorentz",
      roleTitle: "Product Designer",
      summary:
        "Translates intent into polished interfaces with stronger hierarchy, better spacing, and cleaner interaction decisions.",
      tagline: "I push layouts toward clarity, polish, and confidence.",
      discipline: "designer",
      memberType: "subagent",
      state: "formalized",
      cadence: "regular",
      color: "rose",
      avatarLabel: "L",
      responsibilities: [
        "Push visual hierarchy, spacing, and interaction clarity.",
        "Translate references into implementation-ready UI direction.",
        "Help frontends land with better polish and coherence.",
      ],
      takesFromCodex: ["UI critique", "Layout refinement", "Polish"],
      sourceLabel: "Formalized as the recurring product design specialist",
      lastObservedAt: formalizedAt,
      sortOrder: 50,
      createdAt: now,
      updatedAt: now,
    },
  ];
}

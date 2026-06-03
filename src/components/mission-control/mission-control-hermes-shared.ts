export type HermesLayoutThread = {
  id: string;
  title: string;
  active: boolean;
  officeAgentName?: string;
  officeAgentRoleTitle?: string;
};

export type HermesOfficeAgentOption = {
  id: string;
  name: string;
  roleTitle: string;
};

export type HermesLayoutAttachment = {
  id: string;
  kind: "file" | "image";
  name: string;
  sizeLabel: string;
  previewUrl?: string;
};

export type HermesLayoutMessage = {
  id: string;
  role: "user" | "assistant" | "system";
  author: string;
  createdAtLabel: string;
  content: string;
  attachments: HermesLayoutAttachment[];
};

export const HERMES_REASONING_OPTIONS = ["none", "minimal", "low", "medium", "high", "xhigh"] as const;
export type HermesReasoningEffort = (typeof HERMES_REASONING_OPTIONS)[number];

export type HermesSlashCommand = {
  id: string;
  label: string;
  description: string;
  aliases?: string[];
};

export type HermesModelOption = {
  id: string;
  label: string;
  providerLabel: string;
  supportsReasoning: boolean;
  supportsFastMode: boolean;
  reasoningOptions: HermesReasoningEffort[];
};

export const DEFAULT_HERMES_MODEL_ID = "gpt-5.4";
export const DEFAULT_HERMES_REASONING_EFFORT: HermesReasoningEffort = "xhigh";
export const DEFAULT_HERMES_FAST_MODE_ENABLED = true;

export const HERMES_MODEL_OPTIONS: HermesModelOption[] = [
  {
    id: "gpt-5.4",
    label: "GPT-5.4",
    providerLabel: "OpenAI Codex",
    supportsReasoning: true,
    supportsFastMode: true,
    reasoningOptions: [...HERMES_REASONING_OPTIONS],
  },
  {
    id: "gpt-5.4-mini",
    label: "GPT-5.4 Mini",
    providerLabel: "OpenAI Codex",
    supportsReasoning: true,
    supportsFastMode: true,
    reasoningOptions: [...HERMES_REASONING_OPTIONS],
  },
  {
    id: "claude-opus-4.7",
    label: "Claude Opus 4.7",
    providerLabel: "Anthropic",
    supportsReasoning: true,
    supportsFastMode: false,
    reasoningOptions: ["minimal", "low", "medium", "high", "xhigh"],
  },
  {
    id: "claude-sonnet-4.6",
    label: "Claude Sonnet 4.6",
    providerLabel: "Anthropic",
    supportsReasoning: true,
    supportsFastMode: true,
    reasoningOptions: ["minimal", "low", "medium", "high", "xhigh"],
  },
  {
    id: "claude-code",
    label: "Claude Code",
    providerLabel: "Anthropic",
    supportsReasoning: false,
    supportsFastMode: false,
    reasoningOptions: [],
  },
  {
    id: "arcee-ai/trinity-mini",
    label: "Trinity Mini",
    providerLabel: "Arcee AI",
    supportsReasoning: false,
    supportsFastMode: false,
    reasoningOptions: [],
  },
  {
    id: "arcee-ai/trinity-large-thinking",
    label: "Trinity Large Thinking",
    providerLabel: "Arcee AI",
    supportsReasoning: true,
    supportsFastMode: false,
    reasoningOptions: ["minimal", "low", "medium", "high", "xhigh"],
  },
];

export const HERMES_SLASH_COMMANDS: HermesSlashCommand[] = [
  { id: "new", label: "/new", aliases: ["/reset"], description: "Fresh session." },
  { id: "clear", label: "/clear", description: "Clear the screen and start a fresh session." },
  { id: "retry", label: "/retry", description: "Resend the last message." },
  { id: "undo", label: "/undo", description: "Remove the last exchange." },
  { id: "title", label: "/title", description: "Name the current session." },
  { id: "compress", label: "/compress", description: "Manually compress context." },
  { id: "stop", label: "/stop", description: "Kill background processes." },
  { id: "rollback", label: "/rollback", description: "Restore a filesystem checkpoint." },
  { id: "background", label: "/background", description: "Run a prompt in the background." },
  { id: "queue", label: "/queue", description: "Queue a prompt for the next turn." },
  { id: "resume", label: "/resume", description: "Resume a named session." },
  { id: "config", label: "/config", description: "Show configuration." },
  { id: "model", label: "/model", description: "Show or change the active model." },
  { id: "provider", label: "/provider", description: "Show provider info." },
  { id: "personality", label: "/personality", description: "Set the personality." },
  { id: "reasoning", label: "/reasoning", description: "Set the reasoning level." },
  { id: "verbose", label: "/verbose", description: "Cycle verbosity modes." },
  { id: "voice", label: "/voice", description: "Toggle voice mode." },
  { id: "yolo", label: "/yolo", description: "Toggle approval bypass." },
  { id: "skin", label: "/skin", description: "Change the CLI theme." },
  { id: "statusbar", label: "/statusbar", description: "Toggle the status bar." },
  { id: "tools", label: "/tools", description: "Manage tools." },
  { id: "toolsets", label: "/toolsets", description: "List toolsets." },
  { id: "skills", label: "/skills", description: "Search and install skills." },
  { id: "skill", label: "/skill", description: "Load a skill into the session." },
  { id: "cron", label: "/cron", description: "Manage cron jobs." },
  { id: "reload-mcp", label: "/reload-mcp", description: "Reload MCP servers." },
  { id: "plugins", label: "/plugins", description: "List plugins." },
  { id: "approve", label: "/approve", description: "Approve a pending command." },
  { id: "deny", label: "/deny", description: "Deny a pending command." },
  { id: "restart", label: "/restart", description: "Restart the gateway." },
  { id: "sethome", label: "/sethome", description: "Set the current chat as the home channel." },
  { id: "update", label: "/update", description: "Update Hermes to the latest version." },
  { id: "platforms", label: "/platforms", aliases: ["/gateway"], description: "Show platform connection status." },
  { id: "branch", label: "/branch", aliases: ["/fork"], description: "Branch the current session." },
  { id: "btw", label: "/btw", description: "Ask an ephemeral side question." },
  { id: "fast", label: "/fast", description: "Toggle priority and fast processing." },
  { id: "browser", label: "/browser", description: "Open the browser connection." },
  { id: "history", label: "/history", description: "Show conversation history." },
  { id: "save", label: "/save", description: "Save the conversation to a file." },
  { id: "paste", label: "/paste", description: "Attach the clipboard image." },
  { id: "image", label: "/image", description: "Attach a local image file." },
  { id: "help", label: "/help", description: "Show commands." },
  { id: "commands", label: "/commands", description: "Browse all commands." },
  { id: "usage", label: "/usage", description: "Show token usage." },
  { id: "insights", label: "/insights", description: "Show usage analytics." },
  { id: "status", label: "/status", description: "Show session info." },
  { id: "profile", label: "/profile", description: "Show the active profile." },
  { id: "quit", label: "/quit", aliases: ["/exit", "/q"], description: "Exit the session." },
];

export function formatHermesAttachmentSize(sizeBytes: number): string {
  if (sizeBytes < 1024) {
    return `${sizeBytes} B`;
  }

  if (sizeBytes < 1024 * 1024) {
    return `${Math.round(sizeBytes / 1024)} KB`;
  }

  return `${(sizeBytes / (1024 * 1024)).toFixed(1)} MB`;
}

export function findHermesModelOption(modelId?: string | null): HermesModelOption {
  return (
    HERMES_MODEL_OPTIONS.find((option) => option.id === modelId) ??
    HERMES_MODEL_OPTIONS.find((option) => option.id === DEFAULT_HERMES_MODEL_ID) ??
    HERMES_MODEL_OPTIONS[0]
  );
}

export function getHermesReasoningOptions(modelId?: string | null): HermesReasoningEffort[] {
  const option = findHermesModelOption(modelId);
  return option.supportsReasoning ? option.reasoningOptions : [];
}

export function normalizeHermesThreadSettings(settings: {
  modelId?: string | null;
  reasoningEffort?: HermesReasoningEffort | null | undefined;
  fastModeEnabled?: boolean | null | undefined;
}) {
  const model = findHermesModelOption(settings.modelId);
  const reasoningOptions = getHermesReasoningOptions(model.id);
  const defaultReasoning = reasoningOptions.includes(DEFAULT_HERMES_REASONING_EFFORT)
    ? DEFAULT_HERMES_REASONING_EFFORT
    : (reasoningOptions.at(-1) ?? null);
  const reasoningEffort = model.supportsReasoning
    ? reasoningOptions.includes((settings.reasoningEffort ?? "") as HermesReasoningEffort)
      ? ((settings.reasoningEffort ?? null) as HermesReasoningEffort)
      : defaultReasoning
    : null;
  const fastModeEnabled = model.supportsFastMode
    ? Boolean(
        settings.fastModeEnabled ??
          (model.id === DEFAULT_HERMES_MODEL_ID ? DEFAULT_HERMES_FAST_MODE_ENABLED : false),
      )
    : false;

  return {
    modelId: model.id,
    reasoningEffort,
    fastModeEnabled,
  };
}

export function findHermesSlashCommands(draft: string): HermesSlashCommand[] {
  if (!draft.startsWith("/")) {
    return [];
  }

  const query = draft.trim().toLowerCase();
  return HERMES_SLASH_COMMANDS.filter((command) =>
    [command.label, ...(command.aliases ?? [])].some((entry) => entry.toLowerCase().startsWith(query)),
  );
}

export function applyHermesSlashCommand(_draft: string, command: HermesSlashCommand): string {
  return `${command.label} `;
}

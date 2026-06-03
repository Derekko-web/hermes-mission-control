type BuildHermesChatArgsOptions = {
  content: string;
  modelId?: string | null;
  sessionId?: string | null;
  source?: string;
  maxTurns?: number;
};

export type HermesAgentPromptContext = {
  name: string;
  roleTitle: string;
  summary?: string;
  responsibilities?: readonly string[];
};

export function buildHermesAgentPromptContent({
  content,
  agent,
}: {
  content: string;
  agent?: HermesAgentPromptContext | null;
}) {
  if (!agent) {
    return content;
  }

  const userContent = content.trim() || "The user shared attachments without additional text.";
  const responsibilities = (agent.responsibilities ?? []).slice(0, 3);

  return [
    "Mission Control Office agent binding:",
    `- Respond as ${agent.name}, the Office agent whose role is ${agent.roleTitle}.`,
    agent.summary ? `- Agent summary: ${agent.summary}` : null,
    responsibilities.length > 0 ? `- Responsibilities: ${responsibilities.join("; ")}` : null,
    "- Stay in this Office-agent role while keeping normal Hermes capabilities available.",
    "",
    "User request:",
    userContent,
  ]
    .filter((line): line is string => line !== null)
    .join("\n");
}

export function buildHermesChatArgs({
  content,
  modelId,
  sessionId,
  source = "mission-control-hermes",
  maxTurns = 90,
}: BuildHermesChatArgsOptions) {
  const args = [
    "chat",
    "-q",
    content,
    "-Q",
    "--source",
    source,
    "--max-turns",
    String(maxTurns),
  ];

  if (modelId) {
    args.push("-m", modelId);
  }

  if (sessionId) {
    args.push("--resume", sessionId);
  }

  return args;
}

export function parseHermesChatOutput(output: string) {
  const normalized = output.replace(/\u001b\[[0-9;]*m/g, "").trim();
  const match = normalized.match(/session_id:\s*(\S+)\s*\n([\s\S]*)$/);

  if (!match) {
    throw new Error("Hermes output is missing session_id.");
  }

  const response = match[2]
    .replace(/^↻ Resumed session .*$/m, "")
    .trim();

  return {
    sessionId: match[1],
    response,
  };
}

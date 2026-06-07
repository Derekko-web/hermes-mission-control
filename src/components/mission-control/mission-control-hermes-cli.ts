type BuildHermesChatArgsOptions = {
  content: string;
  modelId?: string | null;
  sessionId?: string | null;
  source?: string;
  maxTurns?: number;
};

export const HERMES_FINAL_RESPONSE_START = "<<<MISSION_CONTROL_FINAL_RESPONSE>>>";
export const HERMES_FINAL_RESPONSE_END = "<<<END_MISSION_CONTROL_FINAL_RESPONSE>>>";

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
    "- Return only the user-facing final answer. Do not include reasoning panels, hidden reasoning, tool transcript decorations, or status banners.",
    "",
    "User request:",
    userContent,
  ]
    .filter((line): line is string => line !== null)
    .join("\n");
}

export function buildHermesCliPromptContent(content: string) {
  return [
    "Mission Control response protocol:",
    `- Put the final user-facing answer between ${HERMES_FINAL_RESPONSE_START} and ${HERMES_FINAL_RESPONSE_END}.`,
    "- Text outside those markers may be discarded by Mission Control.",
    "- Do not put reasoning panels, hidden reasoning, tool transcript decorations, or status banners inside the final answer.",
    "",
    content.trim() || "The user shared attachments without additional text.",
  ].join("\n");
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

function extractMarkedHermesFinalResponse(response: string) {
  const match = response.match(
    /<<<MISSION_CONTROL_FINAL_RESPONSE>>>\s*([\s\S]*?)\s*<<<END_MISSION_CONTROL_FINAL_RESPONSE>>>/,
  );

  return match?.[1]?.trim();
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
    response: extractMarkedHermesFinalResponse(response) ?? response,
  };
}

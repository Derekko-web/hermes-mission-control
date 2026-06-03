"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import type { ChangeEvent, ClipboardEvent, FormEvent, KeyboardEvent } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { useQuery } from "convex/react";

import type { Doc, Id } from "../../../convex/_generated/dataModel";
import { api } from "../../../convex/_generated/api";
import { MissionControlHermesLayout } from "./MissionControlHermesLayout";
import {
  applyHermesSlashCommand,
  findHermesModelOption,
  findHermesSlashCommands,
  formatHermesAttachmentSize,
  getHermesReasoningOptions,
  HERMES_MODEL_OPTIONS,
  normalizeHermesThreadSettings,
  type HermesLayoutAttachment,
  type HermesLayoutMessage,
  type HermesOfficeAgentOption,
  type HermesReasoningEffort,
} from "./mission-control-hermes-shared";

type HermesThreadDoc = Doc<"hermesThreads">;
type HermesMessageDoc = Doc<"hermesMessages">;
type TeamMemberDoc = Doc<"teamMembers">;

type HermesSendResult = {
  inserted: number;
  threadId: Id<"hermesThreads"> | null;
  userMessageId?: Id<"hermesMessages">;
  assistantMessageId?: Id<"hermesMessages">;
};

type HermesSendRouteResponse = {
  messages: HermesMessageDoc[];
  sendResult: HermesSendResult;
  threadId: Id<"hermesThreads">;
  threads: HermesThreadDoc[];
};

type HermesCreateThreadRouteResponse = {
  threadId: Id<"hermesThreads">;
  threads: HermesThreadDoc[];
};

type HermesMessagesRouteResponse = {
  messages: HermesMessageDoc[];
};

type HermesDeleteThreadRouteResponse = {
  threads: HermesThreadDoc[];
};

type HermesUpdateSettingsRouteResponse = {
  thread: HermesThreadDoc;
  threads: HermesThreadDoc[];
};

type PendingHermesAttachment = HermesLayoutAttachment & {
  mimeType: string;
  sizeBytes: number;
  dataUrl?: string;
};

const EMPTY_THREADS: HermesThreadDoc[] = [];
const EMPTY_MESSAGES: HermesMessageDoc[] = [];
const EMPTY_TEAM_MEMBERS: TeamMemberDoc[] = [];
const MAX_ATTACHMENTS = 6;
const MAX_IMAGE_BYTES = 2_000_000;

const relativeTimeFormat = new Intl.RelativeTimeFormat("en", { numeric: "auto" });

function formatRelativeTime(timestamp: number) {
  const diff = timestamp - Date.now();
  const minute = 60_000;
  const hour = 60 * minute;
  const day = 24 * hour;

  if (Math.abs(diff) < minute) {
    return "just now";
  }
  if (Math.abs(diff) < hour) {
    return relativeTimeFormat.format(Math.round(diff / minute), "minute");
  }
  if (Math.abs(diff) < day) {
    return relativeTimeFormat.format(Math.round(diff / hour), "hour");
  }

  return relativeTimeFormat.format(Math.round(diff / day), "day");
}

function readFileAsDataUrl(file: File) {
  return new Promise<string>((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      if (typeof reader.result === "string") {
        resolve(reader.result);
        return;
      }

      reject(new Error("Unable to read attachment."));
    };
    reader.onerror = () => reject(reader.error ?? new Error("Unable to read attachment."));
    reader.readAsDataURL(file);
  });
}

async function toPendingHermesAttachment(file: File) {
  const name = file.name || (file.type.startsWith("image/") ? `pasted-image-${Date.now()}.png` : `attachment-${Date.now()}`);
  const isImage = file.type.startsWith("image/");
  const shouldPreview = isImage && file.size <= MAX_IMAGE_BYTES;
  const previewUrl = shouldPreview ? await readFileAsDataUrl(file) : undefined;

  return {
    id: `${name}-${file.lastModified || Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
    kind: isImage ? "image" : "file",
    name,
    mimeType: file.type || "application/octet-stream",
    sizeBytes: file.size,
    sizeLabel: formatHermesAttachmentSize(file.size),
    previewUrl,
    dataUrl: previewUrl,
  } satisfies PendingHermesAttachment;
}

function extractClipboardFiles(event: ClipboardEvent<HTMLTextAreaElement>) {
  const clipboardFiles = Array.from(event.clipboardData.files ?? []);
  if (clipboardFiles.length > 0) {
    return clipboardFiles;
  }

  return Array.from(event.clipboardData.items ?? [])
    .filter((item) => item.kind === "file")
    .map((item) => item.getAsFile())
    .filter((file): file is File => file !== null);
}

function mapMessageAttachment(message: HermesMessageDoc): HermesLayoutAttachment[] {
  return (message.attachments ?? []).map((attachment, index) => ({
    id: `${message._id}-attachment-${index}`,
    kind: attachment.kind,
    name: attachment.name,
    sizeLabel: formatHermesAttachmentSize(attachment.sizeBytes),
    previewUrl: attachment.dataUrl,
  }));
}

async function createHermesThreadViaServer(officeAgentId?: Id<"teamMembers"> | null) {
  const response = await fetch("/api/mission-control/hermes/thread", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      officeAgentId: officeAgentId ?? undefined,
    }),
  });

  if (!response.ok) {
    throw new Error("Unable to create Hermes chat.");
  }

  return (await response.json()) as HermesCreateThreadRouteResponse;
}

async function updateHermesThreadSettingsViaServer(args: {
  threadId: Id<"hermesThreads">;
  modelId: string;
  reasoningEffort: HermesReasoningEffort | null;
  fastModeEnabled: boolean;
  officeAgentId?: Id<"teamMembers"> | null;
}) {
  const response = await fetch(`/api/mission-control/hermes/thread/${args.threadId}`, {
    method: "PATCH",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      ...args,
      officeAgentId: args.officeAgentId ?? undefined,
    }),
  });

  if (!response.ok) {
    throw new Error("Unable to update Hermes thread settings.");
  }

  return (await response.json()) as HermesUpdateSettingsRouteResponse;
}

async function deleteHermesThreadViaServer(threadId: Id<"hermesThreads">) {
  const response = await fetch(`/api/mission-control/hermes/thread/${threadId}`, {
    method: "DELETE",
  });

  if (!response.ok) {
    throw new Error("Unable to delete Hermes chat.");
  }

  return (await response.json()) as HermesDeleteThreadRouteResponse;
}

async function fetchHermesMessagesViaServer(threadId: Id<"hermesThreads">) {
  const response = await fetch(`/api/mission-control/hermes/thread/${threadId}/messages`);

  if (!response.ok) {
    throw new Error("Unable to load Hermes messages.");
  }

  return (await response.json()) as HermesMessagesRouteResponse;
}

async function sendHermesMessageViaServer(args: {
  threadId?: Id<"hermesThreads">;
  officeAgentId?: Id<"teamMembers"> | null;
  content: string;
  attachments: {
    kind: "image" | "file";
    name: string;
    mimeType: string;
    sizeBytes: number;
    dataUrl?: string;
  }[];
}) {
  const response = await fetch("/api/mission-control/hermes/send", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify(args),
  });

  if (!response.ok) {
    throw new Error("Unable to send Hermes message.");
  }

  return (await response.json()) as HermesSendRouteResponse;
}

export function MissionControlHermesView({
  initialThreads,
  initialTeamMembers,
}: {
  initialThreads: HermesThreadDoc[];
  initialTeamMembers: TeamMemberDoc[];
}) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const threadsQuery = useQuery(api.hermesThreads.listThreads);
  const teamMembersQuery = useQuery(api.teamMembers.list);
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  const [selectedThreadId, setSelectedThreadId] = useState<Id<"hermesThreads"> | null>(null);
  const [selectedOfficeAgentId, setSelectedOfficeAgentId] = useState<Id<"teamMembers"> | null>(
    () => initialTeamMembers[0]?._id ?? null,
  );
  const [draft, setDraft] = useState("");
  const [pendingAttachments, setPendingAttachments] = useState<PendingHermesAttachment[]>([]);
  const [fallbackThreads, setFallbackThreads] = useState<HermesThreadDoc[] | null>(null);
  const [fallbackMessagesByThread, setFallbackMessagesByThread] = useState<Record<string, HermesMessageDoc[]>>({});
  const [optimisticMessages, setOptimisticMessages] = useState<HermesLayoutMessage[]>([]);
  const [streamingAssistantMessageId, setStreamingAssistantMessageId] = useState<string | null>(null);
  const [isSending, setIsSending] = useState(false);

  const messagesQuery = useQuery(
    api.hermesThreads.listMessages,
    selectedThreadId ? { threadId: selectedThreadId } : "skip",
  );

  const threads = threadsQuery ?? fallbackThreads ?? initialThreads ?? EMPTY_THREADS;
  const requestedThreadId = searchParams.get("thread") as Id<"hermesThreads"> | null;
  const teamMembers = teamMembersQuery ?? initialTeamMembers ?? EMPTY_TEAM_MEMBERS;
  const fallbackMessages = selectedThreadId ? (fallbackMessagesByThread[selectedThreadId] ?? EMPTY_MESSAGES) : EMPTY_MESSAGES;
  const messages = messagesQuery ?? fallbackMessages;
  const activeThread = useMemo(
    () => threads.find((thread) => thread._id === selectedThreadId) ?? null,
    [selectedThreadId, threads],
  );
  const activeThreadSettings = useMemo(
    () =>
      normalizeHermesThreadSettings({
        modelId: activeThread?.modelId,
        reasoningEffort: activeThread?.reasoningEffort ?? null,
        fastModeEnabled: activeThread?.fastModeEnabled,
      }),
    [activeThread?.fastModeEnabled, activeThread?.modelId, activeThread?.reasoningEffort],
  );
  const [selectedModelId, setSelectedModelId] = useState(activeThreadSettings.modelId);
  const [selectedReasoningEffort, setSelectedReasoningEffort] = useState<HermesReasoningEffort | null>(
    activeThreadSettings.reasoningEffort,
  );
  const [fastModeEnabled, setFastModeEnabled] = useState(activeThreadSettings.fastModeEnabled);
  const slashCommands = useMemo(() => findHermesSlashCommands(draft), [draft]);
  const baseOfficeAgentOptions = useMemo<HermesOfficeAgentOption[]>(
    () =>
      teamMembers.map((member) => ({
        id: member._id,
        name: member.name,
        roleTitle: member.roleTitle,
      })),
    [teamMembers],
  );
  const activeThreadOfficeAgentOption = useMemo<HermesOfficeAgentOption | null>(() => {
    if (!activeThread?.officeAgentId) {
      return null;
    }

    return {
      id: activeThread.officeAgentId,
      name: activeThread.officeAgentName ?? "Office agent",
      roleTitle: activeThread.officeAgentRoleTitle ?? "Agent",
    };
  }, [activeThread]);
  const officeAgentOptions = useMemo(() => {
    if (
      !activeThreadOfficeAgentOption ||
      baseOfficeAgentOptions.some((agent) => agent.id === activeThreadOfficeAgentOption.id)
    ) {
      return baseOfficeAgentOptions;
    }

    return [...baseOfficeAgentOptions, activeThreadOfficeAgentOption];
  }, [activeThreadOfficeAgentOption, baseOfficeAgentOptions]);
  const officeAgentsById = useMemo(
    () => new Map(officeAgentOptions.map((agent) => [agent.id, agent])),
    [officeAgentOptions],
  );
  const defaultOfficeAgentId = (officeAgentOptions[0]?.id as Id<"teamMembers"> | undefined) ?? null;

  useEffect(() => {
    if (!requestedThreadId) {
      return;
    }

    if (selectedThreadId === requestedThreadId) {
      return;
    }

    const requestedThreadExists = threads.some((thread) => thread._id === requestedThreadId);
    if (!requestedThreadExists) {
      return;
    }

    setSelectedThreadId(requestedThreadId);
    setDraft("");
    setPendingAttachments([]);
  }, [requestedThreadId, selectedThreadId, threads]);

  useEffect(() => {
    if (!selectedThreadId) {
      return;
    }

    const authoritativeThreads = threadsQuery ?? fallbackThreads ?? initialThreads ?? EMPTY_THREADS;
    const stillExists = authoritativeThreads.some((thread) => thread._id === selectedThreadId);
    if (!stillExists) {
      setSelectedThreadId(null);
    }
  }, [fallbackThreads, initialThreads, selectedThreadId, threadsQuery]);

  useEffect(() => {
    setSelectedOfficeAgentId(activeThread?.officeAgentId ?? defaultOfficeAgentId);
  }, [activeThread?._id, activeThread?.officeAgentId, defaultOfficeAgentId]);

  useEffect(() => {
    if (!selectedThreadId) {
      return;
    }

    if (messagesQuery) {
      return;
    }

    if (selectedThreadId in fallbackMessagesByThread) {
      return;
    }

    void (async () => {
      const response = await fetchHermesMessagesViaServer(selectedThreadId);
      setFallbackMessagesByThread((current) => ({
        ...current,
        [selectedThreadId]: response.messages,
      }));
    })();
  }, [fallbackMessagesByThread, messagesQuery, selectedThreadId]);

  useEffect(() => {
    setSelectedModelId(activeThreadSettings.modelId);
    setSelectedReasoningEffort(activeThreadSettings.reasoningEffort);
    setFastModeEnabled(activeThreadSettings.fastModeEnabled);
  }, [
    activeThread?._id,
    activeThreadSettings.fastModeEnabled,
    activeThreadSettings.modelId,
    activeThreadSettings.reasoningEffort,
  ]);

  async function addPendingFiles(files: File[]) {
    if (files.length === 0) {
      return;
    }

    const nextAttachments = await Promise.all(files.slice(0, MAX_ATTACHMENTS).map((file) => toPendingHermesAttachment(file)));
    setPendingAttachments((current) => {
      const remainingSlots = Math.max(0, MAX_ATTACHMENTS - current.length);
      if (remainingSlots === 0) {
        return current;
      }

      return [...current, ...nextAttachments.slice(0, remainingSlots)].slice(0, MAX_ATTACHMENTS);
    });
  }

  async function persistThreadSettings(nextSettings: {
    modelId: string;
    reasoningEffort: HermesReasoningEffort | null;
    fastModeEnabled: boolean;
    officeAgentId?: Id<"teamMembers"> | null;
  }) {
    const normalized = normalizeHermesThreadSettings(nextSettings);
    setSelectedModelId(normalized.modelId);
    setSelectedReasoningEffort(normalized.reasoningEffort);
    setFastModeEnabled(normalized.fastModeEnabled);
    const officeAgentId = nextSettings.officeAgentId ?? selectedOfficeAgentId ?? defaultOfficeAgentId ?? undefined;

    if (!selectedThreadId) {
      return;
    }

    const response = await updateHermesThreadSettingsViaServer({
      threadId: selectedThreadId,
      modelId: normalized.modelId,
      reasoningEffort: normalized.reasoningEffort,
      fastModeEnabled: normalized.fastModeEnabled,
      officeAgentId,
    });

    setFallbackThreads(response.threads);
  }

  async function handleOfficeAgentChange(officeAgentId: string) {
    const typedOfficeAgentId = officeAgentId as Id<"teamMembers">;
    setSelectedOfficeAgentId(typedOfficeAgentId);

    if (!selectedThreadId) {
      return;
    }

    await persistThreadSettings({
      modelId: selectedModelId,
      reasoningEffort: selectedReasoningEffort,
      fastModeEnabled,
      officeAgentId: typedOfficeAgentId,
    });
  }

  function submitHermesMessage(content: string, attachments: PendingHermesAttachment[]) {
    const attachmentsPayload = attachments.map((attachment) => ({
      kind: attachment.kind,
      name: attachment.name,
      mimeType: attachment.mimeType,
      sizeBytes: attachment.sizeBytes,
      dataUrl: attachment.dataUrl,
    }));
    const optimisticMessage: HermesLayoutMessage = {
      id: `optimistic-user-${Date.now()}`,
      role: "user",
      author: "You",
      content,
      createdAtLabel: "sending",
      attachments: attachments.map((attachment) => ({
        id: attachment.id,
        kind: attachment.kind,
        name: attachment.name,
        sizeLabel: attachment.sizeLabel,
        previewUrl: attachment.previewUrl,
      })),
    };

    setOptimisticMessages([optimisticMessage]);
    setStreamingAssistantMessageId(null);
    setDraft("");
    setPendingAttachments([]);
    setIsSending(true);

    const officeAgentId = selectedOfficeAgentId ?? defaultOfficeAgentId ?? undefined;
    const threadId = selectedThreadId ?? undefined;

    void (async () => {
      try {
        const response = await sendHermesMessageViaServer({
          threadId,
          officeAgentId,
          content,
          attachments: attachmentsPayload,
        });

        setFallbackThreads(response.threads);
        setFallbackMessagesByThread((current) => ({
          ...current,
          [response.threadId]: response.messages,
        }));
        setSelectedThreadId(response.sendResult.threadId ?? null);
        setStreamingAssistantMessageId(response.sendResult.assistantMessageId ?? null);
      } finally {
        setOptimisticMessages([]);
        setIsSending(false);
      }
    })();
  }

  function handleSendMessage(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    const content = draft.trim();
    if (!content && pendingAttachments.length === 0) {
      return;
    }

    submitHermesMessage(content, pendingAttachments);
  }

  function handleVoiceMessageSubmit(message: string) {
    if (isSending) {
      return;
    }

    submitHermesMessage(message, []);
  }

  async function handleDeleteThread(threadId: string) {
    const typedThreadId = threadId as Id<"hermesThreads">;
    const response = await deleteHermesThreadViaServer(typedThreadId);

    if (typedThreadId === selectedThreadId) {
      setSelectedThreadId(null);
      setStreamingAssistantMessageId(null);
      setDraft("");
      setPendingAttachments([]);
    }

    setFallbackThreads(response.threads);
    setFallbackMessagesByThread((current) => {
      const next = { ...current };
      delete next[typedThreadId];
      return next;
    });
  }

  function handleThreadSelect(threadId: string) {
    const typedThreadId = threadId as Id<"hermesThreads">;
    setStreamingAssistantMessageId(null);
    setSelectedThreadId(typedThreadId);
    setDraft("");
    setPendingAttachments([]);
    router.replace(`/mission-control/hermes?thread=${typedThreadId}`);
  }

  function handleDraftKeyDown(event: KeyboardEvent<HTMLTextAreaElement>) {
    if (event.key === "Tab" && slashCommands.length > 0) {
      event.preventDefault();
      setDraft(applyHermesSlashCommand(draft, slashCommands[0]));
      return;
    }

    if (event.key === "Enter" && !event.shiftKey) {
      event.preventDefault();
      event.currentTarget.form?.requestSubmit();
    }
  }

  async function handleDraftPaste(event: ClipboardEvent<HTMLTextAreaElement>) {
    const files = extractClipboardFiles(event);
    if (files.length === 0) {
      return;
    }

    event.preventDefault();
    await addPendingFiles(files);
  }

  async function handleFileSelection(event: ChangeEvent<HTMLInputElement>) {
    const files = Array.from(event.target.files ?? []);
    await addPendingFiles(files);
    event.target.value = "";
  }

  const mappedMessages: HermesLayoutMessage[] = messages.map((message) => ({
    id: message._id,
    role: message.role,
    author: message.author,
    content: message.content,
    createdAtLabel: formatRelativeTime(message.createdAt),
    attachments: mapMessageAttachment(message),
  }));
  const displayedMessages = optimisticMessages.length > 0 ? [...mappedMessages, ...optimisticMessages] : mappedMessages;
  const selectedModel = findHermesModelOption(selectedModelId);
  const availableReasoningOptions = getHermesReasoningOptions(selectedModelId);
  const showReasoningControl = selectedModel.supportsReasoning;
  const showFastModeToggle = selectedModel.supportsFastMode;
  const selectedOfficeAgent = selectedOfficeAgentId ? officeAgentsById.get(selectedOfficeAgentId) : null;

  return (
    <>
      <MissionControlHermesLayout
        threads={threads.map((thread) => ({
          id: thread._id,
          title: thread.title,
          active: thread._id === selectedThreadId,
          officeAgentName:
            (thread.officeAgentId ? officeAgentsById.get(thread.officeAgentId)?.name : null) ??
            thread.officeAgentName,
          officeAgentRoleTitle:
            (thread.officeAgentId ? officeAgentsById.get(thread.officeAgentId)?.roleTitle : null) ??
            thread.officeAgentRoleTitle,
        }))}
        activeThreadTitle={activeThread?.title ?? null}
        officeAgents={officeAgentOptions}
        selectedOfficeAgentId={selectedOfficeAgent?.id ?? selectedOfficeAgentId ?? ""}
        messages={displayedMessages}
        draft={draft}
        pendingAttachments={pendingAttachments}
        slashCommands={slashCommands}
        selectedModelId={selectedModelId}
        selectedReasoningEffort={selectedReasoningEffort}
        fastModeEnabled={fastModeEnabled}
        availableModels={HERMES_MODEL_OPTIONS}
        availableReasoningOptions={availableReasoningOptions}
        showReasoningControl={showReasoningControl}
        showFastModeToggle={showFastModeToggle}
        settingsDisabled={selectedThreadId === null}
        isSending={isSending}
        streamingAssistantMessageId={streamingAssistantMessageId}
        onModelChange={(modelId) => {
          void persistThreadSettings({
            modelId,
            reasoningEffort: selectedReasoningEffort,
            fastModeEnabled,
          });
        }}
        onReasoningChange={(reasoningEffort) => {
          void persistThreadSettings({
            modelId: selectedModelId,
            reasoningEffort,
            fastModeEnabled,
          });
        }}
        onFastModeToggle={() => {
          void persistThreadSettings({
            modelId: selectedModelId,
            reasoningEffort: selectedReasoningEffort,
            fastModeEnabled: !fastModeEnabled,
          });
        }}
        onAssistantResponseRevealComplete={(messageId) => {
          setStreamingAssistantMessageId((current) => (current === messageId ? null : current));
        }}
        onNewChat={() => {
          void (async () => {
            const defaults = normalizeHermesThreadSettings({});
            const officeAgentId = selectedOfficeAgentId ?? defaultOfficeAgentId ?? undefined;
            setDraft("");
            setPendingAttachments([]);
            setStreamingAssistantMessageId(null);
            setSelectedModelId(defaults.modelId);
            setSelectedReasoningEffort(defaults.reasoningEffort);
            setFastModeEnabled(defaults.fastModeEnabled);
            const createdThread = await createHermesThreadViaServer(officeAgentId);
            setFallbackThreads(createdThread.threads);
            setFallbackMessagesByThread((current) => ({
              ...current,
              [createdThread.threadId]: [],
            }));
            setSelectedThreadId(createdThread.threadId);
            setSelectedOfficeAgentId(officeAgentId ?? null);
          })();
        }}
        onThreadSelect={handleThreadSelect}
        onOfficeAgentChange={(officeAgentId) => {
          void handleOfficeAgentChange(officeAgentId);
        }}
        onThreadDelete={(threadId) => {
          void handleDeleteThread(threadId);
        }}
        onDraftChange={setDraft}
        onDraftKeyDown={handleDraftKeyDown}
        onDraftPaste={(event) => {
          void handleDraftPaste(event);
        }}
        onAttachClick={() => fileInputRef.current?.click()}
        onFilesDrop={(files) => {
          void addPendingFiles(files);
        }}
        onRemovePendingAttachment={(attachmentId) => {
          setPendingAttachments((current) => current.filter((attachment) => attachment.id !== attachmentId));
        }}
        onSlashCommandSelect={(command) => {
          setDraft(applyHermesSlashCommand(draft, command));
        }}
        onVoiceMessageSubmit={(message) => {
          void handleVoiceMessageSubmit(message);
        }}
        onSubmit={handleSendMessage}
      />
      <input
        ref={fileInputRef}
        type="file"
        multiple
        className="hidden"
        accept="image/*,.pdf,.txt,.md,.doc,.docx,.csv,.json"
        onChange={(event) => {
          void handleFileSelection(event);
        }}
      />
    </>
  );
}

import type {
  ClipboardEventHandler,
  FormEventHandler,
  KeyboardEventHandler,
} from "react";
import {
  ArrowUp,
  FileText,
  ImageIcon,
  Paperclip,
  Plus,
  Square,
  UserRound,
  X,
} from "lucide-react";

import {
  ChatContainerContent,
  ChatContainerRoot,
  ChatContainerScrollAnchor,
} from "@/components/ui/chat-container";
import {
  FileUpload,
  FileUploadContent,
  FileUploadTrigger,
} from "@/components/ui/file-upload";
import { Image } from "@/components/ui/image";
import { Message, MessageContent } from "@/components/ui/message";
import {
  PromptInput,
  PromptInputAction,
  PromptInputActions,
  PromptInputTextarea,
} from "@/components/ui/prompt-input";
import {
  Reasoning,
  ReasoningContent,
  ReasoningTrigger,
} from "@/components/ui/reasoning";
import { ResponseStream } from "@/components/ui/response-stream";
import { ScrollButton } from "@/components/ui/scroll-button";
import { Source, SourceContent, SourceTrigger } from "@/components/ui/source";
import { TextShimmer } from "@/components/ui/text-shimmer";
import { Tool } from "@/components/ui/tool";
import type {
  HermesLayoutAttachment,
  HermesLayoutMessage,
  HermesLayoutThread,
  HermesModelOption,
  HermesOfficeAgentOption,
  HermesReasoningEffort,
  HermesSlashCommand,
} from "./mission-control-hermes-shared";

type MissionControlHermesLayoutProps = {
  threads: HermesLayoutThread[];
  activeThreadTitle: string | null;
  officeAgents?: HermesOfficeAgentOption[];
  selectedOfficeAgentId?: string;
  messages: HermesLayoutMessage[];
  draft: string;
  pendingAttachments: HermesLayoutAttachment[];
  slashCommands: HermesSlashCommand[];
  selectedModelId: string;
  selectedReasoningEffort: HermesReasoningEffort | null;
  fastModeEnabled: boolean;
  availableModels: HermesModelOption[];
  availableReasoningOptions: HermesReasoningEffort[];
  showReasoningControl: boolean;
  showFastModeToggle: boolean;
  settingsDisabled?: boolean;
  isSending: boolean;
  streamingAssistantMessageId?: string | null;
  onModelChange: (modelId: string) => void;
  onReasoningChange: (reasoning: HermesReasoningEffort) => void;
  onFastModeToggle: () => void;
  onAssistantResponseRevealComplete?: (messageId: string) => void;
  onNewChat: () => void;
  onOfficeAgentChange?: (officeAgentId: string) => void;
  onThreadSelect: (threadId: string) => void;
  onThreadDelete: (threadId: string) => void;
  onDraftChange: (value: string) => void;
  onDraftKeyDown: KeyboardEventHandler<HTMLTextAreaElement>;
  onDraftPaste: ClipboardEventHandler<HTMLTextAreaElement>;
  onAttachClick: () => void;
  onFilesDrop: (files: File[]) => void;
  onRemovePendingAttachment: (attachmentId: string) => void;
  onSlashCommandSelect: (command: HermesSlashCommand) => void;
  onVoiceMessageSubmit: (message: string) => void;
  onSubmit: FormEventHandler<HTMLFormElement>;
};

type HermesRunTraceProps = {
  isStreaming?: boolean;
  message?: HermesLayoutMessage;
  modelLabel: string;
  selectedReasoningEffort: HermesReasoningEffort | null;
  fastModeEnabled: boolean;
};

function parseDataImageSource(previewUrl?: string) {
  if (!previewUrl?.startsWith("data:")) {
    return null;
  }

  const match = previewUrl.match(/^data:([^;,]+);base64,(.*)$/);
  if (!match) {
    return null;
  }

  return {
    mediaType: match[1],
    base64: match[2],
  };
}

function HermesAttachmentCard({ attachment }: { attachment: HermesLayoutAttachment }) {
  if (attachment.kind === "image" && attachment.previewUrl) {
    const imageSource = parseDataImageSource(attachment.previewUrl);

    return (
      <figure
        data-slot="hermes-message-attachment"
        className="overflow-hidden rounded-[18px] border border-white/[0.08] bg-white/[0.03]"
      >
        <Image
          base64={imageSource?.base64}
          mediaType={imageSource?.mediaType}
          alt={attachment.name}
          className="max-h-[260px] w-full rounded-none object-cover"
        />
        <figcaption className="flex items-center justify-between gap-3 px-3 py-2 text-[0.72rem] text-[#a8abb2]">
          <span className="truncate">{attachment.name}</span>
          <span>{attachment.sizeLabel}</span>
        </figcaption>
      </figure>
    );
  }

  return (
    <div
      data-slot="hermes-message-attachment"
      className="flex items-center gap-3 rounded-[18px] border border-white/[0.08] bg-white/[0.03] px-3 py-3"
    >
      {attachment.kind === "image" ? (
        <ImageIcon className="h-4 w-4 shrink-0 text-white/70" />
      ) : (
        <FileText className="h-4 w-4 shrink-0 text-white/70" />
      )}
      <div className="min-w-0 flex-1">
        <p className="truncate text-sm text-[#f5f5f6]">{attachment.name}</p>
        <p className="text-[0.72rem] text-[#8b8e95]">{attachment.sizeLabel}</p>
      </div>
    </div>
  );
}

function pluralize(count: number, singular: string) {
  return `${count} ${singular}${count === 1 ? "" : "s"}`;
}

function HermesRunTrace({
  isStreaming = false,
  message,
  modelLabel,
  selectedReasoningEffort,
  fastModeEnabled,
}: HermesRunTraceProps) {
  const attachmentCount = message?.attachments?.length ?? 0;
  const wordCount = message?.content.trim().split(/\s+/).filter(Boolean).length ?? 0;
  const traceItems = [
    {
      label: "Prompt",
      value: "accepted in Mission Control",
    },
    {
      label: "Context",
      value: attachmentCount > 0 ? `active thread with ${pluralize(attachmentCount, "attachment")}` : "active thread",
    },
    {
      label: "Model",
      value: `${modelLabel} · reasoning ${selectedReasoningEffort ?? "none"} · fast ${fastModeEnabled ? "on" : "off"}`,
    },
    {
      label: "Run",
      value: isStreaming ? "Hermes CLI request is running" : "assistant response saved",
    },
  ];

  return (
    <Reasoning
      data-slot={isStreaming ? "hermes-thinking-process" : "hermes-assistant-thinking"}
      className="rounded-2xl border border-white/[0.07] bg-black/20 px-3 py-2"
    >
      <ReasoningTrigger className="w-full text-xs text-[#aeb3bd]">
        <span className="flex min-w-0 items-center gap-2">
          {isStreaming ? (
            <TextShimmer className="[--foreground:#f5f5f6] [--muted-foreground:#6f737c]">
              Hermes is thinking...
            </TextShimmer>
          ) : (
            <span>Thinking process</span>
          )}
          <span className="truncate rounded-md border border-white/[0.08] bg-white/[0.04] px-1.5 py-0.5 text-[0.68rem] text-[#858a93]">
            {modelLabel}
          </span>
        </span>
      </ReasoningTrigger>
      <ReasoningContent contentClassName="prose-invert text-xs leading-6 text-[#9ca3af]">
        <div className="pt-3">
          <div className="grid gap-2">
            {traceItems.map((item) => (
              <div key={item.label} className="grid grid-cols-[72px_minmax(0,1fr)] gap-3">
                <span className="text-[#676c75]">{item.label}</span>
                <span className="min-w-0 text-[#aeb3bd]">{item.value}</span>
              </div>
            ))}
          </div>

          <Tool
            className="border-white/[0.07] bg-black/20 text-[#d7d9dd]"
            toolPart={{
              type: "hermes.chat",
              state: isStreaming ? "input-streaming" : "output-available",
              input: {
                model: modelLabel,
                reasoning: selectedReasoningEffort ?? "none",
                fastMode: fastModeEnabled ? "enabled" : "disabled",
              },
              output:
                !isStreaming && message
                  ? {
                      savedAt: message.createdAtLabel,
                      words: wordCount,
                      attachments: attachmentCount,
                    }
                  : undefined,
              toolCallId: isStreaming ? "pending-hermes-chat" : message?.id,
            }}
          />

          <div className="mt-3 flex items-center gap-2 text-xs text-[#8f939b]">
            <span>Source</span>
            <Source href="/mission-control/hermes">
              <SourceTrigger
                label={isStreaming ? "pending thread" : "Hermes thread"}
                className="bg-white/[0.06] text-[#d7d9dd] hover:bg-white/[0.1]"
              />
              <SourceContent
                title="Mission Control Hermes"
                description="Local Hermes thread state, messages, attachments, and selected Office agent."
                className="border-white/[0.12] bg-[#101114] text-[#f5f5f6]"
              />
            </Source>
          </div>
        </div>
      </ReasoningContent>
    </Reasoning>
  );
}

function HermesAssistantAnswer({
  message,
  isStreaming,
  onComplete,
}: {
  message: HermesLayoutMessage;
  isStreaming: boolean;
  onComplete?: () => void;
}) {
  if (message.role === "assistant" && isStreaming) {
    return (
      <div className="whitespace-pre-wrap break-words rounded-none bg-transparent p-0 text-sm leading-7 text-[#f2f2f3]">
        <ResponseStream
          textStream={message.content}
          mode="typewriter"
          speed={72}
          characterChunkSize={3}
          onComplete={onComplete}
        />
      </div>
    );
  }

  return (
    <MessageContent
      markdown={message.role === "assistant"}
      className="rounded-none bg-transparent p-0 text-sm leading-7 text-[#f2f2f3] prose-p:my-0 prose-pre:my-3 prose-code:text-[#f5f5f6]"
    >
      {message.content}
    </MessageContent>
  );
}

function HermesPendingProcess({
  modelLabel,
  selectedReasoningEffort,
  fastModeEnabled,
}: Omit<HermesRunTraceProps, "message">) {
  return (
    <Message
      data-slot="hermes-thinking-process"
      className="mr-auto w-full max-w-[560px] flex-col gap-0"
    >
      <div className="w-full rounded-[24px] border border-white/[0.08] bg-[#0d0f11] px-4 py-4">
        <HermesRunTrace
          isStreaming
          modelLabel={modelLabel}
          selectedReasoningEffort={selectedReasoningEffort}
          fastModeEnabled={fastModeEnabled}
        />
      </div>
    </Message>
  );
}

function HermesComposer({
  draft,
  pendingAttachments,
  slashCommands,
  isSending,
  onDraftChange,
  onDraftKeyDown,
  onDraftPaste,
  onFilesDrop,
  onRemovePendingAttachment,
  onSlashCommandSelect,
  onSubmit,
}: Pick<
  MissionControlHermesLayoutProps,
  | "draft"
  | "pendingAttachments"
  | "slashCommands"
  | "isSending"
  | "onDraftChange"
  | "onDraftKeyDown"
  | "onDraftPaste"
  | "onFilesDrop"
  | "onRemovePendingAttachment"
  | "onSlashCommandSelect"
  | "onSubmit"
>) {
  return (
    <FileUpload
      onFilesAdded={onFilesDrop}
      accept="image/*,.pdf,.txt,.md,.doc,.docx,.csv,.json"
      disabled={isSending}
    >
      <form onSubmit={onSubmit} className="w-full">
        <PromptInput
          data-slot="hermes-composer"
          value={draft}
          onValueChange={onDraftChange}
          isLoading={isSending}
          className="w-full rounded-3xl border-white/[0.1] bg-[#090a0c] p-3 shadow-[0_18px_70px_-44px_rgba(255,255,255,0.55)]"
          onDragOver={(event) => {
            if (event.dataTransfer.types.includes("Files")) {
              event.preventDefault();
            }
          }}
          onDrop={(event) => {
            const files = Array.from(event.dataTransfer.files ?? []);
            if (files.length === 0) {
              return;
            }

            event.preventDefault();
            onFilesDrop(files);
          }}
      >
        {pendingAttachments.length > 0 ? (
          <div className="mb-3 flex flex-wrap gap-2">
            {pendingAttachments.map((attachment) => {
              const imageSource = parseDataImageSource(attachment.previewUrl);

              return (
                <div
                  key={attachment.id}
                  data-slot="hermes-pending-attachment"
                  className="flex max-w-full items-center gap-2 rounded-2xl border border-white/[0.08] bg-white/[0.04] px-2.5 py-2 text-xs text-[#d7d9dd]"
                >
                  {attachment.kind === "image" && imageSource ? (
                    <Image
                      base64={imageSource.base64}
                      mediaType={imageSource.mediaType}
                      alt={attachment.name}
                      className="h-7 w-7 shrink-0 rounded-lg object-cover"
                    />
                  ) : attachment.kind === "image" ? (
                    <ImageIcon className="h-3.5 w-3.5 shrink-0 text-white/60" />
                  ) : (
                    <FileText className="h-3.5 w-3.5 shrink-0 text-white/60" />
                  )}
                  <span className="max-w-[180px] truncate">{attachment.name}</span>
                  <span className="shrink-0 text-white/35">{attachment.sizeLabel}</span>
                  <button
                    type="button"
                    onClick={() => onRemovePendingAttachment(attachment.id)}
                    className="rounded-full p-0.5 text-white/45 transition hover:bg-white/[0.08] hover:text-white"
                    aria-label={`Remove ${attachment.name}`}
                  >
                    <X className="h-3.5 w-3.5" />
                  </button>
                </div>
              );
            })}
          </div>
        ) : null}

        <PromptInputTextarea
          placeholder="Ask me anything..."
          onPaste={onDraftPaste}
          onKeyDown={onDraftKeyDown}
          className="min-h-[52px] px-2 text-[15px] leading-6 text-[#f5f5f6] placeholder:text-[#6f737c]"
        />

        {slashCommands.length > 0 ? (
          <div
            data-slot="hermes-slash-menu"
            className="mt-2 overflow-hidden rounded-2xl border border-white/[0.08] bg-[#101114]"
          >
            {slashCommands.map((command) => (
              <button
                key={command.id}
                type="button"
                onClick={() => onSlashCommandSelect(command)}
                className="flex w-full items-center gap-3 px-3 py-2.5 text-left transition hover:bg-white/[0.05]"
              >
                <span className="min-w-[94px] font-mono text-sm text-[#f5f5f6]">{command.label}</span>
                <span className="text-xs text-[#8f939b]">{command.description}</span>
              </button>
            ))}
          </div>
        ) : null}

        <div className="mt-3 flex items-center justify-between gap-3">
          <PromptInputActions>
            <span data-slot="hermes-composer-attach" className="sr-only" />
            <PromptInputAction tooltip="Attach file">
              <FileUploadTrigger asChild>
                <button
                  type="button"
                  className="flex h-9 w-9 items-center justify-center rounded-full text-white/55 transition hover:bg-white/[0.06] hover:text-white"
                  aria-label="Attach file"
                >
                  <Paperclip className="h-4 w-4" />
                </button>
              </FileUploadTrigger>
            </PromptInputAction>
          </PromptInputActions>

          <button
            data-slot="hermes-composer-send"
            type="submit"
            disabled={isSending || (!draft.trim() && pendingAttachments.length === 0)}
            className="flex h-9 w-9 items-center justify-center rounded-full bg-white text-black transition hover:bg-white/85 disabled:cursor-not-allowed disabled:opacity-45"
            aria-label={isSending ? "Sending message" : "Send message"}
          >
            {isSending ? <Square className="h-3.5 w-3.5 fill-current" /> : <ArrowUp className="h-4 w-4" />}
          </button>
        </div>
        </PromptInput>
      </form>
      <FileUploadContent data-slot="hermes-file-upload-overlay">
        <div className="rounded-3xl border border-white/[0.16] bg-[#090a0c] px-6 py-5 text-center text-sm text-[#f5f5f6] shadow-2xl">
          Drop files into Hermes
        </div>
      </FileUploadContent>
    </FileUpload>
  );
}

export function MissionControlHermesLayout({
  threads,
  messages,
  officeAgents = [],
  selectedOfficeAgentId = "",
  draft,
  pendingAttachments,
  slashCommands,
  selectedModelId,
  selectedReasoningEffort,
  fastModeEnabled,
  availableModels,
  availableReasoningOptions,
  showReasoningControl,
  showFastModeToggle,
  settingsDisabled = false,
  isSending,
  streamingAssistantMessageId = null,
  onModelChange,
  onReasoningChange,
  onFastModeToggle,
  onAssistantResponseRevealComplete,
  onNewChat,
  onOfficeAgentChange,
  onThreadSelect,
  onThreadDelete,
  onDraftChange,
  onDraftKeyDown,
  onDraftPaste,
  onFilesDrop,
  onRemovePendingAttachment,
  onSlashCommandSelect,
  onSubmit,
}: MissionControlHermesLayoutProps) {
  const showEmptyState = messages.length === 0 && !isSending;
  const selectedOfficeAgent =
    officeAgents.find((agent) => agent.id === selectedOfficeAgentId) ?? officeAgents[0] ?? null;
  const selectedOfficeAgentValue = selectedOfficeAgent?.id ?? selectedOfficeAgentId;
  const selectedModel = availableModels.find((model) => model.id === selectedModelId);
  const selectedModelLabel = selectedModel ? `${selectedModel.label} · ${selectedModel.providerLabel}` : selectedModelId;

  return (
    <div className="flex h-full min-h-0 flex-col bg-black text-[#f5f5f6]">
      <header
        data-slot="hermes-topbar"
        className="flex flex-col gap-2 border-b border-white/[0.04] bg-[#0b0c0e] px-2 py-2"
      >
        <div className="flex min-w-0 items-center gap-2">
          <button
            data-slot="hermes-new-chat-button"
            type="button"
            onClick={onNewChat}
            className="flex h-9 w-9 shrink-0 items-center justify-center rounded-[10px] border border-white/[0.12] bg-[#111214] text-white transition hover:border-white/[0.2] hover:bg-[#14161a]"
            aria-label="Create new chat"
          >
            <Plus className="h-4 w-4" />
          </button>

          <div
            data-slot="hermes-thread-tabs"
            className="flex min-w-0 flex-1 items-center gap-2 overflow-x-auto pb-0.5"
            aria-label="Hermes chats"
          >
            {threads.map((thread) => (
              <div
                key={thread.id}
                data-slot="hermes-thread-tab"
                className={`flex shrink-0 items-center gap-1 rounded-[12px] border px-1.5 py-1 ${
                  thread.active
                    ? "border-white/[0.12] bg-white/[0.06] text-white"
                    : "border-white/[0.06] bg-white/[0.02] text-white/70"
                }`}
              >
                <button
                  type="button"
                  onClick={() => onThreadSelect(thread.id)}
                  className="max-w-[260px] truncate rounded-[10px] px-2 py-1 text-left text-sm transition hover:text-white"
                  title={thread.title}
                >
                  {thread.title}
                </button>
                <button
                  data-slot="hermes-thread-delete"
                  type="button"
                  onClick={() => onThreadDelete(thread.id)}
                  className="rounded-full p-1 text-white/45 transition hover:bg-white/[0.06] hover:text-white"
                  aria-label={`Delete ${thread.title}`}
                >
                  <X className="h-3.5 w-3.5" />
                </button>
              </div>
            ))}
          </div>
        </div>

        <div data-slot="hermes-settings-bar" className="flex flex-wrap items-center gap-2 pl-11">
          <div
            data-slot="hermes-agent-binding"
            className="flex h-8 min-w-[210px] items-center gap-1.5 rounded-[10px] border border-white/[0.08] bg-white/[0.03] px-2 text-xs text-[#d7d9dd]"
          >
            <UserRound className="h-3.5 w-3.5 shrink-0 text-white/50" aria-hidden="true" />
            {officeAgents.length > 0 ? (
              <>
                <label className="sr-only" htmlFor="hermes-agent-select">
                  Office agent
                </label>
                <select
                  id="hermes-agent-select"
                  data-slot="hermes-agent-select"
                  value={selectedOfficeAgentValue}
                  onChange={(event) => onOfficeAgentChange?.(event.target.value)}
                  className="h-7 min-w-0 flex-1 bg-transparent text-xs text-[#d7d9dd] outline-none"
                >
                  {officeAgents.map((agent) => (
                    <option key={agent.id} value={agent.id}>
                      {agent.name} · {agent.roleTitle}
                    </option>
                  ))}
                </select>
              </>
            ) : (
              <span className="whitespace-nowrap text-white/45">No Office agents</span>
            )}
          </div>

          <label className="sr-only" htmlFor="hermes-model-select">
            Model
          </label>
          <select
            id="hermes-model-select"
            data-slot="hermes-model-select"
            value={selectedModelId}
            disabled={settingsDisabled}
            onChange={(event) => onModelChange(event.target.value)}
            className="h-8 w-[220px] max-w-full rounded-[10px] border border-white/[0.08] bg-white/[0.03] px-2.5 text-xs text-[#d7d9dd] outline-none disabled:cursor-not-allowed disabled:opacity-45"
          >
            {availableModels.map((model) => (
              <option key={model.id} value={model.id}>
                {model.label} · {model.providerLabel}
              </option>
            ))}
          </select>

          {showReasoningControl ? (
            <>
              <label className="sr-only" htmlFor="hermes-reasoning-select">
                Reasoning
              </label>
              <select
                id="hermes-reasoning-select"
                data-slot="hermes-reasoning-select"
                value={selectedReasoningEffort ?? ""}
                disabled={settingsDisabled}
                onChange={(event) => onReasoningChange(event.target.value as HermesReasoningEffort)}
                className="h-8 w-[92px] rounded-[10px] border border-white/[0.08] bg-white/[0.03] px-2.5 text-xs text-[#d7d9dd] outline-none disabled:cursor-not-allowed disabled:opacity-45"
              >
                {availableReasoningOptions.map((reasoningOption) => (
                  <option key={reasoningOption} value={reasoningOption}>
                    {reasoningOption}
                  </option>
                ))}
              </select>
            </>
          ) : null}

          {showFastModeToggle ? (
            <button
              type="button"
              data-slot="hermes-fast-toggle"
              aria-pressed={fastModeEnabled}
              disabled={settingsDisabled}
              onClick={onFastModeToggle}
              className={`h-8 rounded-[10px] border px-3 text-xs transition disabled:cursor-not-allowed disabled:opacity-45 ${
                fastModeEnabled
                  ? "border-[#8d96ff]/45 bg-[#8d96ff]/18 text-white"
                  : "border-white/[0.08] bg-white/[0.03] text-[#aeb1b7]"
              }`}
            >
              Fast mode
            </button>
          ) : null}
        </div>
      </header>

      {showEmptyState ? (
        <div data-slot="hermes-empty-state" className="flex flex-1 items-start justify-center px-6">
          <div className="flex w-full max-w-[672px] flex-col pt-[18vh]">
            <div data-slot="hermes-greeting" className="mb-9">
              <h1 className="text-[24px] font-semibold tracking-[-0.028em] text-[#f5f5f6]">Hello there!</h1>
              <p className="mt-1 text-[18px] tracking-[-0.018em] text-[#757381]">
                {selectedOfficeAgent ? `Talking with ${selectedOfficeAgent.name}.` : "How can I help you today?"}
              </p>
            </div>
            <div className="max-w-[672px]">
              <HermesComposer
                draft={draft}
                pendingAttachments={pendingAttachments}
                slashCommands={slashCommands}
                isSending={isSending}
                onDraftChange={onDraftChange}
                onDraftKeyDown={onDraftKeyDown}
                onDraftPaste={onDraftPaste}
                onFilesDrop={onFilesDrop}
                onRemovePendingAttachment={onRemovePendingAttachment}
                onSlashCommandSelect={onSlashCommandSelect}
                onSubmit={onSubmit}
              />
            </div>
          </div>
        </div>
      ) : (
        <div className="flex min-h-0 flex-1 flex-col">
          <ChatContainerRoot data-slot="hermes-message-list" className="relative flex-1 px-6 py-8">
            <ChatContainerContent className="mx-auto flex w-full max-w-[672px] flex-col gap-4">
              {messages.map((message) => {
                const alignClassName =
                  message.role === "user"
                    ? "ml-auto"
                    : message.role === "assistant"
                      ? "mr-auto"
                      : "mx-auto";
                const contentClassName =
                  message.role === "user"
                    ? "border-white/[0.08] bg-white/[0.05]"
                    : message.role === "assistant"
                      ? "border-white/[0.08] bg-[#0d0f11]"
                      : "border-white/[0.06] bg-white/[0.03]";
                const isAssistantStreaming =
                  message.role === "assistant" && message.id === streamingAssistantMessageId;

                return (
                  <Message
                    key={message.id}
                    data-slot="hermes-message-bubble"
                    className={`w-full max-w-[560px] flex-col gap-0 ${alignClassName}`}
                  >
                    <div className={`w-full rounded-[24px] border px-4 py-4 ${contentClassName}`}>
                      <div className="mb-3 flex items-center gap-2 text-[0.72rem] uppercase tracking-[0.18em] text-[#7d8088]">
                        <span className="text-[#d6d7da]">{message.author}</span>
                        <span>{message.createdAtLabel}</span>
                      </div>
                      {message.role === "assistant" ? (
                        <div className="mb-4">
                          <HermesRunTrace
                            isStreaming={isAssistantStreaming}
                            message={message}
                            modelLabel={selectedModelLabel}
                            selectedReasoningEffort={selectedReasoningEffort}
                            fastModeEnabled={fastModeEnabled}
                          />
                        </div>
                      ) : null}
                      <HermesAssistantAnswer
                        message={message}
                        isStreaming={isAssistantStreaming}
                        onComplete={() => onAssistantResponseRevealComplete?.(message.id)}
                      />
                    </div>
                    {message.attachments?.length ? (
                      <div className="mt-4 grid gap-3">
                        {message.attachments.map((attachment) => (
                          <HermesAttachmentCard key={attachment.id} attachment={attachment} />
                        ))}
                      </div>
                    ) : null}
                  </Message>
                );
              })}
              {isSending ? (
                <HermesPendingProcess
                  modelLabel={selectedModelLabel}
                  selectedReasoningEffort={selectedReasoningEffort}
                  fastModeEnabled={fastModeEnabled}
                />
              ) : null}
              <ChatContainerScrollAnchor />
            </ChatContainerContent>
            <div className="pointer-events-none absolute inset-x-0 bottom-4 flex justify-center">
              <ScrollButton
                className="pointer-events-auto border-white/[0.12] bg-[#15171b] text-white hover:bg-[#1e2127]"
                aria-label="Scroll to latest message"
              />
            </div>
          </ChatContainerRoot>

          <div className="px-6 pb-6">
            <div className="mx-auto w-full max-w-[672px]">
              <HermesComposer
                draft={draft}
                pendingAttachments={pendingAttachments}
                slashCommands={slashCommands}
                isSending={isSending}
                onDraftChange={onDraftChange}
                onDraftKeyDown={onDraftKeyDown}
                onDraftPaste={onDraftPaste}
                onFilesDrop={onFilesDrop}
                onRemovePendingAttachment={onRemovePendingAttachment}
                onSlashCommandSelect={onSlashCommandSelect}
                onSubmit={onSubmit}
              />
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

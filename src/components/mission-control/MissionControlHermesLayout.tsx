import type {
  ClipboardEventHandler,
  FormEventHandler,
  KeyboardEventHandler,
} from "react";
import {
  ArrowUp,
  FileText,
  ImageIcon,
  Loader,
  Paperclip,
  Plus,
  X,
} from "lucide-react";

import type {
  HermesLayoutAttachment,
  HermesLayoutMessage,
  HermesLayoutThread,
  HermesSlashCommand,
} from "./mission-control-hermes-shared";

type MissionControlHermesLayoutProps = {
  threads: HermesLayoutThread[];
  activeThreadTitle: string | null;
  messages: HermesLayoutMessage[];
  draft: string;
  pendingAttachments: HermesLayoutAttachment[];
  slashCommands: HermesSlashCommand[];
  isSending: boolean;
  onNewChat: () => void;
  onThreadSelect: (threadId: string) => void;
  onThreadDelete: (threadId: string) => void;
  onDraftChange: (value: string) => void;
  onDraftKeyDown: KeyboardEventHandler<HTMLTextAreaElement>;
  onDraftPaste: ClipboardEventHandler<HTMLTextAreaElement>;
  onAttachClick: () => void;
  onRemovePendingAttachment: (attachmentId: string) => void;
  onSlashCommandSelect: (command: HermesSlashCommand) => void;
  onSubmit: FormEventHandler<HTMLFormElement>;
};

function HermesAttachmentCard({ attachment }: { attachment: HermesLayoutAttachment }) {
  if (attachment.kind === "image" && attachment.previewUrl) {
    return (
      <figure
        data-slot="hermes-message-attachment"
        className="overflow-hidden rounded-[18px] border border-white/[0.08] bg-white/[0.03]"
      >
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={attachment.previewUrl}
          alt={attachment.name}
          className="h-auto max-h-[260px] w-full object-cover"
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

function HermesComposer({
  draft,
  pendingAttachments,
  slashCommands,
  isSending,
  onDraftChange,
  onDraftKeyDown,
  onDraftPaste,
  onAttachClick,
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
  | "onAttachClick"
  | "onRemovePendingAttachment"
  | "onSlashCommandSelect"
  | "onSubmit"
>) {
  const canSend = draft.trim().length > 0 || pendingAttachments.length > 0;

  return (
    <form onSubmit={onSubmit} className="w-full">
      <div
        data-slot="hermes-composer"
        className="rounded-[24px] border border-white/[0.1] bg-[#090a0c] px-6 pb-5 pt-5"
      >
        {pendingAttachments.length > 0 ? (
          <div className="mb-4 flex flex-wrap gap-2">
            {pendingAttachments.map((attachment) => (
              <div
                key={attachment.id}
                data-slot="hermes-pending-attachment"
                className="inline-flex items-center gap-2 rounded-full border border-white/[0.08] bg-white/[0.03] px-3 py-1.5 text-xs text-[#d7d9dd]"
              >
                {attachment.kind === "image" ? (
                  <ImageIcon className="h-3.5 w-3.5 text-white/60" />
                ) : (
                  <FileText className="h-3.5 w-3.5 text-white/60" />
                )}
                <span className="max-w-[180px] truncate">{attachment.name}</span>
                <span className="text-[#8b8e95]">{attachment.sizeLabel}</span>
                <button
                  type="button"
                  onClick={() => onRemovePendingAttachment(attachment.id)}
                  className="rounded-full p-0.5 text-white/55 transition hover:bg-white/[0.05] hover:text-white"
                  aria-label={`Remove ${attachment.name}`}
                >
                  <X className="h-3 w-3" />
                </button>
              </div>
            ))}
          </div>
        ) : null}

        <textarea
          value={draft}
          onChange={(event) => onDraftChange(event.target.value)}
          onKeyDown={onDraftKeyDown}
          onPaste={onDraftPaste}
          rows={4}
          placeholder="Ask me anything..."
          className="min-h-[72px] w-full resize-none border-0 bg-transparent text-[14px] leading-6 text-[#f5f5f6] outline-none placeholder:text-[#8b8b91]"
        />

        {slashCommands.length > 0 ? (
          <div
            data-slot="hermes-slash-menu"
            className="mt-4 max-h-[320px] overflow-y-auto rounded-[18px] border border-white/[0.08] bg-[#0d0f11] p-2"
          >
            {slashCommands.map((command) => (
              <button
                key={command.id}
                type="button"
                onClick={() => onSlashCommandSelect(command)}
                className="flex w-full items-start justify-between gap-3 rounded-[14px] px-3 py-2 text-left transition hover:bg-white/[0.04]"
              >
                <div>
                  <p className="text-sm font-medium text-[#f5f5f6]">{command.label}</p>
                  <p className="mt-1 text-xs leading-5 text-[#8b8e95]">{command.description}</p>
                </div>
                <span className="rounded-full border border-white/[0.08] px-2 py-1 text-[0.65rem] uppercase tracking-[0.2em] text-[#7b7f87]">
                  Complete
                </span>
              </button>
            ))}
          </div>
        ) : null}

        <div className="mt-4 flex items-center justify-between gap-4">
          <button
            data-slot="hermes-composer-attach"
            type="button"
            onClick={onAttachClick}
            className="flex h-9 w-9 items-center justify-center rounded-full border border-white/[0.12] bg-white/[0.03] text-white transition hover:border-white/[0.2] hover:bg-white/[0.06]"
            aria-label="Attach files"
          >
            <Paperclip className="h-4 w-4" />
          </button>

          <button
            data-slot="hermes-composer-send"
            type="submit"
            disabled={isSending || !canSend}
            className="flex h-9 w-9 items-center justify-center rounded-full bg-[#f4f4f5] text-[#111111] transition hover:bg-white disabled:cursor-not-allowed disabled:opacity-55"
            aria-label="Send message"
          >
            {isSending ? <Loader className="h-4 w-4 animate-spin" /> : <ArrowUp className="h-4 w-4" />}
          </button>
        </div>
      </div>
    </form>
  );
}

export function MissionControlHermesLayout({
  threads,
  messages,
  draft,
  pendingAttachments,
  slashCommands,
  isSending,
  onNewChat,
  onThreadSelect,
  onThreadDelete,
  onDraftChange,
  onDraftKeyDown,
  onDraftPaste,
  onAttachClick,
  onRemovePendingAttachment,
  onSlashCommandSelect,
  onSubmit,
}: MissionControlHermesLayoutProps) {
  const showEmptyState = messages.length === 0;

  return (
    <div className="flex h-full min-h-0 flex-col bg-black text-[#f5f5f6]">
      <header
        data-slot="hermes-topbar"
        className="flex h-[40px] items-center gap-2 border-b border-white/[0.04] bg-[#0b0c0e] px-1.5"
      >
        <button
          data-slot="hermes-new-chat-button"
          type="button"
          onClick={onNewChat}
          className="flex h-9 w-9 shrink-0 items-center justify-center rounded-[10px] border border-white/[0.12] bg-[#111214] text-white transition hover:border-white/[0.2] hover:bg-[#14161a]"
          aria-label="Create new chat"
        >
          <Plus className="h-4 w-4" />
        </button>

        <div className="flex min-w-0 flex-1 items-center gap-2 overflow-x-auto pb-0.5">
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
                className="max-w-[180px] truncate rounded-[10px] px-2 py-1 text-sm transition hover:text-white"
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
      </header>

      {showEmptyState ? (
        <div data-slot="hermes-empty-state" className="flex flex-1 items-start justify-center px-6">
          <div className="flex w-full max-w-[672px] flex-col pt-[18vh]">
            <div data-slot="hermes-greeting" className="mb-9">
              <h1 className="text-[24px] font-semibold tracking-[-0.028em] text-[#f5f5f6]">Hello there!</h1>
              <p className="mt-1 text-[18px] tracking-[-0.018em] text-[#757381]">How can I help you today?</p>
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
                onAttachClick={onAttachClick}
                onRemovePendingAttachment={onRemovePendingAttachment}
                onSlashCommandSelect={onSlashCommandSelect}
                onSubmit={onSubmit}
              />
            </div>
          </div>
        </div>
      ) : (
        <div className="flex min-h-0 flex-1 flex-col">
          <div data-slot="hermes-message-list" className="flex-1 overflow-y-auto px-6 py-8">
            <div className="mx-auto flex w-full max-w-[672px] flex-col gap-4">
              {messages.map((message) => {
                const alignClassName =
                  message.role === "user"
                    ? "ml-auto border-white/[0.08] bg-white/[0.05]"
                    : message.role === "assistant"
                      ? "mr-auto border-white/[0.08] bg-[#0d0f11]"
                      : "mx-auto border-white/[0.06] bg-white/[0.03]";

                return (
                  <article
                    key={message.id}
                    data-slot="hermes-message-bubble"
                    className={`w-full max-w-[560px] rounded-[24px] border px-4 py-4 ${alignClassName}`}
                  >
                    <div className="flex items-center gap-2 text-[0.72rem] uppercase tracking-[0.18em] text-[#7d8088]">
                      <span className="text-[#d6d7da]">{message.author}</span>
                      <span>{message.createdAtLabel}</span>
                    </div>
                    <p className="mt-3 whitespace-pre-wrap text-sm leading-7 text-[#f2f2f3]">{message.content}</p>
                    {message.attachments?.length ? (
                      <div className="mt-4 grid gap-3">
                        {message.attachments.map((attachment) => (
                          <HermesAttachmentCard key={attachment.id} attachment={attachment} />
                        ))}
                      </div>
                    ) : null}
                  </article>
                );
              })}
            </div>
          </div>

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
                onAttachClick={onAttachClick}
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

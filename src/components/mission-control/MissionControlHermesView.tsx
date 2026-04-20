"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import type { ChangeEvent, ClipboardEvent, FormEvent, KeyboardEvent } from "react";
import { useMutation, useQuery } from "convex/react";

import type { Doc, Id } from "../../../convex/_generated/dataModel";
import { api } from "../../../convex/_generated/api";
import { MissionControlHermesLayout } from "./MissionControlHermesLayout";
import {
  applyHermesSlashCommand,
  findHermesSlashCommands,
  formatHermesAttachmentSize,
  type HermesLayoutAttachment,
  type HermesLayoutMessage,
} from "./mission-control-hermes-shared";

type HermesThreadDoc = Doc<"hermesThreads">;
type HermesMessageDoc = Doc<"hermesMessages">;

type PendingHermesAttachment = HermesLayoutAttachment & {
  mimeType: string;
  sizeBytes: number;
  dataUrl?: string;
};

const EMPTY_THREADS: HermesThreadDoc[] = [];
const EMPTY_MESSAGES: HermesMessageDoc[] = [];
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

export function MissionControlHermesView({ initialThreads }: { initialThreads: HermesThreadDoc[] }) {
  const threadsQuery = useQuery(api.hermesThreads.listThreads);
  const createThread = useMutation(api.hermesThreads.createThread);
  const sendMessage = useMutation(api.hermesThreads.sendMessage);
  const deleteThread = useMutation(api.hermesThreads.deleteThread);
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  const threads = threadsQuery ?? initialThreads ?? EMPTY_THREADS;
  const [selectedThreadId, setSelectedThreadId] = useState<Id<"hermesThreads"> | null>(null);
  const [draft, setDraft] = useState("");
  const [pendingAttachments, setPendingAttachments] = useState<PendingHermesAttachment[]>([]);
  const [isSending, setIsSending] = useState(false);

  const messagesQuery = useQuery(
    api.hermesThreads.listMessages,
    selectedThreadId ? { threadId: selectedThreadId } : "skip",
  );

  const messages = messagesQuery ?? EMPTY_MESSAGES;
  const activeThread = useMemo(
    () => threads.find((thread) => thread._id === selectedThreadId) ?? null,
    [selectedThreadId, threads],
  );
  const slashCommands = useMemo(() => findHermesSlashCommands(draft), [draft]);

  useEffect(() => {
    if (!selectedThreadId) {
      return;
    }

    const stillExists = threads.some((thread) => thread._id === selectedThreadId);
    if (!stillExists) {
      setSelectedThreadId(null);
    }
  }, [selectedThreadId, threads]);

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

  async function handleSendMessage(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    const content = draft.trim();
    if (!content && pendingAttachments.length === 0) {
      return;
    }

    setIsSending(true);

    try {
      const result = await sendMessage({
        threadId: selectedThreadId ?? undefined,
        content,
        attachments: pendingAttachments.map((attachment) => ({
          kind: attachment.kind,
          name: attachment.name,
          mimeType: attachment.mimeType,
          sizeBytes: attachment.sizeBytes,
          dataUrl: attachment.dataUrl,
        })),
      });

      setDraft("");
      setPendingAttachments([]);
      setSelectedThreadId(result.threadId ?? null);
    } finally {
      setIsSending(false);
    }
  }

  async function handleDeleteThread(threadId: string) {
    const typedThreadId = threadId as Id<"hermesThreads">;
    if (typedThreadId === selectedThreadId) {
      setSelectedThreadId(null);
      setDraft("");
      setPendingAttachments([]);
    }

    await deleteThread({ threadId: typedThreadId });
  }

  function handleThreadSelect(threadId: string) {
    setSelectedThreadId(threadId as Id<"hermesThreads">);
    setDraft("");
    setPendingAttachments([]);
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

  return (
    <>
      <MissionControlHermesLayout
        threads={threads.map((thread) => ({
          id: thread._id,
          title: thread.title,
          active: thread._id === selectedThreadId,
        }))}
        activeThreadTitle={activeThread?.title ?? null}
        messages={mappedMessages}
        draft={draft}
        pendingAttachments={pendingAttachments}
        slashCommands={slashCommands}
        isSending={isSending}
        onNewChat={() => {
          void (async () => {
            setDraft("");
            setPendingAttachments([]);
            const createdThread = await createThread({});
            setSelectedThreadId(createdThread.threadId);
          })();
        }}
        onThreadSelect={handleThreadSelect}
        onThreadDelete={(threadId) => {
          void handleDeleteThread(threadId);
        }}
        onDraftChange={setDraft}
        onDraftKeyDown={handleDraftKeyDown}
        onDraftPaste={(event) => {
          void handleDraftPaste(event);
        }}
        onAttachClick={() => fileInputRef.current?.click()}
        onRemovePendingAttachment={(attachmentId) => {
          setPendingAttachments((current) => current.filter((attachment) => attachment.id !== attachmentId));
        }}
        onSlashCommandSelect={(command) => {
          setDraft(applyHermesSlashCommand(draft, command));
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

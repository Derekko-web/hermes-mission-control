"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { useQuery } from "convex/react";

import type { Doc, Id } from "../../../convex/_generated/dataModel";
import { api } from "../../../convex/_generated/api";
import { isLiveOfficePresence } from "./MissionControlOfficeState";
import { MissionControlHermesLayout } from "./MissionControlHermesLayout";

type HermesThreadDoc = Doc<"hermesThreads">;
type HermesMessageDoc = Doc<"hermesMessages">;
type TeamMemberDoc = Doc<"teamMembers">;
type OfficePresenceDoc = Doc<"officePresence">;

type HermesCreateThreadRouteResponse = {
  threadId: Id<"hermesThreads">;
  threads: HermesThreadDoc[];
};

type HermesDeleteThreadRouteResponse = {
  threads: HermesThreadDoc[];
};

const EMPTY_THREADS: HermesThreadDoc[] = [];
const EMPTY_MESSAGES: HermesMessageDoc[] = [];
const EMPTY_TEAM_MEMBERS: TeamMemberDoc[] = [];
const EMPTY_OFFICE_PRESENCE: OfficePresenceDoc[] = [];
const SESSION_TITLE_PATTERN = /^Session\s+(\d+)$/i;

async function createHermesThreadViaServer(args: {
  title: string;
  officeAgentId?: Id<"teamMembers"> | null;
}) {
  const response = await fetch("/api/mission-control/hermes/thread", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      title: args.title,
      officeAgentId: args.officeAgentId ?? undefined,
    }),
  });

  if (!response.ok) {
    throw new Error("Unable to create Hermes session.");
  }

  return (await response.json()) as HermesCreateThreadRouteResponse;
}

async function deleteHermesThreadViaServer(threadId: Id<"hermesThreads">) {
  const response = await fetch(`/api/mission-control/hermes/thread/${threadId}`, {
    method: "DELETE",
  });

  if (!response.ok) {
    throw new Error("Unable to close Hermes session.");
  }

  return (await response.json()) as HermesDeleteThreadRouteResponse;
}

function getNextSessionTitle(threads: readonly HermesThreadDoc[]) {
  const maxSessionNumber = threads.reduce((max, thread) => {
    const match = thread.title.match(SESSION_TITLE_PATTERN);
    if (!match) {
      return max;
    }

    return Math.max(max, Number(match[1]));
  }, 0);

  return `Session ${maxSessionNumber + 1}`;
}

function randomFrom<T>(items: readonly T[]) {
  return items[Math.floor(Math.random() * items.length)];
}

function getLatestPresenceByMemberName(presences: readonly OfficePresenceDoc[]) {
  const presenceByMemberName = new Map<string, OfficePresenceDoc>();
  for (const presence of presences) {
    const existing = presenceByMemberName.get(presence.memberName);
    if (!existing || presence.lastUpdatedAt > existing.lastUpdatedAt) {
      presenceByMemberName.set(presence.memberName, presence);
    }
  }

  return presenceByMemberName;
}

function choosePixelAgentForSession(
  teamMembers: readonly TeamMemberDoc[],
  officePresence: readonly OfficePresenceDoc[],
  threads: readonly HermesThreadDoc[],
) {
  if (teamMembers.length === 0) {
    return null;
  }

  const presenceByMemberName = getLatestPresenceByMemberName(officePresence);
  const sessionCountByAgentId = threads.reduce((counts, thread) => {
    if (!thread.officeAgentId) {
      return counts;
    }

    const key = String(thread.officeAgentId);
    counts.set(key, (counts.get(key) ?? 0) + 1);
    return counts;
  }, new Map<string, number>());
  const candidates = teamMembers.map((member) => {
    const presence = presenceByMemberName.get(member.name) ?? null;
    const isLive = presence ? isLiveOfficePresence(presence) : false;

    return {
      member,
      presence,
      isLive,
      sessionCount: sessionCountByAgentId.get(String(member._id)) ?? 0,
    };
  });
  const availableCandidates = candidates.filter((candidate) => !candidate.isLive && candidate.sessionCount === 0);

  if (availableCandidates.length > 0) {
    return randomFrom(availableCandidates).member._id;
  }

  const lowestSessionCount = Math.min(...candidates.map((candidate) => candidate.sessionCount));
  const leastLoadedCandidates = candidates.filter((candidate) => candidate.sessionCount === lowestSessionCount);
  const inactiveLeastLoadedCandidates = leastLoadedCandidates.filter((candidate) => !candidate.isLive);
  if (inactiveLeastLoadedCandidates.length > 0) {
    return randomFrom(inactiveLeastLoadedCandidates).member._id;
  }

  const oldestLiveAt = Math.min(
    ...leastLoadedCandidates.map((candidate) => candidate.presence?.lastUpdatedAt ?? Number.POSITIVE_INFINITY),
  );
  const leastUnavailableCandidates = leastLoadedCandidates.filter(
    (candidate) => (candidate.presence?.lastUpdatedAt ?? Number.POSITIVE_INFINITY) === oldestLiveAt,
  );

  return randomFrom(leastUnavailableCandidates.length > 0 ? leastUnavailableCandidates : leastLoadedCandidates).member._id;
}

function sortThreadsForTabs(threads: readonly HermesThreadDoc[]) {
  return [...threads].sort((left, right) => {
    if (left.createdAt !== right.createdAt) {
      return left.createdAt - right.createdAt;
    }

    return left.title.localeCompare(right.title);
  });
}

function getQueuedPromptForTerminal(thread: HermesThreadDoc | null, messages: readonly HermesMessageDoc[]) {
  if (!thread || thread.hermesSessionId || messages.length === 0) {
    return null;
  }

  if (messages.some((message) => message.role === "assistant")) {
    return null;
  }

  const latestUserMessage = [...messages].reverse().find((message) => message.role === "user");
  return latestUserMessage?.content.trim() || null;
}

export function MissionControlHermesView({
  initialThreads,
  initialTeamMembers,
  initialOfficePresence = EMPTY_OFFICE_PRESENCE,
}: {
  initialThreads: HermesThreadDoc[];
  initialTeamMembers: TeamMemberDoc[];
  initialOfficePresence?: OfficePresenceDoc[];
}) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const threadsQuery = useQuery(api.hermesThreads.listThreads);
  const teamMembersQuery = useQuery(api.teamMembers.list);
  const officePresenceQuery = useQuery(api.officePresence.list);
  const [selectedThreadId, setSelectedThreadId] = useState<Id<"hermesThreads"> | null>(null);
  const [fallbackThreads, setFallbackThreads] = useState<HermesThreadDoc[] | null>(null);

  const threads = sortThreadsForTabs(threadsQuery ?? fallbackThreads ?? initialThreads ?? EMPTY_THREADS);
  const teamMembers = teamMembersQuery ?? initialTeamMembers ?? EMPTY_TEAM_MEMBERS;
  const officePresence = officePresenceQuery ?? initialOfficePresence ?? EMPTY_OFFICE_PRESENCE;
  const requestedThreadId = searchParams.get("thread") as Id<"hermesThreads"> | null;
  const activeThread = useMemo(
    () => threads.find((thread) => thread._id === selectedThreadId) ?? null,
    [selectedThreadId, threads],
  );
  const messagesQuery = useQuery(
    api.hermesThreads.listMessages,
    selectedThreadId ? { threadId: selectedThreadId } : "skip",
  );
  const activeMessages = messagesQuery ?? EMPTY_MESSAGES;
  const queuedPrompt = getQueuedPromptForTerminal(activeThread, activeMessages);
  const activeOfficeAgentLabel = activeThread?.officeAgentName
    ? `${activeThread.officeAgentName}${activeThread.officeAgentRoleTitle ? ` · ${activeThread.officeAgentRoleTitle}` : ""}`
    : null;

  useEffect(() => {
    if (!requestedThreadId || selectedThreadId === requestedThreadId) {
      return;
    }

    const requestedThreadExists = threads.some((thread) => thread._id === requestedThreadId);
    if (requestedThreadExists) {
      setSelectedThreadId(requestedThreadId);
    }
  }, [requestedThreadId, selectedThreadId, threads]);

  useEffect(() => {
    if (selectedThreadId && threads.some((thread) => thread._id === selectedThreadId)) {
      return;
    }

    setSelectedThreadId(threads[0]?._id ?? null);
  }, [selectedThreadId, threads]);

  async function handleCreateSession() {
    const title = getNextSessionTitle(threads);
    const officeAgentId = choosePixelAgentForSession(teamMembers, officePresence, threads);
    const createdThread = await createHermesThreadViaServer({
      title,
      officeAgentId,
    });

    setFallbackThreads(createdThread.threads);
    setSelectedThreadId(createdThread.threadId);
    router.replace(`/mission-control/hermes?thread=${createdThread.threadId}`);
  }

  async function handleCloseSession(threadId: string) {
    const typedThreadId = threadId as Id<"hermesThreads">;
    const closingIndex = threads.findIndex((thread) => thread._id === typedThreadId);
    const response = await deleteHermesThreadViaServer(typedThreadId);
    const nextThreads = sortThreadsForTabs(response.threads);

    setFallbackThreads(nextThreads);

    if (typedThreadId !== selectedThreadId) {
      return;
    }

    const nextActiveThread = nextThreads[Math.max(0, Math.min(closingIndex, nextThreads.length - 1))] ?? null;
    setSelectedThreadId(nextActiveThread?._id ?? null);
    router.replace(nextActiveThread ? `/mission-control/hermes?thread=${nextActiveThread._id}` : "/mission-control/hermes");
  }

  function handleSelectSession(threadId: string) {
    const typedThreadId = threadId as Id<"hermesThreads">;
    setSelectedThreadId(typedThreadId);
    router.replace(`/mission-control/hermes?thread=${typedThreadId}`);
  }

  return (
    <MissionControlHermesLayout
      sessions={threads.map((thread) => ({
        id: thread._id,
        title: thread.title,
        active: thread._id === selectedThreadId,
        officeAgentName: thread.officeAgentName,
        officeAgentRoleTitle: thread.officeAgentRoleTitle,
      }))}
      activeSessionId={selectedThreadId}
      activeOfficeAgentLabel={activeOfficeAgentLabel}
      queuedPrompt={queuedPrompt}
      onNewSession={() => {
        void handleCreateSession();
      }}
      onSessionSelect={handleSelectSession}
      onSessionClose={(threadId) => {
        void handleCloseSession(threadId);
      }}
      onTerminalStatusChange={() => undefined}
    />
  );
}

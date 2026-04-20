"use client";

import { useDeferredValue, useEffect, useMemo, useState } from "react";
import { useQuery } from "convex/react";

import type { Doc, Id } from "../../../convex/_generated/dataModel";
import { api } from "../../../convex/_generated/api";
import {
  type MemoryBrowserGroup,
  type MemoryReaderDocument,
  type MemoryReaderSection,
  type PinnedMemoryCard,
  MissionControlMemoryLayout,
} from "./MissionControlMemoryLayout";

type MemoryDoc = Doc<"memories">;

const EMPTY_MEMORIES: MemoryDoc[] = [];
const DAY_MS = 24 * 60 * 60 * 1000;
const EXPANDED_GROUP_LABELS = new Set(["Today", "Yesterday", "This Week", "Results"]);

const relativeTimeFormat = new Intl.RelativeTimeFormat("en", { numeric: "auto" });

const readerDateFormatter = new Intl.DateTimeFormat("en-US", {
  weekday: "long",
  month: "long",
  day: "numeric",
  year: "numeric",
  timeZone: "UTC",
});

const shortDateFormatter = new Intl.DateTimeFormat("en-US", {
  weekday: "short",
  month: "short",
  day: "numeric",
  timeZone: "UTC",
});

const monthYearFormatter = new Intl.DateTimeFormat("en-US", {
  month: "long",
  year: "numeric",
  timeZone: "UTC",
});

function startOfUtcDay(timestamp: number) {
  const date = new Date(timestamp);
  return Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate());
}

function startOfUtcWeek(timestamp: number) {
  const dayStart = startOfUtcDay(timestamp);
  const date = new Date(dayStart);
  return dayStart - date.getUTCDay() * DAY_MS;
}

function memoryTimestamp(memory: MemoryDoc) {
  return memory.documentDate ?? memory.updatedAt;
}

function formatRelativeTime(timestamp: number) {
  const diff = timestamp - Date.now();
  const minute = 60_000;
  const hour = 60 * minute;
  const day = 24 * hour;
  const week = 7 * day;

  if (Math.abs(diff) < minute) {
    return "just now";
  }
  if (Math.abs(diff) < hour) {
    return relativeTimeFormat.format(Math.round(diff / minute), "minute");
  }
  if (Math.abs(diff) < day) {
    return relativeTimeFormat.format(Math.round(diff / hour), "hour");
  }
  if (Math.abs(diff) < week) {
    return relativeTimeFormat.format(Math.round(diff / day), "day");
  }
  return relativeTimeFormat.format(Math.round(diff / week), "week");
}

function formatBytes(bytes: number) {
  if (bytes < 1024) {
    return `${bytes} B`;
  }
  return `${(bytes / 1024).toFixed(1)} KB`;
}

function getDocumentSize(memory: MemoryDoc) {
  return new TextEncoder().encode(memory.content).length;
}

export function browserMeta(memory: MemoryDoc) {
  return `${formatBytes(getDocumentSize(memory))} • ${memory.wordCount} words`;
}

function pinnedMeta(memory: MemoryDoc) {
  return `${memory.wordCount} words • Updated ${formatRelativeTime(memory.updatedAt)}`;
}

export function readerSubtitle(memory: MemoryDoc) {
  return `${readerDateFormatter.format(memoryTimestamp(memory))} • ${formatBytes(getDocumentSize(memory))} • ${memory.wordCount} words`;
}

function journalRowTitle(memory: MemoryDoc) {
  return shortDateFormatter.format(memoryTimestamp(memory));
}

function memoryListTitle(memory: MemoryDoc) {
  return memory.kind === "journal" ? journalRowTitle(memory) : memory.title;
}

function matchesSearch(memory: MemoryDoc, search: string) {
  if (!search) {
    return true;
  }

  const haystack = [memory.title, memory.summary, memory.content, memory.sourcePath, ...memory.tags]
    .filter(Boolean)
    .join(" ")
    .toLowerCase();

  return haystack.includes(search);
}

function groupJournalMemories(memories: MemoryDoc[]) {
  const todayStart = startOfUtcDay(Date.now());
  const yesterdayStart = todayStart - DAY_MS;
  const weekStart = startOfUtcWeek(Date.now());
  const now = new Date(todayStart);

  const groups = new Map<string, MemoryDoc[]>();

  for (const memory of memories) {
    const timestamp = memoryTimestamp(memory);
    const dayStart = startOfUtcDay(timestamp);
    const date = new Date(dayStart);

    let label: string;
    if (dayStart === todayStart) {
      label = "Today";
    } else if (dayStart === yesterdayStart) {
      label = "Yesterday";
    } else if (dayStart >= weekStart) {
      label = "This Week";
    } else if (date.getUTCFullYear() === now.getUTCFullYear() && date.getUTCMonth() === now.getUTCMonth()) {
      label = "This Month";
    } else {
      label = monthYearFormatter.format(timestamp);
    }

    groups.set(label, [...(groups.get(label) ?? []), memory]);
  }

  return Array.from(groups.entries()).map(([label, items]) => ({ label, items }));
}

function normalizeLine(line: string) {
  return line
    .replace(/^#{1,6}\s*/, "")
    .replace(/^[-*]\s*/, "• ")
    .replace(/^\d+\.\s*/, (match) => `${match}`)
    .trim();
}

function isTimestampHeading(line: string) {
  return /^\d{1,2}:\d{2}\s?(?:AM|PM)\s+[—-]\s+.+$/i.test(line.trim());
}

export function buildReaderSections(memory: MemoryDoc): MemoryReaderSection[] {
  const sections: MemoryReaderSection[] = [];

  if (memory.summary) {
    sections.push({
      id: `${memory._id}-summary`,
      body: [memory.summary],
    });
  }

  const blocks = memory.content.trim().split(/\n\s*\n/);

  for (const [index, block] of blocks.entries()) {
    const lines = block
      .split("\n")
      .map((line) => line.trim())
      .filter(Boolean);

    if (lines.length === 0) {
      continue;
    }

    const headingMatch = lines[0].match(/^#{1,6}\s+(.*)$/);
    const normalizedFirstLine = normalizeLine(lines[0]);
    const heading = headingMatch
      ? headingMatch[1]
      : isTimestampHeading(normalizedFirstLine)
        ? normalizedFirstLine
        : undefined;
    const remaining = heading ? lines.slice(1) : lines;
    let body = remaining.map(normalizeLine).filter(Boolean);

    if (heading && body[0] === heading) {
      body = body.slice(1);
    }

    if (!heading && body.length === 0) {
      continue;
    }

    sections.push({
      id: `${memory._id}-section-${index}`,
      heading,
      body: body.length > 0 ? body : [normalizeLine(lines[0])],
    });
  }

  return sections;
}

function countLabel(count: number, singular: string, plural = `${singular}s`) {
  return `${count} ${count === 1 ? singular : plural}`;
}

export function MissionControlMemoryView({ initialMemories }: { initialMemories: MemoryDoc[] }) {
  const memoriesQuery = useQuery(api.memories.list);

  const [searchText, setSearchText] = useState("");
  const [selectedMemoryId, setSelectedMemoryId] = useState<Id<"memories"> | null>(null);

  const deferredSearch = useDeferredValue(searchText.trim().toLowerCase());
  const memories = memoriesQuery ?? initialMemories ?? EMPTY_MEMORIES;

  const filteredMemories = useMemo(
    () => memories.filter((memory) => matchesSearch(memory, deferredSearch)),
    [deferredSearch, memories],
  );

  const sortedMemories = useMemo(
    () => [...filteredMemories].sort((left, right) => memoryTimestamp(right) - memoryTimestamp(left)),
    [filteredMemories],
  );

  const pinnedMemory = useMemo(
    () => sortedMemories.find((memory) => memory.pinned) ?? sortedMemories.find((memory) => memory.kind === "long_term") ?? null,
    [sortedMemories],
  );

  const journalMemories = useMemo(
    () => sortedMemories.filter((memory) => memory.kind === "journal"),
    [sortedMemories],
  );

  const nonJournalMemories = useMemo(
    () => sortedMemories.filter((memory) => memory.kind !== "journal" && memory._id !== pinnedMemory?._id),
    [pinnedMemory?._id, sortedMemories],
  );

  const defaultSelectedId = useMemo(() => {
    if (sortedMemories.length === 0) {
      return null;
    }

    if (deferredSearch) {
      return sortedMemories[0]?._id ?? null;
    }

    return journalMemories[0]?._id ?? pinnedMemory?._id ?? nonJournalMemories[0]?._id ?? sortedMemories[0]?._id ?? null;
  }, [deferredSearch, journalMemories, nonJournalMemories, pinnedMemory?._id, sortedMemories]);

  const effectiveSelectedId = selectedMemoryId ?? defaultSelectedId;

  useEffect(() => {
    if (!defaultSelectedId) {
      setSelectedMemoryId(null);
      return;
    }

    const hasSelection = selectedMemoryId ? sortedMemories.some((memory) => memory._id === selectedMemoryId) : false;
    if (!hasSelection && selectedMemoryId !== defaultSelectedId) {
      setSelectedMemoryId(defaultSelectedId);
    }
  }, [defaultSelectedId, selectedMemoryId, sortedMemories]);

  const selectedMemory = sortedMemories.find((memory) => memory._id === effectiveSelectedId) ?? null;

  const browserGroups = useMemo<MemoryBrowserGroup[]>(() => {
    if (deferredSearch) {
      return sortedMemories.length > 0
        ? [
            {
              id: "search-results",
              label: "Results",
              count: sortedMemories.length,
              expanded: true,
              items: sortedMemories.map((memory) => ({
                id: memory._id,
                title: memoryListTitle(memory),
                meta: browserMeta(memory),
                selected: selectedMemory?._id === memory._id,
                onSelect: () => setSelectedMemoryId(memory._id),
              })),
            },
          ]
        : [];
    }

    const journalGroups = groupJournalMemories(journalMemories).map((group) => ({
      id: `journal-${group.label.toLowerCase().replace(/\s+/g, "-")}`,
      label: group.label,
      count: group.items.length,
      expanded: EXPANDED_GROUP_LABELS.has(group.label),
      items: group.items.map((memory) => ({
        id: memory._id,
        title: journalRowTitle(memory),
        meta: browserMeta(memory),
        selected: selectedMemory?._id === memory._id,
        onSelect: () => setSelectedMemoryId(memory._id),
      })),
    }));

    if (
      selectedMemory &&
      selectedMemory.kind !== "journal" &&
      selectedMemory._id !== pinnedMemory?._id &&
      nonJournalMemories.some((memory) => memory._id === selectedMemory._id)
    ) {
      journalGroups.push({
        id: "open-memory",
        label: "Memory Notes",
        count: 1,
        expanded: true,
        items: [
          {
            id: selectedMemory._id,
            title: selectedMemory.title,
            meta: browserMeta(selectedMemory),
            selected: true,
            onSelect: () => setSelectedMemoryId(selectedMemory._id),
          },
        ],
      });
    }

    return journalGroups;
  }, [deferredSearch, journalMemories, nonJournalMemories, pinnedMemory?._id, selectedMemory, sortedMemories]);

  const reader = useMemo<MemoryReaderDocument | null>(() => {
    if (!selectedMemory) {
      return null;
    }

    return {
      title: selectedMemory.title,
      subtitle: readerSubtitle(selectedMemory),
      modifiedLabel: `Modified ${formatRelativeTime(selectedMemory.updatedAt)}`,
      sections: buildReaderSections(selectedMemory),
    };
  }, [selectedMemory]);

  const displayPinnedMemory: PinnedMemoryCard | null = deferredSearch || !pinnedMemory
    ? null
    : {
        id: pinnedMemory._id,
        title: pinnedMemory.title,
        meta: pinnedMeta(pinnedMemory),
        selected: selectedMemory?._id === pinnedMemory._id,
        onSelect: () => setSelectedMemoryId(pinnedMemory._id),
      };

  return (
    <MissionControlMemoryLayout
      searchText={searchText}
      onSearchChange={setSearchText}
      browserHeading={deferredSearch ? "SEARCH RESULTS" : "DAILY JOURNAL"}
      browserCountLabel={deferredSearch ? countLabel(sortedMemories.length, "match") : countLabel(journalMemories.length, "entry")}
      pinnedMemory={displayPinnedMemory}
      groups={browserGroups}
      reader={reader}
    />
  );
}

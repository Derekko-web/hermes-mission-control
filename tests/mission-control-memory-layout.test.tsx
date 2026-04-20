import assert from "node:assert/strict";
import test from "node:test";
import { renderToStaticMarkup } from "react-dom/server";

import { MissionControlMemoryLayout } from "../src/components/mission-control/MissionControlMemoryLayout";

test("renders the redesigned memory browser and journal reader layout", () => {
  const markup = renderToStaticMarkup(
    <MissionControlMemoryLayout
      searchText=""
      onSearchChange={() => undefined}
      browserCountLabel="2 entries"
      pinnedMemory={{
        id: "mem-long-term",
        title: "Long-Term Memory",
        meta: "841 words • Updated 3 days ago",
      }}
      groups={[
        {
          id: "yesterday",
          label: "Yesterday",
          count: 1,
          expanded: true,
          items: [
            {
              id: "journal-2026-04-20",
              title: "Tue, Apr 20",
              meta: "4.1 KB • 648 words",
              selected: true,
            },
          ],
        },
        {
          id: "this-week",
          label: "This Week",
          count: 1,
          expanded: true,
          items: [
            {
              id: "journal-2026-04-19",
              title: "Mon, Apr 19",
              meta: "3.8 KB • 592 words",
              selected: false,
            },
          ],
        },
        {
          id: "this-month",
          label: "This Month",
          count: 4,
          expanded: false,
          items: [],
        },
      ]}
      reader={{
        title: "Journal: 2026-04-20",
        subtitle: "Tuesday, April 20, 2026 • 4.1 KB • 648 words",
        modifiedLabel: "Modified about 14 hours ago",
        sections: [
          {
            id: "sec-1",
            heading: "05:37 AM — Architecture Review",
            body: [
              "Decision: Keep Mission Control as the durable operating layer for tasks, schedules, and memory.",
            ],
          },
          {
            id: "sec-2",
            heading: "09:12 AM — Journal Layout Direction",
            body: [
              "What happened: We chose a denser browser + reader layout so notes feel like a proper internal journal instead of cards.",
            ],
          },
        ],
      }}
    />,
  );

  assert.match(markup, /Search memory…|Search memory\.\.\./);
  assert.match(markup, /Long-Term Memory/);
  assert.match(markup, /data-slot="pinned-memory-icon"/);
  assert.match(markup, /data-slot="pinned-memory-favorite"/);
  assert.match(markup, /lucide-brain/);
  assert.match(markup, /lucide-sparkles/);
  assert.doesNotMatch(markup, /lucide-star/);
  assert.match(markup, /Long-Term Memory<\/p><svg[^>]*data-slot="pinned-memory-favorite"/);
  assert.match(markup, /DAILY JOURNAL/);
  assert.match(markup, /2 entries/);
  assert.match(markup, /data-slot="memory-browser-heading"/);
  assert.match(markup, /data-slot="memory-browser-heading-icon"/);
  assert.match(markup, /(data-slot="memory-browser-heading-icon"[^>]*lucide-book-open|lucide-book-open[^>]*data-slot="memory-browser-heading-icon")/);
  assert.doesNotMatch(markup, /data-slot="memory-browser-heading-icon" class="flex /);
  assert.match(markup, /DAILY JOURNAL<\/p><span/);
  assert.match(markup, /Yesterday \(1\)/);
  assert.match(markup, /This Week \(1\)/);
  assert.match(markup, /This Month \(4\)/);
  assert.match(markup, /Journal: 2026-04-20/);
  assert.match(markup, /05:37 AM — Architecture Review/);
  assert.doesNotMatch(markup, /Tuesday, April 20, 2026 • 05:37 AM • 4\.1 KB • 648 words/);
  assert.doesNotMatch(markup, /05:37 AM • 4\.1 KB • 648 words/);
  assert.match(markup, /Modified about 14 hours ago/);
  assert.match(markup, /data-slot="memory-browser-panel"/);
  assert.match(markup, /data-slot="memory-reader-panel"/);
  assert.match(markup, /data-slot="memory-entry-block"/);
  assert.match(markup, /data-slot="memory-journal-row"/);
  assert.match(markup, /data-slot="memory-browser-guide"/);
  assert.match(markup, /rounded-\[12px\]/);
  assert.match(markup, /grid-cols-\[minmax\(340px,380px\)_minmax\(0,1fr\)\]/);
  assert.match(markup, /overflow-y-auto/);
});

import assert from "node:assert/strict";
import test from "node:test";
import { renderToStaticMarkup } from "react-dom/server";

import { MissionControlCalendarLayout } from "../src/components/mission-control/MissionControlCalendarLayout";

function countMatches(haystack: string, pattern: RegExp) {
  return [...haystack.matchAll(pattern)].length;
}

test("renders the redesigned calendar dashboard structure without the removed top controls", () => {
  const markup = renderToStaticMarkup(
    <MissionControlCalendarLayout
      isComposerOpen={false}
      onToggleComposer={() => undefined}
      composer={null}
      title="Scheduled Tasks"
      subtitle="Mission Control automated routines"
      runningItems={[
        { id: "run-1", label: "mission control pulse", meta: "Every 30 mins", color: "cyan" },
      ]}
      currentViewLabel="Week"
      secondaryViewLabel="Today"
      days={[
        {
          id: "sun",
          dayLabel: "Sun",
          dateLabel: "Apr 20",
          isCurrent: false,
          items: [{ id: "evt-1", title: "newsletter prep", timeLabel: "08:00 UTC", color: "amber" }],
        },
        {
          id: "mon",
          dayLabel: "Mon",
          dateLabel: "Apr 21",
          isCurrent: false,
          items: [{ id: "evt-2", title: "ops review", timeLabel: "09:00 UTC", color: "violet" }],
        },
        {
          id: "tue",
          dayLabel: "Tue",
          dateLabel: "Apr 22",
          isCurrent: false,
          items: [{ id: "evt-3", title: "agent sync", timeLabel: "10:00 UTC", color: "rose" }],
        },
        {
          id: "wed",
          dayLabel: "Wed",
          dateLabel: "Apr 23",
          isCurrent: true,
          items: [{ id: "evt-4", title: "calendar polish", timeLabel: "11:00 UTC", color: "emerald" }],
        },
        {
          id: "thu",
          dayLabel: "Thu",
          dateLabel: "Apr 24",
          isCurrent: false,
          items: [{ id: "evt-5", title: "ship review", timeLabel: "12:00 UTC", color: "indigo" }],
        },
        {
          id: "fri",
          dayLabel: "Fri",
          dateLabel: "Apr 25",
          isCurrent: false,
          items: [{ id: "evt-6", title: "retro prep", timeLabel: "13:00 UTC", color: "cyan" }],
        },
        {
          id: "sat",
          dayLabel: "Sat",
          dateLabel: "Apr 26",
          isCurrent: false,
          items: [{ id: "evt-7", title: "weekly digest", timeLabel: "14:00 UTC", color: "amber" }],
        },
      ]}
      nextUpItems={[
        { id: "next-1", title: "mission control pulse", whenLabel: "in 28 mins", color: "cyan" },
        { id: "next-2", title: "ops review", whenLabel: "in 1 hour", color: "violet" },
      ]}
    />,
  );

  assert.match(markup, /Scheduled Tasks/);
  assert.match(markup, /Always Running/);
  assert.match(markup, /Next Up/);
  assert.doesNotMatch(markup, /data-slot="calendar-toolbar"/);
  assert.doesNotMatch(markup, />Calendar</);
  assert.doesNotMatch(markup, />Search</);
  assert.doesNotMatch(markup, /Live schedule/);
  assert.doesNotMatch(markup, />Pause</);
  assert.doesNotMatch(markup, /Ping Codex/);
  assert.match(markup, />Week</);
  assert.match(markup, />Today</);
  assert.equal(countMatches(markup, /data-slot="calendar-day-card"/g), 7);
  assert.equal(countMatches(markup, /data-slot="calendar-event"/g), 7);
  assert.equal(countMatches(markup, /data-slot="calendar-next-row"/g), 2);
  assert.match(markup, /data-current-day="true"/);
  assert.match(markup, /grid-cols-7/);
  assert.match(markup, /rounded-\[22px\]/);
  assert.match(markup, /min-h-\[210px\]/);
  assert.match(markup, /rounded-\[10px\]/);
});

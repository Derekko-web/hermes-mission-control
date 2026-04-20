import assert from "node:assert/strict";
import test from "node:test";
import { renderToStaticMarkup } from "react-dom/server";

import { MissionControlOfficeLayout } from "../src/components/mission-control/MissionControlOfficeLayout";

function countMatches(haystack: string, pattern: RegExp) {
  return [...haystack.matchAll(pattern)].length;
}

test("renders the refined office operations layout with live-only activity and idle clustering", () => {
  const markup = renderToStaticMarkup(
    <MissionControlOfficeLayout
      title="The Office"
      subtitle="Mission Control headquarters"
      sceneMembers={[
        {
          id: "codex",
          name: "Codex",
          roleTitle: "Lead Builder",
          area: "south_station",
          statusLabel: "Working",
          currentTask: "Build the digital office screen",
          activeTool: "Mission Control",
          accent: "amber",
          avatarLabel: "C",
          presenceMode: "desk",
          showBubble: true,
        },
        {
          id: "mcclintock",
          name: "McClintock",
          roleTitle: "Architecture Scout",
          area: "north_station",
          statusLabel: "Idle",
          currentTask: "Trace implementation edges",
          activeTool: "Codebase",
          accent: "emerald",
          avatarLabel: "M",
          presenceMode: "idle",
          showBubble: false,
        },
        {
          id: "lorentz",
          name: "Lorentz",
          roleTitle: "Designer Specialist",
          area: "northeast_station",
          statusLabel: "Idle",
          currentTask: "Polish office layout",
          activeTool: "Design system",
          accent: "rose",
          avatarLabel: "L",
          presenceMode: "idle",
          showBubble: false,
        },
        {
          id: "banach",
          name: "Banach",
          roleTitle: "Writer Specialist",
          area: "east_station",
          statusLabel: "Idle",
          currentTask: "Refine status copy",
          activeTool: "Docs",
          accent: "violet",
          avatarLabel: "B",
          presenceMode: "idle",
          showBubble: false,
        },
      ]}
      activityTitle="Live Activity"
      activityItems={[
        {
          id: "activity-1",
          memberName: "Codex",
          detail: "Build the digital office screen",
          meta: "Working · South station · Mission Control · just now",
          tone: "amber",
        },
      ]}
    />,
  );

  assert.match(markup, /The Office/);
  assert.match(markup, /Mission Control headquarters/);
  assert.doesNotMatch(markup, /live presence map/);
  assert.doesNotMatch(markup, /5 agents active/);
  assert.doesNotMatch(markup, /Presence view/);
  assert.doesNotMatch(markup, /Presence map/);
  assert.doesNotMatch(markup, /HQ floor/);
  assert.doesNotMatch(markup, /Presence feed/);
  assert.match(markup, /Live Activity/);
  assert.match(markup, /Build the digital office screen/);
  assert.doesNotMatch(markup, /data-slot="office-status-strip"/);
  assert.doesNotMatch(markup, /data-slot="office-status-legend"/);
  assert.match(markup, /data-slot="office-scene-panel"/);
  assert.match(markup, /data-slot="office-scene"/);
  assert.equal(countMatches(markup, /data-slot="office-scene-desk"/g), 5);
  assert.equal(countMatches(markup, /data-slot="office-scene-desk"[^>]*data-area="/g), 5);
  assert.match(markup, /data-slot="office-scene-desk"[^>]*data-area="south_station"/);
  assert.match(markup, /data-slot="office-scene-desk"[^>]*data-area="north_station"/);
  assert.doesNotMatch(markup, /data-slot="office-scene-desk" class=/);
  assert.match(markup, /data-slot="office-scene-avatar"[^>]*data-state="desk"/);
  assert.match(markup, /data-slot="office-scene-avatar"[^>]*data-state="idle"/);
  assert.equal(countMatches(markup, /data-slot="office-scene-avatar"[^>]*data-state="idle"/g), 3);
  assert.match(markup, /data-slot="office-scene-name"/);
  assert.equal(countMatches(markup, /data-slot="office-scene-bubble"/g), 1);
  assert.match(markup, /left-\[57%\] top-\[73%\] -translate-x-1\/2/);
  assert.match(markup, /left-\[57%\] top-\[79%\] -translate-x-1\/2/);
  assert.match(markup, /left-\[51%\] top-\[66%\]/);
  assert.match(markup, /left-\[27%\] top-\[75%\] -translate-x-1\/2 -translate-y-1\/2/);
  assert.match(markup, /left-\[67%\] top-\[75%\] -translate-x-1\/2 -translate-y-1\/2/);
  assert.match(markup, /left-\[57%\] top-\[75%\] -translate-x-1\/2 -translate-y-1\/2/);
  assert.doesNotMatch(markup, /rounded-\[4px\] border border-white\/10 bg-\[#0c0d10\]/);
  assert.match(markup, /data-slot="office-activity-panel"/);
  assert.equal(countMatches(markup, /data-slot="office-activity-row"/g), 1);
  assert.match(markup, /grid-cols-\[minmax\(0,1fr\)_248px\]/);
  assert.match(markup, /rounded-\[12px\]/);
  assert.match(markup, /aspect-\[16\/10\.5\]/);
});

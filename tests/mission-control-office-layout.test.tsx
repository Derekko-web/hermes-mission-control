import assert from "node:assert/strict";
import test from "node:test";
import { renderToStaticMarkup } from "react-dom/server";

import { MISSION_CONTROL_TEMPLATE } from "../shared/missionControlTemplate";
import { MissionControlOfficeLayout } from "../src/components/mission-control/MissionControlOfficeLayout";

function countMatches(haystack: string, pattern: RegExp) {
  return [...haystack.matchAll(pattern)].length;
}

const [lead, architect, , writer, designer] = MISSION_CONTROL_TEMPLATE.operators;

test("renders the refined office operations layout with portable operator labels", () => {
  const markup = renderToStaticMarkup(
    <MissionControlOfficeLayout
      title="The Office"
      subtitle="Mission Control headquarters"
      sceneMembers={[
        {
          id: lead.id,
          name: lead.label,
          roleTitle: lead.roleTitle,
          area: "south_station",
          statusLabel: "Working",
          currentTask: "Customize the portable workspace template",
          activeTool: "Mission Control",
          accent: "amber",
          avatarLabel: lead.avatarLabel,
          presenceMode: "desk",
          showBubble: true,
        },
        {
          id: architect.id,
          name: architect.label,
          roleTitle: architect.roleTitle,
          area: "north_station",
          statusLabel: "Idle",
          currentTask: "Map local repo boundaries",
          activeTool: "Codebase",
          accent: "emerald",
          avatarLabel: architect.avatarLabel,
          presenceMode: "idle",
          showBubble: false,
        },
        {
          id: designer.id,
          name: designer.label,
          roleTitle: designer.roleTitle,
          area: "northeast_station",
          statusLabel: "Idle",
          currentTask: "Polish portable workspace shell",
          activeTool: "Design system",
          accent: "rose",
          avatarLabel: designer.avatarLabel,
          presenceMode: "idle",
          showBubble: false,
        },
        {
          id: writer.id,
          name: writer.label,
          roleTitle: writer.roleTitle,
          area: "east_station",
          statusLabel: "Idle",
          currentTask: "Document local setup notes",
          activeTool: "Docs",
          accent: "violet",
          avatarLabel: writer.avatarLabel,
          presenceMode: "idle",
          showBubble: false,
        },
      ]}
      activityTitle="Live Activity"
      activityItems={[
        {
          id: "activity-1",
          memberName: lead.label,
          detail: "Customize the portable workspace template",
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
  assert.match(markup, /Customize the portable workspace template/);
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

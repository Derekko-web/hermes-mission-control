import assert from "node:assert/strict";
import test from "node:test";
import { renderToStaticMarkup } from "react-dom/server";

import { MISSION_CONTROL_TEMPLATE } from "../shared/missionControlTemplate";
import { MissionControlOfficeLayout } from "../src/components/mission-control/MissionControlOfficeLayout";

function countMatches(haystack: string, pattern: RegExp) {
  return [...haystack.matchAll(pattern)].length;
}

const [lead, architect] = MISSION_CONTROL_TEMPLATE.operators;

test("renders the Pixel Agents office shell with live activity beside the canvas", () => {
  const markup = renderToStaticMarkup(
    <MissionControlOfficeLayout
      title="The Office"
      subtitle="Mission Control headquarters"
      agents={[
        {
          id: 1,
          memberId: lead.id,
          name: lead.label,
          roleTitle: lead.roleTitle,
          statusLabel: "Working",
          activity: "Customize the portable workspace template",
          activeTool: "Mission Control",
          isActive: true,
        },
        {
          id: 2,
          memberId: architect.id,
          name: architect.label,
          roleTitle: architect.roleTitle,
          statusLabel: "Idle",
          activity: "Map local repo boundaries",
          activeTool: "Codebase",
          isActive: false,
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
  assert.match(markup, /1 active/);
  assert.match(markup, /data-slot="office-scene-panel"/);
  assert.match(markup, /data-slot="pixel-agents-office-loading"/);
  assert.match(markup, /Loading Pixel Agents office/);
  assert.match(markup, /data-slot="office-activity-panel"/);
  assert.equal(countMatches(markup, /data-slot="office-activity-row"/g), 1);
  assert.match(markup, /Live Activity/);
  assert.match(markup, /Customize the portable workspace template/);
  assert.match(markup, /grid-cols-\[minmax\(0,1fr\)_284px\]/);

  assert.doesNotMatch(markup, /data-slot="office-scene-desk"/);
  assert.doesNotMatch(markup, /data-slot="office-scene-avatar"/);
  assert.doesNotMatch(markup, /data-slot="office-scene-bubble"/);
  assert.doesNotMatch(markup, /aspect-\[16\/10\.5\]/);
});

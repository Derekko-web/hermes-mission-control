import assert from "node:assert/strict";
import test from "node:test";
import { renderToStaticMarkup } from "react-dom/server";

import { MISSION_CONTROL_TEMPLATE } from "../shared/missionControlTemplate";
import { MissionControlTeamLayout } from "../src/components/mission-control/MissionControlTeamLayout";

const accentByColor = {
  amber: "amber",
  cyan: "cyan",
  emerald: "emerald",
  indigo: "indigo",
  rose: "rose",
  violet: "violet",
} as const;

test("renders the screenshot-style Meet the Team org chart without vendor-specific roster names", () => {
  const [leader, ...directReports] = MISSION_CONTROL_TEMPLATE.operators;

  const markup = renderToStaticMarkup(
    <MissionControlTeamLayout
      title="Meet the Team"
      leader={{
        id: leader.id,
        name: leader.label,
        role: leader.roleTitle,
        summary: leader.summary,
        avatarLabel: leader.avatarLabel,
        accent: accentByColor[leader.color],
        chips: leader.focusAreas,
        meta: "Always on",
      }}
      middleLabelLeft="INPUT SIGNAL"
      middleLabelRight="OUTPUT ACTION"
      directReports={directReports.map((operator) => ({
        id: operator.id,
        name: operator.label,
        role: operator.roleTitle,
        summary: operator.summary,
        avatarLabel: operator.avatarLabel,
        accent: accentByColor[operator.color],
        chips: operator.focusAreas,
        meta: "Role card →",
      }))}
      metaLabel="META LAYER"
      metaNode={{
        id: "operating-model",
        name: "Operating Model",
        role: "Delegation System",
        summary: `${leader.label} routes work across the recurring developer, writer, and designer lanes and keeps the roster coherent.`,
        avatarLabel: "◎",
        accent: "indigo",
        chips: [`${directReports.length} subagents`, "3 disciplines", "Template roster"],
        meta: "Role card →",
      }}
    />,
  );

  assert.match(markup, /Meet the Team/);
  assert.doesNotMatch(markup, /Mission Control/);
  assert.doesNotMatch(markup, /Team Structure/);
  assert.doesNotMatch(markup, /Codex plus the recurring subagents/);
  assert.match(markup, /data-slot="team-page-title"/);
  assert.match(markup, /text-center/);
  assert.match(markup, /data-slot="team-org-chart"/);
  assert.match(markup, /data-slot="team-card-leader"/);
  assert.match(markup, /data-slot="team-connector-grid"/);
  assert.match(markup, /data-slot="team-flow-label-left"/);
  assert.match(markup, /data-slot="team-flow-label-right"/);
  assert.match(markup, /data-slot="team-meta-label"/);
  assert.match(markup, /data-slot="team-card-direct-report"/);
  assert.match(markup, /data-slot="team-card-support"/);
  assert.match(markup, /INPUT SIGNAL/);
  assert.match(markup, /OUTPUT ACTION/);
  assert.match(markup, /META LAYER/);
  assert.match(markup, new RegExp(leader.label));

  for (const operator of directReports) {
    assert.match(markup, new RegExp(operator.label));
  }

  assert.match(markup, /Operating Model/);
  assert.match(markup, /max-w-\[720px\]/);
  assert.match(markup, /lg:grid-cols-4/);
  assert.match(markup, /rounded-\[12px\]/);
  assert.match(markup, /border-white\/\[0\.08\]/);
  assert.match(markup, /bg-\[#0b0b0d\]/);
});

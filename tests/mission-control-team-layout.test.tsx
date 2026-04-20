import assert from "node:assert/strict";
import test from "node:test";
import { renderToStaticMarkup } from "react-dom/server";

import { MissionControlTeamLayout } from "../src/components/mission-control/MissionControlTeamLayout";

test("renders the screenshot-style Meet the Team org chart without the old header copy", () => {
  const markup = renderToStaticMarkup(
    <MissionControlTeamLayout
      title="Meet the Team"
      leader={{
        id: "codex",
        name: "Codex",
        role: "Mission Lead",
        summary: "Owns delivery, decides when to delegate, and stitches every specialist lane back into one shippable result.",
        avatarLabel: "C",
        accent: "amber",
        chips: ["Planning", "Execution", "Integration"],
        meta: "Always on",
      }}
      middleLabelLeft="INPUT SIGNAL"
      middleLabelRight="OUTPUT ACTION"
      directReports={[
        {
          id: "mcclintock",
          name: "McClintock",
          role: "Architecture Scout",
          summary: "Explores repo boundaries, dependencies, and hidden coupling before edits begin.",
          avatarLabel: "M",
          accent: "emerald",
          chips: ["Recon", "Risk", "Boundaries"],
          meta: "Role card →",
        },
        {
          id: "confucius",
          name: "Confucius",
          role: "Implementation Engineer",
          summary: "Turns scoped work into concrete code, fixes, tests, and glue logic.",
          avatarLabel: "C",
          accent: "cyan",
          chips: ["Build", "Fixes", "Tests"],
          meta: "Role card →",
        },
        {
          id: "banach",
          name: "Banach",
          role: "Writer Specialist",
          summary: "Sharpens messaging so the final output is crisp, human, and technically honest.",
          avatarLabel: "B",
          accent: "violet",
          chips: ["Docs", "Voice", "Clarity"],
          meta: "Role card →",
        },
        {
          id: "lorentz",
          name: "Lorentz",
          role: "Product Designer",
          summary: "Translates intent into polished interfaces with stronger hierarchy and cleaner interaction decisions.",
          avatarLabel: "L",
          accent: "rose",
          chips: ["Layout", "Polish", "Direction"],
          meta: "Role card →",
        },
      ]}
      metaLabel="META LAYER"
      metaNode={{
        id: "operating-model",
        name: "Operating Model",
        role: "Delegation System",
        summary: "Routes work across the recurring developer, writer, and designer lanes and keeps the roster coherent.",
        avatarLabel: "◎",
        accent: "indigo",
        chips: ["4 subagents", "3 disciplines", "Live roster"],
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
  assert.match(markup, /Codex/);
  assert.match(markup, /McClintock/);
  assert.match(markup, /Confucius/);
  assert.match(markup, /Banach/);
  assert.match(markup, /Lorentz/);
  assert.match(markup, /Operating Model/);
  assert.match(markup, /max-w-\[720px\]/);
  assert.match(markup, /lg:grid-cols-4/);
  assert.match(markup, /rounded-\[12px\]/);
  assert.match(markup, /border-white\/\[0\.08\]/);
  assert.match(markup, /bg-\[#0b0b0d\]/);
});

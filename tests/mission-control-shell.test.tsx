import assert from "node:assert/strict";
import test from "node:test";
import { renderToStaticMarkup } from "react-dom/server";

import { MissionControlShell } from "../src/components/mission-control/MissionControlShell";

test("renders only the requested live Mission Control tools in the sidebar", () => {
  const markup = renderToStaticMarkup(
    <MissionControlShell tool="calendar">
      <div>Calendar content</div>
    </MissionControlShell>,
  );

  for (const label of ["Tasks", "Calendar", "Memory", "Office", "Team", "Hermes"]) {
    assert.match(markup, new RegExp(`>${label}<`));
  }

  assert.doesNotMatch(markup, />Soon</);
  assert.doesNotMatch(markup, />Live</);

  for (const removedLabel of ["Content", "Approvals", "Council", "Projects", "Docs", "People"]) {
    assert.doesNotMatch(markup, new RegExp(`>${removedLabel}<`));
  }
});

test("uses the Tasks and Calendar sidebar width as the standard for every Mission Control tool", () => {
  const cases = [
    { tool: "calendar" as const, content: "Calendar content" },
    { tool: "memory" as const, content: "Memory content" },
    { tool: "office" as const, content: "Office content" },
    { tool: "team" as const, content: "Team content" },
    { tool: "hermes" as const, content: "Hermes content" },
  ];

  for (const { tool, content } of cases) {
    const markup = renderToStaticMarkup(<MissionControlShell tool={tool}>{content}</MissionControlShell>);

    assert.match(markup, /Mission Control/);
    assert.match(markup, /188px_minmax\(0,1fr\)/, `${tool} should use the standard 188px sidebar width`);
    if (tool === "calendar") {
      assert.match(markup, /data-slot="mission-control-sidebar-brand"/);
    } else {
      assert.match(markup, /data-slot="mission-control-primary-sidebar"/);
    }
    assert.doesNotMatch(markup, /132px_minmax\(0,1fr\)/, `${tool} should not use the old narrow office width`);
    assert.doesNotMatch(markup, /140px_minmax\(0,1fr\)/, `${tool} should not use the old narrow team width`);
    assert.doesNotMatch(markup, /164px_minmax\(0,1fr\)/, `${tool} should not use the old compact width`);
  }
});

test("renders the Team route inside the compact sidebar shell", () => {
  const markup = renderToStaticMarkup(
    <MissionControlShell tool="team">
      <div>Team content</div>
    </MissionControlShell>,
  );

  assert.doesNotMatch(markup, /data-slot="mission-control-topbar"/);
  assert.match(markup, /data-slot="mission-control-primary-sidebar"/);
  assert.match(markup, /data-slot="mission-control-sidebar-brand"/);
  assert.match(markup, /Mission Control/);
  assert.match(markup, /data-slot="mission-control-workspace"/);
  assert.match(markup, /overflow-y-auto bg-\[#0b0b0d\]/);
});

test("renders the Hermes route inside the compact Mission Control shell with the left tool panel", () => {
  const markup = renderToStaticMarkup(
    <MissionControlShell tool="hermes">
      <div>Hermes content</div>
    </MissionControlShell>,
  );

  assert.match(markup, /Hermes content/);
  assert.match(markup, /data-slot="mission-control-primary-sidebar"/);
  assert.match(markup, /data-slot="mission-control-sidebar-brand"/);
  assert.match(markup, /data-slot="mission-control-workspace"/);
});

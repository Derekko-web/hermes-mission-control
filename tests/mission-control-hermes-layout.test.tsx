import assert from "node:assert/strict";
import test from "node:test";
import { renderToStaticMarkup } from "react-dom/server";

import { MissionControlHermesLayout } from "../src/components/mission-control/MissionControlHermesLayout";

test("renders a Hive-style Hermes tab strip and active terminal pane", () => {
  const markup = renderToStaticMarkup(
    <MissionControlHermesLayout
      sessions={[
        {
          id: "thread-1",
          title: "Session 1",
          active: true,
          officeAgentName: "Ada",
          officeAgentRoleTitle: "Builder",
        },
        {
          id: "thread-2",
          title: "Session 2",
          active: false,
        },
      ]}
      activeSessionId="thread-1"
      activeOfficeAgentLabel="Ada · Builder"
      queuedPrompt={null}
      onNewSession={() => undefined}
      onSessionSelect={() => undefined}
      onSessionClose={() => undefined}
    />,
  );

  assert.match(markup, /data-slot="hermes-topbar"/);
  assert.match(markup, /data-slot="hermes-new-session-button"/);
  assert.match(markup, /data-slot="hermes-session-tabs"/);
  assert.match(markup, /data-slot="hermes-session-tab"/);
  assert.match(markup, /data-slot="hermes-session-close"/);
  assert.match(markup, />Session 1</);
  assert.match(markup, />Session 2</);
  assert.match(markup, /Ada · Builder/);
  assert.match(markup, /data-slot="hermes-terminal-pane"/);
  assert.match(markup, /data-session-id="thread-1"/);
  assert.match(markup, /data-slot="hermes-terminal-container"/);
  assert.match(markup, /Connecting to Hermes terminal/);

  assert.doesNotMatch(markup, /data-slot="hermes-composer"/);
  assert.doesNotMatch(markup, /data-slot="hermes-message-list"/);
  assert.doesNotMatch(markup, /Ask me anything/);
  assert.doesNotMatch(markup, /Thinking process/);
});

test("shows a simple empty state when there are no Hermes sessions", () => {
  const markup = renderToStaticMarkup(
    <MissionControlHermesLayout
      sessions={[]}
      activeSessionId={null}
      activeOfficeAgentLabel={null}
      queuedPrompt={null}
      onNewSession={() => undefined}
      onSessionSelect={() => undefined}
      onSessionClose={() => undefined}
    />,
  );

  assert.match(markup, /data-slot="hermes-empty-state"/);
  assert.match(markup, /No Hermes sessions/);
  assert.match(markup, /Press plus to create a Hermes Agent terminal session/);
  assert.match(markup, /New session/);
  assert.doesNotMatch(markup, /data-slot="hermes-terminal-pane"/);
});

test("marks task handoff prompts as queued without rendering a chat composer", () => {
  const markup = renderToStaticMarkup(
    <MissionControlHermesLayout
      sessions={[
        {
          id: "thread-1",
          title: "Review launch handoff",
          active: true,
        },
      ]}
      activeSessionId="thread-1"
      queuedPrompt="Review launch handoff\n\nThis Mission Control card is linked here."
      onNewSession={() => undefined}
      onSessionSelect={() => undefined}
      onSessionClose={() => undefined}
    />,
  );

  assert.match(markup, /queued prompt ready/);
  assert.match(markup, /Hermes Agent/);
  assert.doesNotMatch(markup, /This Mission Control card is linked here/);
  assert.doesNotMatch(markup, /data-slot="hermes-composer"/);
});

import assert from "node:assert/strict";
import test from "node:test";
import { renderToStaticMarkup } from "react-dom/server";

import { MissionControlHermesLayout } from "../src/components/mission-control/MissionControlHermesLayout";

test("renders the redesigned Hermes chat shell, centered empty state, tabs, slash commands, and paste attachment tray", () => {
  const markup = renderToStaticMarkup(
    <MissionControlHermesLayout
      threads={[
        {
          id: "thread-1",
          title: "Sprint wrap-up",
          active: true,
        },
      ]}
      activeThreadTitle={null}
      messages={[]}
      draft="/com"
      pendingAttachments={[
        {
          id: "attachment-1",
          kind: "file",
          name: "notes.pdf",
          sizeLabel: "128 KB",
        },
      ]}
      slashCommands={[
        {
          id: "new",
          label: "/new",
          description: "Fresh session.",
        },
        {
          id: "commands",
          label: "/commands",
          description: "Browse all commands.",
        },
      ]}
      isSending={false}
      onNewChat={() => undefined}
      onThreadSelect={() => undefined}
      onThreadDelete={() => undefined}
      onDraftChange={() => undefined}
      onDraftKeyDown={() => undefined}
      onDraftPaste={() => undefined}
      onAttachClick={() => undefined}
      onRemovePendingAttachment={() => undefined}
      onSlashCommandSelect={() => undefined}
      onSubmit={() => undefined}
    />,
  );

  assert.match(markup, /data-slot="hermes-topbar"/);
  assert.match(markup, /data-slot="hermes-new-chat-button"/);
  assert.match(markup, /data-slot="hermes-thread-tab"/);
  assert.match(markup, /data-slot="hermes-thread-delete"/);
  assert.match(markup, />Sprint wrap-up</);
  assert.match(markup, /data-slot="hermes-empty-state"/);
  assert.match(markup, /Hello there!/);
  assert.match(markup, /How can I help you today\?/);
  assert.match(markup, /Ask me anything\.\.\./);
  assert.match(markup, /data-slot="hermes-composer"/);
  assert.match(markup, /data-slot="hermes-composer-attach"/);
  assert.match(markup, /data-slot="hermes-composer-send"/);
  assert.match(markup, /data-slot="hermes-slash-menu"/);
  assert.match(markup, />\/new</);
  assert.match(markup, />\/commands</);
  assert.match(markup, /Fresh session\./);
  assert.match(markup, /Browse all commands\./);
  assert.doesNotMatch(markup, />\/complete</);
  assert.match(markup, /data-slot="hermes-pending-attachment"/);
  assert.match(markup, /notes\.pdf/);
  assert.match(markup, /rounded-\[24px\]/);
  assert.match(markup, /max-w-\[672px\]/);
  assert.match(markup, /h-\[40px\]/);

  for (const legacyLabel of ["Realtime live", "Conversation history", "Starter prompts", "Selected thread"]) {
    assert.doesNotMatch(markup, new RegExp(legacyLabel));
  }
});

test("keeps the screenshot-style empty state visible for a newly created active tab with no messages", () => {
  const markup = renderToStaticMarkup(
    <MissionControlHermesLayout
      threads={[
        {
          id: "thread-1",
          title: "New chat",
          active: true,
        },
      ]}
      activeThreadTitle="New chat"
      messages={[]}
      draft=""
      pendingAttachments={[]}
      slashCommands={[]}
      isSending={false}
      onNewChat={() => undefined}
      onThreadSelect={() => undefined}
      onThreadDelete={() => undefined}
      onDraftChange={() => undefined}
      onDraftKeyDown={() => undefined}
      onDraftPaste={() => undefined}
      onAttachClick={() => undefined}
      onRemovePendingAttachment={() => undefined}
      onSlashCommandSelect={() => undefined}
      onSubmit={() => undefined}
    />,
  );

  assert.match(markup, /data-slot="hermes-thread-tab"/);
  assert.match(markup, />New chat</);
  assert.match(markup, /data-slot="hermes-empty-state"/);
  assert.match(markup, /Hello there!/);
  assert.doesNotMatch(markup, /data-slot="hermes-message-list"/);
});

test("renders active Hermes messages with attachment previews inside the same minimal shell", () => {
  const markup = renderToStaticMarkup(
    <MissionControlHermesLayout
      threads={[
        {
          id: "thread-1",
          title: "Design review",
          active: true,
        },
      ]}
      activeThreadTitle="Design review"
      messages={[
        {
          id: "message-1",
          role: "user",
          author: "You",
          createdAtLabel: "just now",
          content: "Can you review this mockup before we ship?",
          attachments: [
            {
              id: "attachment-1",
              kind: "image",
              name: "mockup.png",
              sizeLabel: "240 KB",
              previewUrl: "data:image/png;base64,AAAA",
            },
          ],
        },
      ]}
      draft=""
      pendingAttachments={[]}
      slashCommands={[]}
      isSending={false}
      onNewChat={() => undefined}
      onThreadSelect={() => undefined}
      onThreadDelete={() => undefined}
      onDraftChange={() => undefined}
      onDraftKeyDown={() => undefined}
      onDraftPaste={() => undefined}
      onAttachClick={() => undefined}
      onRemovePendingAttachment={() => undefined}
      onSlashCommandSelect={() => undefined}
      onSubmit={() => undefined}
    />,
  );

  assert.match(markup, /data-slot="hermes-message-list"/);
  assert.match(markup, /data-slot="hermes-message-bubble"/);
  assert.match(markup, /data-slot="hermes-message-attachment"/);
  assert.match(markup, /mockup\.png/);
  assert.match(markup, /Can you review this mockup before we ship\?/);
  assert.doesNotMatch(markup, /data-slot="hermes-empty-state"/);
});

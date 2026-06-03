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
      selectedModelId="gpt-5.4"
      selectedReasoningEffort="xhigh"
      fastModeEnabled={true}
      availableModels={[
        {
          id: "gpt-5.4",
          label: "GPT-5.4",
          providerLabel: "OpenAI Codex",
          supportsReasoning: true,
          supportsFastMode: true,
          reasoningOptions: ["minimal", "low", "medium", "high", "xhigh"],
        },
      ]}
      availableReasoningOptions={["minimal", "low", "medium", "high", "xhigh"]}
      showReasoningControl={true}
      showFastModeToggle={true}
      isSending={false}
      onModelChange={() => undefined}
      onReasoningChange={() => undefined}
      onFastModeToggle={() => undefined}
      onNewChat={() => undefined}
      onThreadSelect={() => undefined}
      onThreadDelete={() => undefined}
      onDraftChange={() => undefined}
      onDraftKeyDown={() => undefined}
      onDraftPaste={() => undefined}
      onAttachClick={() => undefined}
      onFilesDrop={() => undefined}
      onRemovePendingAttachment={() => undefined}
      onSlashCommandSelect={() => undefined}
      onVoiceMessageSubmit={() => undefined}
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
  assert.match(markup, /data-slot="hermes-model-select"/);
  assert.match(markup, /data-slot="hermes-reasoning-select"/);
  assert.match(markup, /data-slot="hermes-fast-toggle"/);
  assert.match(markup, /GPT-5\.4/);
  assert.match(markup, /OpenAI Codex/);
  assert.match(markup, /xhigh/);
  assert.match(markup, /Fast mode/);
  assert.match(markup, /data-slot="hermes-slash-menu"/);
  assert.match(markup, />\/new</);
  assert.match(markup, />\/commands</);
  assert.match(markup, /Fresh session\./);
  assert.match(markup, /Browse all commands\./);
  assert.doesNotMatch(markup, />\/complete</);
  assert.match(markup, /data-slot="hermes-pending-attachment"/);
  assert.match(markup, /notes\.pdf/);
  assert.match(markup, /rounded-3xl/);
  assert.match(markup, /max-w-\[672px\]/);
  assert.match(markup, /data-slot="hermes-thread-tabs"/);
  assert.match(markup, /flex-col gap-2/);
  assert.match(markup, /data-slot="hermes-settings-bar"/);

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
      selectedModelId="gpt-5.4"
      selectedReasoningEffort="xhigh"
      fastModeEnabled={true}
      availableModels={[
        {
          id: "gpt-5.4",
          label: "GPT-5.4",
          providerLabel: "OpenAI Codex",
          supportsReasoning: true,
          supportsFastMode: true,
          reasoningOptions: ["minimal", "low", "medium", "high", "xhigh"],
        },
      ]}
      availableReasoningOptions={["minimal", "low", "medium", "high", "xhigh"]}
      showReasoningControl={true}
      showFastModeToggle={true}
      isSending={false}
      onModelChange={() => undefined}
      onReasoningChange={() => undefined}
      onFastModeToggle={() => undefined}
      onNewChat={() => undefined}
      onThreadSelect={() => undefined}
      onThreadDelete={() => undefined}
      onDraftChange={() => undefined}
      onDraftKeyDown={() => undefined}
      onDraftPaste={() => undefined}
      onAttachClick={() => undefined}
      onFilesDrop={() => undefined}
      onRemovePendingAttachment={() => undefined}
      onSlashCommandSelect={() => undefined}
      onVoiceMessageSubmit={() => undefined}
      onSubmit={() => undefined}
    />,
  );

  assert.match(markup, /data-slot="hermes-thread-tab"/);
  assert.match(markup, />New chat</);
  assert.match(markup, /data-slot="hermes-empty-state"/);
  assert.match(markup, /Hello there!/);
  assert.doesNotMatch(markup, /data-slot="hermes-message-list"/);
});

test("hides reasoning and fast mode controls for models that do not support them", () => {
  const markup = renderToStaticMarkup(
    <MissionControlHermesLayout
      threads={[]}
      activeThreadTitle={null}
      messages={[]}
      draft=""
      pendingAttachments={[]}
      slashCommands={[]}
      selectedModelId="claude-code"
      selectedReasoningEffort={null}
      fastModeEnabled={false}
      availableModels={[
        {
          id: "claude-code",
          label: "Claude Code",
          providerLabel: "Anthropic",
          supportsReasoning: false,
          supportsFastMode: false,
          reasoningOptions: [],
        },
      ]}
      availableReasoningOptions={[]}
      showReasoningControl={false}
      showFastModeToggle={false}
      isSending={false}
      onModelChange={() => undefined}
      onReasoningChange={() => undefined}
      onFastModeToggle={() => undefined}
      onNewChat={() => undefined}
      onThreadSelect={() => undefined}
      onThreadDelete={() => undefined}
      onDraftChange={() => undefined}
      onDraftKeyDown={() => undefined}
      onDraftPaste={() => undefined}
      onAttachClick={() => undefined}
      onFilesDrop={() => undefined}
      onRemovePendingAttachment={() => undefined}
      onSlashCommandSelect={() => undefined}
      onVoiceMessageSubmit={() => undefined}
      onSubmit={() => undefined}
    />,
  );

  assert.match(markup, /data-slot="hermes-model-select"/);
  assert.match(markup, /Claude Code/);
  assert.doesNotMatch(markup, /data-slot="hermes-reasoning-select"/);
  assert.doesNotMatch(markup, /data-slot="hermes-fast-toggle"/);
});

test("shows the Hermes thinking process while a new empty chat is sending", () => {
  const markup = renderToStaticMarkup(
    <MissionControlHermesLayout
      threads={[]}
      activeThreadTitle={null}
      messages={[]}
      draft=""
      pendingAttachments={[]}
      slashCommands={[]}
      selectedModelId="gpt-5.4"
      selectedReasoningEffort="xhigh"
      fastModeEnabled={true}
      availableModels={[
        {
          id: "gpt-5.4",
          label: "GPT-5.4",
          providerLabel: "OpenAI Codex",
          supportsReasoning: true,
          supportsFastMode: true,
          reasoningOptions: ["minimal", "low", "medium", "high", "xhigh"],
        },
      ]}
      availableReasoningOptions={["minimal", "low", "medium", "high", "xhigh"]}
      showReasoningControl={true}
      showFastModeToggle={true}
      isSending={true}
      onModelChange={() => undefined}
      onReasoningChange={() => undefined}
      onFastModeToggle={() => undefined}
      onNewChat={() => undefined}
      onThreadSelect={() => undefined}
      onThreadDelete={() => undefined}
      onDraftChange={() => undefined}
      onDraftKeyDown={() => undefined}
      onDraftPaste={() => undefined}
      onAttachClick={() => undefined}
      onFilesDrop={() => undefined}
      onRemovePendingAttachment={() => undefined}
      onSlashCommandSelect={() => undefined}
      onVoiceMessageSubmit={() => undefined}
      onSubmit={() => undefined}
    />,
  );

  assert.match(markup, /data-slot="hermes-message-list"/);
  assert.match(markup, /data-slot="hermes-thinking-process"/);
  assert.match(markup, /Hermes is thinking\.\.\./);
  assert.match(markup, /Hermes CLI request is running/);
  assert.match(markup, /hermes\.chat/);
  assert.doesNotMatch(markup, /data-slot="hermes-empty-state"/);
});

test("renders Office agent binding controls for Hermes threads", () => {
  const markup = renderToStaticMarkup(
    <MissionControlHermesLayout
      threads={[
        {
          id: "thread-1",
          title: "Launch review",
          active: true,
          officeAgentName: "Lead Operator",
          officeAgentRoleTitle: "Primary Agent",
        },
      ]}
      activeThreadTitle="Launch review"
      officeAgents={[
        {
          id: "agent-1",
          name: "Lead Operator",
          roleTitle: "Primary Agent",
        },
        {
          id: "agent-2",
          name: "Architecture Scout",
          roleTitle: "Systems Scout",
        },
      ]}
      selectedOfficeAgentId="agent-1"
      messages={[]}
      draft=""
      pendingAttachments={[]}
      slashCommands={[]}
      selectedModelId="gpt-5.4"
      selectedReasoningEffort="xhigh"
      fastModeEnabled={true}
      availableModels={[
        {
          id: "gpt-5.4",
          label: "GPT-5.4",
          providerLabel: "OpenAI Codex",
          supportsReasoning: true,
          supportsFastMode: true,
          reasoningOptions: ["minimal", "low", "medium", "high", "xhigh"],
        },
      ]}
      availableReasoningOptions={["minimal", "low", "medium", "high", "xhigh"]}
      showReasoningControl={true}
      showFastModeToggle={true}
      isSending={false}
      onModelChange={() => undefined}
      onReasoningChange={() => undefined}
      onFastModeToggle={() => undefined}
      onNewChat={() => undefined}
      onOfficeAgentChange={() => undefined}
      onThreadSelect={() => undefined}
      onThreadDelete={() => undefined}
      onDraftChange={() => undefined}
      onDraftKeyDown={() => undefined}
      onDraftPaste={() => undefined}
      onAttachClick={() => undefined}
      onFilesDrop={() => undefined}
      onRemovePendingAttachment={() => undefined}
      onSlashCommandSelect={() => undefined}
      onVoiceMessageSubmit={() => undefined}
      onSubmit={() => undefined}
    />,
  );

  assert.match(markup, /data-slot="hermes-agent-binding"/);
  assert.match(markup, /data-slot="hermes-agent-select"/);
  assert.match(markup, /Lead Operator · Primary Agent/);
  assert.match(markup, /Architecture Scout · Systems Scout/);
  assert.doesNotMatch(markup, /data-slot="hermes-thread-agent-badge"/);
  assert.match(markup, /Talking with Lead Operator\./);
});

test("renders completed assistant messages with a collapsed thinking process", () => {
  const markup = renderToStaticMarkup(
    <MissionControlHermesLayout
      threads={[
        {
          id: "thread-1",
          title: "Launch review",
          active: true,
        },
      ]}
      activeThreadTitle="Launch review"
      messages={[
        {
          id: "assistant-1",
          role: "assistant",
          author: "Hermes",
          createdAtLabel: "just now",
          content: "Here is the launch review.",
          attachments: [],
        },
      ]}
      draft=""
      pendingAttachments={[]}
      slashCommands={[]}
      selectedModelId="gpt-5.4"
      selectedReasoningEffort="xhigh"
      fastModeEnabled={true}
      availableModels={[
        {
          id: "gpt-5.4",
          label: "GPT-5.4",
          providerLabel: "OpenAI Codex",
          supportsReasoning: true,
          supportsFastMode: true,
          reasoningOptions: ["minimal", "low", "medium", "high", "xhigh"],
        },
      ]}
      availableReasoningOptions={["minimal", "low", "medium", "high", "xhigh"]}
      showReasoningControl={true}
      showFastModeToggle={true}
      isSending={false}
      onModelChange={() => undefined}
      onReasoningChange={() => undefined}
      onFastModeToggle={() => undefined}
      onNewChat={() => undefined}
      onThreadSelect={() => undefined}
      onThreadDelete={() => undefined}
      onDraftChange={() => undefined}
      onDraftKeyDown={() => undefined}
      onDraftPaste={() => undefined}
      onAttachClick={() => undefined}
      onFilesDrop={() => undefined}
      onRemovePendingAttachment={() => undefined}
      onSlashCommandSelect={() => undefined}
      onVoiceMessageSubmit={() => undefined}
      onSubmit={() => undefined}
    />,
  );

  assert.match(markup, /data-slot="hermes-assistant-thinking"/);
  assert.match(markup, /Thinking process/);
  assert.match(markup, /assistant response saved/);
  assert.match(markup, /Here is the launch review\./);
  assert.doesNotMatch(markup, /Hermes is thinking\.\.\./);
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
      selectedModelId="gpt-5.4"
      selectedReasoningEffort="xhigh"
      fastModeEnabled={true}
      availableModels={[
        {
          id: "gpt-5.4",
          label: "GPT-5.4",
          providerLabel: "OpenAI Codex",
          supportsReasoning: true,
          supportsFastMode: true,
          reasoningOptions: ["minimal", "low", "medium", "high", "xhigh"],
        },
      ]}
      availableReasoningOptions={["minimal", "low", "medium", "high", "xhigh"]}
      showReasoningControl={true}
      showFastModeToggle={true}
      isSending={false}
      onModelChange={() => undefined}
      onReasoningChange={() => undefined}
      onFastModeToggle={() => undefined}
      onNewChat={() => undefined}
      onThreadSelect={() => undefined}
      onThreadDelete={() => undefined}
      onDraftChange={() => undefined}
      onDraftKeyDown={() => undefined}
      onDraftPaste={() => undefined}
      onAttachClick={() => undefined}
      onFilesDrop={() => undefined}
      onRemovePendingAttachment={() => undefined}
      onSlashCommandSelect={() => undefined}
      onVoiceMessageSubmit={() => undefined}
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

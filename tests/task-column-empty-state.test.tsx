import assert from "node:assert/strict";
import test from "node:test";
import { renderToStaticMarkup } from "react-dom/server";

import { TaskColumnEmptyState } from "../src/components/mission-control/TaskColumnEmptyState";

test("renders the empty-state copy centered in the first-card slot without a card outline", () => {
  const markup = renderToStaticMarkup(<TaskColumnEmptyState label="No tasks" />);

  assert.match(markup, /No tasks/);
  assert.doesNotMatch(markup, />no tasks</);
  assert.match(markup, /min-h-\[148px\]/);
  assert.match(markup, /justify-center/);
  assert.doesNotMatch(markup, /flex-1/);
  assert.doesNotMatch(markup, /border-dashed/);
  assert.doesNotMatch(markup, /border-white\/8/);
  assert.doesNotMatch(markup, /bg-\[#141419\]/);
  assert.doesNotMatch(markup, /rounded-\[18px\]/);
});

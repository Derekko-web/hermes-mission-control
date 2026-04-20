import assert from "node:assert/strict";
import test from "node:test";
import { renderToStaticMarkup } from "react-dom/server";

import { MissionControlNewTaskButton } from "../src/components/mission-control/MissionControlNewTaskButton";

test("renders a vertically slimmer New task button", () => {
  const markup = renderToStaticMarkup(<MissionControlNewTaskButton onClick={() => undefined} />);

  assert.match(markup, />New task</);
  assert.match(markup, /py-2\.5/);
  assert.doesNotMatch(markup, /py-3/);
});

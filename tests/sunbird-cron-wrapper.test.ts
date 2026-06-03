import assert from "node:assert/strict";
import test from "node:test";
import { readFileSync } from "node:fs";

const scriptPath = "/var/www/dev.chinesearizona.com/web/scripts/article_ingest/cron_sync.sh";

test("Sunbird cron wrapper no longer enforces the old biweekly gate", () => {
  const source = readFileSync(scriptPath, "utf8");

  assert.doesNotMatch(source, /ANCHOR_UTC=/);
  assert.doesNotMatch(source, /days_since_anchor/);
  assert.doesNotMatch(source, /% 14/);
  assert.match(source, /Starting weekly Sunbird article sync\./);
  assert.match(source, /Finished weekly Sunbird article sync\./);
});

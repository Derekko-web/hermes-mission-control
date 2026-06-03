import assert from "node:assert/strict";
import test from "node:test";

import { runHermesSendWithFallback } from "../src/components/mission-control/mission-control-hermes-send";

test("uses the primary Hermes send path when it resolves before the timeout", async () => {
  let fallbackCalls = 0;

  const result = await runHermesSendWithFallback({
    primary: async () => ({ inserted: 2, threadId: "thread-primary" }),
    fallback: async () => {
      fallbackCalls += 1;
      return { inserted: 2, threadId: "thread-fallback" };
    },
    timeoutMs: 25,
  });

  assert.deepEqual(result, {
    result: { inserted: 2, threadId: "thread-primary" },
    via: "primary",
  });
  assert.equal(fallbackCalls, 0);
});

test("falls back to the server Hermes send path when the primary path rejects", async () => {
  let fallbackCalls = 0;

  const result = await runHermesSendWithFallback({
    primary: async () => {
      throw new Error("socket closed");
    },
    fallback: async () => {
      fallbackCalls += 1;
      return { inserted: 2, threadId: "thread-fallback" };
    },
    timeoutMs: 25,
  });

  assert.deepEqual(result, {
    result: { inserted: 2, threadId: "thread-fallback" },
    via: "fallback",
  });
  assert.equal(fallbackCalls, 1);
});

test("falls back to the server Hermes send path when the primary path never settles", async () => {
  let fallbackCalls = 0;
  const start = Date.now();

  const result = await runHermesSendWithFallback({
    primary: () => new Promise<never>(() => undefined),
    fallback: async () => {
      fallbackCalls += 1;
      return { inserted: 2, threadId: "thread-timeout" };
    },
    timeoutMs: 25,
  });

  assert.deepEqual(result, {
    result: { inserted: 2, threadId: "thread-timeout" },
    via: "fallback",
  });
  assert.equal(fallbackCalls, 1);
  assert.ok(Date.now() - start >= 20);
});

test("propagates fallback errors when the primary Hermes send path times out", async () => {
  await assert.rejects(
    () =>
      Promise.race([
        runHermesSendWithFallback({
          primary: () => new Promise<never>(() => undefined),
          fallback: async () => {
            throw new Error("fallback failed");
          },
          timeoutMs: 10,
        }),
        new Promise((_, reject) => {
          setTimeout(() => reject(new Error("helper timed out")), 80);
        }),
      ]),
    /fallback failed/,
  );
});

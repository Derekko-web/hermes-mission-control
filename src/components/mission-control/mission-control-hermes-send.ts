export async function runHermesSendWithFallback<Result>({
  primary,
  fallback,
  timeoutMs = 4_000,
}: {
  primary: () => Promise<Result>;
  fallback: () => Promise<Result>;
  timeoutMs?: number;
}): Promise<{ result: Result; via: "primary" | "fallback" }> {
  let timeoutId: ReturnType<typeof setTimeout> | null = null;

  const timeoutPromise = new Promise<{ result: Result; via: "fallback" }>((resolve, reject) => {
    timeoutId = setTimeout(() => {
      void fallback()
        .then((result) => {
          resolve({ result, via: "fallback" });
        })
        .catch(reject);
    }, timeoutMs);
  });

  try {
    const primaryResult = await Promise.race([
      primary().then((result) => ({ result, via: "primary" as const })),
      timeoutPromise,
    ]);

    if (timeoutId) {
      clearTimeout(timeoutId);
    }

    return primaryResult;
  } catch {
    if (timeoutId) {
      clearTimeout(timeoutId);
    }

    return {
      result: await fallback(),
      via: "fallback",
    };
  }
}

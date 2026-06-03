import { createServer } from "node:http";

const port = Number.parseInt(process.env.MISSION_CONTROL_WEBHOOK_GATEWAY_PORT ?? "4324", 10);
const targetBaseUrl = process.env.MISSION_CONTROL_WEBHOOK_TARGET_BASE_URL ?? "http://127.0.0.1:4322";
const webhookPath = "/api/mission-control/notion/webhook";

const hopByHopHeaders = new Set([
  "connection",
  "content-length",
  "host",
  "keep-alive",
  "proxy-authenticate",
  "proxy-authorization",
  "te",
  "trailer",
  "transfer-encoding",
  "upgrade",
]);

function requestBody(request) {
  return new Promise((resolve, reject) => {
    const chunks = [];

    request.on("data", (chunk) => chunks.push(chunk));
    request.on("error", reject);
    request.on("end", () => resolve(Buffer.concat(chunks)));
  });
}

function filteredRequestHeaders(headers) {
  const filtered = {};

  for (const [name, value] of Object.entries(headers)) {
    if (!hopByHopHeaders.has(name.toLowerCase()) && value !== undefined) {
      filtered[name] = value;
    }
  }

  return filtered;
}

function writeJson(response, status, payload) {
  response.writeHead(status, {
    "content-type": "application/json; charset=utf-8",
  });
  response.end(JSON.stringify(payload));
}

const server = createServer(async (request, response) => {
  const url = new URL(request.url ?? "/", `http://${request.headers.host ?? "127.0.0.1"}`);
  const isWebhookPath = url.pathname === webhookPath || url.pathname === `${webhookPath}/`;

  if (!isWebhookPath) {
    writeJson(response, 404, {
      ok: false,
      error: "Mission Control only exposes the Notion webhook through this gateway.",
    });
    return;
  }

  if (!["GET", "OPTIONS", "POST"].includes(request.method ?? "")) {
    response.writeHead(405, { allow: "GET, OPTIONS, POST" });
    response.end();
    return;
  }

  try {
    const targetUrl = new URL(webhookPath, targetBaseUrl);
    targetUrl.search = url.search;

    const body = request.method === "GET" || request.method === "OPTIONS" ? undefined : await requestBody(request);
    const upstreamResponse = await fetch(targetUrl, {
      method: request.method,
      headers: filteredRequestHeaders(request.headers),
      body: body && body.length > 0 ? body : undefined,
    });

    const responseHeaders = {};
    upstreamResponse.headers.forEach((value, name) => {
      if (!hopByHopHeaders.has(name.toLowerCase())) {
        responseHeaders[name] = value;
      }
    });

    response.writeHead(upstreamResponse.status, responseHeaders);
    response.end(Buffer.from(await upstreamResponse.arrayBuffer()));
  } catch (error) {
    console.error("[mission-control-webhook-gateway] Proxy failed:", error);
    writeJson(response, 502, {
      ok: false,
      error: "Mission Control webhook gateway could not reach the local app.",
    });
  }
});

server.listen(port, "127.0.0.1", () => {
  console.info(
    `[mission-control-webhook-gateway] Listening on http://127.0.0.1:${port}${webhookPath}`,
  );
});

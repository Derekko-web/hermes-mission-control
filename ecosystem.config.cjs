module.exports = {
  apps: [
    {
      name: "hermes-mission-control-db",
      cwd: "/home/derek/.hermes/mission-control",
      script: "npm",
      args: "run convex:dev",
      env: {
        HOME: "/home/derek"
      }
    },
    {
      name: "hermes-mission-control-web",
      cwd: "/home/derek/.hermes/mission-control",
      script: "npm",
      args: "run start",
      env: {
        HOME: "/home/derek",
        PORT: "4322",
        MISSION_CONTROL_INTERNAL_BASE_URL: "http://127.0.0.1:4322"
      }
    },
    {
      name: "hermes-mission-control-webhook-gateway",
      cwd: "/home/derek/.hermes/mission-control",
      script: "scripts/mission-control-webhook-gateway.mjs",
      env: {
        HOME: "/home/derek",
        MISSION_CONTROL_WEBHOOK_GATEWAY_PORT: "4324",
        MISSION_CONTROL_WEBHOOK_TARGET_BASE_URL: "http://127.0.0.1:4322"
      }
    },
    {
      name: "hermes-mission-control-ernie-tunnel",
      cwd: "/home/derek/.hermes/mission-control",
      script: "scripts/mission-control-cloudflare-tunnel.mjs",
      env: {
        HOME: "/home/derek",
        MISSION_CONTROL_TUNNEL_HANDLE: "ernie",
        MISSION_CONTROL_WEBHOOK_GATEWAY_URL: "http://127.0.0.1:4324"
      }
    }
  ]
};

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
        PORT: "4322"
      }
    }
  ]
};

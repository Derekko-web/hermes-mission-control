# Hermes Mission Control

Standalone Mission Control app for Hermes

## Branches

- `main` — the current local Mission Control buildout.
- `template` — the portable starter branch for other Hermes operators.

If you want a reusable starting point for your own Hermes setup, use the `template` branch and customize the shared template file before you do anything else:

- `shared/missionControlTemplate.ts`

That one file controls:
- starter operator names and roles
- default task assignee / schedule owner labels
- starter team roster seed data
- starter office presence seed data
- starter task, calendar, and memory content

Examples:
- rename `Lead Operator` to `Claude Code`
- rename `Implementation Engineer` to `RC Trinity`
- swap the starter schedules for your real cron jobs
- replace starter memory entries with your real operating notes

## Run locally

1. `npm install`
2. `npx convex dev --local`
3. `npm run dev -- --hostname 127.0.0.1 --port 4322`

## Template branch notes

The template branch is meant to start clean for new users. If you already have old local Convex seed data from another branch, you may need to clear or recreate your local Convex data before the portable starter content appears in the UI.

## Production-style run with PM2

- `pm2 start ecosystem.config.cjs`
- `pm2 save`

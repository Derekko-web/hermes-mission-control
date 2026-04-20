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

## Download the template branch

Clone the portable branch directly:

```bash
git clone --branch template https://github.com/Derekko-web/hermes-mission-control.git
cd hermes-mission-control
```

If you already cloned the repo:

```bash
git fetch origin
git checkout template
git pull --ff-only origin template
```

## Use Hermes on your own computer to customize it

Paste the prompt below into Hermes on the computer where you want Mission Control installed.

This prompt is intentionally strict:
- keep the existing UI/UX exactly as it is
- do **not** add tools, routes, nav items, badges, or screens
- only replace starter/template data with the user’s real local Hermes data
- customize the existing tools so they reflect the user’s own setup

### Copy/paste prompt for Hermes

```text
Install and customize the Hermes Mission Control template on this computer.

Repo:
- https://github.com/Derekko-web/hermes-mission-control
- branch: template

Requirements:
1. Clone the repo if it is not already present locally.
2. Stay on the `template` branch unless I explicitly tell you otherwise.
3. Install dependencies and get the project running locally.
4. Inspect my local Hermes environment and replace template/starter data with my own real local data.
5. Do NOT change the existing UI/UX.
6. Do NOT add or remove tools, routes, nav items, status badges, or screens.
7. Only customize the existing Mission Control tools so they show my own local Hermes setup instead of starter data.

What to customize:
- Team / operator labels and roles
- Task assignee labels
- Calendar owner labels
- Starter tasks
- Starter schedules / cron items
- Starter memory documents
- Office presence defaults
- Any other template data in shared/missionControlTemplate.ts and related seed content

What "my own local data" means:
- real local Hermes operators/models/agent names if they exist
- real local recurring jobs, cron jobs, and automations if they exist
- real local workflow/project names if they exist
- real local durable notes or operating rules if they exist
- if something cannot be discovered automatically, ask me only for the missing facts instead of inventing fake data

Safety rules:
- preserve the existing design and behavior
- preserve the existing set of Mission Control tools
- do not redesign the interface
- do not add placeholders like Soon/Live
- do not destroy existing local data without explaining what will be deleted and asking first
- if existing Convex/local seed data must be reset so my real data appears, explain it clearly before doing it

Implementation guidance:
- update shared/missionControlTemplate.ts first
- keep changes focused on template data and seed content
- do not turn this into a new product surface
- if other files must change, only change them as needed to map the existing UI to my real local data

Verification:
- run the relevant tests
- run lint
- run build
- summarize exactly what local data was discovered and what was customized
- tell me if any starter data still remains because you could not safely replace it
```

## Run locally

1. `npm install`
2. `npx convex dev --local`
3. `npm run dev -- --hostname 127.0.0.1 --port 4322`

## Template branch notes

The template branch is meant to start clean for new users. If you already have old local Convex seed data from another branch, you may need to clear or recreate your local Convex data before the portable starter content appears in the UI.

## Production-style run with PM2

- `pm2 start ecosystem.config.cjs`
- `pm2 save`

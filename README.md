# Hermes Mission Control

Standalone Mission Control app for Hermes

## Run locally

1. `npm install`
2. `npx convex dev --local`
3. `npm run dev -- --hostname 127.0.0.1 --port 4322`

## Production-style run with PM2

- `pm2 start ecosystem.config.cjs`
- `pm2 save`

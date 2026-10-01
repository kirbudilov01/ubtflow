# UBT Admin Deployment

## Recommended First Deploy

Deploy `ubt-admin` as a standalone Docker web service with a persistent disk mounted at:

```text
/app/data
```

The app stores the JSON database and uploads under `data/`, so a persistent disk is required. Do not deploy the whole `/Users/kirill/Documents/УБТ` workspace as a single app; it contains project materials that are not part of the web service.

## Render Blueprint

This folder includes `render.yaml` for a Render Docker service:

- healthcheck: `/api/health`
- service port: uses Render `PORT`
- persistent disk: `/app/data`
- production cookies: `COOKIE_SECURE=true`
- generated `SESSION_SECRET`
- manual `ADMIN_USER` and `ADMIN_PASSWORD`

Production env vars to set:

```text
ADMIN_USER=<admin login>
ADMIN_PASSWORD=<strong password>
SESSION_SECRET=<generated automatically by Render or manually set>
COOKIE_SECURE=true
NODE_ENV=production
AUTO_REFRESH_ENABLED=false
```

## Domain

Start with the platform preview URL, then attach a custom domain after login and healthcheck are verified. Good first candidates to check:

```text
viewflow.ai
viewflow.app
ubtflow.com
ubtflow.io
want2view.app
creatorpayflow.com
clipreward.io
```

Use a subdomain for staging if the final brand is not locked:

```text
app.<domain>
staging.<domain>
admin.<domain>
```

## Preflight

```bash
npm install
npm run check:data
PORT=3030 ADMIN_USER=kirill ADMIN_PASSWORD=change_me SESSION_SECRET=local_dev_secret COOKIE_SECURE=false node server.js
npm run check:ui
curl http://127.0.0.1:3030/api/health
```

## Public Launch Guardrails

- Replace the default admin password before production start.
- Do not ship local `data/db.json` or `data/uploads`.
- Keep `.env` out of git and Docker build context.
- Use a persistent disk or external DB before onboarding real creators/companies.
- Treat the current JSON DB as MVP storage, not long-term production architecture.

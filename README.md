# ViewFlow / UBT Admin

Live: https://ubtflow.com

Local MVP for an AI/SaaS creator performance platform:

- offers with accepted-view payouts;
- creator accounts and videos;
- company dashboards and payout cycles;
- referral links and promo codes;
- service API/postback sandbox events;
- USDT-first deposits and withdrawal requests;
- append-only ledger and admin queues;
- WANT2VIEW-oriented knowledge base.

## Local Run

The Homebrew Node on this machine currently has a broken `llhttp` dynamic library. Use the nvm Node first in `PATH`:

```bash
cd /Users/kirill/Documents/УБТ/08_ТЕХНИКА_АДМИНКИ_ИНТЕГРАЦИИ/ubt-admin
PATH=/Users/kirill/.nvm/versions/node/v24.14.1/bin:$PATH npm install
PATH=/Users/kirill/.nvm/versions/node/v24.14.1/bin:$PATH node server.js
```

Open: `http://localhost:3030`

Default local login:

- username: `kirill`
- password: `change_me`

Set `ADMIN_USER`, `ADMIN_PASSWORD`, and `SESSION_SECRET` for real usage.

For a public read-only showcase, set:

```bash
VIEWFLOW_PUBLIC_DEMO=true
```

Unauthenticated visitors can open the workspace and read dashboard data. Mutating API calls still require a signed session.

## Implemented MVP Blocks

- `GET /api/dashboard` - complete local dashboard payload.
- `POST /api/videos` - manual video submission.
- `POST /api/videos/:id/approve` - accepted views approval.
- `POST /api/deposits` - register USDT deposit and ledger entry.
- `POST /api/withdrawals` - create USDT withdrawal request.
- `POST /api/service-events` - sandbox service API/postback event receiver.
- `POST /api/import` - CSV/XLSX import for video/view snapshots.

## Data

The app uses local JSON storage:

```text
data/db.json
```

The DB migrates old `videos/terms` data into the new schema and keeps existing local records intact.

## Next Engineering Steps

- Replace sandbox service events with signed HMAC webhook validation.
- Add real account importers for TikTok, Instagram Reels, and YouTube Shorts.
- Add company payout-cycle approval screens.
- Add real crypto payment provider or controlled wallet service.
- Add role-scoped sessions for admin/company/creator views.

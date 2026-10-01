# ViewFlow Backend MVP

## Current Scope

MVP payments are strictly CPV:

- advertiser funds the platform balance;
- advertiser creates offers with rate per 1,000 verified views;
- creator attaches a video or imports videos from a connected account;
- admin/AI approves payable views;
- advertiser report finalizes the cycle;
- creator net revenue moves to internal balance;
- creator requests USDT withdrawal;
- platform marks withdrawal as paid with a TX hash.

Shares, reposts, comments, referral links, promo codes and service postbacks are quality or future signals only. They do not affect payment in the current MVP.

## Backend Modules

- `server.js` - HTTP API, auth-protected routes, local MVP orchestration.
- `lib/accounting.js` - ledger-first accounting, report finalization, payout calculations, withdrawal state transitions.
- `lib/payouts.js` - dashboard analytics and CPV video enrichment.
- `lib/db.js` - local JSON persistence and migrations.
- `lib/auth.js` - signed cookie session for local/admin MVP.

## Core API

- `POST /api/login`
- `GET /api/dashboard`
- `POST /api/offers`
- `POST /api/deposits`
- `POST /api/videos`
- `POST /api/video-preview`
- `POST /api/accounts/:id/import-videos`
- `POST /api/videos/:id/approve`
- `POST /api/company-reports`
- `POST /api/withdrawals`
- `POST /api/withdrawals/:id/pay`
- `GET /api/accounting/summary`
- `GET /api/ledger`

## Canonical Money Flow

1. `advertiser_deposit` credits company funding.
2. `creator_earning_pending` records approved video revenue before advertiser report.
3. `creator_balance_credit` moves creator net revenue to internal available balance after report.
4. `platform_fee_credit` records the 5% platform commission.
5. `withdrawal_requested` reserves creator available balance.
6. `withdrawal_paid` records completed USDT payout.

## Video Statuses

- `tracking` - video is collecting views.
- `approved_pending_report` - payable views approved, waiting for advertiser report.
- `locked_for_payout` - advertiser report finalized and creator balance credited.
- `rejected` - not payable.
- `paid` - reserved for future per-video paid settlement.

## Production Upgrade Path

Replace `data/db.json` with PostgreSQL while preserving service boundaries:

- `users`
- `sessions`
- `companies`
- `offers`
- `creators`
- `creator_accounts`
- `videos`
- `video_snapshots`
- `company_reports`
- `deposits`
- `ledger_entries`
- `withdrawal_requests`
- `audit_logs`

Recommended stack: Node.js + Fastify/Express + PostgreSQL + Drizzle/Prisma + background jobs for social stats snapshots.

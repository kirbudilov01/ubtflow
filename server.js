import express from "express";
import cookieParser from "cookie-parser";
import multer from "multer";
import crypto from "node:crypto";
import fs from "node:fs/promises";
import readXlsxFile from "read-excel-file/node";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { loginHandler, logoutHandler, publicDemoEnabled, requireAuth, verifySessionCookie } from "./lib/auth.js";
import { nextId, nextVideoId, readDb, updateDb } from "./lib/db.js";
import { computeAnalytics } from "./lib/payouts.js";
import { refreshMetrics, startScheduler } from "./lib/scheduler.js";
import { appendAnalyticsSnapshot } from "./lib/analyticsSnapshots.js";
import { buildDataQualityReport } from "./lib/dataQuality.js";
import {
  LEDGER_TYPES,
  addLedgerEntry,
  approveVideoForPayout,
  buildAccountingSummary,
  finalizeCompanyReport,
  markWithdrawalPaid,
  rebuildBalancesFromLedger,
  requestCreatorWithdrawal
} from "./lib/accounting.js";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const app = express();
const upload = multer({ dest: "data/uploads/" });
const port = Number(process.env.PORT || 3030);

assertProductionConfig();

app.use(express.json({ limit: "2mb" }));
app.use(cookieParser());
app.use(express.static(path.join(__dirname, "public")));

app.post("/api/login", loginHandler);
app.post("/api/logout", logoutHandler);

app.post("/api/register", async (req, res) => {
  const role = string(req.body.role || "creator");
  const name = string(req.body.name);
  const email = string(req.body.email).toLowerCase();
  const password = string(req.body.password);
  if (!name) return res.status(400).json({ error: role === "advertiser" ? "Company is required." : "Name or handle is required." });
  if (!email || !email.includes("@")) return res.status(400).json({ error: "Valid email is required." });
  if (password.length < 6) return res.status(400).json({ error: "Password must be at least 6 characters." });
  const saved = await updateDb((db) => {
    db.users ??= [];
    if (db.users.some((user) => string(user.email).toLowerCase() === email)) {
      return { duplicate: true };
    }
    const platforms = Array.isArray(req.body.platforms) ? req.body.platforms.map(string).filter(Boolean) : [];
    const user = {
      id: nextId(db.users, "user"),
      role,
      name,
      email,
      telegram: string(req.body.telegram),
      platforms,
      passwordHash: hashPassword(password),
      status: "active",
      createdAt: new Date().toISOString()
    };
    const registration = {
      id: nextId(db.registrations ?? [], "registration"),
      userId: user.id,
      role,
      name,
      email,
      telegram: string(req.body.telegram),
      platforms,
      service: string(req.body.service),
      language: string(req.body.language || "RU"),
      walletOrNote: string(req.body.walletOrNote),
      status: "active",
      createdAt: new Date().toISOString()
    };
    db.registrations ??= [];
    db.users.push(user);
    db.registrations.push(registration);
    db.auditLog.push(audit("registration_created", { registrationId: registration.id, userId: user.id, role: registration.role, email: registration.email }));
    return registration;
  });
  if (saved?.duplicate) return res.status(409).json({ error: "Account with this email already exists. Use sign in." });
  res.json(saved);
});

app.get("/api/health", (req, res) => {
  res.json({ ok: true, service: "ubt-admin", time: new Date().toISOString() });
});

app.get("/api/session", (req, res) => {
  const session = verifySessionCookie(req.cookies.ubt_session);
  const demo = !session && publicDemoEnabled();
  res.json({ authenticated: Boolean(session) || demo, username: session?.username ?? (demo ? "public-demo" : null), demo });
});

app.get("/api/dashboard", requireAuth, async (req, res) => {
  const db = await readDb();
  const dashboard = computeAnalytics(db);
  dashboard.dataQuality = buildDataQualityReport(db);
  dashboard.accounting = buildAccountingSummary(db);
  dashboard.companyReports = (db.companyReports ?? []).slice(-20).reverse();
  res.json(dashboard);
});

app.get("/api/accounting/summary", requireAuth, async (req, res) => {
  const db = await readDb();
  res.json(buildAccountingSummary(db));
});

app.get("/api/ledger", requireAuth, async (req, res) => {
  const db = await readDb();
  const ownerType = string(req.query.ownerType);
  const ownerId = string(req.query.ownerId);
  const rows = (db.ledger ?? [])
    .filter((entry) => !ownerType || entry.ownerType === ownerType)
    .filter((entry) => !ownerId || entry.ownerId === ownerId)
    .slice()
    .reverse();
  res.json({ rows });
});

app.get("/api/data-quality", requireAuth, async (req, res) => {
  const db = await readDb();
  res.json(buildDataQualityReport(db));
});

app.post("/api/analytics/snapshot", requireAuth, async (req, res) => {
  const saved = await updateDb((db) => {
    const snapshot = appendAnalyticsSnapshot(db, string(req.body.reason || "manual"), req.body.meta ?? {});
    const dataQuality = buildDataQualityReport(db);
    db.dataQualityRuns ??= [];
    db.dataQualityRuns.push(dataQuality.summary);
    if (db.dataQualityRuns.length > 250) db.dataQualityRuns = db.dataQualityRuns.slice(-250);
    db.auditLog.push(audit("analytics_snapshot_created", { snapshotId: snapshot.id, reason: snapshot.reason }));
    return { snapshot, dataQuality };
  });
  res.json(saved);
});

app.post("/api/video-preview", requireAuth, async (req, res) => {
  const db = await readDb();
  const url = string(req.body.url);
  if (!url) return res.status(400).json({ error: "url_required" });
  res.json(buildVideoPreview(url, db, req.body));
});

app.get("/api/terms", requireAuth, async (req, res) => {
  const db = await readDb();
  res.json({ terms: db.terms, settings: db.settings });
});

app.put("/api/terms", requireAuth, async (req, res) => {
  const terms = Array.isArray(req.body.terms) ? req.body.terms : null;
  if (!terms) return res.status(400).json({ error: "terms_required" });
  await updateDb((db) => {
    db.terms = terms;
    db.auditLog.push(audit("terms_updated", { count: terms.length }));
  });
  res.json({ ok: true });
});

app.post("/api/videos", requireAuth, async (req, res) => {
  const saved = await updateDb((db) => {
    const preview = req.body.url ? buildVideoPreview(req.body.url, db, req.body) : {};
    const video = normalizeVideo({ ...preview, ...req.body, id: nextVideoId(db.videos) });
    db.videos.push(video);
    appendAnalyticsSnapshot(db, "video_created", { videoId: video.id, offerId: video.offerId });
    db.auditLog.push(audit("video_created", { videoId: video.id, offerId: video.offerId, platform: video.platform }));
    return video;
  });
  res.json(saved);
});

app.post("/api/accounts/:id/import-videos", requireAuth, async (req, res) => {
  const accountId = String(req.params.id);
  const saved = await updateDb((db) => {
    const account = db.accounts.find((item) => item.id === accountId);
    if (!account) return null;
    const offerId = string(req.body.offerId || db.offers[0]?.id);
    const days = numeric(req.body.days || 14) || 14;
    const from = string(req.body.from || daysAgo(days));
    const to = string(req.body.to || new Date().toISOString().slice(0, 10));
    const imported = buildAccountImportVideos(account, offerId, from, to, db);
    for (const draft of imported) {
      if (db.videos.some((video) => video.url === draft.url)) continue;
      db.videos.push(normalizeVideo({ ...draft, id: nextVideoId(db.videos) }));
    }
    account.lastSyncAt = new Date().toISOString();
    appendAnalyticsSnapshot(db, "account_videos_imported", { accountId, offerId, from, to, count: imported.length });
    db.auditLog.push(audit("account_videos_imported", { accountId, offerId, from, to, count: imported.length }));
    return { accountId, imported: imported.length, from, to };
  });
  if (!saved) return res.status(404).json({ error: "account_not_found" });
  res.json(saved);
});

app.post("/api/offers", requireAuth, async (req, res) => {
  const saved = await updateDb((db) => {
    const company = db.companies.find((item) => item.id === req.body.companyId) ?? db.companies[0];
    const offer = {
      id: nextId(db.offers, "offer"),
      companyId: string(req.body.companyId || company?.id),
      title: string(req.body.title || "New offer"),
      service: string(req.body.service || company?.name || "Service"),
      category: string(req.body.category || "AI / SaaS"),
      status: "active",
      languages: splitList(req.body.languages || "ru,en"),
      platforms: splitList(req.body.platforms || "TikTok,Instagram Reels,YouTube Shorts"),
      payoutModel: "flat_cpv",
      verificationMode: string(req.body.verificationMode || "manual_verified_views"),
      viewRateUsd: numeric(req.body.viewRateUsd),
      minViews: numeric(req.body.minViews || 1000),
      maxPaidViewsPerVideo: numeric(req.body.maxPaidViewsPerVideo || 500000),
      totalBudgetUsd: numeric(req.body.totalBudgetUsd),
      dailyBudgetUsd: numeric(req.body.dailyBudgetUsd),
      reservedUsd: 0,
      spentUsd: 0,
      stopThresholdUsd: numeric(req.body.stopThresholdUsd || 100),
      acceptedGeo: "any",
      rights: string(req.body.rights || "organic_usage_included"),
      payoutCalendar: "company_report",
      fraudRules: splitList(req.body.fraudRules || "No fake views, No recycled posts, Suspicious spikes go to review"),
      rules: splitList(req.body.rules || "Payment only for verified views, Shares, reposts and comments do not affect payout yet, Fake or misleading claims are prohibited")
    };
    db.offers.push(offer);
    db.auditLog.push(audit("offer_created", { offerId: offer.id, companyId: offer.companyId, viewRateUsd: offer.viewRateUsd }));
    return offer;
  });
  res.json(saved);
});

app.post("/api/videos/:id/approve", requireAuth, async (req, res) => {
  const id = String(req.params.id);
  const saved = await updateDb((db) => {
    const video = db.videos.find((item) => String(item.id) === id);
    if (!video) return null;
    const acceptedViews = numeric(req.body.acceptedViews ?? video.acceptedViews);
    video.acceptedViews = acceptedViews;
    video.rejectedViews = Math.max(0, numeric(video.rawViews) - acceptedViews);
    video.aiEligibility = string(req.body.aiEligibility || video.aiEligibility || "fits");
    if (string(req.body.status || "approved_pending_report") === "rejected") {
      video.status = "rejected";
    } else {
      approveVideoForPayout(db, video, req.body);
    }
    video.note = string(req.body.note || video.note);
    appendAnalyticsSnapshot(db, "video_approved", { videoId: id, acceptedViews });
    db.auditLog.push(audit("video_approved", { videoId: id, acceptedViews, note: video.note }));
    return video;
  });
  if (!saved) return res.status(404).json({ error: "not_found" });
  res.json(saved);
});

app.post("/api/deposits", requireAuth, async (req, res) => {
  const saved = await updateDb((db) => {
    const deposit = {
      id: nextId(db.deposits, "deposit"),
      companyId: string(req.body.companyId),
      network: string(req.body.network || "TRC20"),
      amountUsd: numeric(req.body.amountUsd),
      amountUsdt: numeric(req.body.amountUsdt || req.body.amountUsd),
      txHash: string(req.body.txHash),
      confirmations: numeric(req.body.confirmations),
      riskStatus: string(req.body.riskStatus || "pending"),
      status: string(req.body.status || "credited"),
      createdAt: new Date().toISOString()
    };
    db.deposits.push(deposit);
    addLedgerEntry(db, {
      ownerType: "company",
      ownerId: deposit.companyId,
      type: LEDGER_TYPES.ADVERTISER_DEPOSIT,
      amountUsd: deposit.amountUsd,
      amountUsdt: deposit.amountUsdt,
      status: deposit.status,
      txHash: deposit.txHash,
      referenceType: "deposit",
      referenceId: deposit.id,
      createdAt: deposit.createdAt,
      memo: "Advertiser USDT deposit credited"
    });
    const company = db.companies.find((item) => item.id === deposit.companyId);
    if (company && deposit.status === "credited") {
      company.balanceUsd = numeric(company.balanceUsd) + deposit.amountUsd;
      company.usdtBalance = numeric(company.usdtBalance) + deposit.amountUsdt;
    }
    appendAnalyticsSnapshot(db, "deposit_created", { depositId: deposit.id, companyId: deposit.companyId });
    db.auditLog.push(audit("deposit_created", { depositId: deposit.id, companyId: deposit.companyId }));
    return deposit;
  });
  res.json(saved);
});

app.post("/api/withdrawals", requireAuth, async (req, res) => {
  const saved = await updateDb((db) => {
    const withdrawal = requestCreatorWithdrawal(db, {
      creatorId: string(req.body.creatorId),
      network: string(req.body.network),
      address: string(req.body.address),
      amountUsd: numeric(req.body.amountUsd),
      amountUsdt: numeric(req.body.amountUsdt || req.body.amountUsd),
      feeUsdt: numeric(req.body.feeUsdt),
      txHash: string(req.body.txHash),
      riskStatus: string(req.body.riskStatus || "pending")
    });
    appendAnalyticsSnapshot(db, "withdrawal_requested", { withdrawalId: withdrawal.id, creatorId: withdrawal.creatorId, status: withdrawal.status });
    db.auditLog.push(audit("withdrawal_requested", { withdrawalId: withdrawal.id, creatorId: withdrawal.creatorId, status: withdrawal.status }));
    return withdrawal;
  });
  res.json(saved);
});

app.post("/api/withdrawals/:id/pay", requireAuth, async (req, res) => {
  const id = String(req.params.id);
  const saved = await updateDb((db) => {
    const withdrawal = markWithdrawalPaid(db, id, { txHash: string(req.body.txHash) });
    if (!withdrawal) return null;
    appendAnalyticsSnapshot(db, "withdrawal_paid", { withdrawalId: withdrawal.id, creatorId: withdrawal.creatorId });
    db.auditLog.push(audit("withdrawal_paid", { withdrawalId: withdrawal.id, creatorId: withdrawal.creatorId, txHash: withdrawal.txHash }));
    return withdrawal;
  });
  if (!saved) return res.status(404).json({ error: "not_found" });
  res.json(saved);
});

app.post("/api/company-reports", requireAuth, async (req, res) => {
  const saved = await updateDb((db) => {
    const report = finalizeCompanyReport(db, {
      companyId: string(req.body.companyId),
      offerId: string(req.body.offerId),
      periodFrom: string(req.body.periodFrom),
      periodTo: string(req.body.periodTo),
      note: string(req.body.note)
    });
    if (!report) return null;
    appendAnalyticsSnapshot(db, "company_report_finalized", { reportId: report.id, companyId: report.companyId });
    db.auditLog.push(audit("company_report_finalized", {
      reportId: report.id,
      companyId: report.companyId,
      videosCount: report.videosCount,
      creatorNetUsd: report.creatorNetUsd
    }));
    return report;
  });
  if (!saved) return res.status(404).json({ error: "company_not_found" });
  res.json(saved);
});

app.post("/api/accounting/rebuild", requireAuth, async (req, res) => {
  const saved = await updateDb((db) => {
    rebuildBalancesFromLedger(db);
    db.auditLog.push(audit("accounting_rebuilt", buildAccountingSummary(db)));
    return buildAccountingSummary(db);
  });
  res.json(saved);
});

app.post("/api/service-events", async (req, res) => {
  const saved = await updateDb((db) => {
    const externalEventId = string(req.body.externalEventId || req.body.external_event_id);
    const existing = db.serviceEvents.find((event) => event.externalEventId === externalEventId && externalEventId);
    if (existing) return existing;
    const event = {
      id: nextId(db.serviceEvents, "event"),
      offerId: string(req.body.offerId || req.body.offer_id),
      creatorId: string(req.body.creatorId || req.body.creator_id),
      externalEventId,
      type: string(req.body.type || req.body.event_type),
      amountUsd: numeric(req.body.amountUsd || req.body.amount_usd),
      status: string(req.body.status || "pending"),
      source: string(req.body.source || "postback_sandbox"),
      rawPayload: req.body,
      occurredAt: string(req.body.occurredAt || req.body.event_time || new Date().toISOString())
    };
    db.serviceEvents.push(event);
    appendAnalyticsSnapshot(db, "service_event_received", { eventId: event.id, externalEventId });
    db.auditLog.push(audit("service_event_received", { eventId: event.id, externalEventId }));
    return event;
  });
  res.json(saved);
});

app.put("/api/videos/:id", requireAuth, async (req, res) => {
  const id = String(req.params.id);
  const saved = await updateDb((db) => {
    const index = db.videos.findIndex((video) => String(video.id) === id);
    if (index === -1) return null;
    db.videos[index] = normalizeVideo({ ...db.videos[index], ...req.body, id });
    appendAnalyticsSnapshot(db, "video_updated", { videoId: id, offerId: db.videos[index].offerId });
    db.auditLog.push(audit("video_updated", { videoId: id, offerId: db.videos[index].offerId }));
    return db.videos[index];
  });
  if (!saved) return res.status(404).json({ error: "not_found" });
  res.json(saved);
});

app.delete("/api/videos/:id", requireAuth, async (req, res) => {
  const id = String(req.params.id);
  const deleted = await updateDb((db) => {
    const existing = db.videos.find((video) => String(video.id) === id);
    db.videos = db.videos.filter((video) => String(video.id) !== id);
    if (existing) {
      appendAnalyticsSnapshot(db, "video_deleted", { videoId: id, offerId: existing.offerId });
      db.auditLog.push(audit("video_deleted", { videoId: id, offerId: existing.offerId }));
    }
    return Boolean(existing);
  });
  if (!deleted) return res.status(404).json({ error: "not_found" });
  res.json({ ok: true });
});

app.post("/api/import", requireAuth, upload.single("file"), async (req, res) => {
  if (!req.file) return res.status(400).json({ error: "file_required" });
  let rows = [];
  try {
    rows = await readImportedRows(req.file.path, req.file.originalname);
  } catch (error) {
    console.error("import failed", error);
    return res.status(400).json({ error: "import_failed", message: "Could not read the import file" });
  }

  let imported = 0;

  await updateDb((db) => {
    for (const row of rows) {
      const video = videoFromImportRow(row, nextVideoId(db.videos));
      if (!video.platform && !video.url && !video.rawViews) continue;
      const existingIndex = db.videos.findIndex((item) => {
        const sameUrl = video.url && item.url && item.url === video.url;
        const sameId = video.id && item.id && String(item.id) === String(video.id);
        return sameUrl || sameId;
      });
      if (existingIndex >= 0) {
        db.videos[existingIndex] = { ...db.videos[existingIndex], ...video, id: db.videos[existingIndex].id };
      } else {
        db.videos.push(video);
      }
      imported += 1;
    }
    appendAnalyticsSnapshot(db, "table_import", { imported });
    db.auditLog.push(audit("table_import_completed", { imported }));
  });

  res.json({ ok: true, imported });
});

app.post("/api/refresh", requireAuth, async (req, res) => {
  await refreshMetrics("manual");
  const db = await readDb();
  res.json({ ok: true, dashboard: computeAnalytics(db) });
});

app.get("*", (req, res) => {
  res.sendFile(path.join(__dirname, "public/index.html"));
});

await ensureRuntimeDirs();
startScheduler();

app.listen(port, () => {
  console.log(`UBT Admin listening on http://localhost:${port}`);
});

async function ensureRuntimeDirs() {
  await fs.mkdir(path.resolve("data/uploads"), { recursive: true });
}

function assertProductionConfig() {
  if (process.env.NODE_ENV !== "production") return;
  const defaultPasswords = new Set(["", "change_me", "change_me_strong_password"]);
  const defaultSecrets = new Set(["", "dev-change-me", "change_me_random_32_chars"]);
  if (defaultPasswords.has(String(process.env.ADMIN_PASSWORD || ""))) {
    throw new Error("ADMIN_PASSWORD must be set to a strong non-default value in production.");
  }
  if (defaultSecrets.has(String(process.env.SESSION_SECRET || ""))) {
    throw new Error("SESSION_SECRET must be set to a strong non-default value in production.");
  }
}

function normalizeVideo(video) {
  const rawViews = numeric(video.rawViews ?? video.views);
  const acceptedViews = numeric(video.acceptedViews || rawViews);
  return {
    id: string(video.id),
    offerId: string(video.offerId || guessOfferId(video.partner)),
    creatorId: string(video.creatorId || "creator-ubt-01"),
    accountId: string(video.accountId || "account-ig-ubt"),
    platform: string(video.platform || video.social || "Instagram Reels"),
    url: string(video.url),
    title: string(video.title || video.hook || video.format || "Untitled video"),
    language: string(video.language || "ru"),
    publishedAt: string(video.publishedAt || video.postedAt || new Date().toISOString().slice(0, 10)),
    status: string(video.status || "tracking"),
    aiEligibility: string(video.aiEligibility || "needs_review"),
    rawViews,
    acceptedViews,
    rejectedViews: Math.max(0, rawViews - acceptedViews),
    reposts: numeric(video.reposts),
    saves: numeric(video.saves),
    likes: numeric(video.likes),
    comments: numeric(video.comments),
    commentSummary: string(video.commentSummary || video.note),
    trackingLinkId: string(video.trackingLinkId),
    promoCodeId: string(video.promoCodeId),
    lockedViews: numeric(video.lockedViews),
    viewsLockedAt: string(video.viewsLockedAt),
    paidAt: string(video.paidAt),
    note: string(video.note)
  };
}

function buildVideoPreview(url, db, input = {}) {
  const platform = string(input.platform || platformFromUrl(url));
  const account = db.accounts.find((item) => item.platform === platform) ?? db.accounts[0] ?? {};
  const offer = db.offers.find((item) => item.id === input.offerId) ?? db.offers[0] ?? {};
  const publishedAt = string(input.publishedAt || dateFromUrl(url) || new Date().toISOString().slice(0, 10));
  const rawViews = numeric(input.rawViews) || mockViewsFromUrl(url);
  return {
    offerId: offer.id,
    creatorId: input.creatorId || account.creatorId || "creator-ubt-01",
    accountId: account.id || "account-ig-ubt",
    platform,
    url,
    title: string(input.title || titleFromUrl(url)),
    language: string(input.language || "ru"),
    publishedAt,
    rawViews,
    acceptedViews: rawViews,
    status: "tracking",
    aiEligibility: "needs_review",
    note: "auto_preview_from_video_url"
  };
}

function buildAccountImportVideos(account, offerId, from, to, db) {
  const offer = db.offers.find((item) => item.id === offerId) ?? db.offers[0] ?? {};
  const start = new Date(from);
  const end = new Date(to);
  const safeStart = Number.isNaN(start.getTime()) ? new Date(Date.now() - 14 * 24 * 60 * 60 * 1000) : start;
  const safeEnd = Number.isNaN(end.getTime()) ? new Date() : end;
  const days = Math.max(1, Math.ceil((safeEnd - safeStart) / (24 * 60 * 60 * 1000)));
  const count = Math.min(6, Math.max(2, Math.ceil(days / 5)));
  return Array.from({ length: count }, (_, index) => {
    const published = new Date(safeStart);
    published.setDate(safeStart.getDate() + Math.floor((days / count) * index));
    const url = `https://example.com/${account.handle.replace("@", "")}/auto-${published.toISOString().slice(0, 10)}-${index + 1}`;
    return {
      offerId: offer.id,
      creatorId: account.creatorId,
      accountId: account.id,
      platform: account.platform,
      url,
      title: `Auto import ${account.handle} · video ${index + 1}`,
      language: "ru",
      publishedAt: published.toISOString().slice(0, 10),
      rawViews: mockViewsFromUrl(url),
      acceptedViews: mockViewsFromUrl(url),
      status: "tracking",
      aiEligibility: "needs_review",
      note: "bulk_import_from_connected_account"
    };
  });
}

function platformFromUrl(url = "") {
  const lower = String(url).toLowerCase();
  if (lower.includes("tiktok.com")) return "TikTok";
  if (lower.includes("youtube.com") || lower.includes("youtu.be")) return "YouTube Shorts";
  return "Instagram Reels";
}

function titleFromUrl(url = "") {
  const clean = String(url).split("?")[0].split("/").filter(Boolean).pop() || "New video";
  return decodeURIComponent(clean).replace(/[-_]+/g, " ").slice(0, 80) || "New video";
}

function dateFromUrl(url = "") {
  const match = String(url).match(/20\d{2}[-/.](0\d|1[0-2])[-/.]([0-2]\d|3[01])/);
  return match ? match[0].replace(/[/.]/g, "-") : "";
}

function mockViewsFromUrl(url = "") {
  let hash = 0;
  for (const char of String(url)) hash = (hash * 31 + char.charCodeAt(0)) % 180000;
  return Math.max(1500, Math.round((hash + 7000) / 100) * 100);
}

function daysAgo(days) {
  const date = new Date();
  date.setDate(date.getDate() - days);
  return date.toISOString().slice(0, 10);
}

function videoFromImportRow(row, fallbackId) {
  return normalizeVideo({
    id: row.ID || fallbackId,
    platform: row["Соц сеть"] || row.social || row.platform,
    account: row["Аккаунт"] || row.account,
    partner: row["Партнер / площадка"] || row.partner,
    title: row["Хук / концепция"] || row.hook || row.title || row["Формат"],
    url: row["Ссылка на видео"] || row.url,
    publishedAt: excelDate(row["Дата постинга"] || row.postedAt || row.publishedAt),
    status: row["Статус"] || row.status,
    rawViews: row["Просмотры"] || row.views || row.rawViews,
    acceptedViews: row["Принятые просмотры"] || row.acceptedViews,
    reposts: row["Репосты"] || row.reposts,
    saves: row["Сохранения"] || row.saves,
    likes: row["Лайки"] || row.likes,
    comments: row["Комментарии"] || row.comments,
    note: row["Комментарий"] || row.note
  });
}

function audit(action, payload) {
  return { id: `audit-${Date.now()}-${Math.random().toString(16).slice(2)}`, action, payload, createdAt: new Date().toISOString() };
}

function guessOfferId(partner = "") {
  const lower = String(partner).toLowerCase();
  if (lower.includes("нейро") || lower.includes("neuro")) return "offer-neurosphere-tier";
  if (lower.includes("trend") || lower.includes("тренд") || lower.includes("aidentika") || lower.includes("синтах")) return "offer-trendsee-quality";
  return "offer-fabula-cpv";
}

function excelDate(value) {
  if (!value) return "";
  if (value instanceof Date) return value.toISOString().slice(0, 10);
  return String(value).slice(0, 10);
}

async function readImportedRows(filePath, originalName) {
  if (originalName.toLowerCase().endsWith(".csv")) {
    const raw = await fs.readFile(filePath, "utf8");
    return rowsToObjects(parseCsv(raw));
  }

  const rows = await readXlsxFile(filePath, { sheet: "Видео" }).catch(() => readXlsxFile(filePath));
  return rowsToObjects(rows);
}

function rowsToObjects(rows) {
  const matrix = normalizeRows(rows);
  const headerIndex = matrix.findIndex((row) => {
    const joined = row.map((value) => String(value).toLowerCase()).join(" ");
    return joined.includes("соц сеть") || joined.includes("social");
  });
  if (headerIndex === -1) return [];

  const headers = matrix[headerIndex].map((value) => String(value ?? "").trim());
  return matrix.slice(headerIndex + 1).map((row) => {
    const item = {};
    headers.forEach((header, index) => {
      if (header) item[header] = cellValue(row[index]);
    });
    return item;
  });
}

function normalizeRows(rows) {
  if (!Array.isArray(rows)) return [];
  if (rows.some((row) => row && typeof row === "object" && Array.isArray(row.data))) {
    const videoSheet = rows.find((row) => row.sheet === "Видео") ?? rows[0];
    return normalizeRows(videoSheet.data);
  }
  return rows
    .map((row) => Array.isArray(row) ? row : Object.values(row ?? {}))
    .filter((row) => row.some((value) => value !== null && value !== undefined && value !== ""));
}

function cellValue(value) {
  if (value == null) return "";
  if (value instanceof Date) return value;
  if (typeof value === "object") {
    if ("result" in value) return cellValue(value.result);
    if ("text" in value) return value.text;
    if ("hyperlink" in value) return value.hyperlink;
    if (Array.isArray(value.richText)) return value.richText.map((item) => item.text).join("");
  }
  return value;
}

function parseCsv(raw) {
  return raw
    .split(/\r?\n/)
    .filter(Boolean)
    .map((line) => {
      const cells = [];
      let cell = "";
      let quoted = false;
      for (let i = 0; i < line.length; i += 1) {
        const char = line[i];
        const next = line[i + 1];
        if (char === '"' && quoted && next === '"') {
          cell += '"';
          i += 1;
        } else if (char === '"') {
          quoted = !quoted;
        } else if (char === "," && !quoted) {
          cells.push(cell);
          cell = "";
        } else {
          cell += char;
        }
      }
      cells.push(cell);
      return cells;
    });
}

function string(value) {
  return value == null ? "" : String(value).trim();
}

function splitList(value) {
  if (Array.isArray(value)) return value.map(string).filter(Boolean);
  return String(value ?? "").split(/[,;\n]/).map(string).filter(Boolean);
}

function numeric(value) {
  if (value == null || value === "") return 0;
  return Number(String(value).replace(/\s/g, "").replace(",", ".")) || 0;
}

function hashPassword(password) {
  const salt = crypto.randomBytes(16).toString("hex");
  const hash = crypto.scryptSync(password, salt, 64).toString("hex");
  return `scrypt:${salt}:${hash}`;
}

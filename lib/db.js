import fs from "node:fs/promises";
import path from "node:path";
import {
  accounts,
  companies,
  creators,
  knowledgeBase,
  ledger,
  offers,
  promoCodes,
  serviceEvents,
  settings,
  trackingLinks,
  videos,
  withdrawals
} from "./defaultData.js";

const dbPath = path.resolve("data/db.json");

const emptyDb = () => ({
  schemaVersion: 3,
  settings,
  companies,
  creators,
  offers,
  accounts,
  videos,
  trackingLinks,
  promoCodes,
  serviceEvents,
  ledger,
  knowledgeBase,
  deposits: [],
    withdrawals,
    companyReports: [],
    disputes: [],
  notifications: [],
  auditLog: [],
  users: [],
  registrations: [],
  refreshRuns: [],
  analyticsSnapshots: [],
  dataQualityRuns: []
});

export async function readDb() {
  try {
    const raw = await fs.readFile(dbPath, "utf8");
    const parsed = JSON.parse(raw);
    return migrateDb(parsed);
  } catch (error) {
    if (error.code !== "ENOENT") throw error;
    const initial = emptyDb();
    await writeDb(initial);
    return initial;
  }
}

export async function writeDb(db) {
  await fs.mkdir(path.dirname(dbPath), { recursive: true });
  await fs.writeFile(dbPath, JSON.stringify(migrateDb(db), null, 2));
}

export async function updateDb(mutator) {
  const db = await readDb();
  const result = await mutator(db);
  await writeDb(db);
  return result ?? db;
}

export function nextId(items, prefix) {
  const max = items.reduce((current, item) => {
    const raw = String(item.id ?? "");
    const numeric = Number(raw.replace(`${prefix}-`, ""));
    return Number.isFinite(numeric) ? Math.max(current, numeric) : current;
  }, 0);
  return `${prefix}-${String(max + 1).padStart(3, "0")}`;
}

export function nextVideoId(items) {
  return nextId(items, "video");
}

function migrateDb(db) {
  const base = emptyDb();
  const migrated = {
    ...base,
    ...db,
    schemaVersion: 3,
    settings: { ...base.settings, ...(db.settings ?? {}) },
    companies: mergeSeedById(nonEmpty(db.companies, base.companies), base.companies),
    creators: nonEmpty(db.creators, base.creators),
    offers: mergeSeedById(nonEmpty(db.offers, base.offers), base.offers),
    accounts: nonEmpty(db.accounts, base.accounts),
    videos: migrateVideos(nonEmpty(db.videos, base.videos)),
    trackingLinks: nonEmpty(db.trackingLinks, base.trackingLinks),
    promoCodes: nonEmpty(db.promoCodes, base.promoCodes),
    serviceEvents: nonEmpty(db.serviceEvents, base.serviceEvents),
    ledger: nonEmpty(db.ledger, base.ledger),
    knowledgeBase: nonEmpty(db.knowledgeBase, base.knowledgeBase),
    deposits: Array.isArray(db.deposits) ? db.deposits : [],
    withdrawals: nonEmpty(db.withdrawals, base.withdrawals),
    companyReports: Array.isArray(db.companyReports) ? db.companyReports : [],
    disputes: Array.isArray(db.disputes) ? db.disputes : [],
    notifications: Array.isArray(db.notifications) ? db.notifications : [],
    auditLog: Array.isArray(db.auditLog) ? db.auditLog : [],
    users: Array.isArray(db.users) ? db.users : [],
    registrations: Array.isArray(db.registrations) ? db.registrations : [],
    refreshRuns: Array.isArray(db.refreshRuns) ? db.refreshRuns : [],
    analyticsSnapshots: Array.isArray(db.analyticsSnapshots) ? db.analyticsSnapshots : [],
    dataQualityRuns: Array.isArray(db.dataQualityRuns) ? db.dataQualityRuns : []
  };
  return migrated;
}

function nonEmpty(value, fallback) {
  return Array.isArray(value) && value.length ? value : fallback;
}

function mergeSeedById(current, seed) {
  const byId = new Map(seed.map((item) => [item.id, item]));
  const rows = current.map((item) => {
    const defaults = byId.get(item.id);
    return defaults ? mergeRecord(defaults, item) : item;
  });
  const existing = new Set(rows.map((item) => item.id));
  for (const item of seed) {
    if (!existing.has(item.id)) rows.push(item);
  }
  return rows;
}

function mergeRecord(defaults, current) {
  const merged = { ...defaults, ...current };
  for (const [key, value] of Object.entries(defaults)) {
    if (isPlainObject(value) && isPlainObject(current?.[key])) {
      merged[key] = mergeRecord(value, current[key]);
    }
  }
  return merged;
}

function isPlainObject(value) {
  return value && typeof value === "object" && !Array.isArray(value);
}

function migrateVideos(rows) {
  return rows.map((video, index) => {
    if (String(video.id ?? "").startsWith("video-")) return video;
    const offerId = guessOfferId(video.partner);
    return {
      id: `video-${String(index + 1).padStart(3, "0")}`,
      offerId,
      creatorId: "creator-ubt-01",
      accountId: "account-ig-ubt",
      platform: video.social || "Instagram Reels",
      url: video.url || "",
      title: video.hook || video.format || "Imported video",
      language: "ru",
      publishedAt: video.postedAt || new Date().toISOString().slice(0, 10),
      status: statusMap(video.status),
      aiEligibility: "needs_review",
      rawViews: numeric(video.views),
      acceptedViews: numeric(video.acceptedViews || video.views),
      rejectedViews: Math.max(0, numeric(video.views) - numeric(video.acceptedViews || video.views)),
      reposts: numeric(video.reposts),
      saves: numeric(video.saves),
      likes: numeric(video.likes),
      comments: numeric(video.comments),
      commentSummary: video.note || "",
      trackingLinkId: "",
      promoCodeId: "",
      note: video.note || ""
    };
  });
}

function guessOfferId(partner = "") {
  const lower = String(partner).toLowerCase();
  if (lower.includes("нейро") || lower.includes("neuro")) return "offer-neurosphere-tier";
  if (lower.includes("trend") || lower.includes("тренд") || lower.includes("aidentika") || lower.includes("синтах")) return "offer-trendsee-quality";
  return "offer-fabula-cpv";
}

function statusMap(status = "") {
  const lower = String(status).toLowerCase();
  if (lower.includes("выплач")) return "paid";
  if (lower.includes("засчит")) return "pending_payout";
  if (lower.includes("модерац")) return "needs_review";
  if (lower.includes("пауза")) return "paused";
  return "tracking";
}

function numeric(value) {
  if (value == null || value === "") return 0;
  return Number(String(value).replace(/\s/g, "").replace(",", ".")) || 0;
}

import { computeAnalytics } from "./payouts.js";

const number = (value) => Number(value) || 0;

export function buildAnalyticsSnapshot(db, reason = "manual", meta = {}) {
  const analytics = computeAnalytics(db);
  const now = new Date().toISOString();

  return {
    id: `snapshot-${Date.now()}-${Math.random().toString(16).slice(2)}`,
    reason,
    meta,
    createdAt: now,
    totals: {
      videos: number(analytics.totals.videos),
      rawViews: number(analytics.totals.rawViews),
      acceptedViews: number(analytics.totals.acceptedViews),
      rejectedViews: number(analytics.totals.rejectedViews),
      grossUsd: roundMoney(analytics.totals.grossUsd),
      creatorNetUsd: roundMoney(analytics.totals.creatorNetUsd),
      platformFeeUsd: roundMoney(analytics.totals.platformFeeUsd),
      availableCompanyBalanceUsd: roundMoney(analytics.totals.availableCompanyBalanceUsd),
      reservedUsd: roundMoney(analytics.totals.reservedUsd)
    },
    byCompany: analytics.companies.map((company) => ({
      companyId: company.id,
      name: company.name,
      offerCount: number(company.offerCount),
      videoCount: number(company.videoCount),
      acceptedViews: sumByCompanyVideos(analytics.videos, company.id, "acceptedViews"),
      grossUsd: roundMoney(company.grossUsd),
      availableUsd: roundMoney(company.availableUsd),
      pendingServiceEvents: number(company.pendingServiceEvents)
    })),
    byOffer: analytics.offers.map((offer) => ({
      offerId: offer.id,
      service: offer.service,
      status: offer.status,
      videoCount: number(offer.videoCount),
      acceptedViews: number(offer.acceptedViews),
      grossUsd: roundMoney(offer.grossUsd),
      availableUsd: roundMoney(offer.availableUsd),
      budgetStatus: offer.budgetStatus
    }))
  };
}

export function appendAnalyticsSnapshot(db, reason = "manual", meta = {}) {
  db.analyticsSnapshots ??= [];
  const snapshot = buildAnalyticsSnapshot(db, reason, meta);
  db.analyticsSnapshots.push(snapshot);
  if (db.analyticsSnapshots.length > 250) {
    db.analyticsSnapshots = db.analyticsSnapshots.slice(-250);
  }
  return snapshot;
}

function sumByCompanyVideos(videos, companyId, key) {
  return videos
    .filter((video) => video.companyId === companyId)
    .reduce((total, video) => total + number(video[key]), 0);
}

function roundMoney(value) {
  return Math.round(number(value) * 100) / 100;
}

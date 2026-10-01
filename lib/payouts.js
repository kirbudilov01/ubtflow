const number = (value) => Number(value) || 0;

export function computeAnalytics(db) {
  const settings = db.settings;
  const enrichedVideos = db.videos.map((video) => enrichVideo(video, db));
  const enrichedOffers = db.offers.map((offer) => enrichOffer(offer, enrichedVideos, db));
  const enrichedCompanies = db.companies.map((company) => enrichCompany(company, enrichedOffers, enrichedVideos, db));
  const enrichedCreators = db.creators.map((creator) => enrichCreator(creator, enrichedVideos, db));
  const serviceEvents = db.serviceEvents.map((event) => enrichServiceEvent(event, db));

  const totals = enrichedVideos.reduce((acc, video) => {
    acc.videos += 1;
    acc.rawViews += number(video.rawViews);
    acc.acceptedViews += number(video.acceptedViews);
    acc.rejectedViews += number(video.rejectedViews);
    acc.grossUsd += number(video.grossUsd);
    acc.platformFeeUsd += number(video.platformFeeUsd);
    acc.creatorNetUsd += number(video.creatorNetUsd);
    acc.comments += number(video.comments);
    return acc;
  }, {
    videos: 0,
    rawViews: 0,
    acceptedViews: 0,
    rejectedViews: 0,
    grossUsd: 0,
    platformFeeUsd: 0,
    creatorNetUsd: 0,
    comments: 0
  });

  totals.acceptedRate = totals.rawViews ? totals.acceptedViews / totals.rawViews : 0;
  totals.availableCompanyBalanceUsd = enrichedCompanies.reduce((sum, item) => sum + number(item.availableUsd), 0);
  totals.reservedUsd = enrichedCompanies.reduce((sum, item) => sum + number(item.reservedUsd), 0);
  totals.minimumWithdrawalUsd = settings.minimumWithdrawalUsd;

  return {
    settings,
    totals,
    companies: enrichedCompanies,
    creators: enrichedCreators,
    offers: enrichedOffers,
    videos: enrichedVideos,
    withdrawals: db.withdrawals.map((withdrawal) => enrichWithdrawal(withdrawal, db)),
    serviceEvents,
    trackingLinks: db.trackingLinks,
    promoCodes: db.promoCodes,
    accounts: db.accounts,
    registrations: db.registrations ?? [],
    auditLog: (db.auditLog ?? []).slice(-20).reverse(),
    ledger: db.ledger.slice().reverse(),
    knowledgeBase: db.knowledgeBase,
    analyticsSnapshots: (db.analyticsSnapshots ?? []).slice(-20).reverse(),
    dataQualityRuns: (db.dataQualityRuns ?? []).slice(-20).reverse(),
    queues: buildQueues(enrichedVideos, serviceEvents, db),
    rankings: {
      offers: enrichedOffers.slice().sort((a, b) => b.score - a.score),
      creators: enrichedCreators.slice().sort((a, b) => b.score - a.score),
      videos: enrichedVideos.slice().sort((a, b) => b.grossUsd - a.grossUsd).slice(0, 10)
    },
    refreshRuns: db.refreshRuns.slice(-10).reverse()
  };
}

export function enrichVideo(video, db) {
  const offer = db.offers.find((item) => item.id === video.offerId) ?? {};
  const company = db.companies.find((item) => item.id === offer.companyId) ?? {};
  const creator = db.creators.find((item) => item.id === video.creatorId) ?? {};
  const rawViews = number(video.rawViews);
  const acceptedViews = Math.min(number(video.acceptedViews), rawViews || number(video.acceptedViews));
  const rejectedViews = Math.max(number(video.rejectedViews), Math.max(0, rawViews - acceptedViews));
  const grossUsd = calculateGrossUsd(offer, acceptedViews);
  const platformFeeUsd = grossUsd * number(db.settings.platformFeeRate);
  const creatorNetUsd = grossUsd - platformFeeUsd;
  const acceptedRate = rawViews ? acceptedViews / rawViews : 0;
  const engagementRate = rawViews ? (number(video.reposts) + number(video.saves) + number(video.likes) + number(video.comments)) / rawViews : 0;
  const riskFlags = buildVideoRiskFlags(video, offer, acceptedRate);

  return {
    ...video,
    offerTitle: offer.title ?? "",
    companyId: company.id ?? "",
    companyName: company.name ?? "",
    creatorName: creator.name ?? "",
    creatorHandle: creator.handle ?? "",
    rawViews,
    acceptedViews,
    rejectedViews,
    acceptedRate,
    engagementRate,
    grossUsd,
    platformFeeUsd,
    creatorNetUsd,
    payoutDueAt: estimatePayoutDueAt(video, company),
    payoutCycle: company.payoutCalendar?.billingPeriod ?? "company_report",
    lockedViews: number(video.lockedViews) || (["pending_payout", "paid"].includes(video.status) ? acceptedViews : 0),
    viewsLockedAt: video.viewsLockedAt || (["pending_payout", "paid"].includes(video.status) ? estimatePayoutDueAt(video, company) : ""),
    paidAt: video.paidAt || "",
    riskFlags
  };
}

function estimatePayoutDueAt(video, company) {
  const base = new Date(video.publishedAt || Date.now());
  if (Number.isNaN(base.getTime())) return "company report";
  const days = number(company.payoutCalendar?.approvalWindowDays) || 5;
  const mode = company.payoutCalendar?.billingPeriod;
  if (mode === "weekly") {
    const day = base.getDay();
    const untilSunday = (7 - day) % 7;
    base.setDate(base.getDate() + untilSunday + days);
    return base.toISOString().slice(0, 10);
  }
  if (mode === "biweekly") {
    base.setDate(base.getDate() + 14 + days);
    return base.toISOString().slice(0, 10);
  }
  if (mode === "monthly") {
    base.setMonth(base.getMonth() + 1, 0);
    base.setDate(base.getDate() + days);
    return base.toISOString().slice(0, 10);
  }
  return "company report";
}

function enrichOffer(offer, videos, db) {
  const rows = videos.filter((video) => video.offerId === offer.id);
  const company = db.companies.find((item) => item.id === offer.companyId) ?? {};
  const rawViews = sum(rows, "rawViews");
  const acceptedViews = sum(rows, "acceptedViews");
  const grossUsd = sum(rows, "grossUsd");
  const availableUsd = Math.max(0, number(offer.totalBudgetUsd) - number(offer.reservedUsd) - number(offer.spentUsd));
  const burnRate = number(offer.totalBudgetUsd) ? (number(offer.spentUsd) + number(offer.reservedUsd)) / number(offer.totalBudgetUsd) : 0;
  const budgetStatus = availableUsd <= number(offer.stopThresholdUsd) ? "near_stop" : "healthy";
  const score = Math.round(
    Math.min(100, number(company.reliabilityScore) * 0.45 + Math.min(40, number(offer.viewRateUsd) * 40) + Math.max(0, 15 - riskPenalty(offer)))
  );
  return {
    ...offer,
    companyName: company.name ?? "",
    videoCount: rows.length,
    rawViews,
    acceptedViews,
    grossUsd,
    availableUsd,
    burnRate,
    budgetStatus,
    score
  };
}

function enrichCompany(company, offers, videos, db) {
  const companyOffers = offers.filter((offer) => offer.companyId === company.id);
  const offerIds = new Set(companyOffers.map((offer) => offer.id));
  const companyVideos = videos.filter((video) => video.companyId === company.id || offerIds.has(video.offerId));
  const grossUsd = sum(companyVideos, "grossUsd");
  const availableUsd = Math.max(0, number(company.balanceUsd) - number(company.reservedUsd) - number(company.spentUsd));
  const topCreator = topBy(companyVideos, "creatorName", "grossUsd");
  const topVideo = companyVideos.slice().sort((a, b) => b.grossUsd - a.grossUsd)[0] ?? null;
  const events = db.serviceEvents.filter((event) => companyOffers.some((offer) => offer.id === event.offerId));
  return {
    ...company,
    offerCount: companyOffers.length,
    videoCount: companyVideos.length,
    grossUsd,
    availableUsd,
    topCreator,
    topVideo,
    serviceEventCount: events.length,
    pendingServiceEvents: events.filter((event) => event.status === "pending").length
  };
}

function enrichCreator(creator, videos) {
  const rows = videos.filter((video) => video.creatorId === creator.id);
  const grossUsd = sum(rows, "grossUsd");
  const acceptedViews = sum(rows, "acceptedViews");
  const disputes = rows.filter((video) => video.status === "disputed").length;
  const riskCount = rows.reduce((sumValue, video) => sumValue + video.riskFlags.length, 0);
  const score = Math.max(0, Math.round(70 + Math.min(25, acceptedViews / 10000) - disputes * 8 - riskCount * 4));
  return {
    ...creator,
    videoCount: rows.length,
    acceptedViews,
    grossUsd,
    score,
    canWithdraw: number(creator.availableUsd) >= 100
  };
}

function enrichWithdrawal(withdrawal, db) {
  const creator = db.creators.find((item) => item.id === withdrawal.creatorId) ?? {};
  return {
    ...withdrawal,
    creatorName: creator.name ?? "",
    creatorHandle: creator.handle ?? "",
    walletRiskStatus: creator.wallet?.riskStatus ?? ""
  };
}

function enrichServiceEvent(event, db) {
  const offer = db.offers.find((item) => item.id === event.offerId) ?? {};
  const creator = db.creators.find((item) => item.id === event.creatorId) ?? {};
  return {
    ...event,
    offerTitle: offer.title ?? "",
    creatorName: creator.name ?? ""
  };
}

function calculateGrossUsd(offer, acceptedViews) {
  if (!offer) return 0;
  if (acceptedViews < number(offer.minViews)) return 0;
  const paidViews = number(offer.maxPaidViewsPerVideo) ? Math.min(acceptedViews, number(offer.maxPaidViewsPerVideo)) : acceptedViews;
  return (paidViews / 1000) * number(offer.viewRateUsd);
}

function buildVideoRiskFlags(video, offer, acceptedRate) {
  const flags = [];
  if (number(video.rawViews) > 0 && acceptedRate < 0.75) flags.push("low_accepted_rate");
  if (!offer.platforms?.includes(video.platform)) flags.push("platform_not_allowed");
  if (offer.languages?.length && !offer.languages.includes(video.language)) flags.push("language_mismatch");
  if (number(video.rawViews) > 0 && number(video.rawViews) < number(offer.minViews)) flags.push("below_min_views");
  if (video.aiEligibility === "needs_review") flags.push("ai_review_needed");
  return flags;
}

function buildQueues(videos, serviceEvents, db) {
  return {
    videoReview: videos.filter((video) => ["needs_review", "accepted_for_tracking", "tracking"].includes(video.status) || video.riskFlags.length).slice(0, 12),
    payoutReview: videos.filter((video) => video.status === "pending_payout").slice(0, 12),
    serviceEvents: serviceEvents.filter((event) => event.status === "pending").slice(0, 12),
    withdrawals: db.withdrawals.filter((item) => ["requested", "compliance_review"].includes(item.status)).slice(0, 12),
    lowBalanceOffers: db.offers.filter((offer) => number(offer.totalBudgetUsd) - number(offer.reservedUsd) - number(offer.spentUsd) <= number(offer.stopThresholdUsd))
  };
}

function sum(rows, key) {
  return rows.reduce((total, row) => total + number(row[key]), 0);
}

function topBy(rows, groupKey, valueKey) {
  const map = new Map();
  for (const row of rows) map.set(row[groupKey], (map.get(row[groupKey]) ?? 0) + number(row[valueKey]));
  return [...map.entries()].sort((a, b) => b[1] - a[1])[0] ?? null;
}

function riskPenalty(offer) {
  let penalty = 0;
  if (offer.status !== "active") penalty += 20;
  if (number(offer.totalBudgetUsd) - number(offer.reservedUsd) - number(offer.spentUsd) <= number(offer.stopThresholdUsd)) penalty += 10;
  return penalty;
}

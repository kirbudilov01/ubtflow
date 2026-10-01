export const settings = {
  productName: "ViewFlow",
  brandLine: "Trend intelligence by WANT2VIEW",
  accountingCurrency: "USD",
  settlementCurrency: "USDT",
  platformFeeRate: 0.05,
  referralShareRate: 0.2,
  minimumWithdrawalUsd: 100,
  minimumAcceptedViews: 1000,
  defaultStopThresholdRate: 0.1,
  jurisdiction: "Hong Kong likely",
  networks: ["TRC20", "Polygon"],
  platforms: ["TikTok", "Instagram Reels", "YouTube Shorts"],
  updatedAt: "2026-08-04T00:00:00.000Z"
};

export const companies = [
  {
    id: "company-fabula",
    name: "Fabula",
    logoText: "Fabula",
    siteUrl: "https://fabula-ai.com/",
    domain: "fabula-ai.com",
    accent: "#7b3ff2",
    legalStatus: "pending_contract",
    jurisdiction: "Russia source / international offer pending",
    reliabilityScore: 82,
    balanceUsd: 2500,
    reservedUsd: 840,
    spentUsd: 1260,
    usdtBalance: 2500,
    payoutCalendar: {
      billingPeriod: "monthly",
      cutoffDay: "last_day",
      approvalWindowDays: 5,
      payoutMode: "company_report",
      lateViewsRule: "carry_next_cycle"
    }
  },
  {
    id: "company-neurosphere",
    name: "Neurosphere",
    logoText: "Neurosphere",
    siteUrl: "https://neurosphere.pro/",
    domain: "neurosphere.pro",
    accent: "#20c7c9",
    legalStatus: "pending_contract",
    jurisdiction: "Russia source / international offer pending",
    reliabilityScore: 78,
    balanceUsd: 4000,
    reservedUsd: 1650,
    spentUsd: 2350,
    usdtBalance: 4000,
    payoutCalendar: {
      billingPeriod: "custom",
      cutoffDay: "company_report",
      approvalWindowDays: 5,
      payoutMode: "tiered_report",
      lateViewsRule: "offer_specific"
    }
  },
  {
    id: "company-trendsee",
    name: "TrendSee / Aidentika / SYNTX",
    logoText: "TrendSee",
    siteUrl: "https://trendsee.io/",
    domain: "trendsee.io",
    accent: "#1c8cff",
    legalStatus: "pending_contract",
    jurisdiction: "Russia source / international offer pending",
    reliabilityScore: 74,
    balanceUsd: 1800,
    reservedUsd: 560,
    spentUsd: 690,
    usdtBalance: 1800,
    payoutCalendar: {
      billingPeriod: "monthly",
      cutoffDay: "company_report",
      approvalWindowDays: 7,
      payoutMode: "engagement_quality",
      lateViewsRule: "no_late_views"
    }
  },
  {
    id: "company-want2view",
    name: "WANT2VIEW",
    logoText: "WANT2VIEW",
    siteUrl: "https://app.want2view.com/",
    domain: "app.want2view.com",
    accent: "#28d7c7",
    legalStatus: "internal_product",
    jurisdiction: "Hong Kong likely / internal service",
    reliabilityScore: 91,
    balanceUsd: 1200,
    reservedUsd: 220,
    spentUsd: 480,
    usdtBalance: 1200,
    replenishmentNote: "Internal service; budget is replenished weekly for creator tests.",
    payoutCalendar: {
      billingPeriod: "weekly",
      cutoffDay: "sunday",
      approvalWindowDays: 3,
      payoutMode: "internal_report",
      lateViewsRule: "carry_next_cycle"
    }
  },
  {
    id: "company-atlasrepo",
    name: "AtlasRepo",
    logoText: "AtlasRepo",
    siteUrl: "https://atlasrepo.com/",
    domain: "atlasrepo.com",
    accent: "#ffb000",
    legalStatus: "internal_product",
    jurisdiction: "Hong Kong likely / internal service",
    reliabilityScore: 88,
    balanceUsd: 0,
    reservedUsd: 0,
    spentUsd: 0,
    usdtBalance: 0,
    replenishmentNote: "Offer remains visible: company regularly replenishes testing budgets.",
    payoutCalendar: {
      billingPeriod: "biweekly",
      cutoffDay: "company_report",
      approvalWindowDays: 4,
      payoutMode: "internal_report",
      lateViewsRule: "carry_next_cycle"
    }
  }
];

export const creators = [
  {
    id: "creator-ubt-01",
    name: "UBT Test Creator",
    handle: "@ubt_ai",
    language: "ru",
    status: "verified",
    wallet: { network: "TRC20", address: "TXXXXXXXXXXXXXXXXXXXXXXXXXXXXXX", riskStatus: "clear" },
    availableUsd: 126.35,
    holdUsd: 83.25,
    paidUsd: 0,
    referralCode: "UBT01"
  },
  {
    id: "creator-vlad-style",
    name: "Vlad-style Creator",
    handle: "@vlad_style_grid",
    language: "ru",
    status: "manual_review",
    wallet: { network: "Polygon", address: "0x0000000000000000000000000000000000000000", riskStatus: "pending" },
    availableUsd: 0,
    holdUsd: 312.5,
    paidUsd: 0,
    referralCode: "VFLOW"
  }
];

export const offers = [
  {
    id: "offer-fabula-cpv",
    companyId: "company-fabula",
    title: "Fabula AI marketplace card demos",
    service: "Fabula",
    category: "AI image/design",
    status: "active",
    languages: ["ru", "en"],
    platforms: ["TikTok", "Instagram Reels", "YouTube Shorts"],
    payoutModel: "flat_cpv",
    viewRateUsd: 0.55,
    sourceRateReference: "50 RUB / 1,000 views from Vlad terms; USD/USDT rate set manually",
    minViews: 1000,
    maxPaidViewsPerVideo: 400000,
    totalBudgetUsd: 2500,
    dailyBudgetUsd: 350,
    reservedUsd: 840,
    spentUsd: 1260,
    stopThresholdUsd: 250,
    acceptedGeo: "any",
    rights: "paid_usage_bonus",
    payoutCalendar: "monthly_company_report",
    rules: [
      "Show Fabula screen or clear before/after result",
      "Do not promise guaranteed marketplace sales",
      "Language must match offer language",
      "No copied third-party video without transformation"
    ]
  },
  {
    id: "offer-neurosphere-tier",
    companyId: "company-neurosphere",
    title: "Neurosphere AI workflow payouts",
    service: "Neurosphere",
    category: "AI productivity",
    status: "active",
    languages: ["ru", "en"],
    platforms: ["TikTok", "Instagram Reels", "YouTube Shorts"],
    payoutModel: "tiered_views",
    viewRateUsd: 0,
    tiers: [
      [100000, 110],
      [200000, 220],
      [300000, 330],
      [400000, 385],
      [500000, 440],
      [600000, 495],
      [700000, 550],
      [800000, 605],
      [900000, 660],
      [1000000, 770]
    ],
    sourceRateReference: "RUB ladder from Vlad terms, converted manually for local MVP seed",
    minViews: 1000,
    maxPaidViewsPerVideo: 3000000,
    totalBudgetUsd: 4000,
    dailyBudgetUsd: 600,
    reservedUsd: 1650,
    spentUsd: 2350,
    stopThresholdUsd: 400,
    acceptedGeo: "any",
    rights: "paid_usage_included",
    payoutCalendar: "company_report",
    rules: [
      "Show real AI workflow or clear AI output",
      "No fake income claims",
      "Use approved language",
      "Service mention must be understandable"
    ]
  },
  {
    id: "offer-trendsee-quality",
    companyId: "company-trendsee",
    title: "TrendSee / Aidentika / SYNTX quality view offer",
    service: "TrendSee",
    category: "Marketing SaaS",
    status: "active",
    languages: ["ru", "en"],
    platforms: ["TikTok", "Instagram Reels", "YouTube Shorts"],
    payoutModel: "quality_cpv",
    viewRateUsd: 0.14,
    sourceRateReference: "Repost coefficient model from Vlad terms; fixed USD seed for MVP",
    minViews: 10000,
    maxPaidViewsPerVideo: 500000,
    totalBudgetUsd: 1800,
    dailyBudgetUsd: 250,
    reservedUsd: 560,
    spentUsd: 690,
    stopThresholdUsd: 180,
    acceptedGeo: "any",
    rights: "organic_only",
    payoutCalendar: "company_report",
    rules: [
      "Show trend discovery, script generation, or clear useful workflow",
      "Low-quality reposts can be rejected",
      "Reposts/saves are used as quality signal",
      "No misleading growth guarantees"
    ]
  },
  {
    id: "offer-want2view-content-analytics",
    companyId: "company-want2view",
    title: "WANT2VIEW trend analytics tests",
    service: "WANT2VIEW",
    category: "Content analytics",
    status: "active",
    languages: ["ru", "en"],
    platforms: ["TikTok", "Instagram Reels", "YouTube Shorts"],
    payoutModel: "flat_cpv",
    viewRateUsd: 0.22,
    sourceRateReference: "Internal offer for trend parsing and content analytics adoption.",
    minViews: 1000,
    maxPaidViewsPerVideo: 500000,
    totalBudgetUsd: 1200,
    dailyBudgetUsd: 180,
    reservedUsd: 220,
    spentUsd: 480,
    stopThresholdUsd: 120,
    acceptedGeo: "any",
    rights: "organic_usage_included",
    payoutCalendar: "weekly_internal_report",
    rules: [
      "Show how popular videos are parsed and turned into content ideas",
      "No fake virality guarantees",
      "Mention free test access where relevant",
      "Creator can later buy ViewFlow partner plan at 50% discount"
    ]
  },
  {
    id: "offer-atlasrepo-creator-demo",
    companyId: "company-atlasrepo",
    title: "AtlasRepo AI research workspace demos",
    service: "AtlasRepo",
    category: "Content tools",
    status: "active",
    languages: ["ru", "en"],
    platforms: ["TikTok", "Instagram Reels", "YouTube Shorts"],
    payoutModel: "flat_cpv",
    viewRateUsd: 0.18,
    sourceRateReference: "Internal seed offer; budget can be zero but service replenishes campaign cycles.",
    minViews: 1000,
    maxPaidViewsPerVideo: 500000,
    totalBudgetUsd: 900,
    dailyBudgetUsd: 120,
    reservedUsd: 0,
    spentUsd: 0,
    stopThresholdUsd: 90,
    acceptedGeo: "any",
    rights: "paid_usage_included",
    payoutCalendar: "biweekly_internal_report",
    rules: [
      "Show real research or repo discovery workflow",
      "No false claims about private data access",
      "Focus on creators, founders and AI builders",
      "Offer remains visible even while budget awaits replenishment"
    ]
  }
];

export const accounts = [
  { id: "account-ig-ubt", creatorId: "creator-ubt-01", platform: "Instagram Reels", handle: "@ubt_ai", status: "connected", lastSyncAt: "2026-08-04T08:00:00.000Z" },
  { id: "account-tt-vlad", creatorId: "creator-vlad-style", platform: "TikTok", handle: "@vlad_style_grid", status: "manual_import", lastSyncAt: "2026-08-04T08:00:00.000Z" },
  { id: "account-yt-ubt", creatorId: "creator-ubt-01", platform: "YouTube Shorts", handle: "@ubtshorts", status: "connected", lastSyncAt: "2026-08-04T08:00:00.000Z" }
];

export const videos = [
  {
    id: "video-001",
    offerId: "offer-fabula-cpv",
    creatorId: "creator-ubt-01",
    accountId: "account-ig-ubt",
    platform: "Instagram Reels",
    url: "https://example.com/fabula-reel-001",
    title: "Product photo to marketplace card",
    language: "ru",
    publishedAt: "2026-08-01",
    status: "pending_payout",
    aiEligibility: "fits",
    rawViews: 82000,
    acceptedViews: 76000,
    rejectedViews: 6000,
    reposts: 430,
    saves: 290,
    likes: 3500,
    comments: 96,
    commentSummary: "Audience asks for the tool link and whether it works for Wildberries.",
    trackingLinkId: "track-fabula-ubt",
    promoCodeId: "promo-fabula-ubt",
    note: "Seed video from Fabula workflow pattern"
  },
  {
    id: "video-002",
    offerId: "offer-neurosphere-tier",
    creatorId: "creator-vlad-style",
    accountId: "account-tt-vlad",
    platform: "TikTok",
    url: "https://example.com/neurosphere-tiktok-001",
    title: "One AI platform closes 3 content tasks",
    language: "ru",
    publishedAt: "2026-08-02",
    status: "tracking",
    aiEligibility: "needs_review",
    rawViews: 318000,
    acceptedViews: 300000,
    rejectedViews: 18000,
    reposts: 1100,
    saves: 870,
    likes: 9800,
    comments: 310,
    commentSummary: "Strong interest in pricing and video generation quality.",
    trackingLinkId: "track-neuro-vlad",
    promoCodeId: "promo-neuro-vlad",
    note: "Tiered payout seed"
  },
  {
    id: "video-003",
    offerId: "offer-trendsee-quality",
    creatorId: "creator-ubt-01",
    accountId: "account-yt-ubt",
    platform: "YouTube Shorts",
    url: "https://example.com/trendsee-short-001",
    title: "Viral reference to script in 5 minutes",
    language: "ru",
    publishedAt: "2026-08-03",
    status: "accepted_for_tracking",
    aiEligibility: "fits",
    rawViews: 42000,
    acceptedViews: 39000,
    rejectedViews: 3000,
    reposts: 120,
    saves: 260,
    likes: 1600,
    comments: 54,
    commentSummary: "Comments mostly ask for the prompt and examples.",
    trackingLinkId: "track-trendsee-ubt",
    promoCodeId: "promo-trendsee-ubt",
    note: "Quality coefficient seed"
  }
];

export const trackingLinks = [
  { id: "track-fabula-ubt", offerId: "offer-fabula-cpv", creatorId: "creator-ubt-01", url: "https://fabula-ai.com/?ref=ubt01&utm_source=viewflow", clicks: 142, status: "active" },
  { id: "track-neuro-vlad", offerId: "offer-neurosphere-tier", creatorId: "creator-vlad-style", url: "https://neurosphere.pro/?ref=vflow&utm_source=viewflow", clicks: 510, status: "active" },
  { id: "track-trendsee-ubt", offerId: "offer-trendsee-quality", creatorId: "creator-ubt-01", url: "https://trendsee.io/?ref=ubt01&utm_source=viewflow", clicks: 93, status: "active" }
];

export const promoCodes = [
  { id: "promo-fabula-ubt", offerId: "offer-fabula-cpv", creatorId: "creator-ubt-01", code: "UBTFABULA", uses: 8, status: "active" },
  { id: "promo-neuro-vlad", offerId: "offer-neurosphere-tier", creatorId: "creator-vlad-style", code: "VFLOWAI", uses: 17, status: "active" },
  { id: "promo-trendsee-ubt", offerId: "offer-trendsee-quality", creatorId: "creator-ubt-01", code: "TRENDUBT", uses: 5, status: "active" }
];

export const serviceEvents = [
  { id: "event-001", offerId: "offer-fabula-cpv", creatorId: "creator-ubt-01", externalEventId: "fab-signup-001", type: "signup", amountUsd: 0, status: "approved", source: "postback_sandbox", occurredAt: "2026-08-02T12:00:00.000Z" },
  { id: "event-002", offerId: "offer-neurosphere-tier", creatorId: "creator-vlad-style", externalEventId: "neuro-paid-001", type: "paid_subscription", amountUsd: 49, status: "pending", source: "csv_fallback", occurredAt: "2026-08-03T16:15:00.000Z" },
  { id: "event-003", offerId: "offer-trendsee-quality", creatorId: "creator-ubt-01", externalEventId: "trend-trial-001", type: "trial_started", amountUsd: 0, status: "approved", source: "postback_sandbox", occurredAt: "2026-08-03T18:20:00.000Z" }
];

export const ledger = [
  { id: "ledger-001", ownerType: "company", ownerId: "company-fabula", type: "deposit", amountUsd: 2500, amountUsdt: 2500, status: "credited", txHash: "0xfabula_seed", createdAt: "2026-08-01T10:00:00.000Z" },
  { id: "ledger-002", ownerType: "company", ownerId: "company-neurosphere", type: "deposit", amountUsd: 4000, amountUsdt: 4000, status: "credited", txHash: "0xneuro_seed", createdAt: "2026-08-01T10:10:00.000Z" },
  { id: "ledger-003", ownerType: "creator", ownerId: "creator-ubt-01", type: "accrual_hold", amountUsd: 41.8, amountUsdt: 41.8, status: "on_hold", txHash: "", createdAt: "2026-08-03T10:00:00.000Z" }
];

export const withdrawals = [
  { id: "withdrawal-001", creatorId: "creator-ubt-01", network: "TRC20", address: "demo_trc20_wallet", amountUsd: 100, amountUsdt: 100, feeUsdt: 1, txHash: "", riskStatus: "pending", status: "requested", createdAt: "2026-08-04T08:30:00.000Z" },
  { id: "withdrawal-002", creatorId: "creator-vlad-style", network: "TRC20", address: "", amountUsd: 80, amountUsdt: 80, feeUsdt: 0, txHash: "", riskStatus: "missing_wallet", status: "blocked", createdAt: "2026-08-03T15:10:00.000Z" }
];

export const knowledgeBase = [
  { id: "kb-creator-start", audience: "creator", title: "How creators get paid", body: "Connect an account, take an offer, publish Reels/Shorts/TikTok, pass accepted views review, then withdraw after the company payout cycle." },
  { id: "kb-company-api", audience: "company", title: "Service API / postback rules", body: "Send signup, trial, activation, paid_subscription, refund and chargeback events with external_event_id, timestamp and signature." },
  { id: "kb-admin-usdt", audience: "admin", title: "USDT settlement controls", body: "Every deposit and withdrawal needs network, tx hash, confirmations, risk status and ledger entry." }
];

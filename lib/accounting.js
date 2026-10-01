const money = (value) => Math.round((Number(value) || 0) * 100) / 100;
const number = (value) => Number(value) || 0;

export const LEDGER_TYPES = {
  OPENING_AVAILABLE: "opening_available",
  OPENING_HOLD: "opening_hold",
  ADVERTISER_DEPOSIT: "advertiser_deposit",
  CREATOR_EARNING_PENDING: "creator_earning_pending",
  CREATOR_BALANCE_CREDIT: "creator_balance_credit",
  PLATFORM_FEE_CREDIT: "platform_fee_credit",
  WITHDRAWAL_REQUESTED: "withdrawal_requested",
  WITHDRAWAL_PAID: "withdrawal_paid",
  ADJUSTMENT: "manual_adjustment"
};

export function addLedgerEntry(db, entry) {
  db.ledger ??= [];
  const saved = {
    id: nextLedgerId(db.ledger),
    ownerType: entry.ownerType || "platform",
    ownerId: entry.ownerId || "platform",
    counterpartyType: entry.counterpartyType || "",
    counterpartyId: entry.counterpartyId || "",
    type: entry.type || LEDGER_TYPES.ADJUSTMENT,
    amountUsd: money(entry.amountUsd),
    amountUsdt: money(entry.amountUsdt ?? entry.amountUsd),
    status: entry.status || "posted",
    referenceType: entry.referenceType || "",
    referenceId: entry.referenceId || "",
    txHash: entry.txHash || "",
    memo: entry.memo || "",
    createdAt: entry.createdAt || new Date().toISOString()
  };
  db.ledger.push(saved);
  return saved;
}

export function calculateVideoGrossUsd(offer, acceptedViews) {
  if (!offer) return 0;
  const minViews = number(offer.minViews);
  if (number(acceptedViews) < minViews) return 0;
  const paidViews = number(offer.maxPaidViewsPerVideo)
    ? Math.min(number(acceptedViews), number(offer.maxPaidViewsPerVideo))
    : number(acceptedViews);
  return money((paidViews / 1000) * number(offer.viewRateUsd));
}

export function calculateVideoPayout(db, video) {
  const offer = db.offers.find((item) => item.id === video.offerId);
  const company = db.companies.find((item) => item.id === offer?.companyId);
  const acceptedViews = Math.max(0, number(video.acceptedViews ?? video.rawViews));
  const grossUsd = calculateVideoGrossUsd(offer, acceptedViews);
  const platformFeeUsd = money(grossUsd * number(db.settings?.platformFeeRate ?? 0.05));
  const creatorNetUsd = money(grossUsd - platformFeeUsd);
  return {
    offer,
    company,
    acceptedViews,
    grossUsd,
    platformFeeUsd,
    creatorNetUsd
  };
}

export function rebuildBalancesFromLedger(db) {
  const companyDeltas = new Map();
  const creatorAvailable = new Map();
  const creatorHold = new Map();
  const creatorPaid = new Map();

  for (const entry of db.ledger ?? []) {
    const amount = number(entry.amountUsd);
    if (entry.ownerType === "company" && [LEDGER_TYPES.ADVERTISER_DEPOSIT, "deposit"].includes(entry.type)) {
      companyDeltas.set(entry.ownerId, number(companyDeltas.get(entry.ownerId)) + amount);
    }
    if (entry.ownerType === "creator") {
      if ([LEDGER_TYPES.CREATOR_EARNING_PENDING, LEDGER_TYPES.OPENING_HOLD, "accrual_hold"].includes(entry.type)) {
        creatorHold.set(entry.ownerId, number(creatorHold.get(entry.ownerId)) + amount);
      }
      if ([LEDGER_TYPES.CREATOR_BALANCE_CREDIT, LEDGER_TYPES.OPENING_AVAILABLE].includes(entry.type)) {
        creatorAvailable.set(entry.ownerId, number(creatorAvailable.get(entry.ownerId)) + amount);
        if (entry.type === LEDGER_TYPES.CREATOR_BALANCE_CREDIT) {
          creatorHold.set(entry.ownerId, number(creatorHold.get(entry.ownerId)) - amount);
        }
      }
      if (entry.type === LEDGER_TYPES.WITHDRAWAL_REQUESTED) {
        creatorAvailable.set(entry.ownerId, number(creatorAvailable.get(entry.ownerId)) - amount);
      }
      if (entry.type === LEDGER_TYPES.WITHDRAWAL_PAID) {
        creatorPaid.set(entry.ownerId, number(creatorPaid.get(entry.ownerId)) + amount);
      }
    }
  }

  for (const company of db.companies ?? []) {
    if (companyDeltas.has(company.id)) {
      company.balanceUsd = Math.max(0, money(companyDeltas.get(company.id)));
      company.usdtBalance = company.balanceUsd;
    }
  }
  for (const creator of db.creators ?? []) {
    if (creatorAvailable.has(creator.id)) creator.availableUsd = Math.max(0, money(creatorAvailable.get(creator.id)));
    if (creatorHold.has(creator.id)) creator.holdUsd = Math.max(0, money(creatorHold.get(creator.id)));
    if (creatorPaid.has(creator.id)) creator.paidUsd = Math.max(0, money(creatorPaid.get(creator.id)));
  }
}

export function approveVideoForPayout(db, video, input = {}) {
  const existingPending = (db.ledger ?? []).find((entry) => (
    entry.referenceType === "video"
    && entry.referenceId === video.id
    && entry.type === LEDGER_TYPES.CREATOR_EARNING_PENDING
  ));
  const payout = calculateVideoPayout(db, video);
  const now = new Date().toISOString();
  video.acceptedViews = payout.acceptedViews;
  video.rejectedViews = Math.max(0, number(video.rawViews) - payout.acceptedViews);
  video.lockedViews = payout.acceptedViews;
  video.viewsLockedAt = input.viewsLockedAt || now;
  video.status = "approved_pending_report";
  video.aiEligibility = input.aiEligibility || video.aiEligibility || "fits";
  video.grossUsdLocked = payout.grossUsd;
  video.creatorNetUsdLocked = payout.creatorNetUsd;
  video.platformFeeUsdLocked = payout.platformFeeUsd;

  if (!existingPending) {
    addLedgerEntry(db, {
      ownerType: "creator",
      ownerId: video.creatorId,
      counterpartyType: "company",
      counterpartyId: payout.company?.id,
      type: LEDGER_TYPES.CREATOR_EARNING_PENDING,
      amountUsd: payout.creatorNetUsd,
      status: "pending_report",
      referenceType: "video",
      referenceId: video.id,
      memo: "Pending creator earning for approved views"
    });
  }

  return { video, payout };
}

export function finalizeCompanyReport(db, input = {}) {
  const companyId = input.companyId;
  const company = db.companies.find((item) => item.id === companyId);
  if (!company) return null;

  db.companyReports ??= [];
  const offerIds = new Set(db.offers.filter((offer) => offer.companyId === companyId).map((offer) => offer.id));
  const videos = db.videos.filter((video) => {
    if (!offerIds.has(video.offerId)) return false;
    if (!["approved_pending_report", "pending_payout"].includes(video.status)) return false;
    if (input.offerId && video.offerId !== input.offerId) return false;
    return true;
  });

  const report = {
    id: nextReportId(db.companyReports),
    companyId,
    offerId: input.offerId || "",
    periodFrom: input.periodFrom || "",
    periodTo: input.periodTo || new Date().toISOString().slice(0, 10),
    status: "finalized",
    videosCount: videos.length,
    acceptedViews: 0,
    grossUsd: 0,
    creatorNetUsd: 0,
    platformFeeUsd: 0,
    finalizedAt: new Date().toISOString(),
    note: input.note || "Company report finalized"
  };

  for (const video of videos) {
    const alreadyCredited = (db.ledger ?? []).some((entry) => (
      entry.referenceType === "company_report"
      && entry.referenceId === report.id
      && entry.type === LEDGER_TYPES.CREATOR_BALANCE_CREDIT
    ));
    if (alreadyCredited) continue;
    const payout = calculateVideoPayout(db, video);
    report.acceptedViews += payout.acceptedViews;
    report.grossUsd += payout.grossUsd;
    report.creatorNetUsd += payout.creatorNetUsd;
    report.platformFeeUsd += payout.platformFeeUsd;
    video.status = "locked_for_payout";
    video.reportId = report.id;
    video.payoutDueAt = report.periodTo;

    addLedgerEntry(db, {
      ownerType: "creator",
      ownerId: video.creatorId,
      counterpartyType: "company",
      counterpartyId: companyId,
      type: LEDGER_TYPES.CREATOR_BALANCE_CREDIT,
      amountUsd: payout.creatorNetUsd,
      status: "posted",
      referenceType: "company_report",
      referenceId: report.id,
      memo: `Creator balance credited for ${video.id}`
    });
    addLedgerEntry(db, {
      ownerType: "platform",
      ownerId: "platform",
      counterpartyType: "company",
      counterpartyId: companyId,
      type: LEDGER_TYPES.PLATFORM_FEE_CREDIT,
      amountUsd: payout.platformFeeUsd,
      status: "posted",
      referenceType: "company_report",
      referenceId: report.id,
      memo: `5% fee for ${video.id}`
    });
  }

  report.grossUsd = money(report.grossUsd);
  report.creatorNetUsd = money(report.creatorNetUsd);
  report.platformFeeUsd = money(report.platformFeeUsd);
  db.companyReports.push(report);
  rebuildBalancesFromLedger(db);
  return report;
}

export function requestCreatorWithdrawal(db, input = {}) {
  const creator = db.creators.find((item) => item.id === input.creatorId);
  const amountUsd = money(input.amountUsd);
  const minimum = number(db.settings?.minimumWithdrawalUsd ?? 100);
  const status = !creator || number(creator.availableUsd) < amountUsd || amountUsd < minimum ? "blocked" : "requested";
  const withdrawal = {
    id: nextWithdrawalId(db.withdrawals ?? []),
    creatorId: input.creatorId || "",
    network: input.network || creator?.wallet?.network || "TRC20",
    address: input.address || creator?.wallet?.address || "",
    amountUsd,
    amountUsdt: money(input.amountUsdt ?? amountUsd),
    feeUsdt: money(input.feeUsdt),
    txHash: input.txHash || "",
    riskStatus: input.riskStatus || "pending",
    status,
    createdAt: new Date().toISOString()
  };
  db.withdrawals ??= [];
  db.withdrawals.push(withdrawal);
  if (status === "requested") {
    addLedgerEntry(db, {
      ownerType: "creator",
      ownerId: withdrawal.creatorId,
      type: LEDGER_TYPES.WITHDRAWAL_REQUESTED,
      amountUsd: withdrawal.amountUsd,
      amountUsdt: withdrawal.amountUsdt,
      status: "reserved",
      referenceType: "withdrawal",
      referenceId: withdrawal.id,
      memo: "Creator withdrawal requested"
    });
    rebuildBalancesFromLedger(db);
  }
  return withdrawal;
}

export function markWithdrawalPaid(db, withdrawalId, input = {}) {
  const withdrawal = db.withdrawals.find((item) => item.id === withdrawalId);
  if (!withdrawal) return null;
  withdrawal.status = "paid";
  withdrawal.txHash = input.txHash || withdrawal.txHash;
  withdrawal.paidAt = new Date().toISOString();
  addLedgerEntry(db, {
    ownerType: "creator",
    ownerId: withdrawal.creatorId,
    type: LEDGER_TYPES.WITHDRAWAL_PAID,
    amountUsd: withdrawal.amountUsd,
    amountUsdt: withdrawal.amountUsdt,
    status: "posted",
    referenceType: "withdrawal",
    referenceId: withdrawal.id,
    txHash: withdrawal.txHash,
    memo: "USDT withdrawal paid"
  });
  rebuildBalancesFromLedger(db);
  return withdrawal;
}

export function buildAccountingSummary(db) {
  const ledger = db.ledger ?? [];
  const totalDepositsUsd = sumByTypes(ledger, [LEDGER_TYPES.ADVERTISER_DEPOSIT, "deposit"]);
  const pendingCreatorUsd = sumByTypes(ledger, [LEDGER_TYPES.CREATOR_EARNING_PENDING, LEDGER_TYPES.OPENING_HOLD, "accrual_hold"]) - sumByType(ledger, LEDGER_TYPES.CREATOR_BALANCE_CREDIT);
  const creatorAvailableUsd = (db.creators ?? []).reduce((sum, creator) => sum + number(creator.availableUsd), 0);
  const platformFeeUsd = sumByType(ledger, LEDGER_TYPES.PLATFORM_FEE_CREDIT);
  const requestedWithdrawalsUsd = (db.withdrawals ?? [])
    .filter((item) => item.status === "requested")
    .reduce((sum, item) => sum + number(item.amountUsd), 0);
  return {
    totalDepositsUsd: money(totalDepositsUsd),
    pendingCreatorUsd: money(pendingCreatorUsd),
    creatorAvailableUsd: money(creatorAvailableUsd),
    platformFeeUsd: money(platformFeeUsd),
    requestedWithdrawalsUsd: money(requestedWithdrawalsUsd),
    ledgerEntries: ledger.length,
    reports: (db.companyReports ?? []).length
  };
}

function sumByType(ledger, type) {
  return ledger.filter((entry) => entry.type === type).reduce((sum, entry) => sum + number(entry.amountUsd), 0);
}

function sumByTypes(ledger, types) {
  return ledger.filter((entry) => types.includes(entry.type)).reduce((sum, entry) => sum + number(entry.amountUsd), 0);
}

function nextLedgerId(items) {
  return nextSequentialId(items, "ledger");
}

function nextReportId(items) {
  return nextSequentialId(items, "report");
}

function nextWithdrawalId(items) {
  return nextSequentialId(items, "withdrawal");
}

function nextSequentialId(items, prefix) {
  const max = items.reduce((current, item) => {
    const raw = String(item.id ?? "");
    const value = Number(raw.replace(`${prefix}-`, ""));
    return Number.isFinite(value) ? Math.max(current, value) : current;
  }, 0);
  return `${prefix}-${String(max + 1).padStart(3, "0")}`;
}

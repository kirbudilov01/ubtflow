const number = (value) => Number(value) || 0;

export function buildDataQualityReport(db) {
  const issues = [];
  const offersById = new Map((db.offers ?? []).map((offer) => [offer.id, offer]));
  const companiesById = new Map((db.companies ?? []).map((company) => [company.id, company]));
  const creatorsById = new Map((db.creators ?? []).map((creator) => [creator.id, creator]));
  const accountsById = new Map((db.accounts ?? []).map((account) => [account.id, account]));
  const videoUrls = new Map();
  const externalEvents = new Map();

  for (const company of db.companies ?? []) {
    if (!company.siteUrl) addIssue(issues, "warning", "company_missing_site_url", "У компании нет ссылки на площадку.", { companyId: company.id });
    if (!company.logoText) addIssue(issues, "warning", "company_missing_logo_text", "У компании нет текста логотипа.", { companyId: company.id });
    if (number(company.balanceUsd) < 0 || number(company.usdtBalance) < 0) {
      addIssue(issues, "error", "company_negative_balance", "У компании отрицательный баланс.", { companyId: company.id });
    }
  }

  for (const offer of db.offers ?? []) {
    if (!companiesById.has(offer.companyId)) {
      addIssue(issues, "error", "offer_orphan_company", "Оффер ссылается на несуществующую компанию.", { offerId: offer.id, companyId: offer.companyId });
    }
    if (offer.status === "active" && number(offer.totalBudgetUsd) <= 0) {
      addIssue(issues, "warning", "active_offer_without_budget", "Активный оффер без бюджета.", { offerId: offer.id });
    }
    if (number(offer.spentUsd) + number(offer.reservedUsd) > number(offer.totalBudgetUsd)) {
      addIssue(issues, "warning", "offer_budget_overreserved", "У оффера потрачено и зарезервировано больше бюджета.", { offerId: offer.id });
    }
  }

  for (const video of db.videos ?? []) {
    if (!offersById.has(video.offerId)) addIssue(issues, "error", "video_orphan_offer", "Ролик ссылается на несуществующий оффер.", { videoId: video.id, offerId: video.offerId });
    if (!creatorsById.has(video.creatorId)) addIssue(issues, "error", "video_orphan_creator", "Ролик ссылается на несуществующего креатора.", { videoId: video.id, creatorId: video.creatorId });
    if (!accountsById.has(video.accountId)) addIssue(issues, "warning", "video_orphan_account", "Ролик ссылается на несуществующий аккаунт.", { videoId: video.id, accountId: video.accountId });
    if (!video.url) addIssue(issues, "warning", "video_missing_url", "У ролика нет ссылки.", { videoId: video.id });
    if (number(video.acceptedViews) > number(video.rawViews) && number(video.rawViews) > 0) {
      addIssue(issues, "warning", "video_accepted_gt_raw", "Принятых просмотров больше, чем сырых.", { videoId: video.id });
    }
    if (video.url) {
      const duplicateOf = videoUrls.get(video.url);
      if (duplicateOf) {
        addIssue(issues, "warning", "duplicate_video_url", "Одинаковая ссылка встречается в нескольких роликах.", { videoId: video.id, duplicateOf });
      } else {
        videoUrls.set(video.url, video.id);
      }
    }
  }

  for (const event of db.serviceEvents ?? []) {
    if (!offersById.has(event.offerId)) addIssue(issues, "warning", "event_orphan_offer", "Событие сервиса ссылается на несуществующий оффер.", { eventId: event.id, offerId: event.offerId });
    if (event.creatorId && !creatorsById.has(event.creatorId)) addIssue(issues, "warning", "event_orphan_creator", "Событие сервиса ссылается на несуществующего креатора.", { eventId: event.id, creatorId: event.creatorId });
    if (event.externalEventId) {
      const duplicateOf = externalEvents.get(event.externalEventId);
      if (duplicateOf) {
        addIssue(issues, "warning", "duplicate_external_event", "Повтор внешнего service event id.", { eventId: event.id, duplicateOf });
      } else {
        externalEvents.set(event.externalEventId, event.id);
      }
    }
  }

  const summary = {
    status: issues.some((issue) => issue.severity === "error") ? "error" : issues.length ? "warning" : "ok",
    errors: issues.filter((issue) => issue.severity === "error").length,
    warnings: issues.filter((issue) => issue.severity === "warning").length,
    checkedAt: new Date().toISOString(),
    counts: {
      companies: db.companies?.length ?? 0,
      offers: db.offers?.length ?? 0,
      videos: db.videos?.length ?? 0,
      serviceEvents: db.serviceEvents?.length ?? 0,
      analyticsSnapshots: db.analyticsSnapshots?.length ?? 0,
      auditLog: db.auditLog?.length ?? 0
    }
  };

  return { summary, issues };
}

function addIssue(issues, severity, code, message, meta) {
  issues.push({ severity, code, message, meta });
}

const state = {
  dashboard: null,
  publicDemo: false,
  role: "creator",
  tab: "creators"
};

const ROLE_NAV = {
  creator: {
    label: "Creator",
    defaultTab: "creators",
    items: [
      { tab: "creators", label: "Overview", icon: "dashboard" },
      { tab: "offers", label: "Offers", icon: "offers" },
      { tab: "analytics", label: "Publications", icon: "chart" },
      { tab: "reports", label: "Finance", icon: "wallet" },
      { tab: "knowledge", label: "Help center", icon: "book" }
    ]
  },
  advertiser: {
    label: "Advertiser",
    defaultTab: "company",
    items: [
      { tab: "company", label: "Overview", icon: "dashboard" },
      { tab: "offers", label: "Campaigns", icon: "offers" },
      { tab: "creators", label: "Creators", icon: "user" },
      { tab: "reports", label: "Reports", icon: "report" },
      { tab: "finance", label: "Balance", icon: "wallet" }
    ]
  },
  ops: {
    label: "Platform",
    defaultTab: "dashboard",
    items: [
      { tab: "dashboard", label: "Operations", icon: "dashboard" },
      { tab: "analytics", label: "Moderation", icon: "shield" },
      { tab: "finance", label: "Payments", icon: "wallet" },
      { tab: "tracking", label: "Integrations", icon: "link" },
      { tab: "admin", label: "Users", icon: "settings" },
      { tab: "knowledge", label: "Settings", icon: "book" }
    ]
  }
};

const usd = new Intl.NumberFormat("en-US", { style: "currency", currency: "USD", maximumFractionDigits: 2 });
const num = new Intl.NumberFormat("en-US");
const pct = new Intl.NumberFormat("en-US", { style: "percent", maximumFractionDigits: 1 });

const $ = (selector, root = document) => root.querySelector(selector);
const $$ = (selector, root = document) => [...root.querySelectorAll(selector)];

const COMPANY_META = {
  "company-fabula": {
    logoText: "Fabula",
    siteUrl: "https://fabula-ai.com/",
    domain: "fabula-ai.com",
    accent: "#7b3ff2"
  },
  "company-neurosphere": {
    logoText: "Neurosphere",
    siteUrl: "https://neurosphere.pro/",
    domain: "neurosphere.pro",
    accent: "#20c7c9"
  },
  "company-trendsee": {
    logoText: "TrendSee",
    siteUrl: "https://trendsee.io/",
    domain: "trendsee.io",
    accent: "#1c8cff"
  },
  "company-want2view": {
    logoText: "WANT2VIEW",
    siteUrl: "https://app.want2view.com/",
    domain: "app.want2view.com",
    accent: "#28d7c7"
  },
  "company-atlasrepo": {
    logoText: "AtlasRepo",
    siteUrl: "https://atlasrepo.com/",
    domain: "atlasrepo.com",
    accent: "#ffb000"
  }
};

async function api(path, options = {}) {
  const response = await fetch(path, {
    headers: options.body instanceof FormData ? undefined : { "Content-Type": "application/json" },
    ...options
  });
  if (response.status === 401) {
    if (state.publicDemo) {
      showToast("Demo mode is read-only. Sign in to save changes.");
      throw new Error("demo_read_only");
    }
    showLogin();
    throw new Error("auth_required");
  }
  if (!response.ok) throw new Error(await response.text());
  return response.json();
}

async function publicApi(path, options = {}) {
  const response = await fetch(path, {
    headers: options.body instanceof FormData ? undefined : { "Content-Type": "application/json" },
    ...options
  });
  if (!response.ok) throw new Error(await response.text());
  return response.json();
}

async function init() {
  bindEvents();
  const session = await fetch("/api/session").then((res) => res.json());
  state.publicDemo = Boolean(session.demo);
  if (!session.authenticated) return showLogin();
  showApp();
  await loadDashboard();
}

function showLogin() {
  $("#loginView").classList.remove("hidden");
  $("#appView").classList.add("hidden");
}

function showApp() {
  $("#appView").classList.remove("hidden");
  $("#loginView").classList.add("hidden");
}

async function loadDashboard() {
  state.dashboard = await api("/api/dashboard");
  hydrateControls();
  render();
}

function hydrateControls() {
  fillSelect($("#companyFilter"), state.dashboard.companies.map((item) => [item.id, item.name]), "All companies");
  fillSelect($("#offerFilter"), state.dashboard.offers.map((item) => [item.id, item.title]), "All offers");
  fillSelect($("#offerCompany"), state.dashboard.companies.map((item) => [item.id, item.name]));
  fillSelect($("#depositCompany"), state.dashboard.companies.map((item) => [item.id, item.name]));
  fillSelect($("#reportCompany"), state.dashboard.companies.map((item) => [item.id, item.name]));
  fillSelect($("#reportOffer"), state.dashboard.offers.map((item) => [item.id, item.title]), "All company offers");
  fillSelect($("#withdrawCreator"), state.dashboard.creators.map((item) => [item.id, `${item.name} · ${item.handle}`]));
  fillSelect($("#eventOffer"), state.dashboard.offers.map((item) => [item.id, item.title]));
  fillSelect($("#eventCreator"), state.dashboard.creators.map((item) => [item.id, `${item.name} · ${item.handle}`]));
  fillSelect($("#videoOffer"), state.dashboard.offers.map((item) => [item.id, `${item.service} · ${item.title}`]));
  fillSelect($("#videoCreator"), state.dashboard.creators.map((item) => [item.id, `${item.name} · ${item.handle}`]));
  fillSelect($("#bulkAccount"), state.dashboard.accounts.map((item) => [item.id, `${item.platform} · ${item.handle}`]));
  fillSelect($("#bulkOffer"), state.dashboard.offers.map((item) => [item.id, `${item.service} · ${item.title}`]));
}

function fillSelect(select, rows, firstLabel = null) {
  if (!select) return;
  const current = select.value;
  select.innerHTML = `${firstLabel == null ? "" : `<option value="">${firstLabel}</option>`}${rows.map(([value, label]) => `<option value="${escapeAttr(value)}">${escapeHtml(label)}</option>`).join("")}`;
  if ([...select.options].some((option) => option.value === current)) select.value = current;
}

function render() {
  renderNavigation();
  renderMarketSignals();
  renderKpis();
  renderApprovalWheels();
  renderOffers();
  renderOffersPage();
  renderQueues();
  renderVideos();
  renderCompanies();
  renderCreatorCommandCenter();
  renderCreatorBalances();
  renderCreatorWorkspace();
  renderCreators();
  renderWithdrawalPreview();
  renderContentAnalytics();
  renderAnalytics();
  renderReelTracker();
  renderReports();
  renderAdmin();
  renderTracking();
  renderFinance();
  renderKnowledge();
  syncTabVisibility();
}

function renderMarketSignals() {
  const target = $("#marketSignals");
  if (!target) return;
  const signals = [
    ["Offer economics", "CPM/PPV", "Rate, min views, caps and budget reserves are explicit before creators publish."],
    ["Verification layer", "Accepted views", "Operators lock payable views after quality, platform and fraud review."],
    ["Research edge", "WANT2VIEW", "Trend research turns references into briefs instead of leaving creators to guess."],
    ["Payout trust", "USDT ledger", "Creator balance, hold, withdrawal and advertiser reports stay connected."]
  ];
  target.innerHTML = signals.map(([title, value, body]) => `
    <article>
      <small>${escapeHtml(title)}</small>
      <strong>${escapeHtml(value)}</strong>
      <p>${escapeHtml(body)}</p>
    </article>
  `).join("");
}

function renderNavigation() {
  const nav = ROLE_NAV[state.role] ?? ROLE_NAV.creator;
  const target = $("#sideTabs");
  if (!target) return;
  target.innerHTML = `
    <p class="sidebar-label">${state.role === "ops" ? "Admin" : "Sections"}</p>
    ${nav.items.map((item) => `
      <button class="tab${item.tab === state.tab ? " active" : ""}" data-tab="${escapeAttr(item.tab)}" type="button">
        <span class="nav-icon" data-icon="${escapeAttr(item.icon)}"></span>${escapeHtml(item.label)}
      </button>
    `).join("")}
  `;
  $$(".cabinet-switch button").forEach((item) => item.classList.toggle("active", item.dataset.role === state.role));
}

function renderKpis() {
  const { totals } = state.dashboard;
  const approved = state.dashboard.videos.filter((video) => ["approved", "pending_payout", "paid"].includes(video.status)).length;
  const pending = state.dashboard.videos.filter((video) => ["tracking", "needs_review", "company_report"].includes(video.status)).length;
  const rejected = Math.max(0, state.dashboard.videos.length - approved - pending);
  const kpis = [
    ["Views", num.format(totals.acceptedViews), `${pct.format(totals.acceptedRate)} accepted`],
    ["Earned", usd.format(totals.creatorNetUsd), `${usd.format(totals.platformFeeUsd)} platform fee`],
    ["Reels approved", num.format(approved), `${num.format(totals.videos)} submitted`],
    ["Needs review", num.format(pending), `${num.format(rejected)} rejected`]
  ];
  $("#kpis").innerHTML = kpis.map(([label, value, hint]) => `
    <article class="kpi">
      <span>${label}</span>
      <strong>${value}</strong>
      <small>${hint}</small>
    </article>
  `).join("");
}

function renderApprovalWheels() {
  const target = $("#approvalWheels");
  if (!target) return;
  const videos = state.dashboard.videos;
  const total = Math.max(1, videos.length);
  const approved = videos.filter((video) => ["approved", "pending_payout", "paid"].includes(video.status)).length;
  const pending = videos.filter((video) => ["tracking", "needs_review", "company_report"].includes(video.status)).length;
  const rejected = Math.max(0, videos.length - approved - pending);
  const wheels = [
    ["Approved", approved, "Ready for payout", "good"],
    ["Pending", pending, "Waiting for check", "warn"],
    ["Rejected", rejected, "Not payable", "bad"]
  ];
  target.innerHTML = wheels.map(([label, value, hint, tone]) => {
    const percent = Math.round((value / total) * 100);
    return `
      <article class="wheel-card ${tone}">
        <div class="wheel" style="--value: ${percent}">
          <strong>${percent}%</strong>
        </div>
        <div>
          <span>${escapeHtml(label)}</span>
          <strong>${num.format(value)}</strong>
          <small>${escapeHtml(hint)}</small>
        </div>
      </article>
    `;
  }).join("");
}

function renderOffers() {
  $("#offerCards").innerHTML = state.dashboard.rankings.offers.map((offer) => `
    <article class="card">
      <div class="card-row">
        <strong>${escapeHtml(offer.title)}</strong>
        <span class="badge ${offer.budgetStatus === "healthy" ? "good" : "warn"}">${escapeHtml(offer.budgetStatus)}</span>
      </div>
      <p>${escapeHtml(offer.companyName)} · views-only payout · score ${offer.score}</p>
      <div class="metrics">
        <span>${usd.format(offer.viewRateUsd)} / 1k</span>
        <span>${num.format(offer.acceptedViews)} accepted</span>
        <span>${usd.format(offer.availableUsd)} available</span>
      </div>
    </article>
  `).join("");
}

function renderOffersPage() {
  const target = $("#offersPage");
  if (!target) return;
  const companies = new Map(state.dashboard.companies.map((company) => [company.id, company]));
  target.innerHTML = state.dashboard.rankings.offers.map((offer) => `
    <article class="offer-tile">
      <div class="offer-hero">
        ${renderCompanyLogo(companies.get(offer.companyId), offer)}
        <span class="badge ${offer.budgetStatus === "healthy" ? "good" : "warn"}">${offer.budgetStatus === "healthy" ? "budget ready" : "budget near stop"}</span>
      </div>
      <div class="offer-body">
        ${renderOfferLink(companies.get(offer.companyId), offer)}
        <h3>${escapeHtml(offer.title)}</h3>
        <p>Payment is based on verified views. Creator posts enter review for platform fit, brief match and suspicious traffic before payout is locked.</p>
        <div class="payment-conditions">
          <div><small>Rate</small><strong>${usd.format(offer.viewRateUsd)} per 1k</strong></div>
          <div><small>Minimum</small><strong>from ${num.format(offer.minViews)} views</strong></div>
          <div><small>Cap</small><strong>${num.format(offer.maxPaidViewsPerVideo)} / video</strong></div>
          <div><small>Payout</small><strong>${escapeHtml(offerReportLabel(companies.get(offer.companyId)))}</strong></div>
        </div>
        <div class="offer-brief-list">
          ${(offer.platforms || ["TikTok", "Instagram Reels", "YouTube Shorts"]).map((item) => `<span>${escapeHtml(platformLabel(item))}</span>`).join("")}
          <span>AI pre-check</span>
          <span>Stops at budget reserve</span>
        </div>
      </div>
      <div class="offer-economics">
        <div><small>Rate</small><strong>${usd.format(offer.viewRateUsd)} / 1k</strong></div>
        <div><small>Accepted</small><strong>${num.format(offer.acceptedViews)}</strong></div>
        <div><small>Company balance</small><strong>${usd.format(companies.get(offer.companyId)?.availableUsd ?? 0)}</strong></div>
      </div>
      <div class="offer-bottom-note">
        ${offer.availableUsd <= 0 ? "The offer stays visible because the company regularly replenishes budget." : `${usd.format(offer.availableUsd)} is available inside the offer budget.`} Reposts and comments are quality signals only.
      </div>
      <div class="offer-actions">
        <button type="button">Open brief</button>
        <button class="ghost" type="button">Verification</button>
      </div>
    </article>
  `).join("");
}

function platformLabel(value = "") {
  return String(value).replace("Instagram Reels", "Reels").replace("YouTube Shorts", "Shorts");
}

function offerReportLabel(company = {}) {
  const period = periodLabel(company.payoutCalendar?.billingPeriod);
  const days = company.payoutCalendar?.approvalWindowDays ?? 0;
  return `${period}, +${days} days`;
}

function companyMeta(company = {}, offer = {}) {
  const meta = COMPANY_META[company.id] ?? COMPANY_META[offer.companyId] ?? {};
  return {
    logoText: company.logoText || meta.logoText || company.name || offer.companyName || "Company",
    siteUrl: company.siteUrl || company.website || offer.landingPageUrl || meta.siteUrl || "",
    domain: company.domain || meta.domain || "",
    accent: company.accent || meta.accent || "#167a35"
  };
}

function renderCompanyLogo(company = {}, offer = {}) {
  const meta = companyMeta(company, offer);
  return `
    <div class="offer-brand" style="--brand-accent: ${escapeAttr(meta.accent)}">
      <span class="offer-logo">${escapeHtml(meta.logoText)}</span>
      ${meta.domain ? `<span class="offer-domain">${escapeHtml(meta.domain)}</span>` : ""}
    </div>
  `;
}

function renderOfferLink(company = {}, offer = {}) {
  const meta = companyMeta(company, offer);
  const companyName = offer.companyName || company.name || meta.logoText;
  if (!meta.siteUrl) return `<p class="eyebrow">${escapeHtml(companyName)}</p>`;
  return `
    <div class="offer-company-row">
      <p class="eyebrow">${escapeHtml(companyName)}</p>
      <a class="offer-site-link" href="${escapeAttr(meta.siteUrl)}" target="_blank" rel="noreferrer">Site</a>
    </div>
  `;
}

function renderOfferAside(offer, company = {}) {
  const trust = Number(company.reliabilityScore ?? 0);
  const category = categoryLabel(offer.category);
  return `
    <aside class="offer-side">
      <small>Rate</small>
      <strong>${usd.format(offer.viewRateUsd)} / 1k</strong>
      <span>${escapeHtml(category)}</span>
      <div class="trust-index" title="Integrity index: payout history, budget replenishment, report discipline and dispute risk.">
        <small>Reliability index</small>
        <b>${trust || offer.score}</b>
      </div>
      <p>${escapeHtml(company.replenishmentNote || "Company keeps the offer visible while reports and budgets are updated.")}</p>
    </aside>
  `;
}

function categoryLabel(category = "") {
  const lower = String(category).toLowerCase();
  if (lower.includes("marketplace") || lower.includes("design")) return "Marketplaces";
  if (lower.includes("content") || lower.includes("marketing")) return "Content";
  return "AI / SaaS";
}

function renderContentAnalytics() {
  const target = $("#contentAnalytics");
  if (!target) return;
  target.innerHTML = `
    <article class="content-card hero-content-card">
      <p class="eyebrow">WANT2VIEW integration</p>
      <h3>Find popular videos before creators start shooting.</h3>
      <p>WANT2VIEW will parse TikTok, Reels and Shorts references, group hooks, detect formats and turn them into offer briefs.</p>
      <div class="content-actions">
        <button type="button">Run free test</button>
        <button class="ghost" type="button">Connect WANT2VIEW</button>
      </div>
    </article>
    <article class="content-card">
      <small>Creator test</small>
      <strong>Free first scan</strong>
      <p>Creators can test content analytics before paying for a subscription.</p>
    </article>
    <article class="content-card">
      <small>Partner pricing</small>
      <strong>50% ViewFlow discount</strong>
      <p>Creators who earn through ViewFlow can buy WANT2VIEW / AtlasRepo plans at half price.</p>
    </article>
    <article class="content-card">
      <small>Next pipeline</small>
      <strong>Parse → score → brief → publish</strong>
      <p>Popular videos become briefs, briefs become offer tasks, tasks become verified creator payouts.</p>
    </article>
  `;
}

function renderAdmin() {
  const target = $("#adminCards");
  if (!target) return;
  const registrations = state.dashboard.registrations ?? [];
  const auditLog = state.dashboard.auditLog ?? [];
  const accounts = state.dashboard.accounts ?? [];
  const accounting = state.dashboard.accounting ?? {};
  const reports = state.dashboard.companyReports ?? [];
  const withdrawals = state.dashboard.withdrawals ?? [];
  target.innerHTML = `
    <article class="admin-card">
      <small>Deposits</small>
      <strong>${usd.format(accounting.totalDepositsUsd || 0)}</strong>
      <p>All advertiser deposits recorded in the ledger.</p>
    </article>
    <article class="admin-card">
      <small>Creator balance</small>
      <strong>${usd.format(accounting.creatorAvailableUsd || 0)}</strong>
      <p>Available after finalized company reports.</p>
    </article>
    <article class="admin-card">
      <small>Platform fee</small>
      <strong>${usd.format(accounting.platformFeeUsd || 0)}</strong>
      <p>5% of verified creator revenue.</p>
    </article>
    <article class="admin-card">
      <small>In withdrawal</small>
      <strong>${usd.format(accounting.requestedWithdrawalsUsd || 0)}</strong>
      <p>USDT requests waiting to be sent to wallets.</p>
    </article>
    <article class="admin-card">
      <small>Accounts</small>
      <strong>${num.format(accounts.length)}</strong>
      <p>Connected TikTok, Reels and Shorts accounts.</p>
    </article>
    <article class="admin-card">
      <small>Applications</small>
      <strong>${num.format(registrations.length)}</strong>
      <p>New creators and advertisers in onboarding.</p>
    </article>
    <article class="admin-card wide-admin">
      <h3>Company reports</h3>
      <div class="admin-list">
        ${(reports.length ? reports : [{ id: "no reports", companyId: "Finalize the first report", videosCount: 0, creatorNetUsd: 0, status: "empty" }]).slice(0, 8).map((item) => `
          <div><span>${escapeHtml(item.status)}</span><strong>${escapeHtml(companyName(item.companyId) || item.companyId)}</strong><small>${num.format(item.videosCount || 0)} videos · ${usd.format(item.creatorNetUsd || 0)} to creators · ${escapeHtml(item.periodTo || item.id)}</small></div>
        `).join("")}
      </div>
    </article>
    <article class="admin-card wide-admin">
      <h3>Payout queue</h3>
      <div class="admin-list">
        ${(withdrawals.length ? withdrawals : [{ id: "no payouts", creatorName: "No requests", amountUsd: 0, status: "empty" }]).slice(0, 8).map((item) => `
          <div>
            <span>${escapeHtml(item.status)}</span>
            <strong>${escapeHtml(item.creatorName || item.creatorId || item.id)}</strong>
            <small>${usd.format(item.amountUsd || 0)} · ${escapeHtml(item.network || "")} · ${escapeHtml(item.txHash || "no tx")}</small>
            ${item.status === "requested" ? `<button class="ghost mini-action" type="button" data-pay-withdrawal="${escapeAttr(item.id)}">Mark paid</button>` : ""}
          </div>
        `).join("")}
      </div>
    </article>
    <article class="admin-card wide-admin">
      <h3>Latest registrations</h3>
      <div class="admin-list">
        ${(registrations.length ? registrations : [{ role: "creator", name: "No registrations yet", email: "Waiting for first request", status: "empty" }]).slice(0, 6).map((item) => `
          <div><span>${escapeHtml(item.role)}</span><strong>${escapeHtml(item.name)}</strong><small>${escapeHtml(item.email || item.status)}</small></div>
        `).join("")}
      </div>
    </article>
    <article class="admin-card wide-admin">
      <h3>Audit log</h3>
      <div class="admin-list">
        ${(auditLog.length ? auditLog : [{ action: "no_events", createdAt: "No events yet", payload: {} }]).slice(0, 8).map((item) => `
          <div><span>${escapeHtml(item.action)}</span><strong>${escapeHtml(item.createdAt)}</strong><small>${escapeHtml(JSON.stringify(item.payload ?? {}))}</small></div>
        `).join("")}
      </div>
    </article>
  `;
}

function companyName(companyId) {
  return state.dashboard.companies.find((company) => company.id === companyId)?.name || "";
}

function renderQueues() {
  const q = state.dashboard.queues;
  const rows = [
    ["Video review", q.videoReview.length],
    ["Payout review", q.payoutReview.length],
    ["Service events", q.serviceEvents.length],
    ["Withdrawals", q.withdrawals.length],
    ["Low-balance offers", q.lowBalanceOffers.length]
  ];
  $("#queueCards").innerHTML = rows.map(([label, value]) => `
    <article class="queue-card">
      <span>${label}</span>
      <strong>${value}</strong>
    </article>
  `).join("");
}

function renderVideos() {
  const query = $("#searchInput").value.trim().toLowerCase();
  const companyId = $("#companyFilter").value;
  const offerId = $("#offerFilter").value;
  const status = $("#statusFilter").value;
  const statuses = [...new Set(state.dashboard.videos.map((item) => item.status))];
  const currentStatus = $("#statusFilter").value;
  $("#statusFilter").innerHTML = `<option value="">All statuses</option>${statuses.map((item) => `<option>${escapeHtml(item)}</option>`).join("")}`;
  $("#statusFilter").value = currentStatus;

  const rows = state.dashboard.videos
    .filter((video) => !companyId || video.companyId === companyId)
    .filter((video) => !offerId || video.offerId === offerId)
    .filter((video) => !status || video.status === status)
    .filter((video) => !query || [video.title, video.companyName, video.creatorName, video.url, video.platform].join(" ").toLowerCase().includes(query))
    .sort((a, b) => b.grossUsd - a.grossUsd);

  $("#videoRows").innerHTML = rows.map((video) => `
    <tr>
      <td><strong>${escapeHtml(video.title)}</strong><br><span class="muted">${escapeHtml(video.url)}</span></td>
      <td>${escapeHtml(video.companyName)}</td>
      <td>${escapeHtml(video.creatorHandle || video.creatorName)}</td>
      <td>${escapeHtml(video.platform)}</td>
      <td class="num">${num.format(video.rawViews)}</td>
      <td class="num">${num.format(video.acceptedViews)}</td>
      <td class="num money">${usd.format(video.grossUsd)}</td>
      <td><span class="badge">${escapeHtml(video.status)}</span></td>
      <td><span class="badge warn">${escapeHtml(video.aiEligibility)}</span>${video.riskFlags.length ? `<br><small class="warn-text">${video.riskFlags.join(", ")}</small>` : ""}</td>
      <td><button class="small" data-approve="${escapeAttr(video.id)}">Approve</button></td>
    </tr>
  `).join("");
}

function renderCompanies() {
  $("#companyCards").innerHTML = state.dashboard.companies.map((company) => `
    <article class="company-card">
      <div class="card-row">
        <div>
          <p class="eyebrow">${escapeHtml(company.jurisdiction)}</p>
          <h2>${escapeHtml(company.name)}</h2>
        </div>
        <span class="score">${company.reliabilityScore}</span>
      </div>
      <div class="metrics">
        <span>${usd.format(company.availableUsd)} available</span>
        <span>${usd.format(company.reservedUsd)} reserved</span>
        <span>${usd.format(company.spentUsd)} spent</span>
      </div>
      <div class="split-inline">
        <p><strong>Top creator</strong><br>${escapeHtml(company.topCreator?.[0] ?? "No data")} · ${usd.format(company.topCreator?.[1] ?? 0)}</p>
        <p><strong>Top video</strong><br>${escapeHtml(company.topVideo?.title ?? "No data")}</p>
      </div>
      <p class="muted">Payout: ${escapeHtml(company.payoutCalendar?.billingPeriod)} · approval ${company.payoutCalendar?.approvalWindowDays} days · pending events ${company.pendingServiceEvents}</p>
    </article>
  `).join("");
}

function renderCreators() {
  const target = $("#creatorRows");
  if (!target) return;
  target.innerHTML = (state.dashboard.accounts ?? []).map((account) => {
    const creator = state.dashboard.creators.find((item) => item.id === account.creatorId) ?? {};
    const accountVideos = state.dashboard.videos.filter((video) => video.accountId === account.id);
    return `
      <article class="creator-account-card">
        <span class="platform-dot">${escapeHtml(platformShort(account.platform))}</span>
        <div>
          <strong>${escapeHtml(account.handle)}</strong>
          <p>${escapeHtml(account.platform)} · ${escapeHtml(account.status)}</p>
        </div>
        <div>
          <small>Videos</small>
          <b>${num.format(accountVideos.length)}</b>
        </div>
        <div>
          <small>Status</small>
          <b>${escapeHtml(creator.name || "Creator")}</b>
        </div>
        <button class="ghost" type="button" data-jump-tab="analytics">Refresh</button>
      </article>
    `;
  }).join("");
}

function renderCreatorCommandCenter() {
  const target = $("#creatorCommandCenter");
  if (!target) return;
  const creators = state.dashboard.creators;
  const minWithdrawal = Number(state.dashboard.settings.minimumWithdrawalUsd || 100);
  const available = creators.reduce((sum, creator) => sum + Number(creator.availableUsd || 0), 0);
  const videos = state.dashboard.videos;
  const review = videos.filter((video) => video.status === "needs_review" || video.aiEligibility === "needs_review").length;
  const hasVideos = videos.length > 0;
  const canWithdraw = available >= minWithdrawal;
  const next = canWithdraw
    ? ["Ready to withdraw", `${usd.format(available)} available. Minimum withdrawal is ${usd.format(minWithdrawal)}.`, "creators", "Request payout"]
    : hasVideos
      ? ["Review your videos", `${num.format(review)} videos are waiting for review, the rest keep collecting views.`, "analytics", "Open videos"]
      : ["Start with an offer", "Choose an offer, publish a video and attach a link or account.", "offers", "Choose offer"];
  target.innerHTML = `
    <article>
      <div>
        <p class="eyebrow">Focus now</p>
        <h3>${escapeHtml(next[0])}</h3>
        <p>${escapeHtml(next[1])}</p>
      </div>
      <button type="button" data-jump-tab="${escapeAttr(next[2])}">${escapeHtml(next[3])}</button>
    </article>
  `;
}

function renderCreatorBalances() {
  const target = $("#creatorBalanceCards");
  if (!target) return;
  const creators = state.dashboard.creators;
  const minWithdrawal = state.dashboard.settings.minimumWithdrawalUsd;
  const available = creators.reduce((sum, creator) => sum + Number(creator.availableUsd || 0), 0);
  const hold = creators.reduce((sum, creator) => sum + Number(creator.holdUsd || 0), 0);
  const paid = creators.reduce((sum, creator) => sum + Number(creator.paidUsd || 0), 0);
  const requested = (state.dashboard.withdrawals ?? [])
    .filter((item) => ["requested", "compliance_review"].includes(item.status))
    .reduce((sum, item) => sum + Number(item.amountUsd || 0), 0);
  const canWithdraw = available >= minWithdrawal;
  target.innerHTML = `
    <article class="balance-hero">
      <div>
        <p class="eyebrow">Available to withdraw</p>
        <h3>${usd.format(available)}</h3>
        <p>Fixed after advertiser reports. Minimum withdrawal is ${usd.format(minWithdrawal)}.</p>
      </div>
      <button type="button" data-jump-tab="creators">${canWithdraw ? "Withdraw" : `Min. ${usd.format(minWithdrawal)}`}</button>
    </article>
    <article class="balance-mini">
      <span>Pending</span>
      <strong>${usd.format(hold)}</strong>
      <p>Waiting for AI check, company report or final approval window.</p>
    </article>
    <article class="balance-mini">
      <span>In withdrawal</span>
      <strong>${usd.format(requested)}</strong>
      <p>Requests are created, but USDT has not been sent to wallets yet.</p>
    </article>
    <article class="balance-mini">
      <span>Paid</span>
      <strong>${usd.format(paid)}</strong>
      <p>Already sent to wallets and recorded in the ledger.</p>
    </article>
  `;
}

function renderCreatorWorkspace() {
  renderCreatorWorkflow();
  renderCreatorOfferCards();
  renderCreatorVideoCards();
}

function renderCreatorWorkflow() {
  const target = $("#creatorWorkflowCards");
  if (!target) return;
  const creators = state.dashboard.creators;
  const topCreator = creators.slice().sort((a, b) => Number(b.availableUsd || 0) - Number(a.availableUsd || 0))[0];
  const videos = state.dashboard.videos.filter((video) => !topCreator || video.creatorId === topCreator.id);
  const tracking = videos.filter((video) => ["tracking", "accepted_for_tracking"].includes(video.status)).length;
  const review = videos.filter((video) => video.status === "needs_review" || video.aiEligibility === "needs_review").length;
  const items = [
    ["Choose an offer", "Check the 1k rate, video language, budget and advertiser rules.", "offers", "Open offers"],
    ["Attach your video", `${num.format(videos.length)} videos added. ${num.format(tracking)} are still collecting payable views.`, "analytics", "Add video"],
    ["Wait for review", `${num.format(review)} videos are waiting for AI or advertiser review before balance is fixed.`, "analytics", "Review"]
  ];
  target.innerHTML = items.map(([title, hint, tab, action], index) => `
    <article class="creator-flow-card">
      <span>${index + 1}</span>
      <div>
        <strong>${escapeHtml(title)}</strong>
        <p>${escapeHtml(hint)}</p>
      </div>
      <button class="ghost" type="button" data-jump-tab="${escapeAttr(tab)}">${escapeHtml(action)}</button>
    </article>
  `).join("");
}

function renderCreatorOfferCards() {
  const target = $("#creatorOfferCards");
  if (!target) return;
  const offers = state.dashboard.rankings.offers.slice(0, 3);
  target.innerHTML = offers.map((offer) => `
    <article>
      <div>
        <strong>${escapeHtml(offer.title)}</strong>
        <p>${escapeHtml(offer.companyName)} · ${escapeHtml(offer.category || "AI service")}</p>
      </div>
      <div class="creator-offer-meta">
        <span>${usd.format(offer.viewRateUsd)} per 1k</span>
        <span>${usd.format(offer.availableUsd)} budget</span>
        <span>views only</span>
      </div>
    </article>
  `).join("");
}

function renderCreatorVideoCards() {
  const target = $("#creatorVideoCards");
  if (!target) return;
  const videos = state.dashboard.videos.slice().sort((a, b) => String(b.publishedAt).localeCompare(String(a.publishedAt))).slice(0, 4);
  target.innerHTML = videos.map((video) => `
    <article class="creator-video-card">
      <div>
        <span class="platform-dot">${escapeHtml(platformShort(video.platform))}</span>
        <div>
          <strong>${escapeHtml(video.title)}</strong>
          <p>${escapeHtml(video.offerTitle)} · ${escapeHtml(video.payoutDueAt)}</p>
        </div>
      </div>
      <div class="creator-video-stats">
        <span><small>Views</small><b>${num.format(video.rawViews)}</b></span>
        <span><small>Accepted</small><b>${video.lockedViews ? num.format(video.lockedViews) : "waiting"}</b></span>
        <span><small>Earnings</small><b>${usd.format(video.creatorNetUsd)}</b></span>
        <span class="badge ${payoutBadge(video.status)}">${escapeHtml(creatorStatusLabel(video.status))}</span>
      </div>
    </article>
  `).join("");
}

function renderWithdrawalPreview() {
  const target = $("#withdrawalPreview");
  if (!target) return;
  const creators = state.dashboard.creators;
  const available = creators.reduce((sum, creator) => sum + Number(creator.availableUsd || 0), 0);
  const minWithdrawal = Number(state.dashboard.settings.minimumWithdrawalUsd || 100);
  const requested = (state.dashboard.withdrawals ?? [])
    .filter((item) => ["requested", "compliance_review"].includes(item.status))
    .reduce((sum, item) => sum + Number(item.amountUsd || 0), 0);
  target.innerHTML = `
    <div><small>Available</small><strong>${usd.format(available)}</strong></div>
    <div><small>Minimum</small><strong>${usd.format(minWithdrawal)}</strong></div>
    <div><small>Already requested</small><strong>${usd.format(requested)}</strong></div>
  `;
}

function creatorStatusLabel(status) {
  return ({
    tracking: "tracking",
    accepted_for_tracking: "tracking",
    needs_review: "review",
    approved_pending_report: "approved",
    locked_for_payout: "locked",
    pending_payout: "fixed",
    paid: "paid",
    rejected: "rejected",
    disputed: "dispute"
  })[status] ?? status;
}

function platformShort(platform) {
  if (String(platform).includes("TikTok")) return "TT";
  if (String(platform).includes("Shorts")) return "YT";
  return "IG";
}

function renderAnalytics() {
  const target = $("#analyticsCards");
  if (!target) return;
  const { totals, queues } = state.dashboard;
  const tracking = state.dashboard.videos.filter((video) => ["tracking", "accepted_for_tracking"].includes(video.status)).length;
  const fixed = state.dashboard.videos.filter((video) => ["pending_payout", "paid"].includes(video.status)).length;
  const cards = [
    ["Total views", num.format(totals.rawViews), `${num.format(totals.acceptedViews)} already accepted for calculation`],
    ["Waiting for review", num.format(queues.videoReview.length), "AI or advertiser must confirm eligibility"],
    ["Collecting views", num.format(tracking), "Amount may still change before the report"],
    ["Locked", num.format(fixed), "Views are closed by report or ready for payout"],
    ["Current earnings", usd.format(totals.creatorNetUsd), "Creator revenue after platform fee"],
    ["Avg per video", usd.format(totals.videos ? totals.creatorNetUsd / totals.videos : 0), "Average payout per attached video"]
  ];
  target.innerHTML = cards.map(([label, value, hint]) => `
    <article class="insight-card">
      <small>${escapeHtml(label)}</small>
      <strong>${escapeHtml(value)}</strong>
      <p>${escapeHtml(hint)}</p>
    </article>
  `).join("");
}

function renderReelTracker() {
  const target = $("#reelTrackerRows");
  if (!target) return;
  const rows = state.dashboard.videos.slice().sort((a, b) => String(b.publishedAt).localeCompare(String(a.publishedAt)));
  target.innerHTML = rows.map((video) => `
    <tr>
      <td><strong>${escapeHtml(video.title)}</strong><br><span class="muted">${escapeHtml(video.url)}</span></td>
      <td>${escapeHtml(video.offerTitle)}<br><span class="muted">${escapeHtml(video.companyName)}</span></td>
      <td>${escapeHtml(video.payoutCycle)}</td>
      <td>${escapeHtml(video.payoutDueAt)}</td>
      <td class="num">${num.format(video.rawViews)}</td>
      <td class="num">${video.lockedViews ? num.format(video.lockedViews) : "waiting"}</td>
      <td class="num money">${usd.format(video.creatorNetUsd)}</td>
      <td><span class="badge ${payoutBadge(video.status)}">${escapeHtml(creatorStatusLabel(video.status))}</span>${video.viewsLockedAt ? `<br><small class="muted">locked ${escapeHtml(video.viewsLockedAt)}</small>` : ""}</td>
    </tr>
  `).join("");
}

function payoutLabel(status) {
  return ({
    tracking: "tracking",
    accepted_for_tracking: "tracking",
    needs_review: "review",
    pending_payout: "fixed",
    paid: "paid",
    rejected: "rejected",
    disputed: "dispute"
  })[status] ?? status;
}

function payoutBadge(status) {
  if (["paid", "pending_payout"].includes(status)) return "good";
  if (["rejected", "disputed"].includes(status)) return "bad";
  return "warn";
}

function renderReports() {
  renderPayoutSummary();
  renderWithdrawalStatusCards();
  const target = $("#reportCards");
  if (!target) return;
  target.innerHTML = state.dashboard.companies.map((company) => renderCreatorPayoutCalendarCard(company)).join("");
}

function renderCreatorPayoutCalendarCard(company) {
  const videos = state.dashboard.videos.filter((video) => video.companyId === company.id);
  const waitingVideos = videos.filter((video) => !["paid", "rejected"].includes(video.status));
  const waitingUsd = waitingVideos.reduce((sum, video) => sum + Number(video.creatorNetUsd || 0), 0);
  const nextPayout = nextReadablePayoutDate(waitingVideos);
  const hasBudget = Number(company.availableUsd || 0) > 0;
  return `
    <article class="report-card creator-payout-card">
      <div class="card-row">
        <div>
          <p class="eyebrow">${escapeHtml(periodLabel(company.payoutCalendar?.billingPeriod))}</p>
          <h3>${escapeHtml(company.name)}</h3>
        </div>
        <span class="score" title="Advertiser reliability index">${company.reliabilityScore}</span>
      </div>
      <div class="report-metrics">
        <div><small>Next payout</small><strong>${escapeHtml(nextPayout)}</strong></div>
        <div><small>Videos in cycle</small><strong>${num.format(waitingVideos.length)}</strong></div>
        <div><small>Pending</small><strong>${usd.format(waitingUsd)}</strong></div>
      </div>
      <div class="report-line">
        <span>When views are locked</span>
        <strong>${company.payoutCalendar?.approvalWindowDays ?? 0} days after report</strong>
      </div>
      <div class="report-line">
        <span>Budget status</span>
        <strong>${hasBudget ? "budget ready" : "waiting for top-up"}</strong>
      </div>
      <p class="report-note">${waitingVideos.length ? "After the report, views become accepted and the amount moves to available balance or hold." : "No active videos in this cycle yet."}</p>
      <div class="report-actions">
        <button type="button" data-jump-tab="analytics">Open videos</button>
        <button class="ghost" type="button">Support</button>
      </div>
    </article>
  `;
}

function nextReadablePayoutDate(videos) {
  const dates = videos
    .map((video) => video.payoutDueAt)
    .filter((value) => /^\d{4}-\d{2}-\d{2}$/.test(String(value)))
    .sort();
  return dates[0] ?? "by report";
}

function periodLabel(period) {
  return ({
    weekly: "weekly",
    biweekly: "biweekly",
    monthly: "monthly",
    custom: "by report"
  })[period] ?? "by report";
}

function renderPayoutSummary() {
  const target = $("#payoutSummary");
  if (!target) return;
  const creators = state.dashboard.creators;
  const withdrawals = state.dashboard.withdrawals ?? [];
  const minWithdrawal = state.dashboard.settings.minimumWithdrawalUsd;
  const available = creators.reduce((sum, creator) => sum + Number(creator.availableUsd || 0), 0);
  const hold = creators.reduce((sum, creator) => sum + Number(creator.holdUsd || 0), 0);
  const requested = withdrawals
    .filter((item) => ["requested", "compliance_review"].includes(item.status))
    .reduce((sum, item) => sum + Number(item.amountUsd || 0), 0);
  const blocked = withdrawals.filter((item) => item.status === "blocked").length;
  const canWithdraw = available >= minWithdrawal;
  const cards = [
    ["1", "Available balance", usd.format(available), "Money is fixed after advertiser report.", canWithdraw ? "ready" : "waiting"],
    ["2", "Hold", usd.format(hold), "Views exist, but report cycle or approval is not closed yet.", "waiting"],
    ["3", "In withdrawal", usd.format(requested), "USDT requests are created but not sent yet.", requested ? "review" : "idle"],
    ["4", "Needs support", num.format(blocked), "Below minimum, missing wallet or review issue.", blocked ? "blocked" : "ready"]
  ];
  target.innerHTML = cards.map(([step, title, value, hint, status]) => `
    <article class="payout-step ${status}">
      <span>${step}</span>
      <div>
        <small>${escapeHtml(title)}</small>
        <strong>${escapeHtml(value)}</strong>
        <p>${escapeHtml(hint)}</p>
      </div>
    </article>
  `).join("");
}

function renderWithdrawalStatusCards() {
  const target = $("#withdrawalStatusCards");
  if (!target) return;
  const rows = (state.dashboard.withdrawals ?? []).slice().sort((a, b) => String(b.createdAt).localeCompare(String(a.createdAt)));
  if (!rows.length) {
    const topCreator = state.dashboard.creators.slice().sort((a, b) => Number(b.availableUsd || 0) - Number(a.availableUsd || 0))[0];
    target.innerHTML = `
      <article class="withdrawal-empty">
        <div>
          <p class="eyebrow">No requests yet</p>
          <h3>${topCreator?.canWithdraw ? "You can request the first payout." : "Balance is still growing toward first withdrawal."}</h3>
          <p>Money is first fixed on ViewFlow balance, then the creator creates a separate wallet request.</p>
        </div>
        <button type="button" data-jump-tab="creators">Open withdrawal</button>
      </article>
    `;
    return;
  }
  target.innerHTML = rows.map((item) => `
    <article class="withdrawal-card ${withdrawalTone(item.status)}">
      <div class="card-row">
        <div>
          <p class="eyebrow">${escapeHtml(withdrawalLabel(item.status))}</p>
          <h3>${escapeHtml(item.creatorName || item.creatorId)}</h3>
        </div>
        <strong>${usd.format(item.amountUsd)}</strong>
      </div>
      <div class="withdrawal-route">
        <span>Balance</span>
        <i></i>
        <span>Request</span>
        <i></i>
        <span>Wallet</span>
      </div>
      <p>${escapeHtml(withdrawalHint(item.status))}</p>
      <div class="report-actions">
        <button type="button" data-jump-tab="creators">${item.status === "blocked" ? "Fix" : "Open"}</button>
        <button class="ghost" type="button">Support</button>
      </div>
    </article>
  `).join("");
}

function withdrawalLabel(status) {
  return ({
    requested: "Request created",
    compliance_review: "Compliance review",
    blocked: "Blocked",
    paid: "Paid",
    rejected: "Rejected"
  })[status] ?? status;
}

function withdrawalHint(status) {
  return ({
    requested: "Request is created. Platform checks wallet, amount and available balance.",
    compliance_review: "Wallet or source-of-funds review is in progress before USDT transfer.",
    blocked: "Request cannot be paid now: below minimum, missing wallet or balance mismatch.",
    paid: "USDT has been sent. Transaction hash must be recorded in the ledger.",
    rejected: "Request was closed without payout; support reason is required."
  })[status] ?? "Request is waiting for processing.";
}

function withdrawalTone(status) {
  if (status === "paid") return "ready";
  if (status === "blocked" || status === "rejected") return "blocked";
  return "review";
}

function renderTracking() {
  $("#trackingLinks").innerHTML = state.dashboard.trackingLinks.map((link) => `
    <article class="card">
      <strong>${escapeHtml(link.id)}</strong>
      <p>${escapeHtml(link.url)}</p>
      <span class="badge">${num.format(link.clicks)} clicks</span>
    </article>
  `).join("");
  $("#promoCodes").innerHTML = state.dashboard.promoCodes.map((code) => `
    <article class="card">
      <strong>${escapeHtml(code.code)}</strong>
      <p>${escapeHtml(code.id)}</p>
      <span class="badge">${num.format(code.uses)} uses</span>
    </article>
  `).join("");
  $("#serviceEvents").innerHTML = state.dashboard.serviceEvents.map((event) => `
    <article class="card">
      <div class="card-row"><strong>${escapeHtml(event.type)}</strong><span class="badge">${escapeHtml(event.status)}</span></div>
      <p>${escapeHtml(event.offerTitle)} · ${escapeHtml(event.creatorName)}</p>
      <small>${escapeHtml(event.externalEventId)} · ${usd.format(event.amountUsd)}</small>
    </article>
  `).join("");
}

function renderFinance() {
  $("#ledgerRows").innerHTML = state.dashboard.ledger.slice(0, 12).map((entry) => `
    <article class="card">
      <div class="card-row"><strong>${escapeHtml(entry.type)}</strong><span class="badge">${escapeHtml(entry.status)}</span></div>
      <p>${escapeHtml(entry.ownerType)} · ${escapeHtml(entry.ownerId)}</p>
      <small>${usd.format(entry.amountUsd)} · ${escapeHtml(entry.txHash || "no tx")}</small>
    </article>
  `).join("");
}

function renderKnowledge() {
  const creatorHelp = [
    { audience: "start", title: "How to start", body: "Choose an offer, read the brief and rules, publish a video on TikTok/Reels/Shorts, then attach the link or connect an account." },
    { audience: "videos", title: "How views are counted", body: "Views are collected until the company report date. After review, accepted views are locked and the amount moves to balance or hold." },
    { audience: "payouts", title: "When you can withdraw", body: "Withdrawals are available from $100. Money first appears on ViewFlow balance, then a separate USDT wallet request is created." },
    { audience: "review", title: "Why videos can be rejected", body: "Reasons include wrong language, prohibited format, brief mismatch, suspicious views or publication outside allowed platforms." }
  ];
  const rows = state.role === "creator" ? creatorHelp : state.dashboard.knowledgeBase;
  $("#knowledgeCards").innerHTML = rows.map((item) => `
    <article class="card">
      <p class="eyebrow">${escapeHtml(item.audience)}</p>
      <strong>${escapeHtml(item.title)}</strong>
      <p>${escapeHtml(item.body)}</p>
    </article>
  `).join("");
}

function bindEvents() {
  $("#loginForm").addEventListener("submit", async (event) => {
    event.preventDefault();
    $("#loginError").textContent = "";
    try {
      await api("/api/login", { method: "POST", body: JSON.stringify(Object.fromEntries(new FormData(event.currentTarget).entries())) });
      state.publicDemo = false;
      showApp();
      await loadDashboard();
    } catch {
      $("#loginError").textContent = "Invalid login or password";
    }
  });

  $("#registerForm").addEventListener("submit", async (event) => {
    event.preventDefault();
    $("#registerStatus").textContent = "Sending...";
    try {
      const payload = buildRegistrationPayload(event.currentTarget);
      await publicApi("/api/register", { method: "POST", body: JSON.stringify(payload) });
      event.currentTarget.reset();
      updateRegistrationFields("creator");
      setRegisterStatus("Account created. You can sign in with this email and password.", "success");
    } catch (error) {
      setRegisterStatus(readErrorMessage(error, "Could not submit the application."), "error");
    }
  });

  $$('input[name="role"]').forEach((item) => {
    item.addEventListener("change", () => updateRegistrationFields(item.value));
  });
  updateRegistrationFields($('input[name="role"]:checked')?.value || "creator");

  $("#logoutBtn").addEventListener("click", async () => {
    await api("/api/logout", { method: "POST", body: "{}" });
    state.publicDemo = false;
    showLogin();
  });

  $("#userMenuBtn").addEventListener("click", () => {
    const panel = $("#userMenuPanel");
    const isHidden = panel.classList.toggle("hidden");
    $("#userMenuBtn").setAttribute("aria-expanded", String(!isHidden));
  });

  $("#refreshBtn")?.addEventListener("click", async () => {
    await api("/api/refresh", { method: "POST", body: "{}" });
    await loadDashboard();
  });

  $("#importForm")?.addEventListener("submit", async (event) => {
    event.preventDefault();
    const file = $("#importFile")?.files[0];
    if (!file) return;
    const form = new FormData();
    form.append("file", file);
    await api("/api/import", { method: "POST", body: form });
    event.currentTarget.reset();
    await loadDashboard();
  });

  $("#depositForm").addEventListener("submit", async (event) => submitJsonForm(event, "/api/deposits"));
  $("#offerForm").addEventListener("submit", async (event) => submitJsonForm(event, "/api/offers"));
  $("#companyReportForm").addEventListener("submit", async (event) => submitJsonForm(event, "/api/company-reports"));
  $("#withdrawalForm").addEventListener("submit", async (event) => submitJsonForm(event, "/api/withdrawals"));
  $("#serviceEventForm").addEventListener("submit", async (event) => submitJsonForm(event, "/api/service-events"));
  $("#videoLinkForm").addEventListener("submit", async (event) => submitJsonForm(event, "/api/videos"));
  $("#accountImportForm").addEventListener("submit", submitAccountImport);
  $("#showVideoFormBtn").addEventListener("click", () => $("#videoLinkForm").classList.toggle("hidden"));
  $("#previewVideoBtn").addEventListener("click", previewVideoByUrl);

  $("#searchInput").addEventListener("input", renderVideos);
  $("#companyFilter").addEventListener("input", renderVideos);
  $("#offerFilter").addEventListener("input", renderVideos);
  $("#statusFilter").addEventListener("input", renderVideos);

  $("#sideTabs").addEventListener("click", (event) => {
    const button = event.target.closest("[data-tab]");
    if (!button) return;
    switchTab(button.dataset.tab);
  });

  $$(".cabinet-switch button").forEach((button) => {
    button.addEventListener("click", () => {
      switchRole(button.dataset.role);
    });
  });

  document.addEventListener("click", (event) => {
    if (event.target.closest(".user-menu")) return;
    $("#userMenuPanel")?.classList.add("hidden");
    $("#userMenuBtn")?.setAttribute("aria-expanded", "false");
  });

  document.addEventListener("click", async (event) => {
    const button = event.target.closest("[data-approve]");
    if (!button) return;
    const video = state.dashboard.videos.find((item) => item.id === button.dataset.approve);
    if (!video) return;
    await api(`/api/videos/${video.id}/approve`, {
      method: "POST",
      body: JSON.stringify({ acceptedViews: video.acceptedViews || video.rawViews, aiEligibility: "fits", status: "pending_payout", note: "Approved from local MVP UI" })
    });
    await loadDashboard();
  });

  document.addEventListener("click", async (event) => {
    const button = event.target.closest("[data-pay-withdrawal]");
    if (!button) return;
    const txHash = window.prompt("USDT payout TX hash") || "";
    await api(`/api/withdrawals/${button.dataset.payWithdrawal}/pay`, {
      method: "POST",
      body: JSON.stringify({ txHash })
    });
    await loadDashboard();
  });

  document.addEventListener("click", (event) => {
    const button = event.target.closest("[data-jump-tab]");
    if (!button) return;
    switchTab(button.dataset.jumpTab);
    $("#withdrawalForm")?.scrollIntoView({ behavior: "smooth", block: "center" });
  });
}

function buildRegistrationPayload(form) {
  const raw = Object.fromEntries(new FormData(form).entries());
  const role = raw.role || "creator";
  const name = role === "advertiser" ? raw.companyName : raw.creatorName;
  const platforms = new FormData(form).getAll("creatorPlatforms").filter(Boolean);
  const service = role === "advertiser"
    ? raw.advertiserService
    : [platforms.join(", "), raw.creatorNiche].filter(Boolean).join(" · ");
  const note = role === "advertiser"
    ? [raw.advertiserGoal, raw.note].filter(Boolean).join(" · ")
    : raw.note;
  return {
    role,
    name,
    email: raw.email,
    password: raw.password,
    telegram: raw.telegram,
    platforms,
    service,
    language: raw.language,
    walletOrNote: note
  };
}

function setRegisterStatus(message, tone = "") {
  const target = $("#registerStatus");
  target.textContent = message;
  target.classList.toggle("success", tone === "success");
  target.classList.toggle("error", tone === "error");
}

function showToast(message) {
  const target = $("#toast");
  if (!target) return;
  target.textContent = message;
  target.classList.remove("hidden");
  clearTimeout(showToast.timer);
  showToast.timer = setTimeout(() => target.classList.add("hidden"), 3600);
}

function readErrorMessage(error, fallback) {
  try {
    const parsed = JSON.parse(error.message);
    return parsed.error || fallback;
  } catch {
    return fallback;
  }
}

function updateRegistrationFields(role) {
  $$("[data-role-field]").forEach((field) => {
    const active = field.dataset.roleField === role;
    field.classList.toggle("hidden", !active);
    $$("input, select, textarea", field).forEach((input) => {
      input.disabled = !active;
    });
  });
}

function switchTab(tab) {
  state.tab = tab;
  renderNavigation();
  syncTabVisibility();
}

function switchRole(role) {
  if (!ROLE_NAV[role]) return;
  state.role = role;
  state.tab = ROLE_NAV[role].defaultTab;
  renderNavigation();
  syncTabVisibility();
}

function syncTabVisibility() {
  $$(".tab").forEach((item) => item.classList.toggle("active", item.dataset.tab === state.tab));
  $$(".tab-panel").forEach((panel) => panel.classList.toggle("hidden", panel.id !== state.tab));
  const activeRole = ROLE_NAV[state.role] ?? ROLE_NAV.creator;
  if ($("#currentWorkspace")) $("#currentWorkspace").textContent = activeRole.label;
  $("#globalHero")?.classList.add("hidden");
}

async function submitJsonForm(event, path) {
  event.preventDefault();
  await api(path, { method: "POST", body: JSON.stringify(formDataToObject(event.currentTarget)) });
  event.currentTarget.reset();
  await loadDashboard();
}

function formDataToObject(form) {
  const data = new FormData(form);
  const payload = Object.fromEntries(data.entries());
  for (const key of new Set([...data.keys()])) {
    const values = data.getAll(key);
    if (values.length > 1) payload[key] = values;
  }
  return payload;
}

async function previewVideoByUrl() {
  const form = $("#videoLinkForm");
  const payload = Object.fromEntries(new FormData(form).entries());
  if (!payload.url) return;
  const preview = await api("/api/video-preview", { method: "POST", body: JSON.stringify(payload) });
  setFormValue(form, "offerId", preview.offerId);
  setFormValue(form, "creatorId", preview.creatorId);
  setFormValue(form, "accountId", preview.accountId);
  setFormValue(form, "platform", preview.platform);
  setFormValue(form, "publishedAt", preview.publishedAt);
  setFormValue(form, "rawViews", preview.rawViews);
  setFormValue(form, "language", preview.language);
  setFormValue(form, "title", preview.title);
}

async function submitAccountImport(event) {
  event.preventDefault();
  const payload = Object.fromEntries(new FormData(event.currentTarget).entries());
  const status = $("#bulkImportStatus");
  status.textContent = "Importing videos...";
  const result = await api(`/api/accounts/${encodeURIComponent(payload.accountId)}/import-videos`, {
    method: "POST",
    body: JSON.stringify(payload)
  });
  status.textContent = `Videos added: ${result.imported}. Period: ${result.from} - ${result.to}.`;
  await loadDashboard();
}

function setFormValue(form, name, value) {
  const field = form.elements[name];
  if (field && value !== undefined && value !== null) field.value = value;
}

function escapeHtml(value) {
  return String(value ?? "").replace(/[&<>"']/g, (char) => ({
    "&": "&amp;",
    "<": "&lt;",
    ">": "&gt;",
    '"': "&quot;",
    "'": "&#039;"
  })[char]);
}

function escapeAttr(value) {
  return escapeHtml(value).replace(/`/g, "&#096;");
}

init();

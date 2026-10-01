import fs from "node:fs/promises";
import path from "node:path";
import { pathToFileURL } from "node:url";
import { JSDOM } from "jsdom";

const baseUrl = "http://localhost:3030";
const html = await fs.readFile(path.resolve("public/index.html"), "utf8");
const nativeFetch = globalThis.fetch;

const login = await nativeFetch(`${baseUrl}/api/login`, {
  method: "POST",
  headers: { "Content-Type": "application/json" },
  body: JSON.stringify({ username: process.env.ADMIN_USER || "kirill", password: process.env.ADMIN_PASSWORD || "change_me" })
});

if (!login.ok) throw new Error(`login failed: ${login.status}`);
const cookie = login.headers.get("set-cookie")?.split(";")[0] ?? "";

const dom = new JSDOM(html, {
  url: baseUrl,
  pretendToBeVisual: true
});

globalThis.window = dom.window;
globalThis.document = dom.window.document;
globalThis.FormData = dom.window.FormData;
globalThis.HTMLElement = dom.window.HTMLElement;
globalThis.Event = dom.window.Event;
globalThis.fetch = (input, init = {}) => {
  const url = String(input).startsWith("http") ? String(input) : `${baseUrl}${input}`;
  const headers = new Headers(init.headers);
  if (cookie) headers.set("Cookie", cookie);
  return nativeFetch(url, { ...init, headers });
};

await import(`${pathToFileURL(path.resolve("public/app.js")).href}?t=${Date.now()}`);
await new Promise((resolve) => setTimeout(resolve, 500));

assertText("#appView:not(.hidden)", "app view visible");
assertCount("#kpis .kpi", 4, "kpi cards");
assertCount("#approvalWheels .wheel-card", 3, "approval wheels");
assertCount("#offerCards .card", 3, "offer cards");
assertCount("#videoRows tr", 1, "video rows");
assertCount("#reelTrackerRows tr", 1, "reel tracker rows");
assertCount("#companyCards .company-card", 3, "company cards");
assertCount(".side-tabs .nav-icon", 5, "creator sidebar icons");
assertText(".tab[data-tab='creators'].active", "creator overview nav active");
assertCount("#creatorCommandCenter article", 1, "creator command center");
assertCount("#creatorBalanceCards article", 4, "creator balance cards");
assertCount("#creatorWorkflowCards .creator-flow-card", 3, "creator workflow cards");
assertCount("#creatorOfferCards article", 3, "creator offer cards");
assertCount("#creatorVideoCards .creator-video-card", 1, "creator video cards");
assertCount("#creatorRows .creator-account-card", 1, "creator account cards");
assertCount("#withdrawalPreview div", 3, "withdrawal preview cards");
assertCount("#payoutSummary .payout-step", 4, "payout steps");
assertCount("#withdrawalStatusCards article", 1, "withdrawal status cards");
assertCount("#reportCards .report-card", 3, "report cards");
assertCount("#knowledgeCards .card", 1, "knowledge cards");

console.log("ui smoke ok");

function assertText(selector, label) {
  const element = document.querySelector(selector);
  if (!element) throw new Error(`missing ${label}: ${selector}`);
}

function assertCount(selector, min, label) {
  const count = document.querySelectorAll(selector).length;
  if (count < min) throw new Error(`expected ${label} >= ${min}, got ${count}`);
}

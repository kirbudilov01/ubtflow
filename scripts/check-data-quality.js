import { readDb, writeDb } from "../lib/db.js";
import { buildDataQualityReport } from "../lib/dataQuality.js";
import { appendAnalyticsSnapshot } from "../lib/analyticsSnapshots.js";

const db = await readDb();
const report = buildDataQualityReport(db);

db.dataQualityRuns ??= [];
db.dataQualityRuns.push(report.summary);
if (db.dataQualityRuns.length > 250) db.dataQualityRuns = db.dataQualityRuns.slice(-250);

if (!(db.analyticsSnapshots ?? []).length) {
  appendAnalyticsSnapshot(db, "check:data:init", { source: "scripts/check-data-quality.js" });
}

await writeDb(db);

console.log(JSON.stringify(report.summary, null, 2));

if (report.summary.errors > 0) {
  for (const issue of report.issues.filter((item) => item.severity === "error")) {
    console.error(`${issue.code}: ${issue.message} ${JSON.stringify(issue.meta)}`);
  }
  process.exit(1);
}

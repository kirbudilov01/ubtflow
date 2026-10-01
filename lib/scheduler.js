import { updateDb } from "./db.js";
import { appendAnalyticsSnapshot } from "./analyticsSnapshots.js";
import { buildDataQualityReport } from "./dataQuality.js";

export async function refreshMetrics(source = "manual") {
  const startedAt = new Date().toISOString();

  const result = await updateDb((db) => {
    const snapshot = appendAnalyticsSnapshot(db, `refresh:${source}`, { source });
    const dataQuality = buildDataQualityReport(db);
    db.dataQualityRuns ??= [];
    db.dataQualityRuns.push(dataQuality.summary);
    if (db.dataQualityRuns.length > 250) db.dataQualityRuns = db.dataQualityRuns.slice(-250);
    db.refreshRuns.push({
      id: db.refreshRuns.length + 1,
      source,
      status: "ok",
      startedAt,
      finishedAt: new Date().toISOString(),
      message: "Обновление выполнено: аналитический снимок и проверка качества данных зафиксированы.",
      snapshotId: snapshot.id,
      dataQualityStatus: dataQuality.summary.status,
      dataQualityWarnings: dataQuality.summary.warnings,
      dataQualityErrors: dataQuality.summary.errors
    });
  });

  return result;
}

export function startScheduler() {
  if (process.env.AUTO_REFRESH_ENABLED === "false") return;

  const minutes = Number(process.env.REFRESH_INTERVAL_MINUTES || 360);
  const intervalMs = Math.max(minutes, 5) * 60 * 1000;

  setInterval(() => {
    refreshMetrics("schedule").catch((error) => {
      console.error("scheduled refresh failed", error);
    });
  }, intervalMs);
}

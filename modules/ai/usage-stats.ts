type UsageRow = { status: string; latencyMs: number; inputTokens: number | null; outputTokens: number | null; errorType: string | null; provider: { name: string } };

export function summarizeAIUsage(rows: UsageRow[]) {
  const total = rows.length;
  const successful = rows.filter((row) => row.status === "SUCCESS").length;
  const inputTokens = rows.reduce((sum, row) => sum + (row.inputTokens ?? 0), 0);
  const outputTokens = rows.reduce((sum, row) => sum + (row.outputTokens ?? 0), 0);
  const averageLatencyMs = total ? Math.round(rows.reduce((sum, row) => sum + row.latencyMs, 0) / total) : 0;
  const errors = Object.entries(rows.filter((row) => row.status === "FAILED").reduce<Record<string, number>>((result, row) => { const key = row.errorType ?? "UNKNOWN"; result[key] = (result[key] ?? 0) + 1; return result; }, {})).sort((a, b) => b[1] - a[1]);
  const providers = Object.values(rows.reduce<Record<string, { name: string; total: number; successful: number; latency: number; tokens: number }>>((result, row) => { const item = result[row.provider.name] ??= { name: row.provider.name, total: 0, successful: 0, latency: 0, tokens: 0 }; item.total += 1; item.successful += row.status === "SUCCESS" ? 1 : 0; item.latency += row.latencyMs; item.tokens += (row.inputTokens ?? 0) + (row.outputTokens ?? 0); return result; }, {})).map((item) => ({ ...item, successRate: item.total ? Math.round(item.successful / item.total * 100) : 0, averageLatencyMs: item.total ? Math.round(item.latency / item.total) : 0 }));
  return { total, successful, successRate: total ? Math.round(successful / total * 100) : 0, inputTokens, outputTokens, averageLatencyMs, errors, providers };
}

import { AIUsagePurpose } from "@prisma/client";
import { db } from "@/lib/db";
import { maskApiKey } from "@/lib/settings-crypto";
import { requireSystemAdmin } from "@/modules/authorization/require-admin";
import { addModel, deleteProvider, saveProvider, saveRoute, testProvider, testProviderGeneration, toggleProvider } from "@/modules/ai/admin-actions";
import { summarizeAIUsage } from "@/modules/ai/usage-stats";

const purposeLabels: Record<AIUsagePurpose, string> = {
  TUTOR: "AI 英语老师", VOCABULARY: "单词解释", READING: "阅读生成", QUIZ: "出题", GRAMMAR: "语法批改", WRITING: "写作批改",
  LEARNING_PLAN: "学习计划", TRANSLATION: "翻译", SPEECH_RECOGNITION: "语音识别", TTS: "TTS", IMAGE_GENERATION: "图片生成", VIDEO_GENERATION: "视频生成"
};

export default async function AIAdminPage() {
  await requireSystemAdmin();
  const sevenDaysAgo = new Date(Date.now() - 7 * 86_400_000);
  const [providers, routes, requestLogs] = await Promise.all([
    db.aIProvider.findMany({ where: { deletedAt: null }, include: { models: { orderBy: { priority: "asc" } } }, orderBy: { priority: "asc" } }),
    db.aIUsageRoute.findMany({ include: { models: { include: { model: { include: { provider: true } } }, orderBy: { priority: "asc" } } } }),
    db.aIRequestLog.findMany({ where: { createdAt: { gte: sevenDaysAgo } }, include: { provider: { select: { name: true } } }, orderBy: { createdAt: "desc" }, take: 5000 })
  ]);
  const models = providers.flatMap((provider) => provider.models.map((model) => ({ ...model, providerName: provider.name })));
  const usage = summarizeAIUsage(requestLogs);

  return <div className="mx-auto max-w-6xl">
    <p className="text-sm font-bold uppercase tracking-[.2em] text-brand">AI Platform</p><h1 className="mt-2 text-4xl font-black">AI 模型管理</h1>
    <p className="mt-2 text-muted">API Key 仅在服务器端加密保存，页面永远不会返回旧 Key 的完整值。</p>

    <details className="card mt-8" open={!providers.length}>
      <summary className="cursor-pointer text-xl font-bold">添加 Provider</summary>
      <form action={saveProvider} className="mt-5 grid gap-4 md:grid-cols-2">
        <label><span className="label">配置名称</span><input className="input" name="name" required /></label>
        <label><span className="label">Provider 类型</span><select className="input" name="type" defaultValue="OPENAI"><option>OPENAI</option><option>OPENROUTER</option><option>GEMINI</option><option>OPENAI_COMPATIBLE</option><option>OLLAMA</option></select></label>
        <label className="md:col-span-2"><span className="label">Base URL</span><input className="input" type="url" name="baseUrl" required defaultValue="https://api.openai.com/v1" /></label>
        <label><span className="label">API Key</span><input className="input" type="password" name="apiKey" autoComplete="new-password" /></label>
        <label><span className="label">超时（毫秒）</span><input className="input" type="number" name="timeoutMs" defaultValue="30000" /></label>
        <label><span className="label">优先级</span><input className="input" type="number" name="priority" defaultValue="100" /></label>
        <label><span className="label">备注</span><input className="input" name="notes" /></label>
        <div className="md:col-span-2"><button className="button-primary">保存 Provider</button></div>
      </form>
    </details>

    <div className="mt-6 space-y-5">{providers.map((provider) => <section className="card" key={provider.id}>
      <div className="flex flex-wrap items-start justify-between gap-4"><div><h2 className="text-2xl font-bold">{provider.name}</h2><p className="text-sm text-muted">{provider.type} · {provider.baseUrl} · Key {maskApiKey(Boolean(provider.encryptedApiKey))}</p></div><span className={provider.enabled ? "text-brand" : "text-muted"}>{provider.enabled ? "已启用" : "已停用"}</span></div>
      <div className="mt-3 text-sm text-muted">最近测试：{provider.lastConnectionAt ? `${provider.lastConnectionOk ? "成功" : "失败"} · ${provider.lastConnectionMs}ms` : "尚未测试"}{provider.lastConnectionError ? ` · ${provider.lastConnectionError}` : ""}</div>
      {provider.lastTestOutput && <p className="mt-2 rounded-xl bg-slate-100 p-3 text-sm dark:bg-slate-800">测试生成：{provider.lastTestOutput}</p>}
      <form action={testProviderGeneration} className="mt-3"><input type="hidden" name="id" value={provider.id}/><button className="button-ghost">测试生成</button></form>
      <div className="mt-4 flex flex-wrap gap-2"><form action={testProvider}><input type="hidden" name="id" value={provider.id}/><button className="button-ghost">测试连接</button></form><form action={toggleProvider}><input type="hidden" name="id" value={provider.id}/><button className="button-ghost">{provider.enabled ? "停用" : "启用"}</button></form><form action={deleteProvider}><input type="hidden" name="id" value={provider.id}/><button className="button-ghost text-red-700 dark:text-red-300">删除</button></form></div>

      <details className="mt-5 border-t border-slate-200 pt-4 dark:border-slate-700"><summary className="cursor-pointer font-semibold text-brand">编辑 Provider</summary><form action={saveProvider} className="mt-4 grid gap-3 md:grid-cols-2"><input type="hidden" name="providerId" value={provider.id}/><input type="hidden" name="type" value={provider.type}/><label><span className="label">名称</span><input className="input" name="name" defaultValue={provider.name}/></label><label><span className="label">Base URL</span><input className="input" name="baseUrl" defaultValue={provider.baseUrl}/></label><label><span className="label">新 API Key（留空保持原值）</span><input className="input" type="password" name="apiKey"/></label><label><span className="label">超时</span><input className="input" type="number" name="timeoutMs" defaultValue={provider.timeoutMs}/></label><label><span className="label">优先级</span><input className="input" type="number" name="priority" defaultValue={provider.priority}/></label><label><span className="label">备注</span><input className="input" name="notes" defaultValue={provider.notes ?? ""}/></label><button className="button-primary">保存修改</button></form></details>

      <div className="mt-6"><h3 className="font-bold">模型</h3><div className="mt-2 space-y-2">{provider.models.map((model) => <div className="rounded-xl bg-slate-50 p-3 text-sm dark:bg-slate-800" key={model.id}><strong>{model.displayName}</strong> <span className="text-muted">{model.name} · {model.status} · 优先级 {model.priority}</span></div>)}{!provider.models.length && <p className="text-sm text-muted">尚未添加模型；添加后才能测试连接。</p>}</div>
        <form action={addModel} className="mt-4 grid gap-3 md:grid-cols-3"><input type="hidden" name="providerId" value={provider.id}/><input className="input mt-0" name="name" placeholder="模型名称/API ID" required/><input className="input mt-0" name="displayName" placeholder="显示名称" required/><input className="input mt-0" type="number" step="0.1" name="temperature" defaultValue="0.7"/><input className="input mt-0" type="number" name="maxTokens" defaultValue="2048"/><input className="input mt-0" type="number" name="priority" defaultValue="100"/><button className="button-primary">添加模型</button></form>
      </div>
    </section>)}</div>

    <section className="card mt-6"><h2 className="text-xl font-bold">最近 7 天 API 使用统计</h2><div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-5"><Stat label="请求" value={usage.total}/><Stat label="成功率" value={`${usage.successRate}%`}/><Stat label="平均延迟" value={`${usage.averageLatencyMs}ms`}/><Stat label="输入 Token" value={usage.inputTokens}/><Stat label="输出 Token" value={usage.outputTokens}/></div><div className="mt-5 overflow-x-auto"><table className="w-full text-left text-sm"><thead><tr><th className="p-2">Provider</th><th>请求</th><th>成功率</th><th>平均延迟</th><th>Token</th></tr></thead><tbody>{usage.providers.map((item) => <tr className="border-t" key={item.name}><td className="p-2 font-bold">{item.name}</td><td>{item.total}</td><td>{item.successRate}%</td><td>{item.averageLatencyMs}ms</td><td>{item.tokens}</td></tr>)}</tbody></table></div><p className="mt-4 text-sm text-muted">错误分类：{usage.errors.map(([type, count]) => `${type} ${count}`).join(" · ") || "无失败"}</p></section>

    <section className="card mt-6"><h2 className="text-xl font-bold">AI 用途路由</h2><p className="mt-1 text-sm text-muted">为每个用途添加一个或多个模型；数字越小越优先，失败时按顺序切换。</p>
      {models.length ? <form action={saveRoute} className="mt-5 grid gap-3 md:grid-cols-[1fr_2fr_1fr_auto]"><select className="input mt-0" name="purpose">{Object.values(AIUsagePurpose).map((purpose) => <option value={purpose} key={purpose}>{purposeLabels[purpose]}</option>)}</select><select className="input mt-0" name="modelId">{models.map((model) => <option value={model.id} key={model.id}>{model.providerName} / {model.displayName}</option>)}</select><input className="input mt-0" type="number" name="priority" defaultValue="100"/><button className="button-primary">添加路由</button></form> : <p className="mt-4 text-muted">请先添加模型。</p>}
      <div className="mt-5 space-y-2">{routes.map((route) => <div className="rounded-xl border border-slate-200 p-3 dark:border-slate-700" key={route.id}><strong>{purposeLabels[route.purpose]}</strong><p className="mt-1 text-sm text-muted">{route.models.map((item) => `${item.priority}: ${item.model.provider.name}/${item.model.displayName}`).join(" → ") || "无模型"}</p></div>)}</div>
    </section>
  </div>;
}

function Stat({ label, value }: { label: string; value: string | number }) { return <div className="metric"><span className="text-muted">{label}</span><strong className="text-2xl">{value}</strong></div>; }

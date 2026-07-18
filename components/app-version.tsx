import { APP_VERSION } from "@/lib/version";

export function AppVersion() {
  return <div className="pointer-events-none fixed bottom-2 right-2 z-[100] rounded-full border border-slate-200/80 bg-white/85 px-2.5 py-1 font-mono text-[11px] font-bold text-slate-500 shadow-sm backdrop-blur dark:border-slate-700/80 dark:bg-slate-950/85 dark:text-slate-400" aria-label={`HomeLingua version ${APP_VERSION}`} title={`HomeLingua version ${APP_VERSION}`}>v{APP_VERSION}</div>;
}

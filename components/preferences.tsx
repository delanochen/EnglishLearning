"use client";
import { useEffect, useState } from "react";

export function Preferences({ locale }: { locale: "zh" | "en" }) {
  const [dark, setDark] = useState(false); const [large, setLarge] = useState(false);
  useEffect(() => { setDark(document.documentElement.classList.contains("dark")); setLarge(document.documentElement.classList.contains("large-text")); }, []);
  const toggle = (key: "dark" | "large-text", value: boolean) => { document.documentElement.classList.toggle(key, value); localStorage.setItem(key, String(value)); };
  return <div className="flex gap-2 text-sm">
    <button className="button-ghost" onClick={() => { document.cookie = `ui_locale=${locale === "zh" ? "en" : "zh"}; Path=/; Max-Age=31536000; SameSite=Lax`; location.reload(); }}>{locale === "zh" ? "EN" : "中文"}</button>
    <button className="button-ghost" onClick={() => { const v = !large; setLarge(v); toggle("large-text", v); }}>大字</button>
    <button className="button-ghost" onClick={() => { const v = !dark; setDark(v); toggle("dark", v); }}>{dark ? "浅色" : "深色"}</button>
  </div>;
}

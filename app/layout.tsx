import type { Metadata } from "next";
import "./globals.css";
import { PreferenceScript } from "@/components/preference-script";
import { PwaRegister } from "@/components/pwa-register";
import { AppVersion } from "@/components/app-version";
import { cookies } from "next/headers";

export const metadata: Metadata = { title: "HomeLingua · 家庭英语学习", description: "部署在家庭 NAS 的 AI 英语学习平台", manifest: "/manifest.webmanifest", icons: { icon: "/icons/icon.svg", apple: "/icons/icon-maskable.svg" }, appleWebApp: { capable: true, title: "HomeLingua", statusBarStyle: "default" } };

export default async function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  const locale = (await cookies()).get("ui_locale")?.value === "en" ? "en" : "zh-CN";
  return <html lang={locale} suppressHydrationWarning><head><PreferenceScript /></head><body>{children}<AppVersion/><PwaRegister /></body></html>;
}

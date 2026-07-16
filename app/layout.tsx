import type { Metadata } from "next";
import "./globals.css";
import { PreferenceScript } from "@/components/preference-script";
import { PwaRegister } from "@/components/pwa-register";

export const metadata: Metadata = { title: "HomeLingua · 家庭英语学习", description: "部署在家庭 NAS 的 AI 英语学习平台", manifest: "/manifest.webmanifest", icons: { icon: "/icons/icon.svg", apple: "/icons/icon-maskable.svg" }, appleWebApp: { capable: true, title: "HomeLingua", statusBarStyle: "default" } };

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return <html lang="zh-CN" suppressHydrationWarning><head><PreferenceScript /></head><body>{children}<PwaRegister /></body></html>;
}

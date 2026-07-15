import type { Metadata } from "next";
import "./globals.css";
import { PreferenceScript } from "@/components/preference-script";

export const metadata: Metadata = { title: "HomeLingua · 家庭英语学习", description: "部署在家庭 NAS 的 AI 英语学习平台" };

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return <html lang="zh-CN" suppressHydrationWarning><head><PreferenceScript /></head><body>{children}</body></html>;
}

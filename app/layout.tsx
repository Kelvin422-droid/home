import type { Metadata } from "next";
import "./globals.css";

const siteUrl = "https://dawnnav-dynamic.yuchenc705.chatgpt.site";
const title = "DawnNav · 黎明导航";
const description = "从动态数据库实时读取的双语知识导航，搜索、筛选与管理都在同一个 Next.js 站点中完成。";

export const metadata: Metadata = {
  title: { default: title, template: "%s · DawnNav" },
  description,
  metadataBase: new URL(siteUrl),
  icons: { icon: "/images/favicon.png" },
  openGraph: {
    type: "website",
    url: siteUrl,
    siteName: "DawnNav",
    title,
    description,
    images: [{ url: "/og.png", width: 1200, height: 630, alt: "DawnNav 黎明导航" }]
  },
  twitter: { card: "summary_large_image", title, description, images: ["/og.png"] }
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="zh-CN">
      <body>{children}</body>
    </html>
  );
}

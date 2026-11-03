import type { Metadata, Viewport } from "next";
import { CloudBaseAuthProvider } from "@/hooks/useCloudBaseAuth";
import { isLocalMode } from "@/lib/app-mode";
import "./globals.css";
import "./original.css";
import "./local.css";

const cloudMetadata: Metadata = {
  title: {
    default: "任务进度管理器 - 高效管理您的每日任务",
    template: "%s | 任务进度管理器",
  },
  description:
    "高效管理您的每日任务，记录每一步进展。云端同步、甘特排期、AI智能助手，让工作成为一种仪式。",
  keywords: ["任务管理", "进度追踪", "甘特图", "云端同步", "团队协作", "AI助手"],
  authors: [{ name: "KUN WANG" }],
  openGraph: {
    type: "website",
    locale: "zh_CN",
    siteName: "任务进度管理器",
    title: "任务进度管理器 - 高效管理您的每日任务",
    description:
      "高效管理您的每日任务，记录每一步进展。云端同步、甘特排期、AI智能助手。",
  },
  twitter: {
    card: "summary_large_image",
    title: "任务进度管理器",
    description: "高效管理您的每日任务，记录每一步进展。",
  },
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
    },
  },
  icons: {
    icon: "/favicon.ico",
  },
};

const localMetadata: Metadata = {
  title: '任务进度管理器 Local',
  description: '无登录、本地优先、可离线的个人任务工作台。数据只保存在用户浏览器中。',
  keywords: ['本地任务管理', '离线任务管理', 'PWA', 'IndexedDB'],
  authors: [{ name: 'KUN WANG' }],
  robots: { index: true, follow: true },
  icons: { icon: `${process.env.NEXT_PUBLIC_BASE_PATH || ''}/local-icon.svg` },
  openGraph: {
    type: 'website',
    locale: 'zh_CN',
    siteName: '任务进度管理器 Local',
    title: '任务进度管理器 Local',
    description: '数据留在本地的离线个人任务工作台。',
  },
};

export const metadata = isLocalMode ? localMetadata : cloudMetadata;

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  themeColor: isLocalMode ? '#1f4d3c' : [
    { media: "(prefers-color-scheme: light)", color: "#faf7f2" },
    { media: "(prefers-color-scheme: dark)", color: "#06060e" },
  ],
};

const FONT_URL =
  'https://fonts.googleapis.com/css2?family=IBM+Plex+Mono:wght@400;500;600&family=IBM+Plex+Sans:wght@400;500;600&family=Noto+Sans+SC:wght@300;400;500;700;900&family=Noto+Serif+SC:wght@500;600;700;900&family=LXGW+WenKai:wght@400;700&family=Long+Cang&family=Zen+Old+Mincho:wght@400;700;900&family=Klee+One:wght@400;600&display=swap';

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="zh-CN" className="antialiased" suppressHydrationWarning>
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="" />
        <link href={FONT_URL} rel="stylesheet" crossOrigin="anonymous" />
        {isLocalMode && <link rel="manifest" href={`${process.env.NEXT_PUBLIC_BASE_PATH || ''}/manifest.webmanifest`} />}
      </head>
      <body className="min-h-screen font-sans">
        {isLocalMode ? children : <CloudBaseAuthProvider>{children}</CloudBaseAuthProvider>}
      </body>
    </html>
  );
}

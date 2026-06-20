import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "agent-maker — 공공기관 챗봇 구성 마법사",
  description:
    "공공기관 납품용 챗봇 에이전트를 단계별로 구성하고, Claude Code용 산출물(ZIP)로 내보냅니다.",
};

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="ko">
      <body>{children}</body>
    </html>
  );
}

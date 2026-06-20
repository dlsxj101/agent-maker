import type { Metadata } from "next";
import Link from "next/link";
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
      <body>
        <header className="sticky top-0 z-20 border-b border-hairline bg-background/85 backdrop-blur">
          <div className="mx-auto flex h-12 max-w-6xl items-center justify-between px-4">
            <Link href="/" className="flex items-center gap-2.5">
              <span
                aria-hidden
                className="mono flex h-5 w-5 items-center justify-center rounded-[5px] bg-primary text-[12px] font-bold text-primary-foreground"
              >
                ›
              </span>
              <span className="text-sm font-semibold tracking-tight">agent-maker</span>
              <span className="eyebrow hidden sm:inline">configurator</span>
            </Link>
            <span className="hidden text-xs text-muted sm:block">
              공공기관 챗봇 구성 → Claude Code 산출물
            </span>
          </div>
        </header>
        {children}
      </body>
    </html>
  );
}

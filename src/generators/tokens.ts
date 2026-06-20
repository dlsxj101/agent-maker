/**
 * 디자인 토큰 생성 — AgentSpec.design → CSS 변수 / JSON 토큰.
 *
 * 산출물(DESIGN.md, 스캐폴딩의 globals.css)에서 색·폰트를 **직접 hex 가 아니라 토큰**으로
 * 쓰도록 한다. (CLAUDE.md §5 — 색은 테마 토큰/CSS 변수로)
 */

import type { AgentSpec } from "@/lib/agent-spec";
import { FONT_OPTIONS } from "@/catalog";

/** 폰트 id → CSS font-family 값 (카탈로그 조회, 없으면 sans-serif) */
export function fontFamily(fontId: string): string {
  return FONT_OPTIONS.find((f) => f.id === fontId)?.family ?? "system-ui, sans-serif";
}

/** design.colors + fonts + widget → 평탄한 토큰 맵 (키: --color-*, --font-* …) */
export function designTokens(spec: AgentSpec): Record<string, string> {
  const { colors, fonts, widgetStyle } = spec.design;
  const radius =
    widgetStyle.bubbleRadius === "sharp" ? "2px" : widgetStyle.bubbleRadius === "pill" ? "9999px" : "12px";
  return {
    "--color-primary": colors.primary,
    "--color-secondary": colors.secondary,
    "--color-accent": colors.accent,
    "--color-background": colors.background,
    "--color-surface": colors.surface,
    "--color-text": colors.text,
    "--color-muted": colors.muted,
    "--color-border": colors.border,
    "--font-heading": fontFamily(fonts.heading),
    "--font-body": fontFamily(fonts.body),
    "--bubble-radius": radius,
  };
}

/** 토큰 맵 → `:root { ... }` CSS 문자열 */
export function tokensToCss(tokens: Record<string, string>): string {
  const body = Object.entries(tokens)
    .map(([k, v]) => `  ${k}: ${v};`)
    .join("\n");
  return `:root {\n${body}\n}`;
}

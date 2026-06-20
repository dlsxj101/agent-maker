"use client";

/**
 * 라이브 챗 미리보기 — design 선택(컬러/폰트/말풍선/밀도/아바타/정렬/레이아웃)을 실시간 렌더한다.
 * (PLAN.md §2·§7 — "모든 선택지는 눈으로 보고 고른다", 우측 패널은 항상 현재 선택을 시각 반영)
 *
 * 산출물의 styles.css 와 동일한 토큰 의미를 쓰되, 여기서는 인라인 style 로 즉시 반영한다.
 */

import { useWizardStore } from "@/lib/store";
import { fontFamily } from "@/generators/tokens";

export function ChatPreview() {
  const design = useWizardStore((s) => s.spec.design);
  const name = useWizardStore((s) => s.spec.project.name);
  const { colors, widgetStyle, fonts } = design;

  const radius =
    widgetStyle.bubbleRadius === "sharp" ? 2 : widgetStyle.bubbleRadius === "pill" ? 9999 : 12;
  const gap = widgetStyle.density === "compact" ? 6 : 10;
  const pad = widgetStyle.density === "compact" ? "6px 10px" : "10px 14px";
  const botAlign = widgetStyle.align === "right" ? "flex-end" : "flex-start";

  // 레이아웃별 프레임 느낌(요약 시각화)
  const frame: React.CSSProperties =
    design.layout === "floating-widget"
      ? { width: 260, boxShadow: "0 8px 30px rgba(0,0,0,.18)", borderRadius: 16 }
      : design.layout === "side-panel"
        ? { width: 240, borderRadius: 0, boxShadow: "-4px 0 16px rgba(0,0,0,.12)" }
        : { width: "100%", borderRadius: 12 };

  const avatar = widgetStyle.avatar ? (
    <span
      aria-hidden
      style={{ width: 22, height: 22, borderRadius: 9999, background: colors.primary, flexShrink: 0 }}
    />
  ) : null;

  return (
    <div
      style={{
        ...frame,
        overflow: "hidden",
        border: `1px solid ${colors.border}`,
        background: colors.background,
        color: colors.text,
        fontFamily: fontFamily(fonts.body),
      }}
    >
      <div
        style={{
          background: colors.primary,
          color: "#fff",
          padding: "10px 14px",
          fontWeight: 700,
          fontFamily: fontFamily(fonts.heading),
          fontSize: 14,
        }}
      >
        {name || "안내 챗봇"}
      </div>

      <div style={{ background: colors.surface, padding: 12, display: "flex", flexDirection: "column", gap }}>
        {/* 봇 */}
        <div style={{ display: "flex", gap: 6, justifyContent: botAlign, alignItems: "flex-end" }}>
          {avatar}
          <div
            style={{
              maxWidth: "80%",
              padding: pad,
              borderRadius: radius,
              background: colors.background,
              border: `1px solid ${colors.border}`,
              fontSize: 13,
            }}
          >
            안녕하세요. 무엇을 도와드릴까요?
          </div>
        </div>
        {/* 사용자 */}
        <div style={{ display: "flex", justifyContent: "flex-end" }}>
          <div
            style={{
              maxWidth: "80%",
              padding: pad,
              borderRadius: radius,
              background: colors.primary,
              color: "#fff",
              fontSize: 13,
            }}
          >
            증명서 발급 방법 알려주세요
          </div>
        </div>
      </div>

      {/* 입력창 */}
      <div style={{ display: "flex", gap: 6, padding: 10, borderTop: `1px solid ${colors.border}` }}>
        <div
          style={{
            flex: 1,
            fontSize: 12,
            color: colors.muted,
            padding: widgetStyle.inputStyle === "underline" ? "4px 2px" : "6px 10px",
            border:
              widgetStyle.inputStyle === "underline"
                ? `0 0 1px 0 solid ${colors.border}`
                : `1px solid ${colors.border}`,
            borderBottom: `1px solid ${colors.border}`,
            borderRadius: widgetStyle.inputStyle === "box" ? 8 : 0,
            boxShadow: widgetStyle.inputStyle === "floating" ? "0 2px 8px rgba(0,0,0,.1)" : "none",
            background: colors.background,
          }}
        >
          메시지 입력…
        </div>
        <span
          style={{
            background: colors.accent,
            color: "#fff",
            fontSize: 12,
            padding: "6px 12px",
            borderRadius: 8,
          }}
        >
          전송
        </span>
      </div>
    </div>
  );
}

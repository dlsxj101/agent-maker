"use client";

/**
 * Step 1 — 디자인 & 테마 (M4 시각적 선택). 프리셋 + 커스텀 컬러 + 폰트 + 챗 위젯 스타일.
 * 선택은 우측 ChatPreview 에 실시간 반영된다. (PLAN.md §2 시각적 선택)
 */

import { useWizardStore } from "@/lib/store";
import { THEME_PRESETS, FONT_OPTIONS } from "@/catalog";
import {
  COLOR_MODES,
  LAYOUTS,
  BUBBLE_RADII,
  BUBBLE_ALIGNS,
  INPUT_STYLES,
  DENSITIES,
  AVATAR_STYLES,
} from "@/lib/agent-spec";
import { label } from "@/generators/format";
import { OptionCards, InfoTip } from "../controls";

const AVATAR_DESC: Record<(typeof AVATAR_STYLES)[number], string> = {
  none: "아바타 없음",
  initials: "기관 이니셜 원형",
  icon: "아이콘(🤖)",
  image: "이미지 업로드",
};
const AVATAR_LABEL: Record<(typeof AVATAR_STYLES)[number], string> = {
  none: "없음",
  initials: "이니셜",
  icon: "아이콘",
  image: "이미지",
};

function AvatarPrev({ id }: { id: (typeof AVATAR_STYLES)[number] }) {
  if (id === "none") return <span className="text-[11px] text-muted">—</span>;
  const inner = id === "initials" ? "기" : id === "icon" ? "🤖" : "🖼";
  return (
    <span className="flex h-6 w-6 items-center justify-center rounded-full bg-primary text-[11px] text-white">
      {inner}
    </span>
  );
}

const COLOR_KEYS = [
  ["primary", "주색"],
  ["secondary", "보조"],
  ["accent", "포인트"],
  ["background", "배경"],
  ["surface", "표면"],
  ["text", "텍스트"],
  ["muted", "보조텍스트"],
  ["border", "경계"],
] as const;

export function DesignStep() {
  const design = useWizardStore((s) => s.spec.design);
  const update = useWizardStore((s) => s.updateSection);
  const ws = design.widgetStyle;

  return (
    <div className="space-y-6">
      {/* 프리셋 테마 */}
      <section>
        <span className="mb-1.5 flex items-center gap-1.5 text-sm font-medium">
          <span>컬러 테마</span>
          <InfoTip text="미리 정의된 공식 배색. 선택하면 아래 컬러 토큰에 자동 반영됩니다." />
        </span>
        <div className="grid grid-cols-1 gap-2 sm:grid-cols-3">
          {THEME_PRESETS.map((t) => {
            const active = design.theme === t.id;
            return (
              <button
                key={t.id}
                type="button"
                aria-pressed={active}
                onClick={() => update("design", { theme: t.id, colors: t.colors })}
                className={`rounded-lg border p-3 text-left transition ${
                  active ? "border-primary ring-2 ring-primary/30" : "border-border hover:border-primary"
                }`}
              >
                <span className="flex gap-1">
                  {[t.colors.primary, t.colors.secondary, t.colors.accent].map((c) => (
                    <span key={c} className="h-5 w-5 rounded-full border border-border" style={{ background: c }} />
                  ))}
                </span>
                <span className="mt-2 block text-sm font-medium">{t.label}</span>
                <span className="block text-xs text-muted">{t.description}</span>
              </button>
            );
          })}
        </div>
      </section>

      {/* 커스텀 컬러 — 편집하면 theme=custom */}
      <section>
        <span className="mb-1.5 flex items-center gap-1.5 text-sm font-medium">
          <span>컬러 토큰 {design.theme === "custom" && <span className="text-xs text-muted">(커스텀)</span>}</span>
          <InfoTip text="챗봇 UI 전체에 쓰이는 색상 변수. 직접 수정하면 프리셋이 커스텀으로 전환됩니다." />
        </span>
        <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
          {COLOR_KEYS.map(([key, ko]) => (
            <label key={key} className="flex items-center gap-2 rounded-md border border-border p-2">
              <input
                type="color"
                aria-label={ko}
                value={design.colors[key]}
                onChange={(e) =>
                  update("design", { theme: "custom", colors: { ...design.colors, [key]: e.target.value } })
                }
                className="h-6 w-6 cursor-pointer border-0 bg-transparent p-0"
              />
              <span className="text-xs">{ko}</span>
            </label>
          ))}
        </div>
      </section>

      {/* 폰트 */}
      <section className="grid grid-cols-2 gap-3">
        <Select
          label="제목 폰트"
          info="챗봇 UI 제목·버튼 영역에 쓸 글꼴. 국산 표시 폰트는 별도 라이선스 없이 공공기관에서 사용 가능."
          value={design.fonts.heading}
          onChange={(v) => update("design", { fonts: { ...design.fonts, heading: v } })}
          options={FONT_OPTIONS.map((f) => [f.id, f.label + (f.domestic ? " · 국산" : "")])}
        />
        <Select
          label="본문 폰트"
          info="챗봇 대화 메시지·설명 텍스트에 쓸 글꼴. 가독성이 좋은 고딕 계열을 권장합니다."
          value={design.fonts.body}
          onChange={(v) => update("design", { fonts: { ...design.fonts, body: v } })}
          options={FONT_OPTIONS.map((f) => [f.id, f.label + (f.domestic ? " · 국산" : "")])}
        />
      </section>

      {/* 챗 위젯 스타일 */}
      <section className="grid grid-cols-2 gap-3">
        <Select
          label="말풍선 모서리"
          info="말풍선 테두리의 둥근 정도. 기관 UI 가이드에 맞춰 선택합니다."
          value={ws.bubbleRadius}
          onChange={(v) => update("design", { widgetStyle: { ...ws, bubbleRadius: v as typeof ws.bubbleRadius } })}
          options={BUBBLE_RADII.map((r) => [r, r])}
        />
        <Select
          label="봇 말풍선 정렬"
          info="봇 응답 말풍선이 왼쪽·오른쪽 중 어느 쪽에서 시작할지 결정합니다."
          value={ws.align}
          onChange={(v) => update("design", { widgetStyle: { ...ws, align: v as typeof ws.align } })}
          options={BUBBLE_ALIGNS.map((a) => [a, a])}
        />
        <Select
          label="입력창 형태"
          info="사용자가 메시지를 입력하는 영역의 테두리·배경 스타일."
          value={ws.inputStyle}
          onChange={(v) => update("design", { widgetStyle: { ...ws, inputStyle: v as typeof ws.inputStyle } })}
          options={INPUT_STYLES.map((i) => [i, i])}
        />
        <Select
          label="밀도"
          info="메시지 간격·패딩의 여유 정도. 좁으면 더 많은 내용이 한 화면에 표시됩니다."
          value={ws.density}
          onChange={(v) => update("design", { widgetStyle: { ...ws, density: v as typeof ws.density } })}
          options={DENSITIES.map((d) => [d, d])}
        />
        <label className="col-span-2 flex items-center gap-2 text-sm">
          <input
            type="checkbox"
            checked={ws.avatar}
            onChange={(e) => update("design", { widgetStyle: { ...ws, avatar: e.target.checked } })}
          />
          봇 아바타 표시
        </label>
        {ws.avatar && (
          <div className="col-span-2">
            <OptionCards
              label="아바타 스타일"
              info="봇 말풍선 옆에 표시할 아이콘 종류. 기관 로고 이미지를 쓰면 브랜드 일관성에 도움됩니다."
              columns={4}
              value={ws.avatarStyle}
              onChange={(v) => update("design", { widgetStyle: { ...ws, avatarStyle: v as typeof ws.avatarStyle } })}
              options={AVATAR_STYLES.map((a) => ({
                id: a,
                label: AVATAR_LABEL[a],
                description: AVATAR_DESC[a],
                preview: <AvatarPrev id={a} />,
              }))}
            />
          </div>
        )}
      </section>

      {/* 모드 / 레이아웃 */}
      <section className="grid grid-cols-2 gap-3">
        <Select
          label="모드"
          info="기본 화면 밝기 테마. 시스템은 사용자 OS 설정을 따릅니다."
          value={design.mode}
          onChange={(v) => update("design", { mode: v as (typeof COLOR_MODES)[number] })}
          options={COLOR_MODES.map((m) => [m, label("mode", m)])}
        />
        <Select
          label="레이아웃"
          info="챗봇 창의 배치 형태 — 플로팅 버블, 사이드바, 풀페이지 등."
          value={design.layout}
          onChange={(v) => update("design", { layout: v as (typeof LAYOUTS)[number] })}
          options={LAYOUTS.map((l) => [l, label("layout", l)])}
        />
      </section>
    </div>
  );
}

function Select({
  label: lbl,
  value,
  onChange,
  options,
  info,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  options: readonly (readonly [string, string])[];
  info?: string;
}) {
  return (
    <label className="block">
      <span className="mb-1.5 flex items-center gap-1.5 text-sm font-medium">
        <span>{lbl}</span>
        {info && <InfoTip text={info} />}
      </span>
      <select className="input" value={value} onChange={(e) => onChange(e.target.value)}>
        {options.map(([v, t]) => (
          <option key={v} value={v}>
            {t}
          </option>
        ))}
      </select>
    </label>
  );
}

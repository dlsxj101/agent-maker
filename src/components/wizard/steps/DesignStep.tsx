"use client";

/**
 * Step 1 — 디자인 & 테마 (M3 기본판). 프리셋 테마를 고르면 colors 토큰이 함께 반영된다.
 * 실시간 컬러/위젯 미리보기·커스텀 픽커는 M4(시각적 선택 UI)에서 완성한다.
 */

import { useWizardStore } from "@/lib/store";
import { THEME_PRESETS } from "@/catalog";
import { COLOR_MODES, LAYOUTS } from "@/lib/agent-spec";
import { label } from "@/generators/format";

export function DesignStep() {
  const design = useWizardStore((s) => s.spec.design);
  const update = useWizardStore((s) => s.updateSection);

  return (
    <div className="space-y-5">
      <div>
        <span className="mb-1.5 block text-sm font-medium">컬러 테마</span>
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
                    <span
                      key={c}
                      className="h-5 w-5 rounded-full border border-border"
                      style={{ background: c }}
                    />
                  ))}
                </span>
                <span className="mt-2 block text-sm font-medium">{t.label}</span>
                <span className="block text-xs text-muted">{t.description}</span>
              </button>
            );
          })}
        </div>
      </div>

      <label className="block">
        <span className="mb-1.5 block text-sm font-medium">모드</span>
        <select
          className="input"
          value={design.mode}
          onChange={(e) => update("design", { mode: e.target.value as (typeof COLOR_MODES)[number] })}
        >
          {COLOR_MODES.map((m) => (
            <option key={m} value={m}>
              {label("mode", m)}
            </option>
          ))}
        </select>
      </label>

      <label className="block">
        <span className="mb-1.5 block text-sm font-medium">레이아웃</span>
        <select
          className="input"
          value={design.layout}
          onChange={(e) => update("design", { layout: e.target.value as (typeof LAYOUTS)[number] })}
        >
          {LAYOUTS.map((l) => (
            <option key={l} value={l}>
              {label("layout", l)}
            </option>
          ))}
        </select>
      </label>
    </div>
  );
}

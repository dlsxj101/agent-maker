"use client";

/**
 * Step 6 — LLM (M3 기본판). 제공자 선택 → 해당 제공자의 모델만 노출(카탈로그 주도).
 * 모델 비교표·파라미터 슬라이더 등은 M4/M5 에서 확장한다.
 */

import { useWizardStore } from "@/lib/store";
import { LLM_PROVIDER_CATALOG, modelsByProvider } from "@/catalog";
import { LLM_PROVIDERS, LLM_SERVINGS } from "@/lib/agent-spec";
import { label } from "@/generators/format";

export function LlmStep() {
  const llm = useWizardStore((s) => s.spec.llm);
  const update = useWizardStore((s) => s.updateSection);
  const models = modelsByProvider(llm.provider);

  const onProvider = (provider: (typeof LLM_PROVIDERS)[number]) => {
    const first = modelsByProvider(provider)[0];
    // 제공자를 바꾸면 모델을 해당 제공자의 첫 모델로 재설정(정합 유지)
    update("llm", { provider, model: first ? first.id : llm.model });
  };

  return (
    <div className="space-y-5">
      <div>
        <span className="mb-1.5 block text-sm font-medium">제공자</span>
        <div className="grid grid-cols-1 gap-2 sm:grid-cols-3">
          {LLM_PROVIDER_CATALOG.map((p) => {
            const active = llm.provider === p.id;
            return (
              <button
                key={p.id}
                type="button"
                aria-pressed={active}
                onClick={() => onProvider(p.id)}
                className={`rounded-lg border p-3 text-left transition ${
                  active ? "border-primary ring-2 ring-primary/30" : "border-border hover:border-primary"
                }`}
              >
                <span className="block text-sm font-medium">{p.label}</span>
                <span className="block text-xs text-muted">{p.description}</span>
              </button>
            );
          })}
        </div>
      </div>

      <label className="block">
        <span className="mb-1.5 block text-sm font-medium">모델</span>
        <select
          className="input"
          value={llm.model}
          onChange={(e) => update("llm", { model: e.target.value })}
        >
          {models.map((m) => (
            <option key={m.id} value={m.id}>
              {m.label}
              {m.recommended ? " (권장)" : ""}
              {m.domestic ? " · 국산" : ""}
            </option>
          ))}
        </select>
      </label>

      <label className="block">
        <span className="mb-1.5 block text-sm font-medium">호출 방식</span>
        <select
          className="input"
          value={llm.serving}
          onChange={(e) => update("llm", { serving: e.target.value as (typeof LLM_SERVINGS)[number] })}
        >
          {LLM_SERVINGS.map((s) => (
            <option key={s} value={s}>
              {label("serving", s)}
            </option>
          ))}
        </select>
      </label>
    </div>
  );
}

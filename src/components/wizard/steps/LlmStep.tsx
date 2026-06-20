"use client";

/**
 * Step 6 — LLM. 제공자(카탈로그 주도) → 모델, 호출 방식, 파라미터, 가드레일, 세션, 예산(비용추정 입력).
 */

import { useWizardStore } from "@/lib/store";
import { LLM_PROVIDER_CATALOG, modelsByProvider } from "@/catalog";
import { LLM_PROVIDERS, LLM_SERVINGS } from "@/lib/agent-spec";
import { label } from "@/generators/format";
import { SelectField, NumberField, ToggleField } from "../controls";

export function LlmStep() {
  const llm = useWizardStore((s) => s.spec.llm);
  const update = useWizardStore((s) => s.updateSection);
  const models = modelsByProvider(llm.provider);

  const onProvider = (provider: (typeof LLM_PROVIDERS)[number]) => {
    const first = modelsByProvider(provider)[0];
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

      <SelectField
        label="모델"
        value={llm.model}
        onChange={(v) => update("llm", { model: v })}
        options={models.map((m) => [m.id, `${m.label}${m.recommended ? " (권장)" : ""}${m.domestic ? " · 국산" : ""}`])}
      />
      <SelectField
        label="호출 방식"
        value={llm.serving}
        onChange={(v) => update("llm", { serving: v as (typeof LLM_SERVINGS)[number] })}
        options={LLM_SERVINGS.map((s) => [s, label("serving", s)])}
        hint="폐쇄망이면 self-hosted(사내 추론)를 권장합니다."
      />

      <div className="grid grid-cols-2 gap-3">
        <NumberField
          label="temperature"
          value={llm.params.temperature}
          onChange={(v) => update("llm", { params: { ...llm.params, temperature: v ?? 0 } })}
        />
        <NumberField
          label="max tokens"
          value={llm.params.maxTokens}
          onChange={(v) => update("llm", { params: { ...llm.params, maxTokens: v ?? 0 } })}
        />
      </div>

      <fieldset className="space-y-2">
        <legend className="text-sm font-medium">가드레일</legend>
        <ToggleField
          label="근거 기반 답변 강제(환각 억제)"
          checked={llm.guardrails.groundedOnly}
          onChange={(v) => update("llm", { guardrails: { ...llm.guardrails, groundedOnly: v } })}
        />
        <ToggleField
          label="민감정보(PII) 필터"
          checked={llm.guardrails.piiFilter}
          onChange={(v) => update("llm", { guardrails: { ...llm.guardrails, piiFilter: v } })}
        />
      </fieldset>

      <ToggleField
        label="멀티턴(대화 기억) 사용"
        checked={llm.session.multiTurn}
        onChange={(v) => update("llm", { session: { ...llm.session, multiTurn: v } })}
      />

      <NumberField
        label="월 예상 질의 수 (비용 추정용)"
        value={llm.budget?.estMonthlyQueries}
        onChange={(v) => update("llm", { budget: { ...llm.budget, estMonthlyQueries: v } })}
        hint="입력하면 검토 화면에서 월 비용을 추정합니다."
      />
    </div>
  );
}

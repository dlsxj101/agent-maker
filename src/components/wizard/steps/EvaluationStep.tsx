"use client";

import { useWizardStore } from "@/lib/store";
import { EVAL_METRICS } from "@/lib/agent-spec";
import { ChipMulti, Field, NumberField, ToggleField } from "../controls";

const METRIC_LABELS: Record<string, string> = {
  "retrieval-hit": "검색 적중",
  "citation-accuracy": "인용 정확도",
  "pii-avoidance": "민감정보 회피",
  "refusal-appropriateness": "거절 적절성",
};

export function EvaluationStep() {
  const evaluation = useWizardStore((s) => s.spec.evaluation);
  const update = useWizardStore((s) => s.updateSection);
  const testset = evaluation.testset;

  const setCase = (i: number, patch: Partial<(typeof testset)[number]>) =>
    update("evaluation", { testset: testset.map((c, j) => (j === i ? { ...c, ...patch } : c)) });

  return (
    <div className="space-y-6">
      <Field label="골든셋 (대표 질문 – 기대 근거)" hint="산출물 테스트로 포함되어 챗봇 자체 검증에 쓰입니다.">
        <div className="space-y-2">
          {testset.map((c, i) => (
            <div key={i} className="space-y-1 rounded-md border border-border p-3">
              <div className="flex gap-2">
                <input
                  className="input"
                  value={c.question}
                  placeholder="질문"
                  onChange={(e) => setCase(i, { question: e.target.value })}
                />
                <button
                  type="button"
                  aria-label="삭제"
                  className="shrink-0 rounded-md border border-border px-3 text-sm text-muted"
                  onClick={() => update("evaluation", { testset: testset.filter((_, j) => j !== i) })}
                >
                  ✕
                </button>
              </div>
              <input
                className="input"
                value={c.expectedSource ?? ""}
                placeholder="기대 근거 문서/페이지 (선택)"
                onChange={(e) => setCase(i, { expectedSource: e.target.value || undefined })}
              />
            </div>
          ))}
          <button
            type="button"
            className="rounded-md border border-dashed border-border px-3 py-1.5 text-sm text-muted"
            onClick={() => update("evaluation", { testset: [...testset, { question: "" }] })}
          >
            + 질문 추가
          </button>
        </div>
      </Field>

      <ChipMulti
        label="평가 지표"
        value={evaluation.metrics}
        onChange={(v) => update("evaluation", { metrics: v as typeof evaluation.metrics })}
        options={EVAL_METRICS.map((m) => [m, METRIC_LABELS[m] ?? m])}
      />

      <div className="grid grid-cols-2 gap-3">
        <NumberField
          label="합격선: 검색 적중률"
          value={evaluation.acceptance?.minRetrievalHit}
          onChange={(v) => update("evaluation", { acceptance: { ...evaluation.acceptance, minRetrievalHit: v } })}
          hint="예: 0.8"
        />
        <NumberField
          label="합격선: 인용 정확도"
          value={evaluation.acceptance?.minCitationAccuracy}
          onChange={(v) => update("evaluation", { acceptance: { ...evaluation.acceptance, minCitationAccuracy: v } })}
        />
      </div>

      <ToggleField
        label="A/B 응답 비교 (프롬프트/모델 변형 평가)"
        checked={evaluation.abTesting}
        onChange={(v) => update("evaluation", { abTesting: v })}
      />
    </div>
  );
}

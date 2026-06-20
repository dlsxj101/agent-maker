"use client";

import { useWizardStore } from "@/lib/store";
import { PERSONA_TONES, FALLBACK_ON_UNKNOWN, HANDOFF_MODES } from "@/lib/agent-spec";
import { label } from "@/generators/format";
import { SelectField, TextField, StringListField, Field, NumberField } from "../controls";

export function ConversationStep() {
  const conv = useWizardStore((s) => s.spec.conversation);
  const update = useWizardStore((s) => s.updateSection);
  const intents = conv.intents;

  const setIntent = (i: number, patch: Partial<(typeof intents)[number]>) =>
    update("conversation", { intents: intents.map((it, j) => (j === i ? { ...it, ...patch } : it)) });

  return (
    <div className="space-y-5">
      <SelectField
        label="말투/톤"
        value={conv.persona.tone}
        onChange={(v) => update("conversation", { persona: { ...conv.persona, tone: v as (typeof PERSONA_TONES)[number] } })}
        options={PERSONA_TONES.map((t) => [t, label("tone", t)])}
      />
      <TextField
        label="화자 (선택)"
        value={conv.persona.speaker ?? ""}
        onChange={(v) => update("conversation", { persona: { ...conv.persona, speaker: v || undefined } })}
        placeholder="예: OO기관 안내"
      />

      <Field label="주요 시나리오(인텐트)" hint="대표 민원 흐름을 입력해 빈 챗봇을 방지하세요.">
        <div className="space-y-3">
          {intents.map((it, i) => (
            <div key={i} className="rounded-md border border-border p-3">
              <div className="flex gap-2">
                <input
                  className="input"
                  value={it.name}
                  placeholder="인텐트 이름 (예: 증명서 발급 안내)"
                  onChange={(e) => setIntent(i, { name: e.target.value })}
                />
                <button
                  type="button"
                  aria-label="인텐트 삭제"
                  className="shrink-0 rounded-md border border-border px-3 text-sm text-muted"
                  onClick={() => update("conversation", { intents: intents.filter((_, j) => j !== i) })}
                >
                  ✕
                </button>
              </div>
              <div className="mt-2">
                <StringListField
                  label="예시 발화"
                  value={it.examples ?? []}
                  onChange={(v) => setIntent(i, { examples: v })}
                  placeholder="예: 주민등록등본 어떻게 떼나요?"
                />
              </div>
            </div>
          ))}
          <button
            type="button"
            className="rounded-md border border-dashed border-border px-3 py-1.5 text-sm text-muted"
            onClick={() => update("conversation", { intents: [...intents, { name: "" }] })}
          >
            + 인텐트 추가
          </button>
        </div>
      </Field>

      <StringListField
        label="빠른 응답(추천 질문)"
        value={conv.quickReplies ?? []}
        onChange={(v) => update("conversation", { quickReplies: v })}
      />

      <SelectField
        label="모르는 질문 처리"
        value={conv.fallback.onUnknown}
        onChange={(v) => update("conversation", { fallback: { ...conv.fallback, onUnknown: v as (typeof FALLBACK_ON_UNKNOWN)[number] } })}
        options={FALLBACK_ON_UNKNOWN.map((f) => [f, label("onUnknown", f)])}
      />
      <SelectField
        label="상담사 연결(에스컬레이션)"
        value={conv.fallback.handoff ?? "none"}
        onChange={(v) => update("conversation", { fallback: { ...conv.fallback, handoff: v as (typeof HANDOFF_MODES)[number] } })}
        options={HANDOFF_MODES.map((h) => [h, label("handoff", h)])}
        hint="민원 챗봇은 상담사 연결을 권장합니다."
      />
      {conv.fallback.handoff && conv.fallback.handoff !== "none" && (
        <NumberField
          label="상담사 연결 목표 응답시간(분, SLA)"
          value={conv.fallback.handoffSlaMin}
          onChange={(v) => update("conversation", { fallback: { ...conv.fallback, handoffSlaMin: v } })}
          hint="예: 5 (5분 내 상담사 연결 목표)"
        />
      )}
    </div>
  );
}

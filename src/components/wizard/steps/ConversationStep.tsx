"use client";

import { useWizardStore } from "@/lib/store";
import { PERSONA_TONES, FALLBACK_ON_UNKNOWN, HANDOFF_MODES } from "@/lib/agent-spec";
import { OptionCards, TextField, StringListField, Field, NumberField, ToggleField } from "../controls";

/* -------------------------------------------------------------------------- */
/* 말투/톤 — 예시 발화로 느낌을 즉시 체감할 수 있는 카드 옵션                       */
/* -------------------------------------------------------------------------- */

const TONE_OPTIONS = [
  {
    id: "formal" as (typeof PERSONA_TONES)[number],
    label: "격식체",
    description: "공공기관 표준 문어체. 존칭·경어 사용.",
    preview: <span className="text-xs text-muted italic">{"“안녕하십니까, 무엇을 도와드릴까요?”"}</span>,
  },
  {
    id: "concise" as (typeof PERSONA_TONES)[number],
    label: "간결체",
    description: "군더더기 없이 핵심만 전달. 업무 효율 우선.",
    preview: <span className="text-xs text-muted italic">{"“용건을 말씀해 주세요.”"}</span>,
  },
  {
    id: "friendly" as (typeof PERSONA_TONES)[number],
    label: "친근체",
    description: "부드럽고 편안한 어투. 시민 친화형.",
    preview: <span className="text-xs text-muted italic">{"“안녕하세요! 무엇을 도와드릴까요 😊”"}</span>,
  },
] as const;

/* -------------------------------------------------------------------------- */
/* 모르는 질문 처리 방식                                                          */
/* -------------------------------------------------------------------------- */

const ON_UNKNOWN_OPTIONS = [
  {
    id: "apologize" as (typeof FALLBACK_ON_UNKNOWN)[number],
    label: "모른다고 사과",
    description: "답변 불가 시 정중히 사과하고 안내 채널을 제시합니다.",
  },
  {
    id: "rephrase" as (typeof FALLBACK_ON_UNKNOWN)[number],
    label: "재질문 유도",
    description: "질문을 다시 표현해 달라고 요청해 이해를 재시도합니다.",
  },
  {
    id: "handoff" as (typeof FALLBACK_ON_UNKNOWN)[number],
    label: "상담사 즉시 연결",
    description: "모르는 질문이 오면 바로 상담사(사람)에게 넘깁니다.",
  },
] as const;

/* -------------------------------------------------------------------------- */
/* 상담사 연결(에스컬레이션) 방식                                                 */
/* -------------------------------------------------------------------------- */

const HANDOFF_OPTIONS = [
  {
    id: "none" as (typeof HANDOFF_MODES)[number],
    label: "연결 없음",
    description: "상담사 연결 기능을 사용하지 않습니다.",
  },
  {
    id: "human-agent" as (typeof HANDOFF_MODES)[number],
    label: "채팅 상담사",
    description: "실시간 채팅으로 사람 상담사에게 넘깁니다.",
  },
  {
    id: "phone" as (typeof HANDOFF_MODES)[number],
    label: "전화 안내",
    description: "상담 전화번호를 안내하고 통화를 유도합니다.",
  },
  {
    id: "email" as (typeof HANDOFF_MODES)[number],
    label: "이메일 접수",
    description: "이메일 문의 양식으로 연결합니다.",
  },
] as const;

export function ConversationStep() {
  const conv = useWizardStore((s) => s.spec.conversation);
  const update = useWizardStore((s) => s.updateSection);
  const intents = conv.intents;

  const setIntent = (i: number, patch: Partial<(typeof intents)[number]>) =>
    update("conversation", { intents: intents.map((it, j) => (j === i ? { ...it, ...patch } : it)) });

  return (
    <div className="space-y-5">
      {/* 말투/톤 — 예시 발화 미리보기가 있는 시각 카드 */}
      <OptionCards
        label="말투/톤"
        info="챗봇이 사용자에게 말하는 어투. 기관 성격과 대상 이용자에 맞게 선택하세요."
        value={conv.persona.tone}
        onChange={(v) => update("conversation", { persona: { ...conv.persona, tone: v as (typeof PERSONA_TONES)[number] } })}
        options={TONE_OPTIONS}
        columns={3}
      />
      <TextField
        label="화자 (선택)"
        info="챗봇이 스스로를 소개할 때 쓰는 이름 또는 호칭. 예: OO시 민원 안내봇."
        value={conv.persona.speaker ?? ""}
        onChange={(v) => update("conversation", { persona: { ...conv.persona, speaker: v || undefined } })}
        placeholder="예: OO기관 안내"
      />

      <Field label="주요 시나리오(인텐트)" info="챗봇이 처리할 대표 업무 유형 목록. 미리 정의할수록 빈 챗봇 방지에 효과적입니다." hint="대표 민원 흐름을 입력해 빈 챗봇을 방지하세요.">
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
                  info="이 인텐트를 표현하는 실제 사용자 문장 예시. 많을수록 인식 정확도가 높아집니다."
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
        info="대화창 하단에 버튼으로 표시할 추천 질문. 사용자가 쉽게 시작할 수 있도록 돕습니다."
        value={conv.quickReplies ?? []}
        onChange={(v) => update("conversation", { quickReplies: v })}
      />

      {/* 모르는 질문 처리 방식 — 시각 카드 */}
      <OptionCards
        label="모르는 질문 처리"
        info="챗봇이 답을 모를 때의 처리 방식. 사과·재질문 유도·상담사 연결 중 선택합니다."
        value={conv.fallback.onUnknown}
        onChange={(v) => update("conversation", { fallback: { ...conv.fallback, onUnknown: v as (typeof FALLBACK_ON_UNKNOWN)[number] } })}
        options={ON_UNKNOWN_OPTIONS}
        columns={3}
      />
      {/* 상담사 연결(에스컬레이션) 방식 — 기본값 "none", 시각 카드 */}
      <OptionCards
        label="상담사 연결(에스컬레이션)"
        info="챗봇이 해결 못 한 문의를 사람 상담원에게 넘기는 방식. 민원 챗봇에서는 설정을 권장합니다."
        value={conv.fallback.handoff ?? "none"}
        onChange={(v) => update("conversation", { fallback: { ...conv.fallback, handoff: v as (typeof HANDOFF_MODES)[number] } })}
        options={HANDOFF_OPTIONS}
        columns={2}
        hint="민원 챗봇은 상담사 연결을 권장합니다."
      />
      {conv.fallback.handoff && conv.fallback.handoff !== "none" && (
        <>
          <NumberField
            label="상담사 연결 목표 응답시간(분, SLA)"
            info="상담사가 연결 요청에 응답해야 하는 목표 시간(분). SLA 문서에 명시할 기준값입니다."
            value={conv.fallback.handoffSlaMin}
            onChange={(v) => update("conversation", { fallback: { ...conv.fallback, handoffSlaMin: v } })}
            hint="예: 5 (5분 내 상담사 연결 목표)"
          />
          <ToggleField
            label="대기열 순번/예상 대기시간 표시"
            info="상담사 연결 대기 중 현재 순번과 예상 대기 시간을 사용자에게 표시합니다."
            checked={conv.fallback.showQueue}
            onChange={(v) => update("conversation", { fallback: { ...conv.fallback, showQueue: v } })}
          />
        </>
      )}

      {/* 운영 시간 + 운영시간 외 안내 */}
      <TextField
        label="운영 시간 (선택)"
        info="챗봇·상담 서비스가 활성화되는 시간대. 운영 외 시간에는 별도 안내 문구를 표시합니다."
        value={conv.fallback.operatingHours ?? ""}
        onChange={(v) => update("conversation", { fallback: { ...conv.fallback, operatingHours: v || undefined } })}
        placeholder="예: 평일 09:00-18:00 (주말·공휴일 휴무)"
      />
      <TextField
        label="운영 시간 외 안내 문구 (선택)"
        info="운영 시간 외에 접속한 사용자에게 보여줄 메시지. 대체 연락 채널을 안내할 수 있습니다."
        value={conv.fallback.offHoursMessage ?? ""}
        onChange={(v) => update("conversation", { fallback: { ...conv.fallback, offHoursMessage: v || undefined } })}
        placeholder="예: 지금은 운영 시간이 아닙니다. 평일 09시 이후 다시 문의해 주세요."
      />
    </div>
  );
}

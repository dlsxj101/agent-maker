"use client";

/**
 * Step 6 — LLM. 제공자(카탈로그 주도) → 모델, 호출 방식, 파라미터, 가드레일, 세션, 예산(비용추정 입력).
 */

import { useWizardStore } from "@/lib/store";
import { LLM_PROVIDER_CATALOG, modelsByProvider } from "@/catalog";
import { LLM_PROVIDERS, LLM_SERVINGS, SESSION_PERSISTENCE } from "@/lib/agent-spec";
import { OptionCards, NumberField, ToggleField, InfoTip } from "../controls";

/** 호출 방식(serving) 별 한국어 설명 */
const SERVING_DESCRIPTIONS: Record<(typeof LLM_SERVINGS)[number], string> = {
  "official-api": "공식 클라우드 API — 인터넷 연결 필요",
  proxy: "프록시 서버 경유 — 내부망→인터넷 중계",
  "self-hosted": "사내 추론 서버(vLLM/Ollama/TGI) — 폐쇄망 권장",
};

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
        <span className="mb-1.5 inline-flex items-center gap-1 text-sm font-medium">제공자<InfoTip text="LLM을 서비스하는 회사 또는 오픈소스 프로젝트. 공급사에 따라 선택 가능한 모델이 달라집니다." /></span>
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

      {/* 모델 선택 — 제공자별 필터링된 목록을 카드로 표시 */}
      <OptionCards
        label="모델"
        info="챗봇이 실제로 사용할 AI 언어모델. 성능·비용·폐쇄망 적합 여부를 고려해 선택하세요."
        value={llm.model}
        onChange={(v) => update("llm", { model: v })}
        options={models.map((m) => ({
          id: m.id,
          label: m.label,
          description: m.notes,
          preview:
            m.recommended || m.domestic ? (
              <span className="flex gap-1 text-xs">
                {m.recommended && <span>⭐ 권장</span>}
                {m.domestic && <span>🇰🇷 국산</span>}
              </span>
            ) : undefined,
        }))}
        columns={2}
      />
      {/* 폴백 모델 — 1차 모델 실패/과부하 시 전환 */}
      <OptionCards
        label="폴백 모델 (선택)"
        info="1차 모델 호출 실패·과부하 시 자동으로 전환할 대체 모델. 서비스 안정성을 높입니다."
        value={llm.fallbackModel ?? ""}
        onChange={(v) => update("llm", { fallbackModel: v || undefined })}
        options={[
          { id: "", label: "사용 안 함" },
          ...models.filter((m) => m.id !== llm.model).map((m) => ({ id: m.id, label: m.label })),
        ]}
        columns={2}
        hint="1차 모델 호출 실패·과부하 시 이 모델로 전환합니다."
      />
      {/* 호출 방식 선택 — 폐쇄망 여부에 따라 self-hosted 권장 */}
      <OptionCards
        label="호출 방식"
        info="LLM API를 어떤 경로로 호출할지. 폐쇄망 환경이면 사내 추론 서버(self-hosted)를 선택하세요."
        value={llm.serving}
        onChange={(v) => update("llm", { serving: v as (typeof LLM_SERVINGS)[number] })}
        options={LLM_SERVINGS.map((s) => ({
          id: s,
          label: s === "official-api" ? "공식 API" : s === "proxy" ? "프록시 경유" : "사내 추론 서버",
          description: SERVING_DESCRIPTIONS[s],
        }))}
        columns={3}
        hint="폐쇄망이면 self-hosted(사내 추론)를 권장합니다."
      />

      <div className="grid grid-cols-2 gap-3">
        <NumberField
          label="temperature"
          info="답변의 무작위성. 낮으면 일관·보수적, 높으면 다양·창의적. 공공 안내에는 낮은 값(0.0~0.3)을 권장합니다."
          value={llm.params.temperature}
          onChange={(v) => update("llm", { params: { ...llm.params, temperature: v ?? 0 } })}
        />
        <NumberField
          label="max tokens"
          info="답변 최대 길이(토큰 수). 너무 낮으면 답이 잘리고, 너무 높으면 비용이 증가합니다."
          value={llm.params.maxTokens}
          onChange={(v) => update("llm", { params: { ...llm.params, maxTokens: v ?? 0 } })}
        />
      </div>

      <fieldset className="space-y-2">
        <legend className="inline-flex items-center gap-1 text-sm font-medium">가드레일<InfoTip text="AI가 부적절하거나 위험한 답변을 하지 않도록 거는 안전장치 모음." /></legend>
        <ToggleField
          label="근거 기반 답변 강제(환각 억제)"
          info="근거 문서에 있는 내용만 답하게 강제합니다. 없는 정보를 꾸며내는 환각을 억제합니다."
          checked={llm.guardrails.groundedOnly}
          onChange={(v) => update("llm", { guardrails: { ...llm.guardrails, groundedOnly: v } })}
        />
        <ToggleField
          label="민감정보(PII) 필터"
          info="답변·로그에서 이름·전화번호 등 개인식별정보를 자동으로 마스킹합니다."
          checked={llm.guardrails.piiFilter}
          onChange={(v) => update("llm", { guardrails: { ...llm.guardrails, piiFilter: v } })}
        />
      </fieldset>

      <ToggleField
        label="멀티턴(대화 기억) 사용"
        info="앞선 대화 내용을 기억해 맥락에 맞는 답변을 이어갑니다. 끄면 매 질문이 독립 처리됩니다."
        checked={llm.session.multiTurn}
        onChange={(v) => update("llm", { session: { ...llm.session, multiTurn: v } })}
      />

      {/* 세션 영속 / 재개 — 이탈 후 돌아와 대화 이어가기 */}
      <fieldset className="space-y-2 rounded-md border border-border p-3">
        <legend className="inline-flex items-center gap-1 px-1 text-xs font-medium text-muted">세션 영속 / 재개<InfoTip text="대화 세션을 저장해 두었다가 사용자가 나갔다 돌아왔을 때 이어서 대화할 수 있게 합니다." /></legend>
        <OptionCards
          label="세션 저장 백엔드"
          info="대화 세션 데이터를 어디에 저장할지. 재시작 후에도 유지하려면 Redis 또는 DB를 선택하세요."
          columns={3}
          value={llm.session.persistence}
          onChange={(v) =>
            update("llm", { session: { ...llm.session, persistence: v as (typeof SESSION_PERSISTENCE)[number] } })
          }
          options={[
            { id: "in-memory", label: "인메모리", description: "재시작 시 소실(개발/단순)" },
            { id: "redis", label: "Redis", description: "빠른 세션 공유(영속)" },
            { id: "db", label: "DB", description: "관계형 DB에 영속" },
          ]}
        />
        <ToggleField
          label="이탈 후 재방문 시 대화 이어가기 (resumable)"
          info="사용자가 페이지를 닫고 다시 열었을 때 직전 대화를 그대로 이어갈 수 있게 합니다."
          checked={llm.session.resumable}
          onChange={(v) => update("llm", { session: { ...llm.session, resumable: v } })}
        />
      </fieldset>

      <NumberField
        label="월 예상 질의 수 (비용 추정용)"
        info="한 달에 예상되는 사용자 질의 수. 입력하면 검토 화면에서 월 비용을 자동으로 추산합니다."
        value={llm.budget?.estMonthlyQueries}
        onChange={(v) => update("llm", { budget: { ...llm.budget, estMonthlyQueries: v } })}
        hint="입력하면 검토 화면에서 월 비용을 추정합니다."
      />
    </div>
  );
}

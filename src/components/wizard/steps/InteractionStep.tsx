"use client";

/**
 * Step 8 — 상호작용 & 에이전트 동작 방식. 상단 라이브 프리뷰 + 시각적 선택 카드.
 * "동등한 선택지는 보고 고른다" — 인디케이터·인용·구조화·피드백은 미리보기 카드로 제공.
 */

import { useWizardStore } from "@/lib/store";
import {
  AGENT_MODE_CATALOG,
  INTERACTION_LABELS,
  VOICE_STT_CATALOG,
  VOICE_TTS_CATALOG,
  isAirgapSuitable,
  type VoiceEngineOption,
} from "@/catalog";
import {
  TOOL_POLICIES,
  STREAM_SPEEDS,
  TYPING_INDICATORS,
  CITATION_STYLES,
  TOOLCALL_DISPLAYS,
  CHAT_CONTROLS,
  FEEDBACK_STYLES,
  MODALITIES,
  AGENT_MODES,
  OUTPUT_LENGTHS,
  STRUCTURED_OUTPUTS,
  VOICE_STT_ENGINES,
  VOICE_TTS_ENGINES,
  A11Y_USER_CONTROLS,
} from "@/lib/agent-spec";
import { ToggleField, NumberField, ChipMulti, TextField, OptionCards, StringListField, InfoTip } from "../controls";
import { InteractionPreview } from "../InteractionPreview";

const L = INTERACTION_LABELS;
const opts = <T extends string>(arr: readonly T[], map: Record<string, string>) =>
  arr.map((v) => [v, map[v] ?? v] as const);

const A11Y_LABELS: Record<string, string> = {
  "font-size": "글자 크기 조절",
  "high-contrast": "고대비 모드",
  "screen-reader-hints": "스크린리더 힌트",
};
const TOOLPOLICY_DESC: Record<string, string> = { none: "도구 미사용", auto: "자동 실행(빠름)", confirm: "실행 전 사람 승인(HITL)" };
const SPEED_DESC: Record<string, string> = { slow: "또박또박", normal: "표준 속도", fast: "빠르게", instant: "즉시(스트리밍 없음)" };
const TOOLCALL_DESC: Record<string, string> = { hidden: "사용자에게 숨김", collapsed: "접어서 표시(펼치기 가능)", expanded: "항상 펼쳐 표시" };
const LENGTH_DESC: Record<string, string> = { brief: "핵심만 짧게", balanced: "적정 분량", detailed: "근거까지 상세히" };
// 카탈로그(src/catalog/voice.ts) → OptionCards 옵션. 폐쇄망 적합성을 배지로 표시.
const voiceOpts = <T extends string>(catalog: VoiceEngineOption<T>[]) =>
  catalog.map((e) => ({
    id: e.id,
    label: e.label,
    description: e.description,
    preview:
      e.deployment === "none" ? undefined : (
        <span className={`text-[10px] ${isAirgapSuitable(e.deployment) ? "text-primary" : "text-muted"}`}>
          {isAirgapSuitable(e.deployment) ? "온프레미스 가능" : "클라우드"}
        </span>
      ),
  }));

export function InteractionStep() {
  const it = useWizardStore((s) => s.spec.interaction);
  const update = useWizardStore((s) => s.updateSection);
  const isAgent = it.agentMode === "tool-agent";
  const hasVoice = it.multimodal.includes("voice-input") || it.multimodal.includes("voice-output");

  return (
    <div className="space-y-6">
      {/* 라이브 프리뷰 */}
      <InteractionPreview />

      {/* 에이전트 동작 방식 */}
      <OptionCards
        label="에이전트 동작 방식"
        info="챗봇이 단순 답변만 할지, 외부 도구를 스스로 호출하는 에이전트로 동작할지 결정합니다."
        value={it.agentMode}
        onChange={(v) => update("interaction", { agentMode: v as (typeof AGENT_MODES)[number] })}
        options={AGENT_MODE_CATALOG.map((m) => ({
          id: m.id,
          label: m.label,
          description: m.description,
          preview: <span className="mono text-[11px] text-primary">{m.behavior}</span>,
        }))}
      />

      {/* 도구 정책 (도구호출 에이전트일 때) */}
      {isAgent && (
        <div className="space-y-3 rounded-md border border-border p-3">
          <OptionCards
            label="도구 실행 정책"
            info="에이전트가 외부 도구를 실행할 때 사람의 승인이 필요한지 결정합니다. confirm은 HITL(사람 개입) 방식입니다."
            columns={3}
            value={it.toolPolicy}
            onChange={(v) => update("interaction", { toolPolicy: v as (typeof TOOL_POLICIES)[number] })}
            options={TOOL_POLICIES.map((id) => ({ id, label: L.toolPolicy[id], description: TOOLPOLICY_DESC[id] }))}
          />
          <div className="grid grid-cols-2 gap-3">
            <NumberField label="최대 반복(루프)" info="에이전트가 도구를 호출하며 반복할 수 있는 최대 횟수. 무한 루프를 방지합니다." value={it.maxSteps} onChange={(v) => update("interaction", { maxSteps: v })} />
            <div className="flex items-end pb-2">
              <ToggleField
                label="병렬 호출"
                info="여러 도구를 동시에 호출해 처리 속도를 높입니다. 순서에 의존하지 않는 작업에 적합합니다."
                checked={it.parallelTools ?? false}
                onChange={(v) => update("interaction", { parallelTools: v })}
              />
            </div>
          </div>
        </div>
      )}

      {/* 스트리밍/타이핑 */}
      <div className="space-y-3">
        <ToggleField
          label="응답 스트리밍"
          info="답변을 한 글자씩 실시간으로 흘려보냅니다. 체감 응답 속도가 빨라집니다."
          checked={it.streaming.enabled}
          onChange={(v) => update("interaction", { streaming: { ...it.streaming, enabled: v } })}
        />
        <OptionCards
          label="속도"
          info="스트리밍 시 텍스트가 출력되는 속도. 느릴수록 또박또박, 빠를수록 빠르게 나타납니다."
          columns={4}
          value={it.streaming.speed}
          onChange={(v) => update("interaction", { streaming: { ...it.streaming, speed: v as (typeof STREAM_SPEEDS)[number] } })}
          options={STREAM_SPEEDS.map((id) => ({ id, label: L.speed[id], description: SPEED_DESC[id] }))}
        />
        <OptionCards
          label="타이핑 인디케이터"
          info="AI가 답변을 생성하는 동안 사용자에게 보여줄 생성 중 표시(점 애니메이션·커서 등)."
          columns={3}
          value={it.streaming.indicator}
          onChange={(v) => update("interaction", { streaming: { ...it.streaming, indicator: v as (typeof TYPING_INDICATORS)[number] } })}
          options={TYPING_INDICATORS.map((id) => ({ id, label: L.indicator[id], preview: <IndicatorPrev id={id} /> }))}
        />
      </div>

      {/* 메시지 렌더링 */}
      <OptionCards
        label="인용 표시 방식"
        info="답변에 사용된 근거 출처를 어떻게 표기할지. 칩·각주·인라인 중 선택합니다."
        value={it.rendering.citationStyle}
        onChange={(v) => update("interaction", { rendering: { ...it.rendering, citationStyle: v as (typeof CITATION_STYLES)[number] } })}
        options={CITATION_STYLES.map((id) => ({ id, label: L.citationStyle[id], preview: <CitationPrev id={id} /> }))}
      />
      <OptionCards
        label="도구호출 표시"
        info="에이전트가 외부 도구를 호출했을 때 그 내역을 사용자에게 얼마나 보여줄지 결정합니다."
        columns={3}
        value={it.rendering.toolCallDisplay}
        onChange={(v) => update("interaction", { rendering: { ...it.rendering, toolCallDisplay: v as (typeof TOOLCALL_DISPLAYS)[number] } })}
        options={TOOLCALL_DISPLAYS.map((id) => ({ id, label: L.toolCallDisplay[id], description: TOOLCALL_DESC[id] }))}
      />
      <OptionCards
        label="답변 길이"
        info="기본 답변 분량. 짧게 핵심만 전달할지, 근거까지 상세히 설명할지 선택합니다."
        columns={3}
        value={it.output.length}
        onChange={(v) => update("interaction", { output: { ...it.output, length: v as (typeof OUTPUT_LENGTHS)[number] } })}
        options={OUTPUT_LENGTHS.map((id) => ({ id, label: L.length[id], description: LENGTH_DESC[id] }))}
      />
      <fieldset className="grid grid-cols-3 gap-3">
        <ToggleField label="마크다운" info="굵게·목록·제목 등 마크다운 서식을 렌더링합니다. 끄면 순수 텍스트로만 표시됩니다." checked={it.rendering.markdown} onChange={(v) => update("interaction", { rendering: { ...it.rendering, markdown: v } })} />
        <ToggleField label="코드블록" info="코드를 별도 블록으로 하이라이팅해서 표시합니다. 기술 지원 챗봇에 유용합니다." checked={it.rendering.codeBlocks} onChange={(v) => update("interaction", { rendering: { ...it.rendering, codeBlocks: v } })} />
        <ToggleField
          label="컨텍스트 사용량 미터"
          info="대화가 AI 기억 한도(컨텍스트 윈도우)를 얼마나 소비했는지 사용자에게 표시합니다."
          checked={it.rendering.showContextMeter}
          onChange={(v) => update("interaction", { rendering: { ...it.rendering, showContextMeter: v } })}
        />
      </fieldset>

      {/* 구조화 출력 */}
      <OptionCards
        label="구조화 출력 형식"
        info="답변을 특정 형식(섹션·표·JSON 등)으로 구조화할지 결정합니다. 없음이면 자유 형식입니다."
        columns={4}
        value={it.output.structured}
        onChange={(v) => update("interaction", { output: { ...it.output, structured: v as (typeof STRUCTURED_OUTPUTS)[number] } })}
        options={STRUCTURED_OUTPUTS.map((id) => ({ id, label: L.structured[id], preview: <StructuredPrev id={id} /> }))}
      />

      {/* 웰컴 */}
      <TextField
        label="인사말 (웰컴)"
        info="사용자가 대화를 처음 열었을 때 챗봇이 먼저 건네는 환영 메시지입니다."
        value={it.welcome.greeting ?? ""}
        onChange={(v) => update("interaction", { welcome: { ...it.welcome, greeting: v || undefined } })}
        placeholder="예: 안녕하세요, OO시 안내 챗봇입니다."
      />
      <ToggleField
        label="시작 화면에 추천 질문 노출"
        info="대화 시작 화면에 추천 질문 버튼을 보여줍니다. 처음 사용자의 진입 장벽을 낮춥니다."
        checked={it.welcome.showSuggestions}
        onChange={(v) => update("interaction", { welcome: { ...it.welcome, showSuggestions: v } })}
      />

      {/* 컨트롤 / 피드백 */}
      <ChipMulti
        label="대화 컨트롤"
        info="대화창에 노출할 기능 버튼. 복사·초기화·피드백 등을 원하는 조합으로 활성화합니다."
        value={it.controls}
        onChange={(v) => update("interaction", { controls: v as typeof it.controls })}
        options={opts(CHAT_CONTROLS, L.controls)}
      />
      {it.controls.includes("feedback") && (
        <OptionCards
          label="피드백 방식"
          info="사용자가 답변 품질을 평가하는 방식. 좋아요/싫어요, 별점, 또는 없음 중 선택합니다."
          columns={3}
          value={it.feedback}
          onChange={(v) => update("interaction", { feedback: v as (typeof FEEDBACK_STYLES)[number] })}
          options={FEEDBACK_STYLES.map((id) => ({ id, label: L.feedback[id], preview: <FeedbackPrev id={id} /> }))}
        />
      )}

      {/* 멀티모달 */}
      <ChipMulti
        label="멀티모달 (접근성 연계)"
        info="텍스트 외 음성·이미지 등 다양한 입출력 방식을 활성화합니다. KWCAG 접근성 향상에도 기여합니다."
        value={it.multimodal}
        onChange={(v) => update("interaction", { multimodal: v as typeof it.multimodal })}
        options={opts(MODALITIES, L.multimodal)}
        hint="음성 입출력은 KWCAG 접근성에도 도움이 됩니다."
      />

      {/* 음성 엔진 (voice 선택 시) */}
      {hasVoice && (
        <div className="space-y-3 rounded-md border border-border p-3">
          <span className="inline-flex items-center gap-1 text-xs font-medium text-muted">음성 엔진 (온프레미스 = 폐쇄망 적합)<InfoTip text="음성 입력(STT)·출력(TTS)에 사용할 엔진. 온프레미스 엔진은 폐쇄망에서도 동작합니다." /></span>
          <OptionCards
            label="STT (음성 인식)"
            info="사용자 음성을 텍스트로 변환하는 엔진. 온프레미스 엔진은 인터넷 없이 동작합니다."
            columns={3}
            value={it.voice.stt}
            onChange={(v) => update("interaction", { voice: { ...it.voice, stt: v as (typeof VOICE_STT_ENGINES)[number] } })}
            options={voiceOpts(VOICE_STT_CATALOG)}
          />
          <OptionCards
            label="TTS (음성 합성)"
            info="챗봇 답변을 음성으로 읽어주는 엔진. 시각장애인 접근성 및 핸즈프리 환경에 유용합니다."
            columns={3}
            value={it.voice.tts}
            onChange={(v) => update("interaction", { voice: { ...it.voice, tts: v as (typeof VOICE_TTS_ENGINES)[number] } })}
            options={voiceOpts(VOICE_TTS_CATALOG)}
          />
        </div>
      )}

      {/* 이용 고지 / 동의 배너 */}
      <fieldset className="space-y-2 rounded-md border border-border p-3">
        <legend className="inline-flex items-center gap-1 px-1 text-xs font-medium text-muted">이용 고지 / 동의<InfoTip text="AI 답변임을 알리는 고지와 개인정보 수집 동의 관련 설정. 공공기관 AI 서비스에서 필수 항목입니다." /></legend>
        <ToggleField
          label="AI 답변 고지 표시"
          info="답변이 AI에 의해 생성되었음을 사용자에게 명시합니다. 공공기관 AI 서비스에서 권장됩니다."
          checked={it.disclaimer.aiNotice}
          onChange={(v) => update("interaction", { disclaimer: { ...it.disclaimer, aiNotice: v } })}
        />
        <ToggleField
          label="개인정보/이용 동의 필요"
          info="대화 시작 전 개인정보 수집·이용에 대한 동의를 사용자에게 받습니다."
          checked={it.disclaimer.consent}
          onChange={(v) => update("interaction", { disclaimer: { ...it.disclaimer, consent: v } })}
        />
        <TextField
          label="고지 문구 (선택)"
          info="화면에 표시할 고지·면책 문구를 직접 입력합니다. 비워두면 기본 문구가 사용됩니다."
          value={it.disclaimer.text ?? ""}
          onChange={(v) => update("interaction", { disclaimer: { ...it.disclaimer, text: v || undefined } })}
          placeholder="예: 본 답변은 AI가 생성하며, 정확한 내용은 담당 부서에 확인하세요."
        />
      </fieldset>

      {/* 상태 메시지 */}
      <fieldset className="grid grid-cols-1 gap-3 rounded-md border border-border p-3 sm:grid-cols-3">
        <legend className="inline-flex items-center gap-1 px-1 text-xs font-medium text-muted">상태 메시지<InfoTip text="오류·오프라인·빈 화면 등 특수 상태에서 사용자에게 보여줄 안내 문구를 지정합니다." /></legend>
        <TextField label="오류" info="API 오류 등 문제 발생 시 표시할 메시지. 사용자가 당황하지 않도록 안내합니다." value={it.states.error ?? ""} onChange={(v) => update("interaction", { states: { ...it.states, error: v || undefined } })} placeholder="일시적 오류가 발생했습니다." />
        <TextField label="오프라인" info="인터넷 연결이 끊겼을 때 표시할 메시지." value={it.states.offline ?? ""} onChange={(v) => update("interaction", { states: { ...it.states, offline: v || undefined } })} placeholder="네트워크 연결을 확인하세요." />
        <TextField label="빈 화면" info="대화 내역이 없는 초기 화면에 표시할 안내 문구." value={it.states.empty ?? ""} onChange={(v) => update("interaction", { states: { ...it.states, empty: v || undefined } })} placeholder="무엇을 도와드릴까요?" />
      </fieldset>

      {/* 접근성 사용자 컨트롤 */}
      <ChipMulti
        label="접근성 사용자 컨트롤 (KWCAG)"
        info="사용자가 직접 조절할 수 있는 접근성 기능. 글자 크기·고대비 모드·스크린리더 힌트를 포함합니다."
        value={it.a11yControls}
        onChange={(v) => update("interaction", { a11yControls: v as typeof it.a11yControls })}
        options={opts(A11Y_USER_CONTROLS, A11Y_LABELS)}
      />

      {/* 능동 상호작용 */}
      <fieldset className="grid grid-cols-2 gap-3 rounded-md border border-border p-3">
        <legend className="inline-flex items-center gap-1 px-1 text-xs font-medium text-muted">능동 상호작용<InfoTip text="챗봇이 사용자에게 먼저 말을 거는 기능. 후속 질문 추천과 유휴 재참여를 설정합니다." /></legend>
        <ToggleField
          label="답변 후 후속 질문 추천"
          info="AI 답변 아래에 관련 후속 질문을 버튼으로 추천합니다. 대화 흐름을 자연스럽게 이어줍니다."
          checked={it.proactive.followupSuggestions}
          onChange={(v) => update("interaction", { proactive: { ...it.proactive, followupSuggestions: v } })}
        />
        <NumberField
          label="유휴 후 재참여(분)"
          info="사용자가 이 시간(분) 동안 입력 없이 머물면 챗봇이 먼저 말을 걸어 대화를 유도합니다."
          value={it.proactive.reengageAfterMin}
          onChange={(v) => update("interaction", { proactive: { ...it.proactive, reengageAfterMin: v } })}
        />
      </fieldset>

      {/* 입력 제한 */}
      <fieldset className="space-y-3 rounded-md border border-border p-3">
        <legend className="inline-flex items-center gap-1 px-1 text-xs font-medium text-muted">입력 제한<InfoTip text="사용자 입력 크기와 파일 업로드를 제한해 서버 과부하와 보안 위험을 방지합니다." /></legend>
        <div className="grid grid-cols-2 gap-3">
          <NumberField
            label="입력 글자수 상한"
            info="사용자가 한 번에 입력할 수 있는 최대 글자 수. 초과 시 입력이 차단됩니다."
            value={it.inputLimits.maxChars}
            onChange={(v) => update("interaction", { inputLimits: { ...it.inputLimits, maxChars: v } })}
          />
          <NumberField
            label="파일 크기 상한(MB)"
            info="첨부 파일 한 개의 최대 허용 크기(MB). 서버 부하와 처리 시간을 고려해 설정합니다."
            value={it.inputLimits.maxFileMb}
            onChange={(v) => update("interaction", { inputLimits: { ...it.inputLimits, maxFileMb: v } })}
          />
        </div>
        <StringListField
          label="허용 파일 형식"
          info="업로드를 허용할 파일 확장자 목록. 지정하지 않으면 모든 형식이 허용됩니다."
          value={it.inputLimits.allowedFileTypes ?? []}
          onChange={(v) => update("interaction", { inputLimits: { ...it.inputLimits, allowedFileTypes: v.length ? v : undefined } })}
          placeholder="예: pdf, hwp, docx"
        />
      </fieldset>
    </div>
  );
}

/* --- 선택지 미리보기 (시각 요소) --- */

function IndicatorPrev({ id }: { id: string }) {
  if (id === "dots")
    return (
      <span className="inline-flex gap-1 text-muted">
        <D /> <D d={0.15} /> <D d={0.3} />
      </span>
    );
  if (id === "cursor")
    return (
      <span className="text-[12px] text-muted">
        답변<span className="animate-pulse">▋</span>
      </span>
    );
  return <span className="text-[12px] text-muted">답변</span>;
}

function CitationPrev({ id }: { id: string }) {
  if (id === "chips") return <span className="mono rounded-[3px] border border-border px-1 text-[9px] text-muted">편람 p.12</span>;
  if (id === "footnote") return <span className="text-[11px] text-muted">…발급합니다.¹</span>;
  if (id === "inline") return <span className="text-[11px] text-muted">…발급(출처:편람)</span>;
  return <span className="text-[11px] text-muted">…발급합니다.</span>;
}

function StructuredPrev({ id }: { id: string }) {
  if (id === "sections")
    return (
      <span className="block w-full text-[9px] leading-tight text-muted">
        <b>## 제목</b>
        <br />— 항목
      </span>
    );
  if (id === "table")
    return <span className="grid w-full grid-cols-2 gap-px bg-border text-[8px]"><i className="bg-surface-2 px-1">A</i><i className="bg-surface-2 px-1">B</i><i className="bg-surface-2 px-1">1</i><i className="bg-surface-2 px-1">2</i></span>;
  if (id === "json") return <span className="mono text-[10px] text-muted">{"{ \"k\": … }"}</span>;
  return <span className="block w-full text-[9px] leading-tight text-muted">─────<br />───</span>;
}

function FeedbackPrev({ id }: { id: string }) {
  if (id === "thumbs") return <span className="text-[13px]">👍 👎</span>;
  if (id === "rating") return <span className="text-[12px] text-amber-500">★★★★★</span>;
  return <span className="text-[12px] text-muted">—</span>;
}

function D({ d = 0 }: { d?: number }) {
  return (
    <span
      className="inline-block h-1.5 w-1.5 rounded-full bg-current opacity-50"
      style={{ animation: "pulse 1s ease-in-out infinite", animationDelay: `${d}s` }}
    />
  );
}

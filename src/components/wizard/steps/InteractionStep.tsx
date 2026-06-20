"use client";

/**
 * Step 8 — 상호작용 & 에이전트 동작 방식. 상단 라이브 프리뷰 + 시각적 선택 카드.
 * "동등한 선택지는 보고 고른다" — 인디케이터·인용·구조화·피드백은 미리보기 카드로 제공.
 */

import { useWizardStore } from "@/lib/store";
import { AGENT_MODE_CATALOG, INTERACTION_LABELS } from "@/catalog";
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
import { ToggleField, NumberField, ChipMulti, TextField, OptionCards } from "../controls";
import { InteractionPreview } from "../InteractionPreview";

const L = INTERACTION_LABELS;
const opts = <T extends string>(arr: readonly T[], map: Record<string, string>) =>
  arr.map((v) => [v, map[v] ?? v] as const);

const VOICE_LABELS: Record<string, string> = {
  none: "사용 안 함",
  browser: "브라우저 내장",
  "whisper-local": "Whisper (온프레미스)",
  "coqui-local": "Coqui TTS (온프레미스)",
  clova: "네이버 클로바 (클라우드)",
  google: "Google (클라우드)",
};
const A11Y_LABELS: Record<string, string> = {
  "font-size": "글자 크기 조절",
  "high-contrast": "고대비 모드",
  "screen-reader-hints": "스크린리더 힌트",
};
const TOOLPOLICY_DESC: Record<string, string> = { none: "도구 미사용", auto: "자동 실행(빠름)", confirm: "실행 전 사람 승인(HITL)" };
const SPEED_DESC: Record<string, string> = { slow: "또박또박", normal: "표준 속도", fast: "빠르게", instant: "즉시(스트리밍 없음)" };
const TOOLCALL_DESC: Record<string, string> = { hidden: "사용자에게 숨김", collapsed: "접어서 표시(펼치기 가능)", expanded: "항상 펼쳐 표시" };
const LENGTH_DESC: Record<string, string> = { brief: "핵심만 짧게", balanced: "적정 분량", detailed: "근거까지 상세히" };
const VOICE_LOCAL: string[] = ["browser", "whisper-local", "coqui-local"];
const voiceOpts = <T extends string>(arr: readonly T[]) =>
  arr.map((id) => ({
    id,
    label: VOICE_LABELS[id] ?? id,
    preview:
      id === "none" ? undefined : (
        <span className={`text-[10px] ${VOICE_LOCAL.includes(id) ? "text-primary" : "text-muted"}`}>
          {VOICE_LOCAL.includes(id) ? "온프레미스" : "클라우드"}
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
            columns={3}
            value={it.toolPolicy}
            onChange={(v) => update("interaction", { toolPolicy: v as (typeof TOOL_POLICIES)[number] })}
            options={TOOL_POLICIES.map((id) => ({ id, label: L.toolPolicy[id], description: TOOLPOLICY_DESC[id] }))}
          />
          <div className="grid grid-cols-2 gap-3">
            <NumberField label="최대 반복(루프)" value={it.maxSteps} onChange={(v) => update("interaction", { maxSteps: v })} />
            <div className="flex items-end pb-2">
              <ToggleField
                label="병렬 호출"
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
          checked={it.streaming.enabled}
          onChange={(v) => update("interaction", { streaming: { ...it.streaming, enabled: v } })}
        />
        <OptionCards
          label="속도"
          columns={4}
          value={it.streaming.speed}
          onChange={(v) => update("interaction", { streaming: { ...it.streaming, speed: v as (typeof STREAM_SPEEDS)[number] } })}
          options={STREAM_SPEEDS.map((id) => ({ id, label: L.speed[id], description: SPEED_DESC[id] }))}
        />
        <OptionCards
          label="타이핑 인디케이터"
          columns={3}
          value={it.streaming.indicator}
          onChange={(v) => update("interaction", { streaming: { ...it.streaming, indicator: v as (typeof TYPING_INDICATORS)[number] } })}
          options={TYPING_INDICATORS.map((id) => ({ id, label: L.indicator[id], preview: <IndicatorPrev id={id} /> }))}
        />
      </div>

      {/* 메시지 렌더링 */}
      <OptionCards
        label="인용 표시 방식"
        value={it.rendering.citationStyle}
        onChange={(v) => update("interaction", { rendering: { ...it.rendering, citationStyle: v as (typeof CITATION_STYLES)[number] } })}
        options={CITATION_STYLES.map((id) => ({ id, label: L.citationStyle[id], preview: <CitationPrev id={id} /> }))}
      />
      <OptionCards
        label="도구호출 표시"
        columns={3}
        value={it.rendering.toolCallDisplay}
        onChange={(v) => update("interaction", { rendering: { ...it.rendering, toolCallDisplay: v as (typeof TOOLCALL_DISPLAYS)[number] } })}
        options={TOOLCALL_DISPLAYS.map((id) => ({ id, label: L.toolCallDisplay[id], description: TOOLCALL_DESC[id] }))}
      />
      <OptionCards
        label="답변 길이"
        columns={3}
        value={it.output.length}
        onChange={(v) => update("interaction", { output: { ...it.output, length: v as (typeof OUTPUT_LENGTHS)[number] } })}
        options={OUTPUT_LENGTHS.map((id) => ({ id, label: L.length[id], description: LENGTH_DESC[id] }))}
      />
      <fieldset className="grid grid-cols-3 gap-3">
        <ToggleField label="마크다운" checked={it.rendering.markdown} onChange={(v) => update("interaction", { rendering: { ...it.rendering, markdown: v } })} />
        <ToggleField label="코드블록" checked={it.rendering.codeBlocks} onChange={(v) => update("interaction", { rendering: { ...it.rendering, codeBlocks: v } })} />
        <ToggleField
          label="컨텍스트 사용량 미터"
          checked={it.rendering.showContextMeter}
          onChange={(v) => update("interaction", { rendering: { ...it.rendering, showContextMeter: v } })}
        />
      </fieldset>

      {/* 구조화 출력 */}
      <OptionCards
        label="구조화 출력 형식"
        columns={4}
        value={it.output.structured}
        onChange={(v) => update("interaction", { output: { ...it.output, structured: v as (typeof STRUCTURED_OUTPUTS)[number] } })}
        options={STRUCTURED_OUTPUTS.map((id) => ({ id, label: L.structured[id], preview: <StructuredPrev id={id} /> }))}
      />

      {/* 웰컴 */}
      <TextField
        label="인사말 (웰컴)"
        value={it.welcome.greeting ?? ""}
        onChange={(v) => update("interaction", { welcome: { ...it.welcome, greeting: v || undefined } })}
        placeholder="예: 안녕하세요, OO시 안내 챗봇입니다."
      />
      <ToggleField
        label="시작 화면에 추천 질문 노출"
        checked={it.welcome.showSuggestions}
        onChange={(v) => update("interaction", { welcome: { ...it.welcome, showSuggestions: v } })}
      />

      {/* 컨트롤 / 피드백 */}
      <ChipMulti
        label="대화 컨트롤"
        value={it.controls}
        onChange={(v) => update("interaction", { controls: v as typeof it.controls })}
        options={opts(CHAT_CONTROLS, L.controls)}
      />
      {it.controls.includes("feedback") && (
        <OptionCards
          label="피드백 방식"
          columns={3}
          value={it.feedback}
          onChange={(v) => update("interaction", { feedback: v as (typeof FEEDBACK_STYLES)[number] })}
          options={FEEDBACK_STYLES.map((id) => ({ id, label: L.feedback[id], preview: <FeedbackPrev id={id} /> }))}
        />
      )}

      {/* 멀티모달 */}
      <ChipMulti
        label="멀티모달 (접근성 연계)"
        value={it.multimodal}
        onChange={(v) => update("interaction", { multimodal: v as typeof it.multimodal })}
        options={opts(MODALITIES, L.multimodal)}
        hint="음성 입출력은 KWCAG 접근성에도 도움이 됩니다."
      />

      {/* 음성 엔진 (voice 선택 시) */}
      {hasVoice && (
        <div className="space-y-3 rounded-md border border-border p-3">
          <span className="text-xs font-medium text-muted">음성 엔진 (온프레미스 = 폐쇄망 적합)</span>
          <OptionCards
            label="STT (음성 인식)"
            columns={3}
            value={it.voice.stt}
            onChange={(v) => update("interaction", { voice: { ...it.voice, stt: v as (typeof VOICE_STT_ENGINES)[number] } })}
            options={voiceOpts(VOICE_STT_ENGINES)}
          />
          <OptionCards
            label="TTS (음성 합성)"
            columns={3}
            value={it.voice.tts}
            onChange={(v) => update("interaction", { voice: { ...it.voice, tts: v as (typeof VOICE_TTS_ENGINES)[number] } })}
            options={voiceOpts(VOICE_TTS_ENGINES)}
          />
        </div>
      )}

      {/* 이용 고지 / 동의 배너 */}
      <fieldset className="space-y-2 rounded-md border border-border p-3">
        <legend className="px-1 text-xs font-medium text-muted">이용 고지 / 동의</legend>
        <ToggleField
          label="AI 답변 고지 표시"
          checked={it.disclaimer.aiNotice}
          onChange={(v) => update("interaction", { disclaimer: { ...it.disclaimer, aiNotice: v } })}
        />
        <ToggleField
          label="개인정보/이용 동의 필요"
          checked={it.disclaimer.consent}
          onChange={(v) => update("interaction", { disclaimer: { ...it.disclaimer, consent: v } })}
        />
        <TextField
          label="고지 문구 (선택)"
          value={it.disclaimer.text ?? ""}
          onChange={(v) => update("interaction", { disclaimer: { ...it.disclaimer, text: v || undefined } })}
          placeholder="예: 본 답변은 AI가 생성하며, 정확한 내용은 담당 부서에 확인하세요."
        />
      </fieldset>

      {/* 상태 메시지 */}
      <fieldset className="grid grid-cols-1 gap-3 rounded-md border border-border p-3 sm:grid-cols-3">
        <legend className="px-1 text-xs font-medium text-muted">상태 메시지</legend>
        <TextField label="오류" value={it.states.error ?? ""} onChange={(v) => update("interaction", { states: { ...it.states, error: v || undefined } })} placeholder="일시적 오류가 발생했습니다." />
        <TextField label="오프라인" value={it.states.offline ?? ""} onChange={(v) => update("interaction", { states: { ...it.states, offline: v || undefined } })} placeholder="네트워크 연결을 확인하세요." />
        <TextField label="빈 화면" value={it.states.empty ?? ""} onChange={(v) => update("interaction", { states: { ...it.states, empty: v || undefined } })} placeholder="무엇을 도와드릴까요?" />
      </fieldset>

      {/* 접근성 사용자 컨트롤 */}
      <ChipMulti
        label="접근성 사용자 컨트롤 (KWCAG)"
        value={it.a11yControls}
        onChange={(v) => update("interaction", { a11yControls: v as typeof it.a11yControls })}
        options={opts(A11Y_USER_CONTROLS, A11Y_LABELS)}
      />
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

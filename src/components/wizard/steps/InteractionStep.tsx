"use client";

/**
 * Step 8 — 상호작용 & 에이전트 동작 방식. 상단에 라이브 프리뷰(움직임), 아래에 선택 폼.
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
} from "@/lib/agent-spec";
import { SelectField, ToggleField, NumberField, ChipMulti, TextField } from "../controls";
import { InteractionPreview } from "../InteractionPreview";

const L = INTERACTION_LABELS;
const opts = <T extends string>(arr: readonly T[], map: Record<string, string>) =>
  arr.map((v) => [v, map[v] ?? v] as const);

export function InteractionStep() {
  const it = useWizardStore((s) => s.spec.interaction);
  const update = useWizardStore((s) => s.updateSection);
  const isAgent = it.agentMode === "tool-agent";

  return (
    <div className="space-y-6">
      {/* 라이브 프리뷰 */}
      <InteractionPreview />

      {/* 에이전트 동작 방식 */}
      <div>
        <span className="mb-1.5 block text-sm font-medium">에이전트 동작 방식</span>
        <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
          {AGENT_MODE_CATALOG.map((m) => {
            const active = it.agentMode === m.id;
            return (
              <button
                key={m.id}
                type="button"
                aria-pressed={active}
                onClick={() => update("interaction", { agentMode: m.id as (typeof AGENT_MODES)[number] })}
                className={`rounded-lg border p-3 text-left transition ${
                  active ? "border-primary ring-2 ring-primary/30" : "border-border hover:border-primary"
                }`}
              >
                <span className="block text-sm font-medium">{m.label}</span>
                <span className="mt-0.5 block text-xs text-muted">{m.description}</span>
                <span className="mono mt-1.5 block text-[11px] text-primary">{m.behavior}</span>
              </button>
            );
          })}
        </div>
      </div>

      {/* 도구 정책 (도구호출 에이전트일 때) */}
      {isAgent && (
        <fieldset className="grid grid-cols-3 gap-3 rounded-md border border-border p-3">
          <legend className="px-1 text-xs font-medium text-muted">도구 실행</legend>
          <SelectField
            label="실행 정책"
            value={it.toolPolicy}
            onChange={(v) => update("interaction", { toolPolicy: v as (typeof TOOL_POLICIES)[number] })}
            options={opts(TOOL_POLICIES, L.toolPolicy)}
          />
          <NumberField
            label="최대 반복(루프)"
            value={it.maxSteps}
            onChange={(v) => update("interaction", { maxSteps: v })}
          />
          <div className="flex items-end pb-2">
            <ToggleField
              label="병렬 호출"
              checked={it.parallelTools ?? false}
              onChange={(v) => update("interaction", { parallelTools: v })}
            />
          </div>
        </fieldset>
      )}

      {/* 스트리밍/타이핑 */}
      <fieldset className="grid grid-cols-3 gap-3">
        <div className="col-span-3 flex items-center">
          <ToggleField
            label="응답 스트리밍"
            checked={it.streaming.enabled}
            onChange={(v) => update("interaction", { streaming: { ...it.streaming, enabled: v } })}
          />
        </div>
        <SelectField
          label="속도"
          value={it.streaming.speed}
          onChange={(v) => update("interaction", { streaming: { ...it.streaming, speed: v as (typeof STREAM_SPEEDS)[number] } })}
          options={opts(STREAM_SPEEDS, L.speed)}
        />
        <SelectField
          label="타이핑 인디케이터"
          value={it.streaming.indicator}
          onChange={(v) => update("interaction", { streaming: { ...it.streaming, indicator: v as (typeof TYPING_INDICATORS)[number] } })}
          options={opts(TYPING_INDICATORS, L.indicator)}
        />
      </fieldset>

      {/* 메시지 렌더링 */}
      <fieldset className="grid grid-cols-2 gap-3">
        <SelectField
          label="인용 표시"
          value={it.rendering.citationStyle}
          onChange={(v) => update("interaction", { rendering: { ...it.rendering, citationStyle: v as (typeof CITATION_STYLES)[number] } })}
          options={opts(CITATION_STYLES, L.citationStyle)}
        />
        <SelectField
          label="도구호출 표시"
          value={it.rendering.toolCallDisplay}
          onChange={(v) => update("interaction", { rendering: { ...it.rendering, toolCallDisplay: v as (typeof TOOLCALL_DISPLAYS)[number] } })}
          options={opts(TOOLCALL_DISPLAYS, L.toolCallDisplay)}
        />
        <ToggleField
          label="마크다운"
          checked={it.rendering.markdown}
          onChange={(v) => update("interaction", { rendering: { ...it.rendering, markdown: v } })}
        />
        <ToggleField
          label="코드블록"
          checked={it.rendering.codeBlocks}
          onChange={(v) => update("interaction", { rendering: { ...it.rendering, codeBlocks: v } })}
        />
        <ToggleField
          label="컨텍스트 사용량 미터 표시"
          checked={it.rendering.showContextMeter}
          onChange={(v) => update("interaction", { rendering: { ...it.rendering, showContextMeter: v } })}
        />
      </fieldset>

      {/* 출력 형식 */}
      <fieldset className="grid grid-cols-2 gap-3">
        <SelectField
          label="답변 길이"
          value={it.output.length}
          onChange={(v) => update("interaction", { output: { ...it.output, length: v as (typeof OUTPUT_LENGTHS)[number] } })}
          options={opts(OUTPUT_LENGTHS, L.length)}
        />
        <SelectField
          label="구조화 출력"
          value={it.output.structured}
          onChange={(v) => update("interaction", { output: { ...it.output, structured: v as (typeof STRUCTURED_OUTPUTS)[number] } })}
          options={opts(STRUCTURED_OUTPUTS, L.structured)}
        />
      </fieldset>

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
        <SelectField
          label="피드백 방식"
          value={it.feedback}
          onChange={(v) => update("interaction", { feedback: v as (typeof FEEDBACK_STYLES)[number] })}
          options={opts(FEEDBACK_STYLES, L.feedback)}
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
    </div>
  );
}

"use client";

/**
 * Step 9 — UI 연출 (스트리밍·도구호출·모션). 상단 라이브 프리뷰 + 시각 선택 카드.
 * "어떻게 움직이고 보이나"를 고른다. on/off·속도·노출수준은 §8 상호작용 단계에 있다.
 */

import { useWizardStore } from "@/lib/store";
import {
  STREAM_ANIMATION_CATALOG,
  STREAM_CURSOR_CATALOG,
  TOOLCALL_UI_CATALOG,
  TOOLCALL_ANIMATION_CATALOG,
  MESSAGE_ENTRANCE_CATALOG,
  MOTION_PACING_CATALOG,
} from "@/catalog";
import type {
  STREAM_ANIMATIONS,
  STREAM_CURSORS,
  TOOLCALL_UIS,
  TOOLCALL_ANIMATIONS,
  MESSAGE_ENTRANCES,
  MOTION_PACINGS,
} from "@/lib/agent-spec";
import { OptionCards, ToggleField } from "../controls";
import { PresentationPreview } from "../PresentationPreview";

export function PresentationStep() {
  const p = useWizardStore((s) => s.spec.presentation);
  const it = useWizardStore((s) => s.spec.interaction);
  const update = useWizardStore((s) => s.updateSection);

  const isAgent = it.agentMode === "tool-agent";
  const streamingOff = !it.streaming.enabled || it.streaming.speed === "instant";

  return (
    <div className="space-y-6">
      <PresentationPreview />

      {/* 스트리밍 글자 생성 */}
      <section className="space-y-3">
        <div className="flex items-center gap-2">
          <span className="eyebrow">스트리밍 · 글자 생성</span>
          {streamingOff && (
            <span className="text-[11px] text-muted">
              ※ ‘상호작용’ 단계에서 스트리밍이 꺼져 있거나 즉시 출력이라 애니메이션이 적용되지 않습니다.
            </span>
          )}
        </div>
        <OptionCards
          label="글자 생성 애니메이션"
          info="답변 텍스트가 화면에 차오르는 방식. 타자기는 한 글자씩, 나머지는 단어 단위로 부드럽게 나타납니다."
          columns={3}
          value={p.stream.animation}
          onChange={(v) => update("presentation", { stream: { ...p.stream, animation: v as (typeof STREAM_ANIMATIONS)[number] } })}
          options={STREAM_ANIMATION_CATALOG.map((o) => ({ id: o.id, label: o.label, description: o.description }))}
        />
        <OptionCards
          label="커서(캐럿) 스타일"
          info="글자가 생성되는 동안 깜빡이는 커서 모양. 없음을 고르면 커서를 표시하지 않습니다."
          columns={4}
          value={p.stream.cursor}
          onChange={(v) => update("presentation", { stream: { ...p.stream, cursor: v as (typeof STREAM_CURSORS)[number] } })}
          options={STREAM_CURSOR_CATALOG.map((o) => ({ id: o.id, label: o.label, description: o.description }))}
        />
      </section>

      {/* 도구 호출 표시 */}
      <section className="space-y-3 rounded-md border border-border p-3">
        <div className="flex items-center gap-2">
          <span className="eyebrow">도구 호출 표시</span>
          {!isAgent && (
            <span className="text-[11px] text-muted">
              ※ ‘상호작용’ 단계에서 동작 방식을 ‘도구호출 에이전트’로 골라야 실제로 나타납니다.
            </span>
          )}
        </div>
        <OptionCards
          label="도구 호출 UI"
          info="에이전트가 도구를 호출할 때의 표시 방식 — 한 줄 상태·접힘 카드·타임라인·터미널 로그·도구 칩 중 선택."
          columns={3}
          value={p.toolCall.ui}
          onChange={(v) => update("presentation", { toolCall: { ...p.toolCall, ui: v as (typeof TOOLCALL_UIS)[number] } })}
          options={TOOLCALL_UI_CATALOG.map((o) => ({ id: o.id, label: o.label, description: o.description }))}
        />
        <OptionCards
          label="진행 애니메이션"
          info="도구가 실행되는 동안의 움직임 — 점멸·스피너·진행 바·단계 순차 등장 등."
          columns={3}
          value={p.toolCall.animation}
          onChange={(v) => update("presentation", { toolCall: { ...p.toolCall, animation: v as (typeof TOOLCALL_ANIMATIONS)[number] } })}
          options={TOOLCALL_ANIMATION_CATALOG.map((o) => ({ id: o.id, label: o.label, description: o.description }))}
        />
        <fieldset className="grid grid-cols-2 gap-3">
          <ToggleField
            label="도구 인자 표시"
            info="도구에 전달한 입력값(검색어·파라미터)을 사용자에게 함께 보여줍니다."
            checked={p.toolCall.showArgs}
            onChange={(v) => update("presentation", { toolCall: { ...p.toolCall, showArgs: v } })}
          />
          <ToggleField
            label="도구 결과 표시"
            info="도구가 돌려준 결과 요약을 화면에 함께 보여줍니다. 끄면 호출 사실만 표시합니다."
            checked={p.toolCall.showResult}
            onChange={(v) => update("presentation", { toolCall: { ...p.toolCall, showResult: v } })}
          />
        </fieldset>
      </section>

      {/* 모션 */}
      <section className="space-y-3">
        <span className="eyebrow">메시지 · 모션</span>
        <OptionCards
          label="메시지 등장 애니메이션"
          info="새 말풍선이 화면에 나타날 때의 움직임 — 페이드·떠오름·팝·슬라이드 등."
          columns={3}
          value={p.motion.messageEntrance}
          onChange={(v) => update("presentation", { motion: { ...p.motion, messageEntrance: v as (typeof MESSAGE_ENTRANCES)[number] } })}
          options={MESSAGE_ENTRANCE_CATALOG.map((o) => ({ id: o.id, label: o.label, description: o.description }))}
        />
        <OptionCards
          label="모션 페이싱(속도감)"
          info="전체 애니메이션의 빠르기 기준. 즉시는 거의 움직임이 없고, 느긋은 여유롭게 재생됩니다."
          columns={4}
          value={p.motion.pacing}
          onChange={(v) => update("presentation", { motion: { ...p.motion, pacing: v as (typeof MOTION_PACINGS)[number] } })}
          options={MOTION_PACING_CATALOG.map((o) => ({ id: o.id, label: o.label, description: o.description }))}
        />
      </section>
    </div>
  );
}

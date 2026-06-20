"use client";

/**
 * Step 10 — 에이전트 능력 & 컨텍스트 & 안전.
 * 서브에이전트·명확화 질문·내장 도구·장기 기억·컨텍스트 자동압축·안전(거절/남용).
 */

import { useWizardStore } from "@/lib/store";
import { BUILTIN_TOOL_CATALOG, AGENT_LABELS } from "@/catalog";
import {
  BUILTIN_TOOLS,
  CONTEXT_STRATEGIES,
  REFUSAL_STYLES,
} from "@/lib/agent-spec";
import { SelectField, ToggleField, NumberField } from "../controls";

const opts = <T extends string>(arr: readonly T[], map: Record<string, string>) =>
  arr.map((v) => [v, map[v] ?? v] as const);

export function AgentStep() {
  const ag = useWizardStore((s) => s.spec.agent);
  const network = useWizardStore((s) => s.spec.backend.network);
  const update = useWizardStore((s) => s.updateSection);
  const airgap = network === "offline";

  const toggleTool = (id: (typeof BUILTIN_TOOLS)[number]) => {
    const next = ag.builtinTools.includes(id)
      ? ag.builtinTools.filter((t) => t !== id)
      : [...ag.builtinTools, id];
    update("agent", { builtinTools: next });
  };

  return (
    <div className="space-y-6">
      {/* 능력 시각화 */}
      <CapabilityMap />

      {/* 핵심 능력 */}
      <fieldset className="grid grid-cols-2 gap-3">
        <ToggleField
          label="명확화 질문 (AskUser)"
          checked={ag.askUser}
          onChange={(v) => update("agent", { askUser: v })}
        />
        <ToggleField
          label="장기 기억 (세션 간 벡터 기억)"
          checked={ag.memory.longTerm}
          onChange={(v) => update("agent", { memory: { ...ag.memory, longTerm: v } })}
        />
        <ToggleField
          label="서브에이전트"
          checked={ag.subAgents.enabled}
          onChange={(v) => update("agent", { subAgents: { ...ag.subAgents, enabled: v } })}
        />
        {ag.subAgents.enabled && (
          <NumberField
            label="최대 동시 실행"
            value={ag.subAgents.maxParallel}
            onChange={(v) => update("agent", { subAgents: { ...ag.subAgents, maxParallel: v } })}
          />
        )}
      </fieldset>

      {/* 내장 도구 (카드) */}
      <div>
        <span className="mb-1.5 block text-sm font-medium">내장 도구</span>
        <p className="mb-2 text-xs text-muted">
          커스텀 API 도구는 연동 단계에서 정의합니다. 여기서는 일반 능력 도구를 켭니다.
        </p>
        <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
          {BUILTIN_TOOL_CATALOG.map((t) => {
            const active = ag.builtinTools.includes(t.id);
            const blocked = airgap && t.needsNetwork;
            return (
              <button
                key={t.id}
                type="button"
                aria-pressed={active}
                onClick={() => toggleTool(t.id)}
                className={`rounded-lg border p-2.5 text-left transition ${
                  active ? "border-primary ring-2 ring-primary/30" : "border-border hover:border-primary"
                }`}
              >
                <span className="block text-sm">
                  {t.icon} {t.label}
                </span>
                <span className="mt-0.5 block text-[11px] text-muted">{t.description}</span>
                {blocked && active && (
                  <span className="mono mt-1 block text-[10px] text-red-600">⚠ 폐쇄망: 외부망 필요</span>
                )}
              </button>
            );
          })}
        </div>
      </div>

      {/* 컨텍스트 관리 */}
      <fieldset className="grid grid-cols-3 gap-3 rounded-md border border-border p-3">
        <legend className="px-1 text-xs font-medium text-muted">컨텍스트 관리</legend>
        <div className="flex items-end pb-2">
          <ToggleField
            label="자동 압축"
            checked={ag.context.autoCompact}
            onChange={(v) => update("agent", { context: { ...ag.context, autoCompact: v } })}
          />
        </div>
        <SelectField
          label="압축 전략"
          value={ag.context.strategy}
          onChange={(v) => update("agent", { context: { ...ag.context, strategy: v as (typeof CONTEXT_STRATEGIES)[number] } })}
          options={opts(CONTEXT_STRATEGIES, AGENT_LABELS.contextStrategy)}
        />
        <NumberField
          label="압축 트리거(토큰)"
          value={ag.context.budgetTokens}
          onChange={(v) => update("agent", { context: { ...ag.context, budgetTokens: v } })}
        />
      </fieldset>

      {/* 안전 */}
      <fieldset className="grid grid-cols-3 gap-3 rounded-md border border-border p-3">
        <legend className="px-1 text-xs font-medium text-muted">안전 (LLM 가드레일 보완)</legend>
        <SelectField
          label="거절 스타일"
          value={ag.safety.refusalStyle}
          onChange={(v) => update("agent", { safety: { ...ag.safety, refusalStyle: v as (typeof REFUSAL_STYLES)[number] } })}
          options={opts(REFUSAL_STYLES, AGENT_LABELS.refusalStyle)}
        />
        <NumberField
          label="분당 요청 상한"
          value={ag.safety.rateLimitPerMin}
          onChange={(v) => update("agent", { safety: { ...ag.safety, rateLimitPerMin: v } })}
        />
        <div className="flex items-end pb-2">
          <ToggleField
            label="남용 필터"
            checked={ag.safety.abuseFilter}
            onChange={(v) => update("agent", { safety: { ...ag.safety, abuseFilter: v } })}
          />
        </div>
      </fieldset>
    </div>
  );
}

/** 활성 능력을 한눈에 보여주는 다이어그램 */
function CapabilityMap() {
  const ag = useWizardStore((s) => s.spec.agent);
  const colors = useWizardStore((s) => s.spec.design.colors);
  const caps: string[] = [];
  if (ag.askUser) caps.push("❓ 명확화 질문");
  if (ag.memory.longTerm) caps.push("🧠 장기 기억");
  if (ag.context.autoCompact) caps.push(`🗜 자동압축(${ag.context.strategy})`);
  if (ag.safety.abuseFilter) caps.push("🛡 남용 필터");
  ag.builtinTools.forEach((t) => {
    const m = BUILTIN_TOOL_CATALOG.find((x) => x.id === t);
    if (m) caps.push(`${m.icon} ${m.label}`);
  });

  return (
    <div className="rounded-lg border border-border bg-surface p-4">
      <span className="eyebrow mb-3 block">에이전트 능력 구성</span>
      <div className="flex flex-wrap items-center gap-2">
        <span
          className="rounded-lg px-3 py-1.5 text-sm font-medium text-white"
          style={{ background: colors.primary }}
        >
          🤖 에이전트
        </span>
        {ag.subAgents.enabled && (
          <span className="rounded-lg border border-dashed border-border px-2.5 py-1 text-xs text-muted">
            ↳ 서브에이전트{ag.subAgents.maxParallel ? ` ×${ag.subAgents.maxParallel}` : ""}
          </span>
        )}
      </div>
      {caps.length > 0 ? (
        <div className="mt-3 flex flex-wrap gap-1.5">
          {caps.map((c) => (
            <span key={c} className="rounded-full border border-border px-2 py-0.5 text-[11px] text-muted">
              {c}
            </span>
          ))}
        </div>
      ) : (
        <p className="mt-3 text-xs text-muted">아직 켜진 능력이 없습니다. 아래에서 선택하세요.</p>
      )}
    </div>
  );
}

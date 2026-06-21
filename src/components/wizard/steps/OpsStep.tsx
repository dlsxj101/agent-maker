"use client";

import { useWizardStore } from "@/lib/store";
import { OBSERVABILITY_METRICS, CACHING_LAYERS, ANALYTICS_PROVIDERS } from "@/lib/agent-spec";
import { ToggleField, ChipMulti, TextField, Field, OptionCards, NumberField } from "../controls";

const ANALYTICS_LABELS: Record<(typeof ANALYTICS_PROVIDERS)[number], string> = {
  none: "없음",
  ga: "Google Analytics",
  matomo: "Matomo",
  "self-hosted": "자체 호스팅",
};

const OBS_LABELS: Record<string, string> = {
  tokens: "토큰",
  latency: "지연",
  "error-rate": "에러율",
  none: "없음",
};
const CACHE_LABELS: Record<string, string> = {
  prompt: "프롬프트",
  embedding: "임베딩",
  response: "응답",
  "tool-result": "도구 결과",
  none: "없음",
};

export function OpsStep() {
  const ops = useWizardStore((s) => s.spec.ops);
  const update = useWizardStore((s) => s.updateSection);

  return (
    <div className="space-y-6">
      <ToggleField
        label="대화 로그/감사 이력 보관"
        checked={ops.audit}
        onChange={(v) => update("ops", { audit: v })}
      />

      <Field label="관측(Observability)">
        <div className="space-y-3">
          <ChipMulti
            label="메트릭"
            value={ops.observability?.metrics ?? []}
            onChange={(v) =>
              update("ops", {
                observability: {
                  ...ops.observability,
                  metrics: v as ("tokens" | "latency" | "error-rate" | "none")[],
                  adminDashboard: ops.observability?.adminDashboard ?? false,
                  analytics: ops.observability?.analytics ?? "none",
                },
              })
            }
            options={OBSERVABILITY_METRICS.map((m) => [m, OBS_LABELS[m] ?? m])}
          />
          <ToggleField
            label="관리자 대시보드"
            checked={ops.observability?.adminDashboard ?? false}
            onChange={(v) =>
              update("ops", {
                observability: {
                  ...ops.observability,
                  metrics: ops.observability?.metrics ?? [],
                  adminDashboard: v,
                  analytics: ops.observability?.analytics ?? "none",
                },
              })
            }
          />
          <OptionCards
            label="사용 분석 도구"
            columns={4}
            value={ops.observability?.analytics ?? "none"}
            onChange={(v) =>
              update("ops", {
                observability: {
                  ...ops.observability,
                  metrics: ops.observability?.metrics ?? [],
                  adminDashboard: ops.observability?.adminDashboard ?? false,
                  analytics: v as (typeof ANALYTICS_PROVIDERS)[number],
                },
              })
            }
            options={ANALYTICS_PROVIDERS.map((a) => ({ id: a, label: ANALYTICS_LABELS[a] }))}
          />
        </div>
      </Field>

      <ChipMulti
        label="캐싱 전략"
        value={ops.performance?.caching ?? []}
        onChange={(v) =>
          update("ops", { performance: { ...ops.performance, caching: v as typeof CACHING_LAYERS[number][] } })
        }
        options={CACHING_LAYERS.map((c) => [c, CACHE_LABELS[c] ?? c])}
      />
      {(ops.performance?.caching ?? []).includes("prompt") && (
        <NumberField
          label="프롬프트 캐시 TTL(초)"
          value={ops.performance?.promptCacheTtlSec}
          onChange={(v) =>
            update("ops", { performance: { ...ops.performance, caching: ops.performance?.caching ?? [], promptCacheTtlSec: v } })
          }
          hint="프롬프트 캐시 유지 시간. 예: 300"
        />
      )}

      <TextField
        label="지식베이스 갱신 주기 (선택)"
        value={ops.process?.kbUpdateCycle ?? ""}
        onChange={(v) =>
          update("ops", { process: { ...ops.process, kbUpdateCycle: v || undefined } })
        }
        placeholder="예: 분기 1회"
      />
      <TextField
        label="운영 담당 (선택)"
        value={ops.process?.owner ?? ""}
        onChange={(v) => update("ops", { process: { ...ops.process, owner: v || undefined } })}
      />
    </div>
  );
}

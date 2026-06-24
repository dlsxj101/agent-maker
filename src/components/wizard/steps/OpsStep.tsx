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
        info="대화 이력을 보관해 공공기관 감사·분쟁·민원 대응에 활용한다."
      />
      <NumberField
        label="로그 보관 기간(일)"
        value={ops.logRetentionDays}
        onChange={(v) => update("ops", { logRetentionDays: v })}
        hint="대화/감사 로그 보관 주기(공공 기록물 관리). 개인정보 보관 기간과 별개."
        info="감사 로그를 보관하는 일수. 공공기록물 관리법 기준과 맞춰 설정한다."
      />

      <Field label="백업 / 재해복구(DR)" info="장애·재난 시 데이터를 복구할 수 있도록 백업 주기와 복구 절차를 설정한다.">
        <div className="space-y-2">
          <ToggleField
            label="백업 사용"
            checked={ops.backup.enabled}
            onChange={(v) => update("ops", { backup: { ...ops.backup, enabled: v } })}
            info="정기 백업을 활성화해 장애 시 데이터 복구가 가능하도록 한다."
          />
          {ops.backup.enabled && (
            <TextField
              label="백업 주기"
              value={ops.backup.cycle ?? ""}
              onChange={(v) => update("ops", { backup: { ...ops.backup, cycle: v || undefined } })}
              placeholder="예: 매일 02:00 / 주 1회"
              info="백업을 실행하는 주기. 업무 영향을 최소화하도록 새벽 시간대를 권장한다."
            />
          )}
        </div>
      </Field>

      <Field label="관측(Observability)" info="토큰 사용량·응답 지연·에러율 등을 모니터링해 운영 품질을 관리한다.">
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
            info="수집할 운영 지표. 토큰은 비용, 지연은 성능, 에러율은 안정성 파악에 쓰인다."
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
            info="운영자가 실시간 현황을 한눈에 볼 수 있는 관리 화면을 챗봇에 포함한다."
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
            info="사용 패턴을 분석할 도구. 폐쇄망이면 자체 호스팅 또는 없음을 선택한다."
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
        info="반복되는 요청의 결과를 재사용해 응답 속도를 높이고 LLM 비용을 줄인다."
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
        info="RAG 지식베이스를 얼마나 자주 최신 문서로 갱신할지 주기를 입력한다."
      />
      <TextField
        label="운영 담당 (선택)"
        value={ops.process?.owner ?? ""}
        onChange={(v) => update("ops", { process: { ...ops.process, owner: v || undefined } })}
        info="챗봇 운영을 책임지는 담당자·부서. 산출물 운영 매뉴얼에 기재된다."
      />
    </div>
  );
}

"use client";

import { useWizardStore } from "@/lib/store";
import { API_AUTH_MODES, WEBHOOK_CHANNELS } from "@/lib/agent-spec";
import { ChipMulti, Field } from "../controls";

const API_AUTH_LABELS: Record<string, string> = {
  none: "없음",
  "api-key": "API Key",
  oauth: "OAuth",
  gpki: "GPKI",
};

export function IntegrationsStep() {
  const integ = useWizardStore((s) => s.spec.integrations);
  const update = useWizardStore((s) => s.updateSection);
  const { apis, tools } = integ;

  return (
    <div className="space-y-6">
      <Field label="외부/내부 API 연동" info="챗봇이 호출할 외부 또는 내부망 API를 등록하고 인증 방식을 지정한다.">
        <div className="space-y-2">
          {apis.map((api, i) => (
            <div key={i} className="flex gap-2">
              <input
                className="input"
                value={api.name}
                placeholder="API 이름 (예: 민원 시스템)"
                onChange={(e) => update("integrations", { apis: apis.map((a, j) => (j === i ? { ...a, name: e.target.value } : a)) })}
              />
              <select
                className="input max-w-[120px]"
                value={api.auth}
                onChange={(e) =>
                  update("integrations", {
                    apis: apis.map((a, j) => (j === i ? { ...a, auth: e.target.value as (typeof API_AUTH_MODES)[number] } : a)),
                  })
                }
              >
                {API_AUTH_MODES.map((m) => (
                  <option key={m} value={m}>
                    {API_AUTH_LABELS[m] ?? m}
                  </option>
                ))}
              </select>
              <button
                type="button"
                aria-label="삭제"
                className="shrink-0 rounded-md border border-border px-3 text-sm text-muted"
                onClick={() => update("integrations", { apis: apis.filter((_, j) => j !== i) })}
              >
                ✕
              </button>
            </div>
          ))}
          <button
            type="button"
            className="rounded-md border border-dashed border-border px-3 py-1.5 text-sm text-muted"
            onClick={() => update("integrations", { apis: [...apis, { name: "", auth: "none" }] })}
          >
            + API 추가
          </button>
        </div>
      </Field>

      <Field label="도구 사용(tool use / function calling)" hint="챗봇이 호출할 액션" info="챗봇이 외부 기능·API를 직접 실행하는 동작을 정의한다. 각 도구는 이름과 설명이 필요하다.">
        <div className="space-y-2">
          {tools.map((tool, i) => (
            <div key={i} className="flex gap-2">
              <input
                className="input"
                value={tool.name}
                placeholder="도구 이름"
                onChange={(e) => update("integrations", { tools: tools.map((t, j) => (j === i ? { ...t, name: e.target.value } : t)) })}
              />
              <input
                className="input"
                value={tool.description}
                placeholder="설명"
                onChange={(e) => update("integrations", { tools: tools.map((t, j) => (j === i ? { ...t, description: e.target.value } : t)) })}
              />
              <button
                type="button"
                aria-label="삭제"
                className="shrink-0 rounded-md border border-border px-3 text-sm text-muted"
                onClick={() => update("integrations", { tools: tools.filter((_, j) => j !== i) })}
              >
                ✕
              </button>
            </div>
          ))}
          <button
            type="button"
            className="rounded-md border border-dashed border-border px-3 py-1.5 text-sm text-muted"
            onClick={() => update("integrations", { tools: [...tools, { name: "", description: "" }] })}
          >
            + 도구 추가
          </button>
        </div>
      </Field>

      <ChipMulti
        label="웹훅/알림"
        value={integ.webhooks}
        onChange={(v) => update("integrations", { webhooks: v as typeof integ.webhooks })}
        options={WEBHOOK_CHANNELS.map((w) => [w, w === "none" ? "없음" : w === "email" ? "이메일" : "문자(SMS)"])}
        info="특정 이벤트 발생 시 이메일·문자로 외부에 자동 알림을 보낸다."
      />
    </div>
  );
}

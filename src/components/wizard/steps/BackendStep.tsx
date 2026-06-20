"use client";

import { useWizardStore } from "@/lib/store";
import { BACKEND_RUNTIMES, AUTH_MODES, DEPLOY_FORMS, NETWORK_MODES } from "@/lib/agent-spec";
import { FRAMEWORKS_BY_RUNTIME } from "@/catalog";
import { label } from "@/generators/format";
import { SelectField, ToggleField, TextField } from "../controls";

export function BackendStep() {
  const be = useWizardStore((s) => s.spec.backend);
  const update = useWizardStore((s) => s.updateSection);
  const frameworks = FRAMEWORKS_BY_RUNTIME[be.runtime];

  return (
    <div className="space-y-5">
      <SelectField
        label="런타임"
        value={be.runtime}
        onChange={(v) => {
          const rt = v as (typeof BACKEND_RUNTIMES)[number];
          update("backend", { runtime: rt, framework: FRAMEWORKS_BY_RUNTIME[rt][0]?.id });
        }}
        options={BACKEND_RUNTIMES.map((r) => [r, label("runtime", r)])}
      />
      {frameworks.length > 0 && (
        <SelectField
          label="프레임워크"
          value={be.framework ?? frameworks[0].id}
          onChange={(v) => update("backend", { framework: v })}
          options={frameworks.map((f) => [f.id, f.label])}
        />
      )}
      <SelectField
        label="인증/인가"
        value={be.auth}
        onChange={(v) => update("backend", { auth: v as (typeof AUTH_MODES)[number] })}
        options={AUTH_MODES.map((a) => [a, label("auth", a)])}
      />
      <SelectField
        label="배포 형태"
        value={be.deploy}
        onChange={(v) => update("backend", { deploy: v as (typeof DEPLOY_FORMS)[number] })}
        options={DEPLOY_FORMS.map((d) => [d, label("deploy", d)])}
      />
      <SelectField
        label="네트워크(외부 호출)"
        value={be.network}
        onChange={(v) => update("backend", { network: v as (typeof NETWORK_MODES)[number] })}
        options={NETWORK_MODES.map((n) => [n, label("network", n)])}
      />
      <ToggleField
        label="감사 로그(공공기관 대응)"
        checked={be.logging.audit}
        onChange={(v) => update("backend", { logging: { ...be.logging, audit: v } })}
      />
      <TextField
        label="모니터링 (선택)"
        value={be.logging.monitoring ?? ""}
        onChange={(v) => update("backend", { logging: { ...be.logging, monitoring: v || undefined } })}
        placeholder="예: prometheus"
      />
    </div>
  );
}

"use client";

import { useWizardStore } from "@/lib/store";
import { FRONTEND_FRAMEWORKS, EMBED_MODES, A11Y_LEVELS } from "@/lib/agent-spec";
import { label } from "@/generators/format";
import { SelectField, ToggleField, TextField } from "../controls";

export function FrontendStep() {
  const fe = useWizardStore((s) => s.spec.frontend);
  const update = useWizardStore((s) => s.updateSection);
  return (
    <div className="space-y-5">
      <SelectField
        label="프레임워크"
        value={fe.framework}
        onChange={(v) => update("frontend", { framework: v as (typeof FRONTEND_FRAMEWORKS)[number] })}
        options={FRONTEND_FRAMEWORKS.map((f) => [f, label("framework", f)])}
      />
      <SelectField
        label="임베드 방식"
        value={fe.embed}
        onChange={(v) => update("frontend", { embed: v as (typeof EMBED_MODES)[number] })}
        options={EMBED_MODES.map((e) => [e, label("embed", e)])}
      />
      <SelectField
        label="웹 접근성(KWCAG)"
        value={fe.a11yLevel}
        onChange={(v) => update("frontend", { a11yLevel: v as (typeof A11Y_LEVELS)[number] })}
        options={A11Y_LEVELS.map((a) => [a, label("a11yLevel", a)])}
        hint="컴플라이언스 단계의 접근성 등급과 일치시키세요."
      />
      <TextField
        label="UI 라이브러리 (선택)"
        value={fe.uiLib ?? ""}
        onChange={(v) => update("frontend", { uiLib: v || undefined })}
        placeholder="예: shadcn, mui, none"
      />
      <ToggleField
        label="반응형/모바일 지원"
        checked={fe.responsive}
        onChange={(v) => update("frontend", { responsive: v })}
      />
    </div>
  );
}

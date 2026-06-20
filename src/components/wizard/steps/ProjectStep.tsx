"use client";

/**
 * Step 0 — 기관/프로젝트 기본 정보. M3 기본 입력(텍스트/셀렉트/체크박스).
 * 시각적 카드 UI 고도화는 M4. 모든 값은 store 의 project 섹션에 즉시 반영된다.
 */

import { useWizardStore } from "@/lib/store";
import { DEPLOY_ENVS, PURPOSES } from "@/lib/agent-spec";
import { label } from "@/generators/format";

export function ProjectStep() {
  const project = useWizardStore((s) => s.spec.project);
  const update = useWizardStore((s) => s.updateSection);

  const togglePurpose = (p: (typeof PURPOSES)[number]) => {
    const has = project.purpose.includes(p);
    update("project", {
      purpose: has ? project.purpose.filter((x) => x !== p) : [...project.purpose, p],
    });
  };

  return (
    <div className="space-y-5">
      <Field label="기관명" required>
        <input
          className="input"
          value={project.org}
          onChange={(e) => update("project", { org: e.target.value })}
          placeholder="예: OO광역시"
        />
      </Field>
      <Field label="부서">
        <input
          className="input"
          value={project.dept ?? ""}
          onChange={(e) => update("project", { dept: e.target.value })}
          placeholder="예: 민원봉사과"
        />
      </Field>
      <Field label="챗봇 명칭" required>
        <input
          className="input"
          value={project.name}
          onChange={(e) => update("project", { name: e.target.value })}
          placeholder="예: OO시 민원봇"
        />
      </Field>
      <Field label="배포 환경">
        <select
          className="input"
          value={project.deployEnv}
          onChange={(e) =>
            update("project", { deployEnv: e.target.value as (typeof DEPLOY_ENVS)[number] })
          }
        >
          {DEPLOY_ENVS.map((d) => (
            <option key={d} value={d}>
              {label("deployEnv", d)}
            </option>
          ))}
        </select>
      </Field>
      <Field label="용도 (복수 선택)">
        <div className="flex flex-wrap gap-2">
          {PURPOSES.map((p) => {
            const active = project.purpose.includes(p);
            return (
              <button
                key={p}
                type="button"
                aria-pressed={active}
                onClick={() => togglePurpose(p)}
                className={`rounded-full border px-3 py-1 text-sm transition ${
                  active
                    ? "border-primary bg-primary text-primary-foreground"
                    : "border-border bg-surface text-muted hover:border-primary"
                }`}
              >
                {label("purpose", p)}
              </button>
            );
          })}
        </div>
      </Field>
    </div>
  );
}

function Field({
  label: lbl,
  required,
  children,
}: {
  label: string;
  required?: boolean;
  children: React.ReactNode;
}) {
  return (
    <label className="block">
      <span className="mb-1.5 block text-sm font-medium">
        {lbl}
        {required && <span className="ml-1 text-red-500">*</span>}
      </span>
      {children}
    </label>
  );
}

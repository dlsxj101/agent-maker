"use client";

/**
 * 좌측 진행 스텝퍼. mono 인덱스 + 활성 좌측 액센트 바, 단계별 충돌/누락 상태 점.
 */

import { useWizardStore } from "@/lib/store";
import { WIZARD_STEPS } from "@/catalog";
import { detectConflicts } from "@/lib/conflicts";
import { getMissingRequired } from "@/lib/readiness";

export function Stepper() {
  const stepIndex = useWizardStore((s) => s.stepIndex);
  const setStep = useWizardStore((s) => s.setStep);
  const spec = useWizardStore((s) => s.spec);

  const conflictSections = new Set(detectConflicts(spec).map((c) => c.section));
  const missingSections = new Set(getMissingRequired(spec).map((m) => m.section));

  return (
    <nav aria-label="마법사 단계">
      <p className="eyebrow mb-3 px-2">steps</p>
      <ol>
        {WIZARD_STEPS.map((step, i) => {
          const active = i === stepIndex;
          const hasConflict = conflictSections.has(step.id);
          const hasMissing = missingSections.has(step.id);
          return (
            <li key={step.id}>
              <button
                type="button"
                onClick={() => setStep(i)}
                aria-current={active ? "step" : undefined}
                className={`flex w-full items-center gap-2.5 rounded-token border-l-2 py-1.5 pl-2.5 pr-2 text-left text-[13px] transition duration-150 ${
                  active
                    ? "border-[var(--accent)] bg-[var(--accent-weak)] font-medium text-foreground"
                    : "border-transparent text-muted hover:bg-surface-2 hover:text-foreground motion-safe:hover:pl-3"
                }`}
                style={{ borderRadius: "0 var(--radius) var(--radius) 0" }}
              >
                <span
                  className={`mono w-5 shrink-0 text-[11px] tabular-nums ${
                    active ? "text-primary" : "text-muted/70"
                  }`}
                >
                  {String(i).padStart(2, "0")}
                </span>
                <span className="flex-1 truncate">{step.title}</span>
                {hasMissing ? (
                  <span
                    title="필수 입력 누락"
                    aria-label="필수 입력 누락"
                    className="h-1.5 w-1.5 rounded-full"
                    style={{ background: "var(--danger)" }}
                  />
                ) : hasConflict ? (
                  <span
                    title="충돌 경고"
                    aria-label="충돌 경고"
                    className="h-1.5 w-1.5 rounded-full"
                    style={{ background: "var(--warn)" }}
                  />
                ) : null}
              </button>
            </li>
          );
        })}
      </ol>
    </nav>
  );
}

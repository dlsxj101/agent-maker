"use client";

/**
 * 좌측 진행 스텝퍼. 현재 단계 표시 + 클릭 이동. 단계별 충돌/누락 배지를 함께 보여준다.
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
    <nav aria-label="마법사 단계" className="space-y-1">
      <ol className="space-y-1">
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
                className={`flex w-full items-center gap-3 rounded-md px-3 py-2 text-left text-sm transition ${
                  active ? "bg-primary text-primary-foreground" : "text-muted hover:bg-surface"
                }`}
              >
                <span
                  className={`flex h-6 w-6 shrink-0 items-center justify-center rounded-full text-xs font-semibold ${
                    active ? "bg-primary-foreground text-primary" : "bg-surface text-muted"
                  }`}
                >
                  {i}
                </span>
                <span className="flex-1 truncate">{step.title}</span>
                {hasMissing && (
                  <span title="필수 입력 누락" className="text-red-500" aria-label="필수 입력 누락">
                    ●
                  </span>
                )}
                {!hasMissing && hasConflict && (
                  <span title="충돌 경고" className="text-amber-500" aria-label="충돌 경고">
                    ▲
                  </span>
                )}
              </button>
            </li>
          );
        })}
      </ol>
    </nav>
  );
}

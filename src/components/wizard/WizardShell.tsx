"use client";

/**
 * 마법사 셸 — 좌(스텝퍼) / 중(현재 스텝 폼) / 우(미리보기) 3단 레이아웃. (PLAN.md §7)
 * 이전/다음 내비게이션 + localStorage 자동 저장(persist). 상태는 Zustand store.
 *
 * 하이드레이션: persist 는 클라이언트에서 localStorage 를 읽으므로, 마운트 전에는
 * 기본값으로 렌더해 SSR↔클라이언트 불일치를 피한다(마운트 후 실제 상태 표시).
 */

import { useSyncExternalStore } from "react";
import { useWizardStore } from "@/lib/store";
import { WIZARD_STEPS } from "@/catalog";
import { Stepper } from "./Stepper";
import { StepContent } from "./StepContent";
import { PreviewPanel } from "./PreviewPanel";

/** 클라이언트 마운트(하이드레이션) 여부 — 서버=false, 클라이언트=true. persist 복원 전 깜빡임 방지. */
function useHydrated(): boolean {
  return useSyncExternalStore(
    () => () => {},
    () => true,
    () => false,
  );
}

export function WizardShell() {
  const mounted = useHydrated();

  const stepIndex = useWizardStore((s) => s.stepIndex);
  const next = useWizardStore((s) => s.next);
  const prev = useWizardStore((s) => s.prev);
  const reset = useWizardStore((s) => s.reset);

  if (!mounted) {
    return <div className="p-8 text-sm text-muted">마법사를 불러오는 중…</div>;
  }

  const step = WIZARD_STEPS[stepIndex];
  const isFirst = stepIndex === 0;
  const isLast = stepIndex === WIZARD_STEPS.length - 1;

  return (
    <div className="mx-auto grid max-w-6xl grid-cols-1 gap-6 px-4 py-8 lg:grid-cols-[220px_1fr_300px]">
      {/* 좌: 스텝퍼 */}
      <aside className="lg:sticky lg:top-8 lg:self-start">
        <Stepper />
      </aside>

      {/* 중: 현재 스텝 */}
      <section aria-labelledby="step-title">
        <header className="mb-5">
          <p className="text-xs font-medium text-muted">
            단계 {stepIndex} / {WIZARD_STEPS.length - 1}
          </p>
          <h1 id="step-title" className="text-2xl font-bold">
            {step.title}
          </h1>
          <p className="mt-1 text-sm text-muted">{step.summary}</p>
        </header>

        <StepContent stepIndex={stepIndex} />

        <div className="mt-8 flex items-center justify-between border-t border-border pt-4">
          <button
            type="button"
            onClick={prev}
            disabled={isFirst}
            className="rounded-md border border-border px-4 py-2 text-sm font-medium disabled:opacity-40"
          >
            이전
          </button>
          <span className="text-xs text-muted" aria-live="polite">
            변경사항은 자동 저장됩니다
          </span>
          {isLast ? (
            <button
              type="button"
              onClick={reset}
              className="rounded-md border border-border px-4 py-2 text-sm font-medium"
            >
              처음부터
            </button>
          ) : (
            <button
              type="button"
              onClick={next}
              className="rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground"
            >
              다음
            </button>
          )}
        </div>
      </section>

      {/* 우: 미리보기 */}
      <aside className="lg:sticky lg:top-8 lg:self-start rounded-lg border border-border bg-surface p-4">
        <PreviewPanel />
      </aside>
    </div>
  );
}

"use client";

/**
 * 마법사 셸 — 좌(스텝퍼) / 중(현재 스텝 폼) / 우(미리보기) 3단 레이아웃. (PLAN.md §7)
 * 이전/다음 내비게이션 + localStorage 자동 저장(persist). 상태는 Zustand store.
 *
 * 하이드레이션: persist 는 클라이언트에서 localStorage 를 읽으므로, 마운트 전에는
 * 기본값으로 렌더해 SSR↔클라이언트 불일치를 피한다(마운트 후 실제 상태 표시).
 */

import Link from "next/link";
import { useWizardStore } from "@/lib/store";
import { WIZARD_STEPS } from "@/catalog";
import { Stepper } from "./Stepper";
import { StepContent } from "./StepContent";
import { PreviewPanel } from "./PreviewPanel";
import { useHydrated } from "./useHydrated";

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

  const btn =
    "rounded-token border border-border px-4 py-2 text-sm font-medium transition duration-150 hover:border-primary hover:text-foreground motion-safe:active:scale-[.98]";
  const btnPrimary =
    "rounded-token bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground transition duration-150 hover:bg-[var(--accent-strong)] hover:shadow-md motion-safe:hover:-translate-y-0.5 motion-safe:active:translate-y-0";

  return (
    <div className="mx-auto grid max-w-6xl grid-cols-1 gap-8 px-4 py-8 lg:grid-cols-[208px_1fr_300px]">
      {/* 좌: 스텝퍼 */}
      <aside className="lg:sticky lg:top-16 lg:self-start">
        <Stepper />
      </aside>

      {/* 중: 현재 스텝 */}
      <section aria-labelledby="step-title" className="min-w-0">
        {/* key 로 스텝 전환마다 헤더+폼에 진입 애니메이션 재생 (step-enter) */}
        <div key={stepIndex} className="step-enter">
          <header className="mb-6 border-b border-hairline pb-4">
            <p className="eyebrow">
              step {String(stepIndex).padStart(2, "0")} / {String(WIZARD_STEPS.length - 1).padStart(2, "0")}
            </p>
            <h1 id="step-title" className="mt-2 text-xl font-semibold tracking-tight">
              {step.title}
            </h1>
            <p className="mt-1 text-[13px] text-muted">{step.summary}</p>
          </header>

          <StepContent stepIndex={stepIndex} />
        </div>

        <div className="mt-8 flex items-center justify-between border-t border-hairline pt-4">
          <button type="button" onClick={prev} disabled={isFirst} className={`${btn} disabled:opacity-40`} style={{ borderRadius: "var(--radius)" }}>
            이전
          </button>
          <span className="flex items-center gap-3 text-xs text-muted" aria-live="polite">
            <span className="mono text-[var(--accent)]">●</span> 자동 저장됨
            <button type="button" onClick={reset} className="underline underline-offset-2 hover:text-foreground">
              초기화
            </button>
          </span>
          {isLast ? (
            <Link href="/wizard/review" className={btnPrimary} style={{ borderRadius: "var(--radius)" }}>
              검토 &amp; 내보내기 →
            </Link>
          ) : (
            <button type="button" onClick={next} className={btnPrimary} style={{ borderRadius: "var(--radius)" }}>
              다음
            </button>
          )}
        </div>
      </section>

      {/* 우: 미리보기 */}
      <aside
        className="rounded-lg border border-border bg-surface p-4 lg:sticky lg:top-16 lg:self-start"
      >
        <PreviewPanel />
      </aside>
    </div>
  );
}

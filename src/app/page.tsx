import Link from "next/link";
import { WIZARD_STEPS } from "@/catalog/steps";

/**
 * 랜딩 페이지. 프로젝트 개요 + 단계 목록 + 마법사 진입.
 * 로드맵: PLAN.md §8
 */
export default function Home() {
  return (
    <main className="mx-auto max-w-3xl px-6 py-16">
      <span className="inline-block rounded-full border border-border bg-surface px-3 py-1 text-xs font-medium text-muted">
        마법사 셸 · 상태 단계 (M3) · 시각적 선택 UI 확장 예정
      </span>

      <h1 className="mt-6 text-4xl font-bold tracking-tight">agent-maker</h1>
      <p className="mt-4 text-lg text-muted">
        공공기관 납품용 <strong className="text-foreground">챗봇 에이전트 구성 마법사</strong>.
        테마·스택·RAG·LLM·API·컴플라이언스를 보면서 선택하면, Claude Code가 한 번에 챗봇을
        구현할 수 있는 산출물 묶음(ZIP)을 만들어 줍니다.
      </p>

      <Link
        href="/wizard"
        className="mt-8 inline-block rounded-lg bg-primary px-6 py-3 text-sm font-semibold text-primary-foreground"
      >
        마법사 시작하기 →
      </Link>

      <section className="mt-12">
        <h2 className="text-sm font-semibold uppercase tracking-wider text-muted">
          마법사 단계
        </h2>
        <ol className="mt-4 space-y-3">
          {WIZARD_STEPS.map((step, i) => (
            <li
              key={step.id}
              className="flex items-start gap-4 rounded-lg border border-border bg-surface p-4"
            >
              <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-primary text-sm font-semibold text-primary-foreground">
                {i}
              </span>
              <div>
                <h3 className="font-medium">{step.title}</h3>
                <p className="text-sm text-muted">{step.summary}</p>
              </div>
            </li>
          ))}
        </ol>
      </section>

      <footer className="mt-12 border-t border-border pt-6 text-sm text-muted">
        설계·로드맵은 저장소의 <code>PLAN.md</code> 를, 작업 지침은 <code>CLAUDE.md</code> 를
        참고하세요.
      </footer>
    </main>
  );
}

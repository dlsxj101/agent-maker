import Link from "next/link";
import { WIZARD_STEPS } from "@/catalog/steps";

/**
 * 랜딩. thesis(결정 → 기계가 읽는 정본 산출물) + 12단계 시퀀스 + 진입.
 * 디자인: 절제된 개발자 도구형 (docs/app-design.md).
 */
export default function Home() {
  return (
    <main className="mx-auto max-w-6xl px-4">
      {/* 히어로 */}
      <section className="grid grid-cols-1 gap-10 py-14 lg:grid-cols-[1.1fr_1fr] lg:py-20">
        <div>
          <p className="eyebrow">spec · design · prompt</p>
          <h1 className="mt-4 text-4xl font-bold leading-[1.12] tracking-tight sm:text-5xl">
            챗봇을 만들지 않습니다.
            <br />
            챗봇의 <span className="text-primary">설계도</span>를 만듭니다.
          </h1>
          <p className="mt-5 max-w-md text-[15px] leading-relaxed text-muted">
            공공기관 챗봇에 필요한 결정 — 테마·스택·RAG·LLM·컴플라이언스 — 을 보면서 고르면,
            Claude Code가 한 방에 구현할 수 있는 <span className="text-foreground">정본 산출물(ZIP)</span>로
            내보냅니다. 폐쇄망·접근성·국내 보관 제약을 처음부터 반영합니다.
          </p>
          <div className="mt-7 flex items-center gap-3">
            <Link
              href="/wizard"
              className="rounded-token bg-primary px-5 py-2.5 text-sm font-semibold text-primary-foreground transition hover:bg-[var(--accent-strong)]"
              style={{ borderRadius: "var(--radius)" }}
            >
              구성 시작 →
            </Link>
            <span className="text-xs text-muted">12단계 · 브라우저에서 ZIP 생성 · 서버 불필요</span>
          </div>
        </div>

        {/* 산출물 spec-peek (특징적 아티팩트) */}
        <SpecPeek />
      </section>

      {/* 12 결정 시퀀스 */}
      <section className="border-t border-hairline py-12">
        <div className="flex items-baseline justify-between">
          <h2 className="text-sm font-semibold">무엇을 결정하나</h2>
          <span className="eyebrow">12 steps</span>
        </div>
        <ol className="mt-6 grid grid-cols-1 gap-x-10 gap-y-px sm:grid-cols-2">
          {WIZARD_STEPS.map((step, i) => (
            <li
              key={step.id}
              className="flex items-start gap-4 border-b border-hairline py-3.5"
            >
              <span className="mono mt-0.5 text-xs text-primary tabular-nums">
                {String(i).padStart(2, "0")}
              </span>
              <div>
                <h3 className="text-[13.5px] font-medium">{step.title}</h3>
                <p className="mt-0.5 text-xs leading-relaxed text-muted">{step.summary}</p>
              </div>
            </li>
          ))}
        </ol>
      </section>

      <footer className="border-t border-hairline py-8 text-xs text-muted">
        설계·로드맵은 <code className="mono">PLAN.md</code>, 앱 디자인은{" "}
        <code className="mono">docs/app-design.md</code> 참고.
      </footer>
    </main>
  );
}

/** 산출물 미리보기 카드 — 에디터/터미널 느낌의 mono spec-peek */
function SpecPeek() {
  return (
    <div className="overflow-hidden rounded-lg border border-border bg-surface shadow-[0_1px_2px_rgba(0,0,0,0.04)]">
      <div className="flex items-center gap-2 border-b border-hairline bg-surface-2 px-3 py-2">
        <span className="flex gap-1.5" aria-hidden>
          <span className="h-2.5 w-2.5 rounded-full bg-border" />
          <span className="h-2.5 w-2.5 rounded-full bg-border" />
          <span className="h-2.5 w-2.5 rounded-full bg-border" />
        </span>
        <span className="mono text-xs text-muted">agent-spec.json</span>
      </div>
      <pre className="mono overflow-x-auto px-4 py-3.5 text-[12px] leading-[1.7] text-foreground">
        <code>{`{
  "project":  { "org": "OO광역시", "deployEnv": "gov-cloud" },
  "design":   { "theme": "gov-blue", "layout": "floating-widget" },
  "rag":      { "embedding": "bge-m3", "vectorDb": "pgvector" },
  "llm":      { "provider": "claude", "model": "sonnet-4-6" },
  "compliance": { "a11y": "kwcag-aa", "dataResidencyKR": true }
}`}</code>
      </pre>
      <div className="flex flex-wrap items-center gap-1.5 border-t border-hairline bg-surface-2 px-4 py-2.5 text-[11px] text-muted">
        <span className="mono text-primary">출력 →</span>
        {["PROMPT.md", "DESIGN.md", "CLAUDE.md", "scaffolding/", "tests/"].map((f) => (
          <span key={f} className="mono rounded-[4px] border border-border px-1.5 py-0.5">
            {f}
          </span>
        ))}
      </div>
    </div>
  );
}

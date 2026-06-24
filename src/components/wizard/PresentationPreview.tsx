"use client";

/**
 * UI 연출 라이브 프리뷰 — presentation 선택을 실제 움직이는 데모로 보여준다.
 * 스트리밍 글자생성(타자기/단어페이드/블러/슬라이드) · 커서 · 도구호출 UI/애니메이션 ·
 * 메시지 등장 모션 · 페이싱을 선택값대로 재생한다. ↻ 재생 버튼으로 반복.
 * prefers-reduced-motion 이면 애니메이션 없이 최종 상태를 즉시 표시. (PLAN.md §4 Step 9)
 */

import { useEffect, useState, useSyncExternalStore } from "react";
import { useWizardStore } from "@/lib/store";
import { PACING_MS } from "@/catalog/presentation";

/** prefers-reduced-motion 구독 — effect 내 setState 없이 외부 스토어로 읽는다. */
function usePrefersReducedMotion() {
  return useSyncExternalStore(
    (cb) => {
      const mq = window.matchMedia("(prefers-reduced-motion: reduce)");
      mq.addEventListener("change", cb);
      return () => mq.removeEventListener("change", cb);
    },
    () => window.matchMedia("(prefers-reduced-motion: reduce)").matches,
    () => false,
  );
}

const USER = "주민등록등본 발급 방법 알려주세요";
const ANSWER =
  "주민등록등본은 정부24 또는 가까운 행정복지센터에서 발급할 수 있습니다. 온라인 발급에는 공동인증서가 필요합니다.";
const STEPS = [
  { tool: "search_documents", arg: '"주민등록등본"', result: "민원편람.pdf 3건" },
  { tool: "get_office_hours", arg: "{}", result: "평일 09–18시" },
];
const PER_CHAR: Record<string, number> = { slow: 55, normal: 28, fast: 13, instant: 0 };
const TOK_KEYFRAME: Record<string, string> = {
  "fade-in-words": "tok-fade",
  "blur-in": "tok-blur",
  "slide-up": "tok-slide",
};
const ENTRANCE_KEYFRAME: Record<string, string> = {
  fade: "am-fade-in",
  "fade-up": "am-fade-up",
  pop: "am-pop-in",
  slide: "am-slide-in",
};

export function PresentationPreview() {
  const p = useWizardStore((s) => s.spec.presentation);
  const it = useWizardStore((s) => s.spec.interaction);
  const colors = useWizardStore((s) => s.spec.design.colors);

  const reduce = usePrefersReducedMotion();
  const [run, setRun] = useState(0);
  const [phase, setPhase] = useState<"user" | "tools" | "answer" | "done">("user");
  const [trace, setTrace] = useState(0);
  const [units, setUnits] = useState(0); // 스트리밍으로 드러난 글자/단어 수

  const isAgent = it.agentMode === "tool-agent" && it.rendering.toolCallDisplay !== "hidden";
  const wordMode = p.stream.animation !== "typewriter" && p.stream.animation !== "none";
  const streaming = it.streaming.enabled && it.streaming.speed !== "instant" && p.stream.animation !== "none";
  const pacingMs = PACING_MS[p.motion.pacing] ?? 260;
  const words = ANSWER.split(/(\s+)/); // 공백 보존
  const totalUnits = wordMode ? words.length : ANSWER.length;

  useEffect(() => {
    const timers: ReturnType<typeof setTimeout>[] = [];
    const at = (ms: number, fn: () => void) => timers.push(setTimeout(fn, ms));

    at(0, () => {
      setTrace(0);
      setUnits(0);
      setPhase("user");
    });

    if (reduce) {
      at(0, () => {
        setTrace(STEPS.length);
        setUnits(totalUnits);
        setPhase("done");
      });
      return () => timers.forEach(clearTimeout);
    }

    let t = 350;
    if (isAgent) {
      at(t, () => setPhase("tools"));
      STEPS.forEach((_, i) => {
        t += 600;
        at(t, () => setTrace(i + 1));
      });
      t += 350;
    }
    at(t, () => setPhase("answer"));
    if (streaming) {
      const per = wordMode ? Math.max(70, (PER_CHAR[it.streaming.speed] ?? 28) * 3) : PER_CHAR[it.streaming.speed] ?? 28;
      for (let i = 1; i <= totalUnits; i++) {
        t += per;
        at(t, () => setUnits(i));
      }
    } else {
      at(t, () => setUnits(totalUnits));
    }
    t += 300;
    at(t, () => setPhase("done"));

    return () => timers.forEach(clearTimeout);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [run, reduce, p.stream.animation, p.motion.pacing, it.agentMode, it.streaming.enabled, it.streaming.speed, it.rendering.toolCallDisplay]);

  const entranceName = reduce ? "" : ENTRANCE_KEYFRAME[p.motion.messageEntrance] ?? "";
  const entrance = (delay = 0): React.CSSProperties =>
    entranceName
      ? { animation: `${entranceName} ${pacingMs || 1}ms cubic-bezier(.22,1,.36,1) ${delay}ms both` }
      : {};

  return (
    <div className="rounded-lg border border-border bg-surface">
      <div className="flex items-center justify-between border-b border-hairline bg-surface-2 px-3 py-2">
        <span className="eyebrow">live · {p.stream.animation} · {p.toolCall.ui}</span>
        <button
          type="button"
          onClick={() => setRun((r) => r + 1)}
          className="mono rounded-[4px] border border-border px-2 py-0.5 text-[11px] text-muted transition hover:border-primary hover:text-foreground"
        >
          ↻ 재생
        </button>
      </div>

      <div className="space-y-2.5 p-4">
        {/* 사용자 */}
        <div className="flex justify-end">
          <div
            className="max-w-[80%] rounded-xl px-3 py-1.5 text-[13px]"
            style={{ background: colors.primary, color: "#fff", ...entrance() }}
          >
            {USER}
          </div>
        </div>

        {/* 도구 호출 UI */}
        {isAgent && trace > 0 && (
          <div style={entrance()}>
            <ToolCallView
              ui={p.toolCall.ui}
              anim={p.toolCall.animation}
              showArgs={p.toolCall.showArgs}
              showResult={p.toolCall.showResult}
              trace={trace}
              active={phase === "tools"}
              colors={colors}
              pacingMs={pacingMs}
            />
          </div>
        )}

        {/* 봇 답변 (스트리밍) */}
        {(phase === "answer" || phase === "done") && (
          <div className="flex justify-start">
            <div
              className="max-w-[88%] rounded-xl border px-3 py-2 text-[13px] leading-relaxed"
              style={{ background: colors.background, borderColor: colors.border, color: colors.text, ...entrance() }}
            >
              <StreamingText
                animation={p.stream.animation}
                cursorStyle={p.stream.cursor}
                wordMode={wordMode}
                words={words}
                full={ANSWER}
                units={units}
                total={totalUnits}
                pacingMs={pacingMs}
                done={phase === "done"}
                streaming={streaming}
              />
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

/* ----------------------------- 스트리밍 텍스트 ----------------------------- */

function StreamingText(props: {
  animation: string;
  cursorStyle: string;
  wordMode: boolean;
  words: string[];
  full: string;
  units: number;
  total: number;
  pacingMs: number;
  done: boolean;
  streaming: boolean;
}) {
  const typing = props.streaming && props.units < props.total;
  const showCaret = typing && props.cursorStyle !== "none";

  let body: React.ReactNode;
  if (!props.wordMode) {
    // 타자기 / 즉시 — 부분 문자열
    body = props.full.slice(0, props.streaming ? props.units : props.total);
  } else {
    // 단어 단위 등장 — 새 단어만 애니메이션(키 안정화로 기존 단어는 재생 안 함)
    const kf = TOK_KEYFRAME[props.animation] ?? "tok-fade";
    const shown = props.words.slice(0, props.streaming ? props.units : props.total);
    body = shown.map((w, i) => (
      <span
        key={i}
        className="tok"
        style={{ animationName: kf, ["--tok-dur" as string]: `${props.pacingMs || 1}ms` }}
      >
        {w}
      </span>
    ));
  }

  return (
    <>
      {body}
      {showCaret && <Caret style={props.cursorStyle} />}
    </>
  );
}

function Caret({ style }: { style: string }) {
  if (style === "bar") return <span className="type-caret" aria-hidden />;
  const glyph = style === "block" ? "█" : "_";
  return (
    <span aria-hidden style={{ animation: "am-caret-blink 1s step-end infinite", marginLeft: 1 }}>
      {glyph}
    </span>
  );
}

/* ----------------------------- 도구 호출 UI ----------------------------- */

function ToolCallView(props: {
  ui: string;
  anim: string;
  showArgs: boolean;
  showResult: boolean;
  trace: number;
  active: boolean;
  colors: Record<string, string>;
  pacingMs: number;
}) {
  const { ui, anim, trace, active, colors, pacingMs } = props;
  const shown = STEPS.slice(0, trace);
  const stepAnim = (i: number): React.CSSProperties =>
    anim === "stagger" ? { animation: `am-slide-in ${pacingMs || 1}ms ease ${i * 60}ms both` } : {};

  // 진행 인디케이터(활성 단계)
  const indicator =
    anim === "spinner" ? (
      <span className="am-spinner" style={{ color: colors.accent }} aria-hidden />
    ) : anim === "pulse" ? (
      <span className="animate-pulse" style={{ color: colors.accent }}>
        ●
      </span>
    ) : null;

  const stepText = (s: (typeof STEPS)[number]) =>
    `${s.tool}${props.showArgs ? `(${s.arg})` : "()"}${props.showResult ? ` → ${s.result}` : ""}`;

  if (ui === "inline-status") {
    const cur = STEPS[Math.min(trace - 1, STEPS.length - 1)];
    return (
      <div className="flex items-center gap-2 px-1 text-[12px]" style={{ color: colors.muted }}>
        {active && indicator}
        <span>
          {active ? `🔧 ${cur.tool} 실행 중…` : `🔧 도구 ${trace}회 사용 완료`}
        </span>
        {anim === "progress" && (
          <span className="ml-1 inline-block h-1 w-16 overflow-hidden rounded-full" style={{ background: colors.border }}>
            <span
              className="block h-full rounded-full transition-[width] duration-200"
              style={{ width: `${(trace / STEPS.length) * 100}%`, background: colors.accent }}
            />
          </span>
        )}
      </div>
    );
  }

  if (ui === "chips") {
    return (
      <div className="flex flex-wrap items-center gap-1.5">
        {active && indicator}
        {shown.map((s, i) => (
          <span
            key={i}
            className="mono rounded-full border px-2 py-0.5 text-[11px]"
            style={{ borderColor: colors.border, color: colors.muted, ...stepAnim(i) }}
          >
            🔧 {s.tool}
          </span>
        ))}
      </div>
    );
  }

  if (ui === "terminal") {
    return (
      <div
        className="mono rounded-md px-2.5 py-1.5 text-[11px] leading-relaxed"
        style={{ background: "#0d1117", color: "#c9d1d9", border: `1px solid ${colors.border}` }}
      >
        {shown.map((s, i) => (
          <div key={i} style={stepAnim(i)}>
            <span style={{ color: "#3fb950" }}>$</span> {stepText(s)}
          </div>
        ))}
        {active && <span className="type-caret" style={{ background: "#c9d1d9" }} aria-hidden />}
      </div>
    );
  }

  if (ui === "timeline") {
    return (
      <div className="pl-1">
        {shown.map((s, i) => (
          <div key={i} className="flex gap-2" style={stepAnim(i)}>
            <span className="flex flex-col items-center">
              <span
                className="mt-1 h-2 w-2 rounded-full"
                style={{ background: i === trace - 1 && active ? colors.accent : colors.border }}
              />
              {i < shown.length - 1 && <span className="w-px flex-1" style={{ background: colors.border }} />}
            </span>
            <span className="mono pb-1.5 text-[11px]" style={{ color: colors.muted }}>
              {stepText(s)}
            </span>
          </div>
        ))}
      </div>
    );
  }

  // card (기본) — 접힘 카드
  return (
    <div className="rounded-md border" style={{ borderColor: colors.border, background: colors.surface }}>
      <div className="mono flex items-center gap-2 px-2.5 py-1.5 text-[11px]" style={{ color: colors.muted }}>
        {active ? indicator ?? <span style={{ color: colors.accent }}>⚙</span> : <span style={{ color: colors.accent }}>⚙</span>}
        도구 {trace}회 호출
        {anim === "progress" && (
          <span className="ml-auto inline-block h-1 w-16 overflow-hidden rounded-full" style={{ background: colors.border }}>
            <span
              className="block h-full rounded-full transition-[width] duration-200"
              style={{ width: `${(trace / STEPS.length) * 100}%`, background: colors.accent }}
            />
          </span>
        )}
      </div>
      <div className="space-y-1 border-t px-2.5 py-1.5" style={{ borderColor: colors.border }}>
        {shown.map((s, i) => (
          <div key={i} className="mono text-[11px] leading-relaxed" style={stepAnim(i)}>
            <span style={{ color: colors.accent }}>›</span> {stepText(s)}
          </div>
        ))}
      </div>
    </div>
  );
}

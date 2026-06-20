"use client";

/**
 * 라이브 상호작용 프리뷰 — interaction 선택을 실제로 움직이는 데모로 보여준다.
 * 스트리밍 타이핑 · 도구호출 trace · 인용 칩 · 컨트롤바를 선택값대로 애니메이션한다.
 * prefers-reduced-motion 이면 최종 상태를 즉시 표시. (PLAN.md §4 Step 8)
 *
 * 디자인 토큰(spec.design.colors)을 함께 써서 "동작 + 룩"을 한 번에 보여준다.
 */

import { useEffect, useState } from "react";
import { useWizardStore } from "@/lib/store";

const USER_MSG = "주민등록등본 발급 방법 알려주세요";
const ANSWER =
  "주민등록등본은 정부24 또는 가까운 행정복지센터에서 발급할 수 있습니다. 온라인 발급에는 공동인증서가 필요합니다.";
const TOOL_TRACE = [
  { tool: "search_documents", arg: '"주민등록등본 발급"', result: "민원편람.pdf 3건" },
  { tool: "get_office_hours", arg: "{}", result: "평일 09–18시" },
];
const CITES = ["민원편람.pdf p.12", "정부24 안내"];
const PER_CHAR: Record<string, number> = { slow: 55, normal: 28, fast: 12, instant: 0 };

export function InteractionPreview() {
  const it = useWizardStore((s) => s.spec.interaction);
  const colors = useWizardStore((s) => s.spec.design.colors);
  const [run, setRun] = useState(0);
  const [typed, setTyped] = useState(0);
  const [phase, setPhase] = useState<"user" | "tools" | "thinking" | "answer" | "done">("user");
  const [trace, setTrace] = useState(0);
  const [userToggled, setUserToggled] = useState(false);

  const showTrace = it.agentMode === "tool-agent" && it.rendering.toolCallDisplay !== "hidden";
  const showCites = it.agentMode === "rag-cited" && it.rendering.citationStyle !== "none";
  const streaming = it.streaming.enabled && it.streaming.speed !== "instant";
  // 설정이 expanded 면 펼침, collapsed 면 사용자 토글로. (effect 없이 파생)
  const traceOpen = it.rendering.toolCallDisplay === "expanded" ? !userToggled : userToggled;

  useEffect(() => {
    const reduce =
      typeof window !== "undefined" &&
      window.matchMedia?.("(prefers-reduced-motion: reduce)").matches;
    const timers: ReturnType<typeof setTimeout>[] = [];
    const at = (ms: number, fn: () => void) => timers.push(setTimeout(fn, ms));

    // 초기화 (timeout 콜백으로 — effect 본문 직접 setState 회피)
    at(0, () => {
      setTyped(0);
      setTrace(0);
      setPhase("user");
    });

    if (reduce) {
      at(0, () => {
        setTrace(TOOL_TRACE.length);
        setTyped(ANSWER.length);
        setPhase("done");
      });
      return () => timers.forEach(clearTimeout);
    }

    let t = 300;
    if (showTrace) {
      at(t, () => setPhase("tools"));
      TOOL_TRACE.forEach((_, i) => {
        t += 550;
        at(t, () => setTrace(i + 1));
      });
      t += 400;
    }
    at(t, () => setPhase("thinking"));
    t += 600;
    at(t, () => setPhase("answer"));
    if (streaming) {
      const per = PER_CHAR[it.streaming.speed] ?? 28;
      for (let i = 1; i <= ANSWER.length; i++) {
        t += per;
        at(t, () => setTyped(i));
      }
    } else {
      at(t, () => setTyped(ANSWER.length));
    }
    t += 250;
    at(t, () => setPhase("done"));

    return () => timers.forEach(clearTimeout);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [run, it.agentMode, it.streaming.enabled, it.streaming.speed, it.rendering.toolCallDisplay, it.rendering.citationStyle]);

  const answerText = ANSWER.slice(0, typed);
  const ctxPct = Math.min(96, 18 + trace * 12 + Math.round((typed / ANSWER.length) * 26));
  const cursor = it.streaming.indicator === "cursor" && phase === "answer" && typed < ANSWER.length;
  const dots = it.streaming.indicator === "dots" && phase === "thinking";

  return (
    <div className="rounded-lg border border-border bg-surface">
      <div className="flex items-center justify-between border-b border-hairline bg-surface-2 px-3 py-2">
        <span className="eyebrow">live · {it.agentMode}</span>
        <button
          type="button"
          onClick={() => setRun((r) => r + 1)}
          className="mono rounded-[4px] border border-border px-2 py-0.5 text-[11px] text-muted hover:text-foreground"
        >
          ↻ 재생
        </button>
      </div>

      <div className="space-y-2.5 p-4">
        {/* 사용자 */}
        <div className="flex justify-end">
          <div className="max-w-[80%] rounded-xl px-3 py-1.5 text-[13px]" style={{ background: colors.primary, color: "#fff" }}>
            {USER_MSG}
          </div>
        </div>

        {/* 도구호출 trace */}
        {showTrace && trace > 0 && (
          <div className="rounded-md border border-border" style={{ background: colors.surface }}>
            <button
              type="button"
              onClick={() => setUserToggled((o) => !o)}
              className="mono flex w-full items-center gap-2 px-2.5 py-1.5 text-[11px] text-muted"
            >
              <span style={{ color: colors.accent }}>⚙</span>
              도구 {trace}회 호출
              <span className="ml-auto">{traceOpen ? "▾" : "▸"}</span>
            </button>
            {traceOpen && (
              <div className="space-y-1 border-t border-hairline px-2.5 py-1.5">
                {TOOL_TRACE.slice(0, trace).map((s, i) => (
                  <div key={i} className="mono text-[11px] leading-relaxed">
                    <span style={{ color: colors.accent }}>›</span> {s.tool}(
                    <span className="text-muted">{s.arg}</span>) <span className="text-muted">→ {s.result}</span>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* 봇 답변 / 타이핑 */}
        {(phase === "thinking" || phase === "answer" || phase === "done") && (
          <div className="flex justify-start">
            <div
              className="max-w-[85%] rounded-xl border px-3 py-2 text-[13px] leading-relaxed"
              style={{ background: colors.background, borderColor: colors.border, color: colors.text }}
            >
              {dots ? (
                <span className="inline-flex gap-1">
                  <Dot /> <Dot d={0.15} /> <Dot d={0.3} />
                </span>
              ) : (
                <>
                  {answerText}
                  {cursor && <span className="animate-pulse">▋</span>}
                  {/* 인용 칩 */}
                  {showCites && phase === "done" && it.rendering.citationStyle === "chips" && (
                    <span className="mt-2 flex flex-wrap gap-1">
                      {CITES.map((c) => (
                        <span
                          key={c}
                          className="mono rounded-[4px] border px-1.5 py-0.5 text-[10px]"
                          style={{ borderColor: colors.border, color: colors.muted }}
                        >
                          {c}
                        </span>
                      ))}
                    </span>
                  )}
                  {showCites && phase === "done" && it.rendering.citationStyle !== "chips" && (
                    <span className="mt-1 block text-[10px]" style={{ color: colors.muted }}>
                      출처: {CITES.join(", ")}
                    </span>
                  )}
                </>
              )}
            </div>
          </div>
        )}

        {/* 컨트롤바 */}
        {phase === "done" && it.controls.length > 0 && (
          <div className="flex items-center gap-2 pl-1 pt-0.5 text-[11px] text-muted">
            {it.controls.includes("regenerate") && <span>↻ 재생성</span>}
            {it.controls.includes("copy") && <span>⧉ 복사</span>}
            {it.controls.includes("stop") && <span>■ 중지</span>}
            {it.controls.includes("feedback") && it.feedback === "thumbs" && <span>👍 👎</span>}
            {it.controls.includes("feedback") && it.feedback === "rating" && <span>★★★★★</span>}
          </div>
        )}

        {/* 멀티모달/웰컴 힌트 */}
        {(it.multimodal.length > 0 || it.welcome.showSuggestions) && (
          <div className="flex flex-wrap items-center gap-1.5 border-t border-hairline pt-2.5">
            {it.welcome.showSuggestions && (
              <span className="mono rounded-full border border-border px-2 py-0.5 text-[10px] text-muted">
                추천질문
              </span>
            )}
            {it.multimodal.includes("image-input") && <Chip>🖼 이미지</Chip>}
            {it.multimodal.includes("file-upload") && <Chip>📎 파일</Chip>}
            {it.multimodal.includes("voice-input") && <Chip>🎙 음성입력</Chip>}
            {it.multimodal.includes("voice-output") && <Chip>🔊 음성출력</Chip>}
          </div>
        )}

        {/* 컨텍스트 사용량 미터 */}
        {it.rendering.showContextMeter && (
          <div className="border-t border-hairline pt-2.5">
            <div className="mono mb-1 flex justify-between text-[10px] text-muted">
              <span>컨텍스트 사용량</span>
              <span>{ctxPct}%</span>
            </div>
            <div className="h-1.5 w-full overflow-hidden rounded-full bg-surface-2">
              <div
                className="h-full rounded-full transition-[width] duration-200"
                style={{
                  width: `${ctxPct}%`,
                  background: ctxPct > 85 ? "#dc2626" : colors.accent,
                }}
              />
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

function Dot({ d = 0 }: { d?: number }) {
  return (
    <span
      className="inline-block h-1.5 w-1.5 rounded-full bg-current opacity-50"
      style={{ animation: "pulse 1s ease-in-out infinite", animationDelay: `${d}s` }}
    />
  );
}

function Chip({ children }: { children: React.ReactNode }) {
  return <span className="rounded-full border border-border px-2 py-0.5 text-[10px] text-muted">{children}</span>;
}

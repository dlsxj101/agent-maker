"use client";

/**
 * 검토(Review) & 내보내기 화면. (PLAN.md §7)
 * - 충돌(경고) + 필수 누락(차단) 표시
 * - 월 비용 추정
 * - 생성될 파일 미리보기(탭)
 * - ZIP 내보내기 (필수 누락 시 비활성화 = export 차단 게이트)
 */

import { useMemo, useState } from "react";
import Link from "next/link";
import { useWizardStore } from "@/lib/store";
import { useHydrated } from "./useHydrated";
import { detectConflicts } from "@/lib/conflicts";
import { getMissingRequired, isExportReady } from "@/lib/readiness";
import { estimateMonthlyCost } from "@/lib/cost";
import { generateArtifacts, bundleToZip } from "@/generators";
import { projectSlug } from "@/generators/format";

export function Review() {
  const hydrated = useHydrated();
  const spec = useWizardStore((s) => s.spec);

  const artifacts = useMemo(() => (hydrated ? generateArtifacts(spec) : []), [spec, hydrated]);
  const [selected, setSelected] = useState("PROMPT.md");

  if (!hydrated) return <div className="p-8 text-sm text-muted">검토 화면을 불러오는 중…</div>;

  const conflicts = detectConflicts(spec);
  const missing = getMissingRequired(spec);
  const ready = isExportReady(spec);
  const cost = estimateMonthlyCost(spec);
  const current = artifacts.find((f) => f.path === selected) ?? artifacts[0];

  const onExport = async () => {
    const blob = await bundleToZip(artifacts);
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `${projectSlug(spec)}.zip`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <main className="mx-auto max-w-5xl px-4 py-8">
      <div className="mb-6 flex items-end justify-between border-b border-hairline pb-4">
        <div>
          <p className="eyebrow">review · export</p>
          <h1 className="mt-2 text-xl font-semibold tracking-tight">검토 &amp; 내보내기</h1>
        </div>
        <Link href="/wizard" className="text-sm text-muted underline underline-offset-2 hover:text-foreground">
          ← 마법사로
        </Link>
      </div>

      {/* 게이트: 필수 누락 */}
      {missing.length > 0 && (
        <div
          className="mb-4 p-4 text-sm"
          style={{ background: "var(--danger-weak)", color: "var(--danger)", borderRadius: "var(--radius)" }}
        >
          <p className="font-medium">필수 입력이 비어 있어 내보낼 수 없습니다.</p>
          <ul className="mt-1 list-disc pl-5">
            {missing.map((m) => (
              <li key={m.label}>
                {m.label} <span className="mono text-xs">({m.section})</span>
              </li>
            ))}
          </ul>
        </div>
      )}

      {/* 충돌 경고 */}
      {conflicts.length > 0 && (
        <div
          className="mb-4 p-4 text-sm"
          style={{ background: "var(--warn-weak)", color: "var(--warn)", borderRadius: "var(--radius)" }}
        >
          <p className="font-medium">충돌 경고 ({conflicts.length}) — 내보내기는 가능하나 검토 권장</p>
          <ul className="mt-1 space-y-1">
            {conflicts.map((c) => (
              <li key={c.id}>
                <span className="mono text-xs">{c.id}</span> {c.message}
              </li>
            ))}
          </ul>
        </div>
      )}

      {/* 비용 추정 */}
      <div className="mb-4 rounded-lg border border-border bg-surface p-4 text-sm">
        <p className="font-medium">월 비용 추정</p>
        {cost.available ? (
          <p className="mt-1">
            {cost.selfHosted ? (
              <span className="text-muted">{cost.note}</span>
            ) : (
              <>
                약 <strong>${cost.monthlyUsd.toLocaleString()}</strong> / ₩
                {cost.monthlyKrw.toLocaleString()} <span className="text-xs text-muted">({cost.note})</span>
              </>
            )}
          </p>
        ) : (
          <p className="mt-1 text-muted">{cost.note}</p>
        )}
      </div>

      {/* 파일 미리보기 (에디터 톤) */}
      <div className="overflow-hidden rounded-lg border border-border">
        <div className="flex flex-wrap gap-0.5 border-b border-hairline bg-surface-2 p-1.5">
          {artifacts.map((f) => {
            const on = f.path === current?.path;
            return (
              <button
                key={f.path}
                type="button"
                onClick={() => setSelected(f.path)}
                className={`mono rounded-[4px] px-2 py-1 text-[11px] transition ${
                  on ? "bg-primary text-primary-foreground" : "text-muted hover:bg-surface"
                }`}
              >
                {f.path}
              </button>
            );
          })}
        </div>
        <pre className="mono max-h-[440px] overflow-auto bg-surface p-4 text-[12px] leading-[1.7]">
          <code>{current?.contents}</code>
        </pre>
      </div>

      {/* 내보내기 */}
      <div className="mt-6 flex items-center gap-3">
        <button
          type="button"
          onClick={onExport}
          disabled={!ready}
          className="rounded-token bg-primary px-6 py-3 text-sm font-semibold text-primary-foreground transition hover:bg-[var(--accent-strong)] disabled:cursor-not-allowed disabled:opacity-40"
          style={{ borderRadius: "var(--radius)" }}
        >
          ZIP 내보내기
        </button>
        {!ready && <span className="text-sm text-red-600">필수 입력을 채우면 활성화됩니다.</span>}
        {ready && <span className="text-sm text-muted">{artifacts.length}개 파일이 포함됩니다.</span>}
      </div>
    </main>
  );
}

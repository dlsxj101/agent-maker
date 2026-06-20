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
      <div className="mb-6 flex items-center justify-between">
        <h1 className="text-2xl font-bold">검토 &amp; 내보내기</h1>
        <Link href="/wizard" className="text-sm text-muted underline">
          ← 마법사로 돌아가기
        </Link>
      </div>

      {/* 게이트: 필수 누락 */}
      {missing.length > 0 && (
        <div className="mb-4 rounded-md border border-red-300 bg-red-50 p-4 text-sm text-red-700">
          <p className="font-medium">필수 입력이 비어 있어 내보낼 수 없습니다.</p>
          <ul className="mt-1 list-disc pl-5">
            {missing.map((m) => (
              <li key={m.label}>
                {m.label} <span className="text-xs">({m.section})</span>
              </li>
            ))}
          </ul>
        </div>
      )}

      {/* 충돌 경고 */}
      {conflicts.length > 0 && (
        <div className="mb-4 rounded-md border border-amber-300 bg-amber-50 p-4 text-sm text-amber-800">
          <p className="font-medium">충돌 경고 ({conflicts.length}) — 내보내기는 가능하나 검토 권장</p>
          <ul className="mt-1 space-y-1">
            {conflicts.map((c) => (
              <li key={c.id}>
                <span className="font-mono text-xs">{c.id}</span> {c.message}
              </li>
            ))}
          </ul>
        </div>
      )}

      {/* 비용 추정 */}
      <div className="mb-4 rounded-md border border-border bg-surface p-4 text-sm">
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

      {/* 파일 미리보기 */}
      <div className="rounded-lg border border-border">
        <div className="flex flex-wrap gap-1 border-b border-border p-2">
          {artifacts.map((f) => (
            <button
              key={f.path}
              type="button"
              onClick={() => setSelected(f.path)}
              className={`rounded px-2 py-1 text-xs font-mono ${
                f.path === current?.path ? "bg-primary text-primary-foreground" : "text-muted hover:bg-surface"
              }`}
            >
              {f.path}
            </button>
          ))}
        </div>
        <pre className="max-h-[420px] overflow-auto p-4 text-xs leading-relaxed">
          <code>{current?.contents}</code>
        </pre>
      </div>

      {/* 내보내기 */}
      <div className="mt-6 flex items-center gap-3">
        <button
          type="button"
          onClick={onExport}
          disabled={!ready}
          className="rounded-md bg-primary px-6 py-3 text-sm font-semibold text-primary-foreground disabled:cursor-not-allowed disabled:opacity-40"
        >
          ZIP 내보내기
        </button>
        {!ready && <span className="text-sm text-red-600">필수 입력을 채우면 활성화됩니다.</span>}
        {ready && <span className="text-sm text-muted">{artifacts.length}개 파일이 포함됩니다.</span>}
      </div>
    </main>
  );
}

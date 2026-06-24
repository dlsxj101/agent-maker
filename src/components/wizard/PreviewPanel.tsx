"use client";

/**
 * 우측 미리보기 패널. M3 에서는 현재 선택 요약 + 컬러 스와치 + 충돌/누락 경고를 보여준다.
 * 실제 챗 위젯 라이브 렌더(말풍선/레이아웃)는 M4 에서 추가한다. (PLAN.md §7)
 */

import { useWizardStore } from "@/lib/store";
import { detectConflicts } from "@/lib/conflicts";
import { getMissingRequired } from "@/lib/readiness";
import { LLM_MODEL_CATALOG } from "@/catalog";
import { label } from "@/generators/format";
import { ChatPreview } from "./ChatPreview";

export function PreviewPanel() {
  const spec = useWizardStore((s) => s.spec);
  const conflicts = detectConflicts(spec);
  const missing = getMissingRequired(spec);
  const model = LLM_MODEL_CATALOG.find((m) => m.id === spec.llm.model);

  return (
    <div className="space-y-5 text-sm">
      <p className="eyebrow">live preview</p>

      <ChatPreview />

      <dl className="space-y-2">
        <Row k="기관/챗봇" v={`${spec.project.org || "—"} / ${spec.project.name || "—"}`} />
        <Row k="배포 환경" v={label("deployEnv", spec.project.deployEnv)} />
        <Row k="레이아웃" v={label("layout", spec.design.layout)} />
        <Row k="LLM" v={`${label("provider", spec.llm.provider)} · ${model?.label ?? spec.llm.model}`} />
      </dl>

      <div>
        <p className="mb-1.5 text-xs font-medium text-muted">컬러 토큰</p>
        <div className="flex gap-1.5">
          {(["primary", "secondary", "accent", "surface", "border"] as const).map((k) => (
            <span
              key={k}
              title={`${k}: ${spec.design.colors[k]}`}
              className="h-7 w-7 rounded-md border border-border transition-transform duration-150 motion-safe:hover:scale-110"
              style={{ background: spec.design.colors[k] }}
            />
          ))}
        </div>
      </div>

      {missing.length > 0 && (
        <div
          className="rounded-token p-3"
          style={{ background: "var(--danger-weak)", color: "var(--danger)", borderRadius: "var(--radius)" }}
        >
          <p className="font-medium">필수 입력 누락 ({missing.length})</p>
          <ul className="mt-1 list-disc pl-4">
            {missing.map((m) => (
              <li key={m.label}>{m.label}</li>
            ))}
          </ul>
        </div>
      )}

      {conflicts.length > 0 && (
        <div
          className="rounded-token p-3"
          style={{ background: "var(--warn-weak)", color: "var(--warn)", borderRadius: "var(--radius)" }}
        >
          <p className="font-medium">충돌 경고 ({conflicts.length})</p>
          <ul className="mt-1 space-y-1">
            {conflicts.map((c) => (
              <li key={c.id}>
                <span className="mono text-xs">{c.id}</span> {c.message}
              </li>
            ))}
          </ul>
        </div>
      )}

      {missing.length === 0 && conflicts.length === 0 && (
        <p
          className="rounded-token p-3"
          style={{ background: "var(--accent-weak)", color: "var(--accent-strong)", borderRadius: "var(--radius)" }}
        >
          충돌·누락 없음 — 내보내기 준비됨.
        </p>
      )}
    </div>
  );
}

function Row({ k, v }: { k: string; v: string }) {
  return (
    <div className="flex justify-between gap-3">
      <dt className="text-muted">{k}</dt>
      <dd className="text-right font-medium">{v}</dd>
    </div>
  );
}

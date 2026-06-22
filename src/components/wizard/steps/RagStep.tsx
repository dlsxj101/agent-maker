"use client";

import { useWizardStore } from "@/lib/store";
import { RAG_SOURCES, CHUNKING_STRATEGIES, VECTOR_DBS, RETRIEVAL_STRATEGIES, RAG_ACCESS_CONTROLS } from "@/lib/agent-spec";
import {
  EMBEDDING_MODELS,
  VECTOR_DB_CATALOG,
  RERANKERS,
  CHUNKING_STRATEGY_DESCRIPTIONS,
  RETRIEVAL_STRATEGY_DESCRIPTIONS,
} from "@/catalog";
import { label } from "@/generators/format";
import { OptionCards, ToggleField, NumberField, ChipMulti, StringListField } from "../controls";

// ── 임베딩 카드 preview 배지 헬퍼 ──────────────────────────────────────────
/** 소형 배지 렌더 */
function Badge({ text, variant = "default" }: { text: string; variant?: "primary" | "default" | "muted" }) {
  const cls =
    variant === "primary"
      ? "bg-primary/10 text-primary border-primary/30"
      : variant === "muted"
        ? "bg-surface-2 text-muted border-border"
        : "bg-surface-2 text-foreground border-border";
  return (
    <span className={`inline-flex items-center rounded border px-1.5 py-0.5 text-[10px] font-medium ${cls}`}>
      {text}
    </span>
  );
}

/** 임베딩 카드 미리보기 배지 줄 */
function EmbeddingPreview({
  cloud,
  domestic,
  dim,
}: {
  cloud: boolean;
  domestic?: boolean;
  dim?: number;
}) {
  return (
    <span className="flex flex-wrap gap-1">
      {/* 폐쇄망 친화 = 온프레미스 */}
      {cloud ? (
        <Badge text="클라우드" variant="muted" />
      ) : (
        <Badge text="온프레미스 · 폐쇄망 가능" variant="primary" />
      )}
      {domestic && <Badge text="국산" variant="primary" />}
      {dim != null && <Badge text={`차원 ${dim}`} variant="muted" />}
    </span>
  );
}

/** Vector DB 카드 미리보기 배지 */
function VectorDbPreview({ onPremFriendly }: { onPremFriendly: boolean }) {
  return (
    <span className="flex flex-wrap gap-1">
      {onPremFriendly && <Badge text="온프레미스 친화" variant="primary" />}
    </span>
  );
}

// ── 카드 옵션 목록 사전 빌드 (렌더 외부에서 생성해 안정적 참조) ─────────────

/** 청킹 전략 카드 옵션 */
const chunkingOptions = CHUNKING_STRATEGIES.map((c) => ({
  id: c,
  label: label("chunking", c),
  description: CHUNKING_STRATEGY_DESCRIPTIONS[c],
}));

/** 임베딩 모델 카드 옵션 */
const embeddingOptions = EMBEDDING_MODELS.map((m) => ({
  id: m.id,
  label: m.label,
  description: m.note ?? (m.cloud ? "클라우드 API" : "온프레미스"),
  preview: <EmbeddingPreview cloud={m.cloud} domestic={m.domestic} dim={m.dim} />,
}));

/** Vector DB 카드 옵션 */
const vectorDbOptions = VECTOR_DB_CATALOG.map((d) => ({
  id: d.id,
  label: d.label,
  description: d.note,
  preview: <VectorDbPreview onPremFriendly={d.onPremFriendly} />,
}));

/** 검색 전략 카드 옵션 */
const retrievalOptions = RETRIEVAL_STRATEGIES.map((r) => ({
  id: r,
  label: label("retrieval", r),
  description: RETRIEVAL_STRATEGY_DESCRIPTIONS[r],
}));

/** 리랭커 카드 옵션 */
const rerankerOptions = RERANKERS.map((r) => ({
  id: r.id,
  label: r.label,
  description: r.description,
}));

// ── 컴포넌트 ────────────────────────────────────────────────────────────────

export function RagStep() {
  const rag = useWizardStore((s) => s.spec.rag);
  const update = useWizardStore((s) => s.updateSection);

  if (!rag.enabled) {
    return (
      <div className="space-y-4">
        <ToggleField label="RAG(지식 기반 검색) 사용" checked={false} onChange={(v) => update("rag", { enabled: v })} />
        <p className="text-sm text-muted">RAG를 사용하면 업로드 문서 기반으로 근거 있는 답변을 합니다.</p>
      </div>
    );
  }

  return (
    <div className="space-y-5">
      <ToggleField label="RAG(지식 기반 검색) 사용" checked={rag.enabled} onChange={(v) => update("rag", { enabled: v })} />

      {/* 지식 소스 — 다중 선택이므로 ChipMulti 유지 */}
      <ChipMulti
        label="지식 소스"
        value={rag.sources}
        onChange={(v) => update("rag", { sources: v as typeof rag.sources })}
        options={RAG_SOURCES.map((s) => [s, label("sources", s)])}
        hint="공공기관 문서는 HWP(한글)가 많습니다."
      />

      <fieldset className="flex gap-4">
        <ToggleField label="OCR" checked={rag.ingest.ocr} onChange={(v) => update("rag", { ingest: { ...rag.ingest, ocr: v } })} />
        <ToggleField label="표 추출" checked={rag.ingest.tables} onChange={(v) => update("rag", { ingest: { ...rag.ingest, tables: v } })} />
        <ToggleField label="이미지" checked={rag.ingest.images} onChange={(v) => update("rag", { ingest: { ...rag.ingest, images: v } })} />
      </fieldset>

      {/* 청킹 전략 — OptionCards (단일 선택) */}
      <OptionCards
        label="청킹 전략"
        value={rag.chunking.strategy}
        onChange={(v) =>
          update("rag", { chunking: { ...rag.chunking, strategy: v as (typeof CHUNKING_STRATEGIES)[number] } })
        }
        options={chunkingOptions}
        columns={2}
      />

      <div className="grid grid-cols-2 gap-3">
        <NumberField label="청크 크기" value={rag.chunking.size} onChange={(v) => update("rag", { chunking: { ...rag.chunking, size: v } })} />
        <NumberField label="오버랩" value={rag.chunking.overlap} onChange={(v) => update("rag", { chunking: { ...rag.chunking, overlap: v } })} />
      </div>

      {/* 임베딩 모델 — OptionCards (단일 선택, 배지 미리보기) */}
      <OptionCards
        label="임베딩 모델"
        value={rag.embedding}
        onChange={(v) => update("rag", { embedding: v })}
        options={embeddingOptions}
        columns={2}
        hint="폐쇄망이면 온프레미스 임베딩(BGE-M3 등)을 고르세요."
      />

      {/* Vector DB — OptionCards (단일 선택, 온프레미스 배지) */}
      <OptionCards
        label="Vector DB"
        value={rag.vectorDb}
        onChange={(v) => update("rag", { vectorDb: v as (typeof VECTOR_DBS)[number] })}
        options={vectorDbOptions}
        columns={3}
      />

      {/* 검색 전략 — OptionCards (단일 선택) */}
      <OptionCards
        label="검색 전략"
        value={rag.retrieval.strategy}
        onChange={(v) =>
          update("rag", { retrieval: { ...rag.retrieval, strategy: v as (typeof RETRIEVAL_STRATEGIES)[number] } })
        }
        options={retrievalOptions}
        columns={2}
      />

      <NumberField label="top-K" value={rag.retrieval.topK} onChange={(v) => update("rag", { retrieval: { ...rag.retrieval, topK: v } })} />

      {/* 리랭커 — OptionCards (단일 선택) */}
      <OptionCards
        label="리랭커"
        value={rag.retrieval.reranker ?? "none"}
        onChange={(v) =>
          update("rag", { retrieval: { ...rag.retrieval, reranker: v === "none" ? undefined : v } })
        }
        options={rerankerOptions}
        columns={3}
      />

      <NumberField
        label="검색 신뢰도 임계값 (no-answer)"
        value={rag.retrieval.minScore}
        onChange={(v) => update("rag", { retrieval: { ...rag.retrieval, minScore: v } })}
        hint="유사도가 이 값 미만이면 '근거 부족'으로 보고 모른다고 답합니다(환각 억제). 예: 0.7"
      />

      <ToggleField label="답변에 출처/페이지 표기 (공공 신뢰성)" checked={rag.citations} onChange={(v) => update("rag", { citations: v })} />

      <StringListField
        label="용어집 / 동의어 사전"
        value={rag.glossary}
        onChange={(v) => update("rag", { glossary: v })}
        placeholder="예: 등본=주민등록등본, 초본"
      />
      <p className="-mt-2 text-xs text-muted">전문용어·약어를 정규화해 검색/답변 품질을 높입니다. 형식: 용어=동의어1,동의어2</p>

      {/* 문서 권한 기반 검색 — OptionCards */}
      <OptionCards
        label="문서 접근 제어"
        columns={3}
        value={rag.accessControl}
        onChange={(v) => update("rag", { accessControl: v as (typeof RAG_ACCESS_CONTROLS)[number] })}
        options={[
          { id: "none" as const, label: "전체 공개", description: "모든 이용자가 모든 문서를 검색" },
          { id: "role-based" as const, label: "역할 기반", description: "이용자 권한(역할)에 따라 검색 범위 제한" },
          { id: "department" as const, label: "부서 기반", description: "소속 부서 문서만 검색 (내부 업무봇)" },
        ]}
        hint="공개/내부 문서를 구분하면 본인확인(프론트엔드)과 함께 권한 검색을 구현합니다."
      />
    </div>
  );
}

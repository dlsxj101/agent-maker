"use client";

import { useWizardStore } from "@/lib/store";
import { RAG_SOURCES, CHUNKING_STRATEGIES, VECTOR_DBS, RETRIEVAL_STRATEGIES } from "@/lib/agent-spec";
import { EMBEDDING_MODELS, VECTOR_DB_CATALOG, RERANKERS } from "@/catalog";
import { label } from "@/generators/format";
import { SelectField, ToggleField, NumberField, ChipMulti } from "../controls";

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

      <div className="grid grid-cols-3 gap-3">
        <SelectField
          label="청킹 전략"
          value={rag.chunking.strategy}
          onChange={(v) => update("rag", { chunking: { ...rag.chunking, strategy: v as (typeof CHUNKING_STRATEGIES)[number] } })}
          options={CHUNKING_STRATEGIES.map((c) => [c, label("chunking", c)])}
        />
        <NumberField label="청크 크기" value={rag.chunking.size} onChange={(v) => update("rag", { chunking: { ...rag.chunking, size: v } })} />
        <NumberField label="오버랩" value={rag.chunking.overlap} onChange={(v) => update("rag", { chunking: { ...rag.chunking, overlap: v } })} />
      </div>

      <SelectField
        label="임베딩 모델"
        value={rag.embedding}
        onChange={(v) => update("rag", { embedding: v })}
        options={EMBEDDING_MODELS.map((m) => [m.id, `${m.label}${m.cloud ? " · 클라우드" : " · 온프레미스"}${m.domestic ? "·국산" : ""}`])}
        hint="폐쇄망이면 온프레미스 임베딩(BGE-M3 등)을 고르세요."
      />

      <SelectField
        label="Vector DB"
        value={rag.vectorDb}
        onChange={(v) => update("rag", { vectorDb: v as (typeof VECTOR_DBS)[number] })}
        options={VECTOR_DB_CATALOG.map((d) => [d.id, `${d.label}${d.note ? ` — ${d.note}` : ""}`])}
      />

      <div className="grid grid-cols-3 gap-3">
        <SelectField
          label="검색 전략"
          value={rag.retrieval.strategy}
          onChange={(v) => update("rag", { retrieval: { ...rag.retrieval, strategy: v as (typeof RETRIEVAL_STRATEGIES)[number] } })}
          options={RETRIEVAL_STRATEGIES.map((r) => [r, label("retrieval", r)])}
        />
        <NumberField label="top-K" value={rag.retrieval.topK} onChange={(v) => update("rag", { retrieval: { ...rag.retrieval, topK: v } })} />
        <SelectField
          label="리랭커"
          value={rag.retrieval.reranker ?? "none"}
          onChange={(v) => update("rag", { retrieval: { ...rag.retrieval, reranker: v === "none" ? undefined : v } })}
          options={RERANKERS.map((r) => [r.id, r.label])}
        />
      </div>

      <ToggleField label="답변에 출처/페이지 표기 (공공 신뢰성)" checked={rag.citations} onChange={(v) => update("rag", { citations: v })} />
    </div>
  );
}

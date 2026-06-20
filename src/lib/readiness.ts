/**
 * Export 준비도(필수 필드) 점검 — 골격. (docs/spec-schema.md "Export 차단 게이트")
 *
 * "한 방에" 구현에 필수인데 비어 있는 필드를 찾는다. M3 에서는 검토/스텝 배지 표시용으로 쓰고,
 * **export 버튼 비활성화(차단)** 까지의 완성은 M5 에서 마무리한다.
 */

import type { AgentSpec } from "@/lib/agent-spec";

export interface MissingField {
  /** 관련 스텝/섹션 id */
  section: string;
  /** 사람이 읽는 필드명 */
  label: string;
}

/** 비어 있는 필수 필드 목록 (없으면 빈 배열 = export 준비됨) */
export function getMissingRequired(spec: AgentSpec): MissingField[] {
  const missing: MissingField[] = [];
  if (!spec.project.org.trim()) missing.push({ section: "project", label: "기관명" });
  if (!spec.project.name.trim()) missing.push({ section: "project", label: "챗봇 명칭" });
  if (spec.rag.enabled) {
    if (!spec.rag.embedding.trim()) missing.push({ section: "rag", label: "임베딩 모델" });
  }
  if (!spec.llm.model.trim()) missing.push({ section: "llm", label: "LLM 모델" });
  return missing;
}

/** export 가능 여부 (필수 필드가 모두 채워졌는가) */
export function isExportReady(spec: AgentSpec): boolean {
  return getMissingRequired(spec).length === 0;
}

/**
 * 충돌 감지 엔진 — AgentSpec 선택들 사이의 모순을 경고로 알린다. (PLAN.md §7, docs/spec-schema.md 교차검증 표)
 *
 * 순수 함수(부수효과 없음) → 단위 테스트 가능. 마법사 UI(검토 화면·스텝 배지)가 이 결과를 표시한다.
 * M3 골격: 대표 규칙(C1·C2·C3·C5·C8·C9·C11)을 구현. 나머지(C4·C6·C7·C10)는 M5에서 보강한다.
 *
 * 충돌(경고)은 export 를 막지 않는다. "필수 필드 누락 → export 차단"은 별도 게이트(M5).
 */

import type { AgentSpec } from "@/lib/agent-spec";

export interface Conflict {
  /** 규칙 id (docs/spec-schema.md 표 기준, 예: "C1") */
  id: string;
  /** 관련 AgentSpec 섹션 / 스텝 id (UI 강조용) */
  section: string;
  /** 사용자에게 보일 경고/제안 메시지 */
  message: string;
}

/** API 가 아니라 추론 서버가 필요한(=온프레미스 가능) 임베딩 모델 */
const ONPREM_EMBEDDINGS = ["bge-m3", "kure", "ko-sroberta", "multilingual-e5"];

/** AgentSpec → 충돌 목록 (없으면 빈 배열) */
export function detectConflicts(spec: AgentSpec): Conflict[] {
  const out: Conflict[] = [];
  const airgap = spec.project.deployEnv === "on-premise-airgap";

  // C1: 폐쇄망 + 클라우드 임베딩
  if (airgap && spec.rag.enabled && !ONPREM_EMBEDDINGS.includes(spec.rag.embedding)) {
    out.push({
      id: "C1",
      section: "rag",
      message: `폐쇄망인데 임베딩 \`${spec.rag.embedding}\`은 외부 API일 수 있습니다. 온프레미스 임베딩(BGE-M3 등)을 권장합니다.`,
    });
  }

  // C2: 폐쇄망 + LLM 공식 API
  if (airgap && spec.llm.serving === "official-api") {
    out.push({
      id: "C2",
      section: "llm",
      message: "폐쇄망에서는 LLM 공식 API 직접 호출이 불가합니다. self-hosted(사내 추론) 또는 프록시로 변경하세요.",
    });
  }

  // C3: 완전 오프라인 + 외부 API 연동
  if (spec.backend.network === "offline" && spec.integrations.apis.length > 0) {
    out.push({
      id: "C3",
      section: "integrations",
      message: "백엔드가 완전 오프라인인데 외부 API 연동이 있습니다. 프록시/내부망 API로 변경하세요.",
    });
  }

  // C5: RAG 사용 + HWP 소스 없음 (공공기관)
  if (spec.rag.enabled && !spec.rag.sources.includes("upload-hwp")) {
    out.push({
      id: "C5",
      section: "rag",
      message: "공공기관 문서는 HWP(한글)가 많습니다. 지식 소스에 HWP 업로드 추가를 권장합니다.",
    });
  }

  // C8: RAG 사용 + 인텐트 비어 있음 (빈 챗봇 방지)
  if (spec.rag.enabled && spec.conversation.intents.length === 0) {
    out.push({
      id: "C8",
      section: "conversation",
      message: "주요 시나리오(인텐트)가 비어 있습니다. 대표 민원 흐름을 입력해 빈 챗봇을 방지하세요.",
    });
  }

  // C9: 민원 용도 + 상담사 연결(에스컬레이션) 없음
  const handoff = spec.conversation.fallback.handoff;
  if (
    spec.project.purpose.includes("civil-complaint") &&
    (!handoff || handoff === "none")
  ) {
    out.push({
      id: "C9",
      section: "conversation",
      message: "민원 안내 챗봇은 상담사 연결(에스컬레이션)을 권장합니다. fallback.handoff를 설정하세요.",
    });
  }

  // C11: 다국어 + i18n 정책 미설정
  if (spec.project.languages.includes("multi") && !spec.conversation.i18n) {
    out.push({
      id: "C11",
      section: "conversation",
      message: "다국어 운영인데 언어별 응답/지식소스 정책(i18n)이 없습니다. 정책을 설정하세요.",
    });
  }

  return out;
}

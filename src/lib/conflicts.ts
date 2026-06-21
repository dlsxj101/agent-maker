/**
 * 충돌 감지 엔진 — AgentSpec 선택들 사이의 모순을 경고로 알린다. (PLAN.md §7, docs/spec-schema.md 교차검증 표)
 *
 * 순수 함수(부수효과 없음) → 단위 테스트 가능. 마법사 UI(검토 화면·스텝 배지)가 이 결과를 표시한다.
 * M3 골격: 대표 규칙(C1·C2·C3·C5·C8·C9·C11)을 구현. 나머지(C4·C6·C7·C10)는 M5에서 보강한다.
 *
 * 충돌(경고)은 export 를 막지 않는다. "필수 필드 누락 → export 차단"은 별도 게이트(M5).
 */

import type { AgentSpec } from "@/lib/agent-spec";
import { CLOUD_EMBEDDING_IDS } from "@/catalog";
import { LLM_MODEL_CATALOG } from "@/catalog";

export interface Conflict {
  /** 규칙 id (docs/spec-schema.md 표 기준, 예: "C1") */
  id: string;
  /** 관련 AgentSpec 섹션 / 스텝 id (UI 강조용) */
  section: string;
  /** 사용자에게 보일 경고/제안 메시지 */
  message: string;
}

/** 클라우드 임베딩 여부 (카탈로그 기준; 미상이면 클라우드로 보지 않음) */
const isCloudEmbedding = (id: string) => CLOUD_EMBEDDING_IDS.includes(id);

/** AgentSpec → 충돌 목록 (없으면 빈 배열) */
export function detectConflicts(spec: AgentSpec): Conflict[] {
  const out: Conflict[] = [];
  const airgap = spec.project.deployEnv === "on-premise-airgap";

  // C1: 폐쇄망 + 클라우드 임베딩
  if (airgap && spec.rag.enabled && isCloudEmbedding(spec.rag.embedding)) {
    out.push({
      id: "C1",
      section: "rag",
      message: `폐쇄망인데 임베딩 \`${spec.rag.embedding}\`은 외부 API입니다. 온프레미스 임베딩(BGE-M3 등)을 권장합니다.`,
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

  // C4: 프론트엔드 접근성 등급과 컴플라이언스 접근성 등급 불일치
  const a11yRank: Record<string, number> = {
    none: 0,
    "kwcag-a": 1,
    "kwcag-aa": 2,
    "kwcag-aaa": 3,
  };
  if (a11yRank[spec.frontend.a11yLevel] !== a11yRank[spec.compliance.a11y]) {
    out.push({
      id: "C4",
      section: "compliance",
      message: `프론트엔드 접근성(${spec.frontend.a11yLevel})과 컴플라이언스 접근성(${spec.compliance.a11y}) 등급이 다릅니다. 더 높은 등급으로 통일하세요.`,
    });
  }

  // C6: 개인정보 수집 + 마스킹 미적용
  if (spec.compliance.privacy.collectsPii && !spec.compliance.privacy.masking) {
    out.push({
      id: "C6",
      section: "compliance",
      message: "개인정보를 수집하는데 마스킹/비식별이 꺼져 있습니다. 마스킹·보관기간 설정을 권장합니다.",
    });
  }

  // C7: 데이터 국내 보관 + 해외 클라우드 LLM/임베딩
  const model = LLM_MODEL_CATALOG.find((m) => m.id === spec.llm.model);
  const overseasLlm =
    (spec.llm.provider === "openai" || (model && model.providerId === "openai")) &&
    spec.llm.serving !== "self-hosted";
  const overseasEmbedding = spec.rag.enabled && isCloudEmbedding(spec.rag.embedding);
  if (spec.compliance.security.dataResidencyKR && (overseasLlm || overseasEmbedding)) {
    out.push({
      id: "C7",
      section: "compliance",
      message: "데이터 국내 보관 요건인데 해외 클라우드 LLM/임베딩을 씁니다. 국내 리전/온프레미스를 검토하세요.",
    });
  }

  // C10: 오프라인 설치 패키지 요구 + 클라우드 의존(LLM/임베딩)
  if (
    spec.compliance.procurement?.offlineInstaller &&
    (spec.llm.serving === "official-api" || overseasEmbedding)
  ) {
    out.push({
      id: "C10",
      section: "compliance",
      message: "오프라인 설치 패키지를 요구하는데 클라우드 LLM/임베딩에 의존합니다. 온프레미스 구성으로 변경하세요.",
    });
  }

  // C12: 도구호출 에이전트인데 도구 미정의
  if (spec.interaction.agentMode === "tool-agent" && spec.integrations.tools.length === 0) {
    out.push({
      id: "C12",
      section: "interaction",
      message: "도구호출 에이전트인데 호출할 도구가 없습니다. 연동 단계에서 도구(tool)를 정의하세요.",
    });
  }

  // C13: 폐쇄망인데 외부망이 필요한 내장 도구 활성
  if (spec.backend.network === "offline") {
    const net = spec.agent.builtinTools.filter((t) => t === "web-search" || t === "image-gen");
    if (net.length > 0) {
      out.push({
        id: "C13",
        section: "agent",
        message: `폐쇄망 환경인데 외부망이 필요한 도구(${net.join(", ")})가 켜져 있습니다. 온프레미스 대안을 쓰거나 비활성화하세요.`,
      });
    }
  }

  // C15: 음성 모달리티를 켰는데 엔진 미선택
  const it = spec.interaction;
  if (
    (it.multimodal.includes("voice-input") && it.voice.stt === "none") ||
    (it.multimodal.includes("voice-output") && it.voice.tts === "none")
  ) {
    out.push({
      id: "C15",
      section: "interaction",
      message: "음성 입출력을 켰지만 음성 엔진(STT/TTS)이 선택되지 않았습니다. 엔진을 지정하세요.",
    });
  }

  // C16: 폐쇄망인데 클라우드 음성 엔진
  const cloudVoice = ["clova", "google"];
  if (spec.backend.network === "offline" && (cloudVoice.includes(it.voice.stt) || cloudVoice.includes(it.voice.tts))) {
    out.push({
      id: "C16",
      section: "interaction",
      message: "폐쇄망 환경에 클라우드 음성 엔진(클로바/구글)이 선택됐습니다. 온프레미스(whisper-local/coqui-local)를 쓰세요.",
    });
  }

  // C17: 폐쇄망인데 외부 메신저 채널
  if (spec.backend.network === "offline") {
    const ext = spec.frontend.channels.filter((c) => c !== "web" && c !== "app");
    if (ext.length > 0) {
      out.push({
        id: "C17",
        section: "frontend",
        message: `폐쇄망 환경인데 외부 채널(${ext.join(", ")})이 선택됐습니다. 외부망 연동이 필요하니 웹/앱 위주로 검토하세요.`,
      });
    }
  }

  // C18: 폐쇄망인데 외부 분석 도구(GA)
  if (spec.backend.network === "offline" && spec.ops.observability?.analytics === "ga") {
    out.push({
      id: "C18",
      section: "ops",
      message: "폐쇄망 환경에 Google Analytics가 선택됐습니다. 자체 호스팅 분석(matomo/self-hosted)을 쓰세요.",
    });
  }

  // C19: 문서 권한 기반 검색인데 이용자 인증이 없음
  if (spec.rag.accessControl !== "none" && spec.frontend.userAuth === "none") {
    out.push({
      id: "C19",
      section: "rag",
      message: "문서 권한 기반 검색을 쓰려면 이용자 신원이 필요합니다. 프론트엔드에서 본인확인/로그인을 설정하세요.",
    });
  }

  // C14: 자동 압축을 켰는데 전략이 없음
  if (spec.agent.context.autoCompact && spec.agent.context.strategy === "none") {
    out.push({
      id: "C14",
      section: "agent",
      message: "컨텍스트 자동 압축이 켜져 있지만 압축 전략이 '압축 안 함'입니다. 전략(요약/절단/슬라이딩)을 선택하세요.",
    });
  }

  return out;
}

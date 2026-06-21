/**
 * 산출물 생성기 테스트용 샘플 AgentSpec 픽스처 (손으로 쓴 대표 프로필). PLAN.md §8 M2.
 *
 * 두 가지 대표 프로필로 생성기를 검증한다:
 *  - cloud  : 공공 클라우드 + Claude 공식 API + pgvector (일반적 구성)
 *  - airgap : 폐쇄망 + 오픈소스 self-hosted + 온프레미스 임베딩 (제약 강한 구성)
 */

import { createDraftSpec, type AgentSpec } from "@/lib/agent-spec";

/** 공공 클라우드 민원 챗봇 */
export const cloudSpec: AgentSpec = createDraftSpec({
  project: {
    org: "OO광역시",
    dept: "민원봉사과",
    name: "OO시 민원봇",
    purpose: ["civil-complaint", "faq"],
    audience: ["citizen"],
    languages: ["ko"],
    deployEnv: "gov-cloud",
    traffic: "medium",
  },
  design: { theme: "gov-blue", layout: "floating-widget" },
  llm: { provider: "claude", model: "claude-sonnet-4-6", serving: "official-api" },
  rag: {
    enabled: true,
    sources: ["upload-pdf", "upload-hwp"],
    vectorDb: "pgvector",
    embedding: "bge-m3",
  },
  conversation: {
    persona: { tone: "formal", speaker: "OO시 안내" },
    intents: [{ name: "증명서 발급 안내", examples: ["주민등록등본 어떻게 떼나요?"] }],
    fallback: { onUnknown: "handoff", handoff: "human-agent" },
  },
  evaluation: {
    testset: [
      { question: "주민등록등본 발급 방법은?", expectedSource: "민원편람.pdf" },
      { question: "운영 시간은 어떻게 되나요?" },
    ],
    metrics: ["retrieval-hit", "citation-accuracy"],
  },
});

/** 폐쇄망 내부 업무 지원 챗봇 (온프레미스/오픈소스) */
export const airgapSpec: AgentSpec = createDraftSpec({
  project: {
    org: "OO부",
    dept: "정보화담당관",
    name: "내부 규정봇",
    purpose: ["internal-support", "policy-info"],
    audience: ["public-official"],
    languages: ["ko"],
    deployEnv: "on-premise-airgap",
  },
  design: { theme: "gov-gray", layout: "full-page", mode: "light" },
  frontend: { framework: "react", a11yLevel: "kwcag-aaa" },
  backend: { runtime: "node", network: "offline", deploy: "kubernetes" },
  llm: { provider: "opensource", model: "exaone-3.5", serving: "self-hosted" },
  rag: {
    enabled: true,
    sources: ["upload-hwp", "upload-docx"],
    vectorDb: "qdrant",
    embedding: "bge-m3",
    retrieval: { strategy: "hybrid", reranker: "bge-reranker" },
  },
  conversation: {
    persona: { tone: "concise" },
    intents: [{ name: "복무 규정 조회" }],
    fallback: { onUnknown: "apologize" },
  },
  compliance: {
    security: { dataResidencyKR: true, networkSeparation: true },
    procurement: { domesticPreferred: true, offlineInstaller: true },
  },
});

/** 도구호출 에이전트 프로필 (tool-agent + 도구 정의 + 스트리밍 + 멀티턴 + RAG) */
export const toolAgentSpec: AgentSpec = createDraftSpec({
  project: {
    org: "OO구",
    dept: "민원여권과",
    name: "OO구 업무 에이전트",
    purpose: ["civil-complaint", "booking"],
    audience: ["citizen"],
    languages: ["ko"],
    deployEnv: "gov-cloud",
    traffic: "high",
  },
  design: { theme: "gov-blue", layout: "side-panel" },
  llm: { provider: "claude", model: "claude-sonnet-4-6", serving: "official-api" },
  rag: { enabled: true, sources: ["upload-pdf"], vectorDb: "pgvector", embedding: "bge-m3" },
  interaction: {
    agentMode: "tool-agent",
    toolPolicy: "confirm",
    maxSteps: 3,
    rendering: { toolCallDisplay: "expanded" },
    inputLimits: { maxChars: 500 },
  },
  agent: { safety: { rateLimitPerMin: 30, abuseFilter: true } },
  integrations: {
    tools: [
      { name: "search_minwon", description: "민원 사례/절차 검색" },
      { name: "book_appointment", description: "방문 예약 생성" },
    ],
  },
  conversation: {
    persona: { tone: "formal" },
    intents: [{ name: "여권 발급 예약" }],
    fallback: { onUnknown: "handoff", handoff: "human-agent" },
  },
  evaluation: {
    testset: [{ question: "여권 발급 예약하려면?", expectedSource: "여권민원안내.pdf" }],
    metrics: ["retrieval-hit"],
  },
});

/** 결정성 테스트용 고정 시각 */
export const FIXED_NOW = new Date("2026-06-20T00:00:00.000Z");

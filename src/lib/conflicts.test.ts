/**
 * 충돌 감지 / 준비도 점검 테스트 (PLAN.md §7, M3).
 */

import { describe, it, expect } from "vitest";
import { createDraftSpec } from "@/lib/agent-spec";
import { detectConflicts } from "@/lib/conflicts";
import { getMissingRequired, isExportReady } from "@/lib/readiness";
import { estimateMonthlyCost } from "@/lib/cost";
import { cloudSpec, airgapSpec } from "@/generators/fixtures";

const ids = (spec: ReturnType<typeof createDraftSpec>) =>
  detectConflicts(spec).map((c) => c.id);

describe("detectConflicts", () => {
  it("airgap + 공식 API + 클라우드 임베딩이면 C1·C2 를 잡는다", () => {
    const spec = createDraftSpec({
      project: { org: "A", name: "B", deployEnv: "on-premise-airgap" },
      llm: { serving: "official-api" },
      rag: { enabled: true, embedding: "openai-text-embedding-3-large", sources: ["upload-hwp"] },
    });
    const got = ids(spec);
    expect(got).toContain("C1");
    expect(got).toContain("C2");
  });

  it("offline 백엔드 + 외부 API 면 C3", () => {
    const spec = createDraftSpec({
      backend: { network: "offline" },
      integrations: { apis: [{ name: "민원API", auth: "api-key" }] },
    });
    expect(ids(spec)).toContain("C3");
  });

  it("RAG 사용 + HWP 없음이면 C5", () => {
    const spec = createDraftSpec({ rag: { enabled: true, sources: ["upload-pdf"] } });
    expect(ids(spec)).toContain("C5");
  });

  it("RAG 사용 + 인텐트 없음이면 C8", () => {
    const spec = createDraftSpec({ rag: { enabled: true, sources: ["upload-hwp"] } });
    expect(ids(spec)).toContain("C8");
  });

  it("민원 용도 + 상담사 연결 없음이면 C9", () => {
    const spec = createDraftSpec({
      project: { org: "A", name: "B", purpose: ["civil-complaint"] },
    });
    expect(ids(spec)).toContain("C9");
  });

  it("다국어 + i18n 미설정이면 C11", () => {
    const spec = createDraftSpec({ project: { org: "A", name: "B", languages: ["multi"] } });
    expect(ids(spec)).toContain("C11");
  });

  it("접근성 등급 불일치면 C4", () => {
    const spec = createDraftSpec({
      frontend: { a11yLevel: "kwcag-aaa" },
      compliance: { a11y: "kwcag-aa" },
    });
    expect(ids(spec)).toContain("C4");
  });

  it("개인정보 수집 + 마스킹 꺼짐이면 C6", () => {
    const spec = createDraftSpec({
      compliance: { privacy: { collectsPii: true, masking: false } },
    });
    expect(ids(spec)).toContain("C6");
  });

  it("국내 보관 + 해외 클라우드 임베딩이면 C7", () => {
    const spec = createDraftSpec({
      compliance: { security: { dataResidencyKR: true } },
      rag: { enabled: true, embedding: "openai-text-embedding-3-large", sources: ["upload-hwp"] },
    });
    expect(ids(spec)).toContain("C7");
  });

  it("도구호출 에이전트 + 도구 미정의면 C12", () => {
    const spec = createDraftSpec({ interaction: { agentMode: "tool-agent" } });
    expect(ids(spec)).toContain("C12");
  });

  it("폐쇄망 + 웹검색 내장 도구면 C13", () => {
    const spec = createDraftSpec({
      backend: { network: "offline" },
      agent: { builtinTools: ["web-search"] },
    });
    expect(ids(spec)).toContain("C13");
  });

  it("자동압축 켜고 전략 none 이면 C14", () => {
    const spec = createDraftSpec({ agent: { context: { autoCompact: true, strategy: "none" } } });
    expect(ids(spec)).toContain("C14");
  });

  it("음성 입력 켜고 STT 엔진 미선택이면 C15", () => {
    const spec = createDraftSpec({ interaction: { multimodal: ["voice-input"] } });
    expect(ids(spec)).toContain("C15");
  });

  it("폐쇄망 + 클라우드 음성 엔진이면 C16", () => {
    const spec = createDraftSpec({
      backend: { network: "offline" },
      interaction: { voice: { stt: "clova", tts: "none" } },
    });
    expect(ids(spec)).toContain("C16");
  });

  it("폐쇄망 + 외부 채널이면 C17", () => {
    const spec = createDraftSpec({
      backend: { network: "offline" },
      frontend: { channels: ["web", "kakao-channel"] },
    });
    expect(ids(spec)).toContain("C17");
  });

  it("폐쇄망 + GA 분석이면 C18", () => {
    const spec = createDraftSpec({
      backend: { network: "offline" },
      ops: { observability: { analytics: "ga" } },
    });
    expect(ids(spec)).toContain("C18");
  });

  it("문서 권한 검색 + 이용자 인증 없음이면 C19", () => {
    const spec = createDraftSpec({ rag: { accessControl: "role-based" } });
    expect(ids(spec)).toContain("C19");
  });

  it("오프라인 설치 패키지 + 공식 API LLM 이면 C10", () => {
    const spec = createDraftSpec({
      llm: { serving: "official-api" },
      compliance: { procurement: { domesticPreferred: true, offlineInstaller: true } },
    });
    expect(ids(spec)).toContain("C10");
  });

  it("cloud 픽스처(정상 구성)는 airgap 전용 충돌(C1·C2·C3)을 내지 않는다", () => {
    const got = ids(cloudSpec);
    expect(got).not.toContain("C1");
    expect(got).not.toContain("C2");
    expect(got).not.toContain("C3");
  });

  it("airgap 픽스처는 온프레미스 구성이라 C1·C2 를 내지 않는다", () => {
    const got = ids(airgapSpec);
    expect(got).not.toContain("C1"); // bge-m3 = 온프레미스 임베딩
    expect(got).not.toContain("C2"); // self-hosted
  });

  it("resumable + 인메모리 세션이면 C20 을 잡는다", () => {
    const spec = createDraftSpec({ llm: { session: { resumable: true, persistence: "in-memory" } } });
    expect(ids(spec)).toContain("C20");
  });

  it("세션 persistence=redis 인데 캐시가 redis 가 아니면 C21 을 잡는다", () => {
    const spec = createDraftSpec({
      llm: { session: { persistence: "redis" } },
      database: { cache: "none" },
    });
    expect(ids(spec)).toContain("C21");
  });

  it("세션 persistence=redis + database.cache=redis 면 C21 없음", () => {
    const spec = createDraftSpec({
      llm: { session: { persistence: "redis" } },
      database: { cache: "redis" },
    });
    expect(ids(spec)).not.toContain("C21");
  });
});

describe("getMissingRequired / isExportReady", () => {
  it("기본 초안은 기관명·챗봇명이 비어 export 준비 안 됨", () => {
    const spec = createDraftSpec();
    const missing = getMissingRequired(spec).map((m) => m.label);
    expect(missing).toContain("기관명");
    expect(missing).toContain("챗봇 명칭");
    expect(isExportReady(spec)).toBe(false);
  });

  it("필수 입력이 채워진 cloud 픽스처는 export 준비됨", () => {
    expect(isExportReady(cloudSpec)).toBe(true);
  });
});

describe("estimateMonthlyCost", () => {
  it("self-hosted 는 토큰 과금 0", () => {
    const e = estimateMonthlyCost(airgapSpec); // serving=self-hosted
    expect(e.selfHosted).toBe(true);
    expect(e.monthlyUsd).toBe(0);
  });

  it("질의 수가 없으면 추정 불가", () => {
    expect(estimateMonthlyCost(cloudSpec).available).toBe(false);
  });

  it("질의 수 + 단가가 있으면 양수 추정", () => {
    const spec = createDraftSpec({
      llm: { provider: "claude", model: "claude-sonnet-4-6", serving: "official-api", budget: { estMonthlyQueries: 100000 } },
    });
    const e = estimateMonthlyCost(spec);
    expect(e.available).toBe(true);
    expect(e.monthlyUsd).toBeGreaterThan(0);
    expect(e.monthlyKrw).toBeGreaterThan(0);
  });
});

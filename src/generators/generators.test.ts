/**
 * 산출물 생성기 테스트 (PLAN.md §8 M2, §검증 루프).
 *  - 골든 산출물 스냅샷 (cloud / airgap 프로필)
 *  - 결정성: 동일 spec → 동일 산출 (고정 now)
 *  - ZIP round-trip: 묶고 풀어서 원본 복원
 *  - 공공기관 제약이 PROMPT.md 에 반영되는지(핵심 보장) 단언
 */

import { describe, it, expect } from "vitest";
import { unzipSync, strFromU8 } from "fflate";
import {
  generateArtifacts,
  bundleToZipBytes,
  type GeneratedFile,
} from "./index";
import { cloudSpec, airgapSpec, toolAgentSpec, voiceSpec, FIXED_NOW } from "./fixtures";
import { detectConflicts } from "@/lib/conflicts";
import { createDraftSpec, type AgentSpec } from "@/lib/agent-spec";

function fileMap(files: GeneratedFile[]): Record<string, string> {
  return Object.fromEntries(files.map((f) => [f.path, f.contents]));
}

describe("generateArtifacts — 파일 구성", () => {
  it("문서 + 스캐폴딩 핵심 파일이 모두 생성된다 (cloud)", () => {
    const paths = generateArtifacts(cloudSpec, { now: FIXED_NOW }).map((f) => f.path);
    for (const p of [
      "PROMPT.md",
      "DESIGN.md",
      "CLAUDE.md",
      "ARCHITECTURE.md",
      "README.md",
      "agent-spec.json",
      "package.json",
      "src/server.ts",
      "src/chat.ts",
      "src/llm/client.ts",
      "src/rag/pipeline.ts",
      "public/styles.css",
      "tests/golden.test.ts",
      ".env.example",
    ]) {
      expect(paths).toContain(p);
    }
  });

  it("경로 기준 정렬로 항상 같은 순서를 반환한다(결정성)", () => {
    const paths = generateArtifacts(cloudSpec, { now: FIXED_NOW }).map((f) => f.path);
    expect(paths).toEqual([...paths].sort((a, b) => a.localeCompare(b)));
  });

  it("RAG pipeline 의 ingest/chunk/index 가 throw 스텁이 아니라 실제 구현이다", () => {
    const p = fileMap(generateArtifacts(cloudSpec, { now: FIXED_NOW }))["src/rag/pipeline.ts"];
    expect(p).toContain("readFile"); // ingest 가 파일을 실제로 읽는다
    expect(p).toContain("CHUNK_SIZE"); // chunk 가 크기 기반 분할
    expect(p).toContain("INDEXED"); // index 가 인메모리 색인에 적재
    expect(p).not.toContain('throw new Error("TODO: 청킹');
  });

  it("RAG 비활성 시 pipeline.ts 를 생성하지 않는다", () => {
    const noRag = { ...cloudSpec, rag: { ...cloudSpec.rag, enabled: false } };
    const paths = generateArtifacts(noRag, { now: FIXED_NOW }).map((f) => f.path);
    expect(paths).not.toContain("src/rag/pipeline.ts");
  });

  it("tool-agent 는 tools.ts(TOOLS+TOOL_DEFS) + 도구 루프 + confirm 라우트를 생성한다", () => {
    const m = fileMap(generateArtifacts(toolAgentSpec, { now: FIXED_NOW }));
    expect(m["src/tools.ts"]).toContain("search_minwon");
    expect(m["src/tools.ts"]).toContain("export const TOOLS");
    expect(m["src/tools.ts"]).toContain("TOOL_DEFS"); // Anthropic tool-use 정의
    expect(m["src/tools.ts"]).toContain("input_schema");
    expect(m["src/chat.ts"]).toContain("Object.keys(TOOLS)");
    expect(m["src/server.ts"]).toContain("/api/chat/confirm"); // toolPolicy=confirm
    expect(m["PROMPT.md"]).toContain("search_minwon"); // PROMPT 가 도구를 이름으로 명시
    expect(m["src/chat.ts"]).toContain("yield { trace: t }"); // 도구 trace SSE 이벤트(expanded)
  });

  it("안전 설정(rate limit/남용/입력길이)이 server 가드 미들웨어로 생성된다", () => {
    const m = fileMap(generateArtifacts(toolAgentSpec, { now: FIXED_NOW }));
    expect(m["src/server.ts"]).toContain("RATE_PER_MIN");
    expect(m["src/server.ts"]).toContain("isAbusive");
    expect(m["src/server.ts"]).toContain("너무 깁니다");
  });

  it("가드레일(거절 스타일·금칙 주제·PII)이 시스템 프롬프트에 주입된다", () => {
    const spec = {
      ...cloudSpec,
      llm: { ...cloudSpec.llm, guardrails: { ...cloudSpec.llm.guardrails, bannedTopics: ["정치", "투자권유"] } },
    };
    const chat = fileMap(generateArtifacts(spec, { now: FIXED_NOW }))["src/chat.ts"];
    expect(chat).toContain("답변이 불가능하면"); // 거절 스타일 지시
    expect(chat).toContain("정치, 투자권유"); // 금칙 주제
    expect(chat).toContain("개인정보"); // PII 필터(기본 on)
  });

  it("폐쇄망 음성+접근제어 프로필: PROMPT 반영 + 온프레미스 음성 충돌 없음", () => {
    const m = fileMap(generateArtifacts(voiceSpec, { now: FIXED_NOW }));
    expect(m["PROMPT.md"]).toContain("음성");
    expect(m["PROMPT.md"]).toContain("접근 제어");
    expect(detectConflicts(voiceSpec).map((c) => c.id)).not.toContain("C16");
  });

  it("멀티턴+스트리밍이면 세션 스토어 + SSE 엔드포인트 + answerStream 을 생성한다", () => {
    const m = fileMap(generateArtifacts(cloudSpec, { now: FIXED_NOW }));
    expect(m["src/chat.ts"]).toContain("SESSIONS");
    expect(m["src/chat.ts"]).toContain("answerStream");
    expect(m["src/server.ts"]).toContain("/api/chat/stream");
    expect(m["src/llm/client.ts"]).toContain("completeStream");
  });
});

describe("스택별 디스패치 (M7-D 풀 패리티)", () => {
  const withRuntime = (runtime: AgentSpec["backend"]["runtime"]): AgentSpec => ({
    ...toolAgentSpec,
    backend: { ...toolAgentSpec.backend, runtime },
  });

  it("python → FastAPI 백엔드(main.py/requirements/chat/llm/rag/tools)를 생성한다", () => {
    const m = fileMap(generateArtifacts(withRuntime("python"), { now: FIXED_NOW }));
    for (const p of ["main.py", "chat.py", "llm_client.py", "requirements.txt", "rag/pipeline.py", "tools.py"])
      expect(Object.keys(m)).toContain(p);
    expect(m["main.py"]).toContain("FastAPI");
    expect(m["main.py"]).toContain("/api/chat/confirm"); // toolPolicy=confirm
    expect(Object.keys(m)).not.toContain("package.json"); // Node 산출물 아님
  });

  it("go → net/http 백엔드(main.go/llm.go/go.mod)를 생성한다", () => {
    const m = fileMap(generateArtifacts(withRuntime("go"), { now: FIXED_NOW }));
    for (const p of ["main.go", "llm.go", "go.mod", "main_test.go"]) expect(Object.keys(m)).toContain(p);
    expect(m["main.go"]).toContain("net/http");
    expect(m["main.go"]).toContain("toolDefs"); // tool-agent
  });

  it("java → Spring Boot 백엔드(pom.xml/Controller/Service)를 생성한다", () => {
    const m = fileMap(generateArtifacts(withRuntime("java"), { now: FIXED_NOW }));
    expect(Object.keys(m)).toContain("pom.xml");
    expect(Object.keys(m).some((p) => p.endsWith("ChatController.java"))).toBe(true);
    expect(Object.keys(m).some((p) => p.endsWith("ChatService.java"))).toBe(true);
    expect(Object.keys(m).some((p) => p.endsWith("Tools.java"))).toBe(true);
  });

  it("모든 스택이 공통 프론트엔드(public/*)를 공유한다", () => {
    for (const rt of ["node", "python", "go", "java"] as const) {
      const m = fileMap(generateArtifacts(withRuntime(rt), { now: FIXED_NOW }));
      expect(Object.keys(m)).toContain("public/index.html");
      expect(Object.keys(m)).toContain("public/styles.css");
    }
  });

  it("M7-A: OpenAI 호환 + tool-agent → function-calling 루프(tool_calls)를 생성한다", () => {
    const spec = createDraftSpec({
      llm: { provider: "opensource", serving: "self-hosted" },
      interaction: { agentMode: "tool-agent" },
      integrations: { tools: [{ name: "t", description: "d" }] },
    });
    const client = fileMap(generateArtifacts(spec, { now: FIXED_NOW }))["src/llm/client.ts"];
    expect(client).toContain("tool_calls"); // OpenAI function-calling 응답 처리
    expect(client).toContain('type: "function" as const'); // tools 변환
    expect(client).not.toContain("임시: 단순 complete"); // 기존 TODO 스텁이 사라졌는지
  });
});

describe("스택별 프레임워크 변형 (M7-D 후속)", () => {
  const mk = (runtime: AgentSpec["backend"]["runtime"], framework: string): AgentSpec => ({
    ...toolAgentSpec,
    backend: { ...toolAgentSpec.backend, runtime, framework },
  });

  it("python/flask → app.py(Flask), main.py 없음", () => {
    const m = fileMap(generateArtifacts(mk("python", "flask"), { now: FIXED_NOW }));
    expect(m["app.py"]).toContain("Flask(");
    expect(Object.keys(m)).not.toContain("main.py");
    expect(m["requirements.txt"]).toContain("flask");
  });

  it("python/django → manage.py + config/settings.py + views.py", () => {
    const m = fileMap(generateArtifacts(mk("python", "django"), { now: FIXED_NOW }));
    for (const p of ["manage.py", "config/settings.py", "config/urls.py", "views.py"])
      expect(Object.keys(m)).toContain(p);
    expect(m["requirements.txt"]).toContain("django");
  });

  it("python 기본(미지정) → FastAPI main.py", () => {
    const m = fileMap(generateArtifacts(mk("python", ""), { now: FIXED_NOW }));
    expect(m["main.py"]).toContain("FastAPI");
  });

  it("node/fastify → fastify 서버, @types/express 없음", () => {
    const m = fileMap(generateArtifacts(mk("node", "fastify"), { now: FIXED_NOW }));
    expect(m["src/server.ts"]).toContain("fastify");
    expect(m["package.json"]).toContain('"fastify"');
    expect(m["package.json"]).not.toContain("@types/express");
  });

  it("node/nestjs → main.ts + app.module.ts + chat.controller.ts (server.ts 없음)", () => {
    const m = fileMap(generateArtifacts(mk("node", "nestjs"), { now: FIXED_NOW }));
    for (const p of ["src/main.ts", "src/app.module.ts", "src/chat.controller.ts"])
      expect(Object.keys(m)).toContain(p);
    expect(Object.keys(m)).not.toContain("src/server.ts");
    expect(m["package.json"]).toContain("@nestjs/core");
    expect(m["tsconfig.json"]).toContain("experimentalDecorators");
  });

  it("go/gin·echo → go.mod 에 모듈 require, main.go 가 프레임워크 사용", () => {
    const gin = fileMap(generateArtifacts(mk("go", "gin"), { now: FIXED_NOW }));
    expect(gin["go.mod"]).toContain("gin-gonic/gin");
    expect(gin["main.go"]).toContain("gin.Default()");
    const echo = fileMap(generateArtifacts(mk("go", "echo"), { now: FIXED_NOW }));
    expect(echo["go.mod"]).toContain("labstack/echo");
    expect(echo["main.go"]).toContain("echo.New()");
  });

  it("go 기본(미지정) → 표준 라이브러리 net/http (외부 require 없음)", () => {
    const m = fileMap(generateArtifacts(mk("go", ""), { now: FIXED_NOW }));
    expect(m["main.go"]).toContain("net/http");
    expect(m["go.mod"]).not.toContain("require");
  });
});

describe("세션 영속/재개 · 폴백 · 운영시간 (M7 후속)", () => {
  it("resumable → 프론트엔드가 sessionId 를 localStorage 에 보관(이탈 후 재개)", () => {
    const spec = createDraftSpec({ llm: { session: { resumable: true } } });
    const js = fileMap(generateArtifacts(spec, { now: FIXED_NOW }))["public/app.js"];
    expect(js).toContain("localStorage.getItem(\"chat_session\")");
  });

  it("기본(resumable=false) → localStorage 미사용(스냅샷 안정)", () => {
    const js = fileMap(generateArtifacts(cloudSpec, { now: FIXED_NOW }))["public/app.js"];
    expect(js).not.toContain("chat_session");
  });

  it("persistence=redis / resumable → PROMPT 와 Node 세션 주석에 영속 지시", () => {
    const spec = createDraftSpec({ llm: { session: { resumable: true, persistence: "redis" } } });
    const m = fileMap(generateArtifacts(spec, { now: FIXED_NOW }));
    expect(m["PROMPT.md"]).toContain("세션 영속");
    expect(m["PROMPT.md"]).toContain("재개");
    expect(m["src/chat.ts"]).toContain("persistence=redis");
  });

  it("fallbackModel → PROMPT 에 폴백 지시", () => {
    const spec = createDraftSpec({ llm: { model: "claude-sonnet-4-6", fallbackModel: "claude-haiku-4-5" } });
    expect(fileMap(generateArtifacts(spec, { now: FIXED_NOW }))["PROMPT.md"]).toContain("폴백");
  });

  it("operatingHours → PROMPT 에 운영 시간 지시", () => {
    const spec = createDraftSpec({
      conversation: { fallback: { operatingHours: "평일 09:00-18:00" } },
    });
    expect(fileMap(generateArtifacts(spec, { now: FIXED_NOW }))["PROMPT.md"]).toContain("운영 시간: 평일 09:00-18:00");
  });
});

describe("보안·품질 신규 옵션 (전수 재감사 2차)", () => {
  it("암호화(at-rest)·IP 제한·PIA 가 PROMPT/ARCHITECTURE/.env 에 반영된다", () => {
    const spec = createDraftSpec({
      compliance: {
        privacy: { collectsPii: true, piaRequired: true },
        security: { encryption: { atRest: true }, ipAllowlist: { enabled: true, cidrs: ["10.0.0.0/8"] } },
      },
    });
    const m = fileMap(generateArtifacts(spec, { now: FIXED_NOW }));
    expect(m["PROMPT.md"]).toContain("암호화");
    expect(m["PROMPT.md"]).toContain("10.0.0.0/8");
    expect(m["PROMPT.md"]).toContain("PIA");
    expect(m["ARCHITECTURE.md"]).toContain("접속 IP 제한");
    expect(m[".env.example"]).toContain("IP_ALLOWLIST=10.0.0.0/8");
  });

  it("RAG no-answer 임계값(minScore)·용어집이 PROMPT 와 파이프라인에 반영된다", () => {
    const spec = createDraftSpec({
      rag: { enabled: true, retrieval: { minScore: 0.7 }, glossary: ["등본=주민등록등본,초본"] },
      evaluation: { testset: [{ question: "등본?", expectedSource: "x.pdf" }] },
    });
    const m = fileMap(generateArtifacts(spec, { now: FIXED_NOW }));
    expect(m["PROMPT.md"]).toContain("minScore=0.7");
    expect(m["PROMPT.md"]).toContain("no-answer");
    expect(m["PROMPT.md"]).toContain("용어집");
    expect(m["src/rag/pipeline.ts"]).toContain("0.7"); // 임계값 주석
  });

  it("로그 보관기간·백업이 PROMPT 운영 단계에 반영된다", () => {
    const spec = createDraftSpec({ ops: { logRetentionDays: 365, backup: { enabled: true, cycle: "매일 02:00" } } });
    const prompt = fileMap(generateArtifacts(spec, { now: FIXED_NOW }))["PROMPT.md"];
    expect(prompt).toContain("365일 보관");
    expect(prompt).toContain("백업");
  });

  it("기본값이면 신규 보안 옵션이 PROMPT 에 안 나온다(스냅샷 안정)", () => {
    const prompt = fileMap(generateArtifacts(cloudSpec, { now: FIXED_NOW }))["PROMPT.md"];
    expect(prompt).not.toContain("IP_ALLOWLIST");
    expect(prompt).not.toContain("PIA");
  });
});

describe("결정성", () => {
  it("동일 spec + 동일 now → 완전히 동일한 산출", () => {
    const a = generateArtifacts(cloudSpec, { now: FIXED_NOW });
    const b = generateArtifacts(cloudSpec, { now: FIXED_NOW });
    expect(a).toEqual(b);
  });
});

describe("공공기관 제약 반영 (제품 핵심 보장)", () => {
  it("폐쇄망 프로필의 PROMPT.md 는 오프라인 제약과 self-hosted 를 명시한다", () => {
    const prompt = fileMap(generateArtifacts(airgapSpec, { now: FIXED_NOW }))["PROMPT.md"];
    expect(prompt).toContain("폐쇄망");
    expect(prompt).toContain("외부 인터넷 호출 불가");
    expect(prompt).toContain("사내 추론 서버");
  });

  it("airgap 스캐폴딩은 Anthropic SDK 의존성을 넣지 않는다(공식 API 아님)", () => {
    const pkg = fileMap(generateArtifacts(airgapSpec, { now: FIXED_NOW }))["package.json"];
    expect(pkg).not.toContain("@anthropic-ai/sdk");
    expect(pkg).toContain("express");
  });

  it("cloud 스캐폴딩은 Claude 공식 API 클라이언트를 생성한다", () => {
    const client = fileMap(generateArtifacts(cloudSpec, { now: FIXED_NOW }))["src/llm/client.ts"];
    expect(client).toContain("@anthropic-ai/sdk");
  });

  it("도구호출 에이전트 모드는 PROMPT/스캐폴드에 에이전트 루프를 명시한다", () => {
    const agent = {
      ...cloudSpec,
      interaction: { ...cloudSpec.interaction, agentMode: "tool-agent" as const },
    };
    const m = fileMap(generateArtifacts(agent, { now: FIXED_NOW }));
    expect(m["PROMPT.md"]).toContain("도구호출 에이전트");
    expect(m["src/chat.ts"]).toContain("도구 호출 루프");
  });

  it("에이전트 능력(서브에이전트·내장도구·자동압축)이 PROMPT 에 반영된다", () => {
    const agent = {
      ...cloudSpec,
      agent: {
        ...cloudSpec.agent,
        subAgents: { enabled: true, maxParallel: 3, roles: [] },
        builtinTools: ["web-search" as const, "calculator" as const],
        context: { autoCompact: true, strategy: "summarize" as const },
      },
    };
    const m = fileMap(generateArtifacts(agent, { now: FIXED_NOW }));
    expect(m["PROMPT.md"]).toContain("서브에이전트");
    expect(m["PROMPT.md"]).toContain("web-search");
    expect(m["PROMPT.md"]).toContain("자동 압축");
  });

  it("디자인 토큰이 styles.css 에 CSS 변수로 들어간다", () => {
    const css = fileMap(generateArtifacts(cloudSpec, { now: FIXED_NOW }))["public/styles.css"];
    expect(css).toContain("--color-primary: #1F4E8C");
  });
});

describe("ZIP round-trip", () => {
  it("묶었다가 풀면 원본 파일 내용이 복원된다", () => {
    const files = generateArtifacts(cloudSpec, { now: FIXED_NOW });
    const bytes = bundleToZipBytes(files);
    const unzipped = unzipSync(bytes);
    const original = fileMap(files);
    for (const [path, contents] of Object.entries(original)) {
      expect(strFromU8(unzipped[path])).toBe(contents);
    }
    expect(Object.keys(unzipped).sort()).toEqual(Object.keys(original).sort());
  });
});

describe("골든 산출물 스냅샷", () => {
  it("cloud 프로필 전체 산출 스냅샷", () => {
    expect(fileMap(generateArtifacts(cloudSpec, { now: FIXED_NOW }))).toMatchSnapshot();
  });
  it("airgap 프로필 전체 산출 스냅샷", () => {
    expect(fileMap(generateArtifacts(airgapSpec, { now: FIXED_NOW }))).toMatchSnapshot();
  });
});

describe("산출물 다국어 (M7-C)", () => {
  /** docLang:"en" 으로 생성한 cloud 스펙 */
  const cloudEnSpec = createDraftSpec({
    ...cloudSpec,
    project: { ...cloudSpec.project, docLang: "en" as const },
  });

  it("docLang:'en' 이면 PROMPT.md 에 영어 헤더가 포함된다", () => {
    const m = fileMap(generateArtifacts(cloudEnSpec, { now: FIXED_NOW }));
    expect(m["PROMPT.md"]).toContain("Implementation Instructions (Claude Code Master Prompt)");
    expect(m["PROMPT.md"]).toContain("What to Build");
    expect(m["PROMPT.md"]).toContain("Acceptance Criteria");
  });

  it("docLang:'en' 이면 PROMPT.md 에 한국어 헤더가 없다", () => {
    const m = fileMap(generateArtifacts(cloudEnSpec, { now: FIXED_NOW }));
    expect(m["PROMPT.md"]).not.toContain("구현 지시 (Claude Code 마스터 프롬프트)");
    expect(m["PROMPT.md"]).not.toContain("무엇을 만드는가");
    expect(m["PROMPT.md"]).not.toContain("완료 기준");
  });

  it("docLang:'en' 이면 DESIGN.md·CLAUDE.md·ARCHITECTURE.md·README.md 도 영어로 생성된다", () => {
    const m = fileMap(generateArtifacts(cloudEnSpec, { now: FIXED_NOW }));
    expect(m["DESIGN.md"]).toContain("Design System (DESIGN.md)");
    expect(m["CLAUDE.md"]).toContain("Work Instructions");
    expect(m["ARCHITECTURE.md"]).toContain("Architecture (ARCHITECTURE.md)");
    expect(m["README.md"]).toContain("Getting Started");
  });

  it("docLang 기본값(ko)은 한국어 산출물을 생성한다", () => {
    const m = fileMap(generateArtifacts(cloudSpec, { now: FIXED_NOW }));
    expect(m["PROMPT.md"]).toContain("구현 지시 (Claude Code 마스터 프롬프트)");
    expect(m["PROMPT.md"]).not.toContain("Implementation Instructions");
  });

  it("en 프로필 cloud 산출 스냅샷 (M7-C)", () => {
    expect(fileMap(generateArtifacts(cloudEnSpec, { now: FIXED_NOW }))).toMatchSnapshot();
  });
});

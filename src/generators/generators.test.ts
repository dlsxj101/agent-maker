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
import { cloudSpec, airgapSpec, FIXED_NOW } from "./fixtures";

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

  it("RAG 비활성 시 pipeline.ts 를 생성하지 않는다", () => {
    const noRag = { ...cloudSpec, rag: { ...cloudSpec.rag, enabled: false } };
    const paths = generateArtifacts(noRag, { now: FIXED_NOW }).map((f) => f.path);
    expect(paths).not.toContain("src/rag/pipeline.ts");
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
    expect(m["src/chat.ts"]).toContain("도구호출 에이전트");
  });

  it("에이전트 능력(서브에이전트·내장도구·자동압축)이 PROMPT 에 반영된다", () => {
    const agent = {
      ...cloudSpec,
      agent: {
        ...cloudSpec.agent,
        subAgents: { enabled: true, maxParallel: 3 },
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

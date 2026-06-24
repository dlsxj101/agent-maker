/**
 * AgentSpec 직렬화 round-trip 테스트 (PLAN.md §8 M1, §검증 루프).
 *
 * 검증 목표:
 *  - 기본값만으로 완전한 초안 스펙이 만들어진다(parse({})).
 *  - serialize → deserialize 가 손실 없이 원형을 복원한다(round-trip).
 *  - 스키마의 기본값이 카탈로그의 실제 항목 id 와 일치한다(SSOT 정합).
 */

import { describe, it, expect } from "vitest";
import {
  AgentSpecSchema,
  createDraftSpec,
  serializeSpec,
  deserializeSpec,
  SPEC_VERSION,
  GENERATOR_VERSION,
} from "./agent-spec";
import { THEME_PRESETS, FONT_OPTIONS, LLM_MODEL_CATALOG } from "@/catalog";

describe("AgentSpec 기본값", () => {
  it("빈 객체만으로 모든 섹션이 채워진 초안이 생성된다", () => {
    const spec = createDraftSpec();
    // §0~§15 전 섹션 키가 존재한다
    expect(Object.keys(spec).sort()).toEqual(
      [
        "meta",
        "project",
        "design",
        "frontend",
        "backend",
        "database",
        "rag",
        "llm",
        "conversation",
        "interaction",
        "presentation",
        "agent",
        "integrations",
        "evaluation",
        "compliance",
        "ops",
      ].sort(),
    );
    expect(spec.meta.specVersion).toBe(SPEC_VERSION);
    expect(spec.meta.generatorVersion).toBe(GENERATOR_VERSION);
  });

  it("seed 부분 입력 위에 기본값을 채운다", () => {
    const spec = createDraftSpec({ project: { org: "행정안전부", name: "민원봇" } });
    expect(spec.project.org).toBe("행정안전부");
    expect(spec.project.name).toBe("민원봇");
    expect(spec.project.deployEnv).toBe("gov-cloud"); // 기본값
    expect(spec.project.languages).toEqual(["ko"]); // 기본값
  });
});

describe("직렬화 round-trip", () => {
  it("serialize → deserialize 가 원형을 복원한다", () => {
    const original = serializeSpec(createDraftSpec({ project: { org: "OO시", name: "안내봇" } }));
    const restored = deserializeSpec(original);
    // 복원된 스펙을 다시 직렬화하면 동일해야 한다(createdAt 고정).
    const reserialized = serializeSpec(restored);
    expect(reserialized).toBe(original);
  });

  it("serializeSpec 은 createdAt 을 기록한다", () => {
    const fixed = new Date("2026-06-20T00:00:00.000Z");
    const json = serializeSpec(createDraftSpec(), fixed);
    const restored = deserializeSpec(json);
    expect(restored.meta.createdAt).toBe("2026-06-20T00:00:00.000Z");
  });

  it("알 수 없는 키는 무시되고 누락 필드는 기본값으로 채워진다", () => {
    const json = JSON.stringify({ project: { org: "X" }, bogusKey: 123 });
    const restored = deserializeSpec(json);
    expect(restored.project.org).toBe("X");
    expect("bogusKey" in restored).toBe(false);
    expect(restored.llm.provider).toBe("claude"); // 누락 → 기본값
  });

  it("잘못된 enum 값은 거부된다", () => {
    const bad = JSON.stringify({ llm: { provider: "gemini" } });
    expect(() => deserializeSpec(bad)).toThrow();
  });
});

describe("기본값 ↔ 카탈로그 정합 (SSOT)", () => {
  const draft = createDraftSpec();

  it("기본 테마 id 가 카탈로그에 존재한다", () => {
    expect(THEME_PRESETS.some((t) => t.id === draft.design.theme)).toBe(true);
  });

  it("기본 폰트 id 가 카탈로그에 존재한다", () => {
    const ids = FONT_OPTIONS.map((f) => f.id);
    expect(ids).toContain(draft.design.fonts.heading);
    expect(ids).toContain(draft.design.fonts.body);
  });

  it("기본 LLM 모델이 카탈로그의 recommended 항목과 일치한다", () => {
    const recommended = LLM_MODEL_CATALOG.find((m) => m.recommended);
    expect(recommended?.id).toBe(draft.llm.model);
    expect(recommended?.providerId).toBe(draft.llm.provider);
  });

  it("기본 테마의 컬러 토큰이 스키마 colors 기본값과 일치한다", () => {
    const govBlue = THEME_PRESETS.find((t) => t.id === "gov-blue");
    expect(govBlue?.colors).toEqual(draft.design.colors);
  });
});

describe("스키마 안정성", () => {
  it("parse 결과를 다시 parse 해도 동일하다(idempotent)", () => {
    const once = AgentSpecSchema.parse({});
    const twice = AgentSpecSchema.parse(once);
    expect(twice).toEqual(once);
  });
});

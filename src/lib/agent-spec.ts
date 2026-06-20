/**
 * AgentSpec — 마법사의 모든 선택을 담는 설정 객체의 단일 진실(SSOT).
 *
 * ⚠️ 현재는 골격(placeholder)이다. M1에서 docs/spec-schema.md를 기준으로
 *    각 섹션을 Zod 스키마로 완성한다. (PLAN.md §5, §8 / CLAUDE.md §4)
 *
 * 설계 규칙:
 *  - 이 Zod 스키마가 타입·검증·기본값의 출발점이다.
 *  - 목록형 선택지(LLM·임베딩·VectorDB 등)는 src/catalog/* 에서 주입한다.
 *  - 필드 추가 시: 이 스키마 → 타입 → UI → 생성기 순으로 일관되게 반영한다.
 */

import { z } from "zod";

/** 스키마 버전 — 변경 시 올리고 docs/spec-schema.md와 함께 갱신 */
export const SPEC_VERSION = "1.0";

// TODO(M1): 아래 각 섹션을 docs/spec-schema.md에 맞춰 구체화한다.
//           현재는 자리표시자로 passthrough 객체만 둔다.
const placeholderSection = z.object({}).passthrough();

export const AgentSpecSchema = z.object({
  meta: z.object({
    specVersion: z.string().default(SPEC_VERSION),
    generatorVersion: z.string().default("0.1.0"),
    createdAt: z.string().optional(), // 직렬화 시점에 기록
  }),
  // 섹션 번호는 docs/spec-schema.md와 일치한다.
  project: placeholderSection, // §1
  design: placeholderSection, // §2
  frontend: placeholderSection, // §3
  backend: placeholderSection, // §4 (+ sla)
  database: placeholderSection, // §5
  rag: placeholderSection, // §6
  llm: placeholderSection, // §7 (+ session, budget)
  conversation: placeholderSection, // §8  대화 설계 (신규)
  integrations: placeholderSection, // §9
  evaluation: placeholderSection, // §10 평가/테스트 (신규)
  compliance: placeholderSection, // §11
  ops: placeholderSection, // §12 운영·관측 (신규, compliance에서 분리)
});

/** 마법사 전역 상태로 쓰이는 설정 타입 */
export type AgentSpec = z.infer<typeof AgentSpecSchema>;

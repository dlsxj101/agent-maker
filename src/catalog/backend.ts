/**
 * 백엔드 카탈로그 — 런타임별 프레임워크 목록 (데이터). (PLAN.md §4 Step 3)
 * id 는 AgentSpec.backend.framework(string) 에 저장. 런타임 enum 은 agent-spec.ts.
 */

import type { BACKEND_RUNTIMES } from "@/lib/agent-spec";

type RuntimeId = (typeof BACKEND_RUNTIMES)[number];

export const FRAMEWORKS_BY_RUNTIME: Record<
  RuntimeId,
  { id: string; label: string; description?: string }[]
> = {
  node: [
    { id: "express", label: "Express", description: "경량·미니멀 Node.js 웹 프레임워크" },
    { id: "nestjs", label: "NestJS", description: "TypeScript 기반 엔터프라이즈 Node.js 프레임워크" },
    { id: "fastify", label: "Fastify", description: "고성능 Node.js 프레임워크, 낮은 오버헤드" },
  ],
  python: [
    { id: "fastapi", label: "FastAPI", description: "비동기·타입 힌트 기반 고성능 Python API" },
    { id: "django", label: "Django", description: "전통적인 Python 풀스택 웹 프레임워크" },
    { id: "flask", label: "Flask", description: "경량 Python 마이크로 프레임워크" },
  ],
  java: [
    { id: "spring", label: "Spring Boot", description: "공공기관 표준 Java 엔터프라이즈 프레임워크" },
  ],
  go: [
    { id: "gin", label: "Gin", description: "빠르고 경량인 Go HTTP 프레임워크" },
    { id: "echo", label: "Echo", description: "고성능·미니멀 Go 웹 프레임워크" },
  ],
  none: [],
};

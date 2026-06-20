/**
 * 백엔드 카탈로그 — 런타임별 프레임워크 목록 (데이터). (PLAN.md §4 Step 3)
 * id 는 AgentSpec.backend.framework(string) 에 저장. 런타임 enum 은 agent-spec.ts.
 */

import type { BACKEND_RUNTIMES } from "@/lib/agent-spec";

type RuntimeId = (typeof BACKEND_RUNTIMES)[number];

export const FRAMEWORKS_BY_RUNTIME: Record<RuntimeId, { id: string; label: string }[]> = {
  node: [
    { id: "express", label: "Express" },
    { id: "nestjs", label: "NestJS" },
    { id: "fastify", label: "Fastify" },
  ],
  python: [
    { id: "fastapi", label: "FastAPI" },
    { id: "django", label: "Django" },
    { id: "flask", label: "Flask" },
  ],
  java: [{ id: "spring", label: "Spring Boot" }],
  go: [
    { id: "gin", label: "Gin" },
    { id: "echo", label: "Echo" },
  ],
  none: [],
};

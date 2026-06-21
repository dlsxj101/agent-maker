/**
 * 스캐폴딩 생성기 — 디스패처. (M7-0)
 *
 * 산출물 = 스택 공통 프론트엔드(채팅 위젯) + 백엔드 런타임별 골격.
 * 백엔드는 `spec.backend.runtime` 에 따라 Node/Python/Java/Go 모듈로 분기한다(풀 패리티, PLAN.md M7-D).
 * 모든 스택은 동일한 REST 계약(/health, /api/chat[, /stream, /confirm])과 동일한 깊이(멀티턴·스트리밍·
 * tool-use·RAG·가드/안전)를 목표로 한다.
 */

import type { AgentSpec } from "@/lib/agent-spec";
import type { GeneratedFile } from "../index";
import { frontendFiles } from "./shared";
import { nodeBackendFiles } from "./node";
import { pythonBackendFiles } from "./python";
import { javaBackendFiles } from "./java";
import { goBackendFiles } from "./go";

/** 런타임 → 백엔드 스캐폴드 생성기 */
function backendFiles(spec: AgentSpec, slug: string): GeneratedFile[] {
  switch (spec.backend.runtime) {
    case "python":
      return pythonBackendFiles(spec, slug);
    case "java":
      return javaBackendFiles(spec, slug);
    case "go":
      return goBackendFiles(spec, slug);
    case "node":
    case "none": // 백엔드 미선택 시에도 기동 가능한 Node 골격을 기본 제공
    default:
      return nodeBackendFiles(spec, slug);
  }
}

/** 스캐폴딩 파일 묶음 생성 (프론트엔드 공통 + 백엔드 스택별) */
export function generateScaffold(spec: AgentSpec, slug: string): GeneratedFile[] {
  return [...frontendFiles(spec), ...backendFiles(spec, slug)];
}

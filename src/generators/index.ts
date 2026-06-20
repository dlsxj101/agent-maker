/**
 * 산출물 생성기 (Export generators) — 골격(placeholder).
 *
 * 마법사 완료 시 AgentSpec을 받아 Claude Code용 산출물 묶음을 만든다.
 * 산출물 스펙은 PLAN.md §6 참조. ZIP 묶음은 클라이언트 사이드에서 생성한다(폐쇄망 친화).
 *
 * ⚠️ 현재는 시그니처/구조만 정의한다. 실제 템플릿 렌더링은 M4에서 구현한다.
 *    (PLAN.md §8 — M4: 산출물 생성기)
 */

import type { AgentSpec } from "@/lib/agent-spec";

/** 산출물 한 파일 */
export interface GeneratedFile {
  /** ZIP 내 경로 (예: "PROMPT.md") */
  path: string;
  contents: string;
}

/**
 * AgentSpec → 산출물 파일 목록.
 * TODO(M4): 아래 각 파일의 템플릿을 구현한다.
 *  - PROMPT.md       : Claude Code 마스터 지시 프롬프트 (구현 순서 포함) ★최우선
 *  - DESIGN.md       : 디자인 시스템(컬러 토큰·폰트·위젯·레이아웃)
 *  - CLAUDE.md       : 생성될 챗봇 프로젝트용 작업 지침
 *  - agent-spec.json : AgentSpec 직렬화(재현·재편집)
 *  - README.md       : 생성될 챗봇의 사람용 개요
 *  - .gitignore      : 선택된 스택에 맞는 ignore
 */
export function generateArtifacts(_spec: AgentSpec): GeneratedFile[] {
  throw new Error("Not implemented yet — M4에서 구현 (PLAN.md §6, §8)");
}

/**
 * 산출물 파일 목록 → ZIP(Blob).
 * TODO(M4): 클라이언트 사이드 zip 라이브러리(fflate/jszip 후보)로 구현한다.
 */
export async function bundleToZip(_files: GeneratedFile[]): Promise<Blob> {
  throw new Error("Not implemented yet — M4에서 구현 (PLAN.md §6, §8)");
}

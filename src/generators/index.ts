/**
 * 산출물 생성기 (Export generators) — 오케스트레이터.
 *
 * 마법사 완료 시 AgentSpec 을 받아 Claude Code용 산출물 묶음(문서 + 스캐폴딩)을 만들고,
 * 클라이언트 사이드에서 ZIP 으로 묶는다(폐쇄망 친화). 산출물 스펙: PLAN.md §6.
 *
 * 결정성(determinism): 동일 AgentSpec → 동일 파일 목록/내용. (단, agent-spec.json 의
 * meta.createdAt 만 시간 의존 — 테스트에서는 `now` 를 고정해 스냅샷을 안정화한다.)
 */

import { zipSync, strToU8 } from "fflate";
import type { AgentSpec } from "@/lib/agent-spec";
import { serializeSpec } from "@/lib/agent-spec";
import { projectSlug } from "./format";
import {
  renderPromptMd,
  renderDesignMd,
  renderClaudeMd,
  renderArchitectureMd,
  renderReadmeMd,
} from "./docs";
import { generateScaffold } from "./scaffold";

/** 산출물 한 파일 */
export interface GeneratedFile {
  /** ZIP 내 경로 (예: "PROMPT.md") */
  path: string;
  contents: string;
}

export interface GenerateOptions {
  /** agent-spec.json 의 createdAt 기록 시각 (테스트 결정성용) */
  now?: Date;
}

/**
 * AgentSpec → 산출물 파일 목록. (문서 + 스캐폴딩 코드, PLAN.md §6)
 * 경로 기준 정렬해 항상 같은 순서로 반환한다(결정성).
 */
export function generateArtifacts(spec: AgentSpec, options: GenerateOptions = {}): GeneratedFile[] {
  const slug = projectSlug(spec);
  const docs: GeneratedFile[] = [
    { path: "PROMPT.md", contents: renderPromptMd(spec) },
    { path: "DESIGN.md", contents: renderDesignMd(spec) },
    { path: "CLAUDE.md", contents: renderClaudeMd(spec) },
    { path: "ARCHITECTURE.md", contents: renderArchitectureMd(spec) },
    { path: "README.md", contents: renderReadmeMd(spec) },
    { path: "agent-spec.json", contents: serializeSpec(spec, options.now) + "\n" },
  ];
  const scaffold = generateScaffold(spec, slug);
  return [...docs, ...scaffold].sort((a, b) => a.path.localeCompare(b.path));
}

/**
 * 산출물 파일 목록 → ZIP(Uint8Array). 브라우저/노드 공통.
 * (브라우저에서 다운로드하려면 `new Blob([bytes], { type: "application/zip" })` 로 감싼다.)
 */
export function bundleToZipBytes(files: GeneratedFile[]): Uint8Array {
  const entries: Record<string, Uint8Array> = {};
  for (const f of files) entries[f.path] = strToU8(f.contents);
  return zipSync(entries, { level: 6 });
}

/**
 * 산출물 파일 목록 → ZIP(Blob). (브라우저 다운로드용)
 */
export async function bundleToZip(files: GeneratedFile[]): Promise<Blob> {
  const bytes = bundleToZipBytes(files);
  return new Blob([bytes as BlobPart], { type: "application/zip" });
}

/** AgentSpec → ZIP 바이트 (생성+묶음 한 번에) */
export function exportSpecToZipBytes(spec: AgentSpec, options: GenerateOptions = {}): Uint8Array {
  return bundleToZipBytes(generateArtifacts(spec, options));
}

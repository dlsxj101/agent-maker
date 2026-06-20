/**
 * 마법사 전역 상태 (Zustand + persist). M3 0번 작업: 상태관리 = Zustand 확정.
 *
 * - 단일 진실 `AgentSpec` 초안을 보관하고, 각 스텝이 섹션 슬라이스를 갱신한다.
 * - `persist` 미들웨어로 localStorage 에 자동 저장(폐쇄망 친화·서버 불필요, CLAUDE.md §4-6).
 * - 스텝 인덱스/이동/리셋. 파생값(충돌·준비도)은 selector 로 계산한다.
 */

"use client";

import { create } from "zustand";
import { persist } from "zustand/middleware";
import {
  AgentSpecSchema,
  createDraftSpec,
  type AgentSpec,
} from "@/lib/agent-spec";
import { WIZARD_STEPS } from "@/catalog";

/** 한 섹션을 부분 갱신할 때 쓰는 타입 (해당 섹션의 일부 필드) */
type SectionPatch<K extends keyof AgentSpec> = Partial<AgentSpec[K]>;

interface WizardState {
  spec: AgentSpec;
  stepIndex: number;
  /** 섹션 슬라이스 갱신 (예: updateSection("project", { org: "..." })) */
  updateSection: <K extends keyof AgentSpec>(key: K, patch: SectionPatch<K>) => void;
  /** spec 전체 교체 (agent-spec.json 불러오기 등) */
  loadSpec: (raw: unknown) => void;
  setStep: (i: number) => void;
  next: () => void;
  prev: () => void;
  reset: () => void;
}

const LAST_STEP = WIZARD_STEPS.length - 1;
const clampStep = (i: number) => Math.max(0, Math.min(LAST_STEP, i));

export const useWizardStore = create<WizardState>()(
  persist(
    (set) => ({
      spec: createDraftSpec(),
      stepIndex: 0,
      updateSection: (key, patch) =>
        set((s) => ({
          spec: { ...s.spec, [key]: { ...s.spec[key], ...patch } },
        })),
      loadSpec: (raw) => set({ spec: AgentSpecSchema.parse(raw) }),
      setStep: (i) => set({ stepIndex: clampStep(i) }),
      next: () => set((s) => ({ stepIndex: clampStep(s.stepIndex + 1) })),
      prev: () => set((s) => ({ stepIndex: clampStep(s.stepIndex - 1) })),
      reset: () => set({ spec: createDraftSpec(), stepIndex: 0 }),
    }),
    {
      name: "agent-maker:wizard", // localStorage 키
      version: 1,
      // 저장된 spec 은 스키마로 다시 파싱해 누락 필드를 기본값으로 메운다(마이그레이션 안전).
      merge: (persisted, current) => {
        const p = persisted as Partial<WizardState> | undefined;
        if (!p) return current;
        return {
          ...current,
          stepIndex: typeof p.stepIndex === "number" ? clampStep(p.stepIndex) : 0,
          spec: p.spec ? AgentSpecSchema.parse(p.spec) : current.spec,
        };
      },
    },
  ),
);

/**
 * 월 비용 추정 — 조달/예산 결정 지원. (PLAN.md §4 Step 11 "비용 추정")
 *
 * ⚠️ 추정값이다. 모델 단가는 카탈로그의 대략값(USD/1M tokens)이며 실제는 제공자 고지 기준.
 * self-hosted/오픈소스는 토큰당 과금이 없으므로 0(별도 인프라 비용은 추정 대상 외)으로 본다.
 */

import type { AgentSpec } from "@/lib/agent-spec";
import { LLM_MODEL_CATALOG } from "@/catalog";

/** 질의 1건당 평균 토큰 가정(입력=프롬프트+RAG 컨텍스트, 출력=답변) */
export const ASSUMED_TOKENS_PER_QUERY = { input: 1500, output: 400 };

export interface CostEstimate {
  /** 추정 가능 여부 (단가/질의수 정보가 있는지) */
  available: boolean;
  monthlyUsd: number;
  monthlyKrw: number;
  /** 참고: self-hosted 라 토큰 과금이 없음 */
  selfHosted: boolean;
  note: string;
}

/** 추정에 쓰는 환율(USD→KRW). 대략값. */
export const USD_TO_KRW = 1400;

export function estimateMonthlyCost(spec: AgentSpec): CostEstimate {
  const model = LLM_MODEL_CATALOG.find((m) => m.id === spec.llm.model);
  const queries = spec.llm.budget?.estMonthlyQueries ?? 0;
  const selfHosted = spec.llm.serving === "self-hosted";

  if (selfHosted) {
    return {
      available: true,
      monthlyUsd: 0,
      monthlyKrw: 0,
      selfHosted: true,
      note: "self-hosted — 토큰당 과금 없음(별도 인프라/GPU 비용은 추정 대상 외).",
    };
  }

  if (!queries || !model?.priceInPerMTok || !model?.priceOutPerMTok) {
    return {
      available: false,
      monthlyUsd: 0,
      monthlyKrw: 0,
      selfHosted: false,
      note: "월 예상 질의 수(llm.budget.estMonthlyQueries)와 모델 단가가 있어야 추정할 수 있습니다.",
    };
  }

  const inTok = (queries * ASSUMED_TOKENS_PER_QUERY.input) / 1_000_000;
  const outTok = (queries * ASSUMED_TOKENS_PER_QUERY.output) / 1_000_000;
  const usd = inTok * model.priceInPerMTok + outTok * model.priceOutPerMTok;
  return {
    available: true,
    monthlyUsd: Math.round(usd * 100) / 100,
    monthlyKrw: Math.round(usd * USD_TO_KRW),
    selfHosted: false,
    note: `질의 ${queries.toLocaleString()}건/월 · 질의당 입력 ${ASSUMED_TOKENS_PER_QUERY.input}/출력 ${ASSUMED_TOKENS_PER_QUERY.output} 토큰 가정(추정).`,
  };
}

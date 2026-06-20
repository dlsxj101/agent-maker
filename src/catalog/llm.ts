/**
 * LLM 카탈로그 — 제공자(provider)와 모델 목록 (데이터).
 *
 * CLAUDE.md §4: 새 모델이 나오면 이 데이터에 항목만 추가한다(컴포넌트 수정 불필요).
 * provider 값은 AgentSpec.llm.provider enum 과 일치한다. (src/lib/agent-spec.ts LLM_PROVIDERS)
 * model 의 id 는 AgentSpec.llm.model(string) 에 저장된다.
 *
 * 공공기관 맥락:
 *  - Claude 가 기본 권장. 폐쇄망/온프레미스는 오픈소스(국산 EXAONE/HyperCLOVA 포함) + self-hosted.
 *  - `airgap` 배포 + 클라우드 제공자(claude/openai) + official-api 는 충돌 경고 대상(C2).
 */

import type { LLM_PROVIDERS } from "@/lib/agent-spec";

type ProviderId = (typeof LLM_PROVIDERS)[number];

export interface LlmProvider {
  id: ProviderId;
  label: string;
  description: string;
}

export const LLM_PROVIDER_CATALOG: LlmProvider[] = [
  {
    id: "claude",
    label: "Claude (Anthropic)",
    description: "기본 권장 — 한국어 품질·안전성 우수, 근거 기반 답변에 강점",
  },
  {
    id: "openai",
    label: "OpenAI",
    description: "GPT 계열. 공식 API 위주(해외 클라우드 — 데이터 국내보관 시 검토 필요)",
  },
  {
    id: "opensource",
    label: "오픈소스 / 온프레미스",
    description: "폐쇄망·망분리 대응. 사내 추론 서버(vLLM/Ollama/TGI)로 self-hosted",
  },
];

export interface LlmModel {
  /** AgentSpec.llm.model 에 저장되는 안정적 id */
  id: string;
  providerId: ProviderId;
  label: string;
  /** 컨텍스트 윈도우(토큰) — 대략값, 비교 표시용 */
  contextWindow?: number;
  /** 기본 권장 모델 여부 */
  recommended?: boolean;
  /** 국산 모델 여부 (공공기관 국산 우선 가점) */
  domestic?: boolean;
  /** 폐쇄망에서 self-hosted 가능한 오픈소스 여부 */
  openSource?: boolean;
  /** 대략 단가(USD / 1M tokens) — 비용 추정용. 추정값이며 실제 단가는 제공자 고지 기준. */
  priceInPerMTok?: number;
  priceOutPerMTok?: number;
  notes?: string;
}

/** recommended=true 항목이 기본값(claude-sonnet-4-6)과 일치해야 한다. */
export const LLM_MODEL_CATALOG: LlmModel[] = [
  // Claude
  {
    id: "claude-opus-4-8",
    providerId: "claude",
    label: "Claude Opus 4.8",
    contextWindow: 200_000,
    priceInPerMTok: 15,
    priceOutPerMTok: 75,
    notes: "최고 성능 — 복잡한 추론·민감 민원 처리",
  },
  {
    id: "claude-sonnet-4-6",
    providerId: "claude",
    label: "Claude Sonnet 4.6",
    contextWindow: 200_000,
    recommended: true,
    priceInPerMTok: 3,
    priceOutPerMTok: 15,
    notes: "성능·비용 균형 — 대부분의 공공기관 챗봇 기본값",
  },
  {
    id: "claude-haiku-4-5",
    providerId: "claude",
    label: "Claude Haiku 4.5",
    contextWindow: 200_000,
    priceInPerMTok: 0.8,
    priceOutPerMTok: 4,
    notes: "빠르고 저렴 — 단순 FAQ·고트래픽",
  },
  // OpenAI
  {
    id: "gpt-4o",
    providerId: "openai",
    label: "GPT-4o",
    contextWindow: 128_000,
    priceInPerMTok: 2.5,
    priceOutPerMTok: 10,
    notes: "범용 — 해외 클라우드, 데이터 국내보관 요건 시 검토",
  },
  {
    id: "gpt-4o-mini",
    providerId: "openai",
    label: "GPT-4o mini",
    contextWindow: 128_000,
    priceInPerMTok: 0.15,
    priceOutPerMTok: 0.6,
    notes: "경량·저비용",
  },
  // 오픈소스 / 온프레미스 (국산 포함)
  {
    id: "exaone-3.5",
    providerId: "opensource",
    label: "EXAONE 3.5 (LG·국산)",
    contextWindow: 32_000,
    domestic: true,
    openSource: true,
    notes: "국산 한국어 특화 — 폐쇄망 self-hosted 적합",
  },
  {
    id: "hyperclova-x",
    providerId: "opensource",
    label: "HyperCLOVA X (네이버·국산)",
    domestic: true,
    notes: "국산 — 사내/전용 추론 환경",
  },
  {
    id: "qwen-2.5",
    providerId: "opensource",
    label: "Qwen 2.5",
    contextWindow: 128_000,
    openSource: true,
    notes: "오픈소스 — 한국어 포함 다국어",
  },
  {
    id: "llama-3.1",
    providerId: "opensource",
    label: "Llama 3.1",
    contextWindow: 128_000,
    openSource: true,
    notes: "오픈소스 — 폐쇄망 self-hosted",
  },
];

/** providerId 로 모델 목록 필터링 (UI 에서 제공자 선택 후 모델 노출용) */
export function modelsByProvider(providerId: ProviderId): LlmModel[] {
  return LLM_MODEL_CATALOG.filter((m) => m.providerId === providerId);
}

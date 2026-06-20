/**
 * 상호작용/에이전트 동작 카탈로그 (데이터). (PLAN.md §4 Step 8, docs/spec-schema.md §9)
 * id 는 AgentSpec.interaction 의 enum 값과 일치.
 */

import type { AGENT_MODES } from "@/lib/agent-spec";

type AgentModeId = (typeof AGENT_MODES)[number];

export interface AgentModeOption {
  id: AgentModeId;
  label: string;
  /** 한 줄 설명 */
  description: string;
  /** 동작 특징(프리뷰/PROMPT 에 반영) */
  behavior: string;
}

export const AGENT_MODE_CATALOG: AgentModeOption[] = [
  {
    id: "rag-cited",
    label: "RAG 인용형",
    description: "지식 검색 후 근거를 인용해 답변 (기본 권장)",
    behavior: "질문 → 검색 → 근거 기반 답변 + 출처 표기",
  },
  {
    id: "chatbot",
    label: "일반 챗봇",
    description: "도구·검색 없이 모델 단독 대화",
    behavior: "질문 → 답변 (단순 멀티턴)",
  },
  {
    id: "tool-agent",
    label: "도구호출 에이전트",
    description: "도구를 호출하며 단계적으로 문제 해결 (코딩에이전트식)",
    behavior: "추론 → 도구 호출 → 결과 관찰 → 반복 → 답변 (trace 표시)",
  },
  {
    id: "workflow",
    label: "워크플로우 가이드",
    description: "정해진 절차를 폼/버튼으로 안내",
    behavior: "단계별 입력 수집 → 분기 → 완료 (민원 신청 등)",
  },
];

/** UI 라벨 사전 (enum → 한글) */
export const INTERACTION_LABELS = {
  toolPolicy: { none: "없음", auto: "자동 실행", confirm: "사람 승인(HITL)" },
  speed: { slow: "느리게", normal: "보통", fast: "빠르게", instant: "즉시(스트리밍 없음)" },
  indicator: { dots: "점 애니메이션", cursor: "커서 깜빡임", none: "없음" },
  citationStyle: { none: "표시 안 함", inline: "인라인", footnote: "각주", chips: "출처 칩" },
  toolCallDisplay: { hidden: "숨김", collapsed: "접힘(펼치기 가능)", expanded: "펼침" },
  controls: {
    stop: "중지",
    regenerate: "재생성",
    copy: "복사",
    feedback: "피드백",
    clear: "대화 초기화",
    export: "대화 내보내기",
  },
  feedback: { none: "없음", thumbs: "좋아요/싫어요", rating: "별점" },
  length: { brief: "간결", balanced: "균형", detailed: "상세" },
  structured: { none: "자유 형식", sections: "섹션 구조", table: "표 위주", json: "JSON" },
  multimodal: {
    "image-input": "이미지 입력",
    "file-upload": "파일 업로드",
    "voice-input": "음성 입력(STT)",
    "voice-output": "음성 출력(TTS)",
  },
} as const;

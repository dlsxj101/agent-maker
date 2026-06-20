/**
 * 에이전트 능력 카탈로그 (데이터). (PLAN.md §4 Step 10, docs/spec-schema.md §10)
 * id 는 AgentSpec.agent 의 enum 값과 일치.
 */

import type { BUILTIN_TOOLS, CONTEXT_STRATEGIES, REFUSAL_STYLES } from "@/lib/agent-spec";

type BuiltinToolId = (typeof BUILTIN_TOOLS)[number];

export interface BuiltinToolOption {
  id: BuiltinToolId;
  label: string;
  icon: string;
  description: string;
  /** 폐쇄망에서 부적합할 수 있는 도구 (충돌 경고용) */
  needsNetwork?: boolean;
}

export const BUILTIN_TOOL_CATALOG: BuiltinToolOption[] = [
  { id: "web-search", label: "웹 검색", icon: "🔎", description: "외부 웹에서 최신 정보 검색", needsNetwork: true },
  { id: "code-interpreter", label: "코드 실행", icon: "💻", description: "샌드박스에서 코드/계산 실행" },
  { id: "calculator", label: "계산기", icon: "🧮", description: "정확한 수치 계산" },
  { id: "file-reader", label: "파일 읽기", icon: "📄", description: "업로드 문서 파싱/요약" },
  { id: "image-gen", label: "이미지 생성", icon: "🎨", description: "이미지 생성/편집", needsNetwork: true },
];

/** UI 라벨 사전 (enum → 한글) */
export const AGENT_LABELS = {
  contextStrategy: {
    none: "압축 안 함",
    summarize: "요약 압축",
    truncate: "오래된 메시지 절단",
    "sliding-window": "슬라이딩 윈도우",
  } satisfies Record<(typeof CONTEXT_STRATEGIES)[number], string>,
  refusalStyle: {
    polite: "정중히 거절",
    brief: "간결히 거절",
    redirect: "대안/담당부서 안내",
    strict: "엄격(규정 인용)",
  } satisfies Record<(typeof REFUSAL_STYLES)[number], string>,
} as const;

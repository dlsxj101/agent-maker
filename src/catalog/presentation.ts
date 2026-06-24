/**
 * UI 연출 카탈로그 — 스트리밍 글자생성 · 도구호출 표시 · 모션. (PLAN.md §4 Step 9)
 * 선택지 = 데이터(CLAUDE.md §4). id 는 AgentSpec.presentation 의 enum 값과 일치.
 *
 * 이 단계는 "어떻게 움직이고 보이나"(연출)를 정한다. on/off·속도·노출수준 같은
 * 행동 결정은 §9 interaction 에 있고, 여기서는 그 위의 시각 스타일/애니메이션을 고른다.
 */

export interface PresentationOption<T extends string> {
  id: T;
  label: string;
  description: string;
}

/** 스트리밍 글자 생성 애니메이션 */
export const STREAM_ANIMATION_CATALOG: PresentationOption<
  "typewriter" | "fade-in-words" | "blur-in" | "slide-up" | "none"
>[] = [
  { id: "typewriter", label: "타자기", description: "한 글자씩 또박또박. 가장 익숙한 생성 느낌" },
  { id: "fade-in-words", label: "단어 페이드", description: "단어 단위로 부드럽게 나타남" },
  { id: "blur-in", label: "블러 인", description: "흐릿하게 떠올라 선명해짐. 차분한 느낌" },
  { id: "slide-up", label: "슬라이드 업", description: "줄/청크가 아래에서 떠오름" },
  { id: "none", label: "즉시", description: "애니메이션 없이 한 번에 표시" },
];

/** 스트리밍 커서(캐럿) 글리프 */
export const STREAM_CURSOR_CATALOG: PresentationOption<"bar" | "block" | "underscore" | "none">[] = [
  { id: "bar", label: "막대 ▏", description: "얇은 세로 막대 커서" },
  { id: "block", label: "블록 █", description: "꽉 찬 블록 커서(터미널 느낌)" },
  { id: "underscore", label: "밑줄 _", description: "깜빡이는 밑줄 커서" },
  { id: "none", label: "없음", description: "커서를 표시하지 않음" },
];

/** 도구 호출 표시 UI */
export const TOOLCALL_UI_CATALOG: PresentationOption<
  "inline-status" | "card" | "timeline" | "terminal" | "chips"
>[] = [
  { id: "inline-status", label: "인라인 상태", description: "‘문서 검색 중…’ 같은 한 줄 상태 표시" },
  { id: "card", label: "접힘 카드", description: "도구 내역을 카드로 묶어 접고/펼침" },
  { id: "timeline", label: "타임라인", description: "단계별 점으로 잇는 세로 진행 표시" },
  { id: "terminal", label: "터미널 로그", description: "콘솔 로그 스타일(mono). 개발/기술 느낌" },
  { id: "chips", label: "도구 칩", description: "호출한 도구를 칩으로 순차 등장" },
];

/** 도구 호출 진행 애니메이션 */
export const TOOLCALL_ANIMATION_CATALOG: PresentationOption<
  "none" | "pulse" | "spinner" | "progress" | "stagger"
>[] = [
  { id: "none", label: "없음", description: "정적으로 표시" },
  { id: "pulse", label: "점멸", description: "진행 중 부드럽게 점멸" },
  { id: "spinner", label: "스피너", description: "회전 인디케이터" },
  { id: "progress", label: "진행 바", description: "단계 진행률을 막대로 표시" },
  { id: "stagger", label: "순차 등장", description: "단계가 차례로 미끄러져 등장" },
];

/** 메시지 등장 애니메이션 */
export const MESSAGE_ENTRANCE_CATALOG: PresentationOption<
  "none" | "fade" | "fade-up" | "pop" | "slide"
>[] = [
  { id: "none", label: "없음", description: "즉시 나타남" },
  { id: "fade", label: "페이드", description: "투명도만 부드럽게" },
  { id: "fade-up", label: "페이드 업", description: "살짝 떠오르며 나타남(기본)" },
  { id: "pop", label: "팝", description: "톡 튀어나오는 스케일 효과" },
  { id: "slide", label: "슬라이드", description: "옆에서 미끄러져 들어옴" },
];

/** 전체 모션 페이싱(속도감) */
export const MOTION_PACING_CATALOG: PresentationOption<
  "instant" | "snappy" | "smooth" | "relaxed"
>[] = [
  { id: "instant", label: "즉시", description: "애니메이션 거의 없음(0ms)" },
  { id: "snappy", label: "빠릿", description: "짧고 경쾌하게" },
  { id: "smooth", label: "부드럽게", description: "표준 속도(기본)" },
  { id: "relaxed", label: "느긋", description: "여유롭고 천천히" },
];

/** 페이싱 → 애니메이션 지속시간(ms). 산출물 CSS/프리뷰 공통 기준. */
export const PACING_MS: Record<string, number> = {
  instant: 0,
  snappy: 140,
  smooth: 260,
  relaxed: 420,
};

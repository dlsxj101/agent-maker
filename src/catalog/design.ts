/**
 * 디자인 카탈로그 — 테마 프리셋, 폰트 목록 (데이터).
 *
 * CLAUDE.md §4: 선택지는 코드에 하드코딩하지 않는다. 새 테마/폰트 = 이 데이터에 항목 추가.
 * 컬러 토큰 키는 AgentSpec.design.colors 와 일치한다. (src/lib/agent-spec.ts ColorsSchema)
 *
 * `theme = "custom"` 은 프리셋이 아니라 사용자 직접 입력 색을 의미한다(카탈로그에 두지 않음).
 */

/** AgentSpec.design.colors 와 동일한 컬러 토큰 묶음 */
export interface ColorTokens {
  primary: string;
  secondary: string;
  accent: string;
  background: string;
  surface: string;
  text: string;
  muted: string;
  border: string;
}

export interface ThemePreset {
  /** AgentSpec.design.theme 에 저장되는 안정적 id */
  id: string;
  /** 화면 표시 이름 */
  label: string;
  /** 한 줄 설명 (공공기관 톤 의도) */
  description: string;
  colors: ColorTokens;
}

/** 공공기관 톤(차분/신뢰감) 프리셋. 첫 항목이 기본값(gov-blue)과 일치. */
export const THEME_PRESETS: ThemePreset[] = [
  {
    id: "gov-blue",
    label: "신뢰 블루",
    description: "차분한 남색 기반 — 행정·공공 서비스의 기본 톤",
    colors: {
      primary: "#1F4E8C",
      secondary: "#3A6EA5",
      accent: "#1B998B",
      background: "#FFFFFF",
      surface: "#F5F7FA",
      text: "#1A1A1A",
      muted: "#6B7280",
      border: "#E5E7EB",
    },
  },
  {
    id: "gov-green",
    label: "안정 그린",
    description: "환경·복지·민원 안내에 어울리는 안정적인 녹색 톤",
    colors: {
      primary: "#1E6B4F",
      secondary: "#2E8B6B",
      accent: "#C9962E",
      background: "#FFFFFF",
      surface: "#F3F8F5",
      text: "#16241D",
      muted: "#5F6B64",
      border: "#DCE8E1",
    },
  },
  {
    id: "gov-gray",
    label: "중립 그레이",
    description: "장식을 최소화한 중립 톤 — 가독성·접근성 우선",
    colors: {
      primary: "#374151",
      secondary: "#4B5563",
      accent: "#2563EB",
      background: "#FFFFFF",
      surface: "#F4F5F7",
      text: "#111827",
      muted: "#6B7280",
      border: "#E2E5EA",
    },
  },
];

export interface FontOption {
  /** AgentSpec.design.fonts.heading/body 에 저장되는 안정적 id */
  id: string;
  /** 화면 표시 이름 */
  label: string;
  /** CSS font-family 값 */
  family: string;
  /** 폰트 출처/배포 */
  source: string;
  /** 국산/한국어 친화 여부 (공공기관 국산 우선 가점) */
  domestic: boolean;
}

/** 국산·한국어 친화 폰트 우선. 첫 항목이 기본값(pretendard)과 일치. */
export const FONT_OPTIONS: FontOption[] = [
  {
    id: "pretendard",
    label: "Pretendard",
    family: "'Pretendard', system-ui, sans-serif",
    source: "오픈소스 (OFL)",
    domestic: true,
  },
  {
    id: "nanum-gothic",
    label: "나눔고딕",
    family: "'Nanum Gothic', sans-serif",
    source: "네이버 (OFL)",
    domestic: true,
  },
  {
    id: "noto-sans-kr",
    label: "본고딕 (Noto Sans KR)",
    family: "'Noto Sans KR', sans-serif",
    source: "Google·Adobe (OFL)",
    domestic: true,
  },
  {
    id: "system",
    label: "시스템 기본",
    family: "system-ui, -apple-system, sans-serif",
    source: "OS 내장",
    domestic: false,
  },
];

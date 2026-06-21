/**
 * 산출물 문서용 한글 라벨/포맷 헬퍼 (생성기 전용).
 *
 * AgentSpec 의 enum 값(영문 id)을 사람이 읽는 문서(PROMPT/DESIGN/README 등)에서
 * 한글 라벨로 바꾼다. 목록형 카탈로그(테마·폰트·LLM 모델)는 src/catalog 에서 조회한다.
 *
 * 주의: 이 라벨은 "산출물 문서 가독성"용이다. 마법사 UI 라벨은 M4에서 카탈로그로 확장한다.
 */

import type { AgentSpec } from "@/lib/agent-spec";

/** enum id → 한글 라벨 사전 (문서에 등장하는 것 위주) */
const LABELS: Record<string, Record<string, string>> = {
  purpose: {
    "civil-complaint": "민원 안내",
    "internal-support": "내부 업무 지원",
    faq: "FAQ",
    "policy-info": "정책/제도 안내",
    booking: "예약/신청",
    other: "기타",
  },
  audience: {
    citizen: "일반 국민",
    "public-official": "공무원",
    "specific-applicant": "특정 민원인",
    other: "기타",
  },
  languages: { ko: "한국어", en: "영어", multi: "다국어" },
  deployEnv: {
    "on-premise-airgap": "폐쇄망(완전 분리)",
    "network-separated": "망분리",
    "gov-cloud": "공공 클라우드(G-Cloud 등)",
    "public-cloud": "일반 클라우드",
  },
  traffic: { low: "낮음", medium: "보통", high: "높음" },
  mode: { light: "라이트", dark: "다크", system: "시스템" },
  layout: {
    "full-page": "전체 페이지형",
    "floating-widget": "우하단 플로팅 위젯",
    "side-panel": "사이드 패널",
    "iframe-embed": "iframe 임베드",
  },
  framework: {
    react: "React",
    nextjs: "Next.js",
    vue: "Vue",
    "vanilla-widget": "순수 JS 위젯",
    "embed-snippet": "임베드 스니펫",
  },
  embed: {
    "standalone-page": "독립 페이지",
    "script-tag": "스크립트 한 줄 삽입",
    iframe: "iframe",
    "npm-package": "npm 패키지",
  },
  a11yLevel: {
    none: "미지정",
    "kwcag-a": "KWCAG 2.2 A",
    "kwcag-aa": "KWCAG 2.2 AA",
    "kwcag-aaa": "KWCAG 2.2 AAA",
  },
  runtime: { node: "Node.js", python: "Python", java: "Java", go: "Go", none: "없음" },
  auth: {
    none: "없음",
    session: "세션",
    jwt: "JWT",
    "sso-gpki": "SSO(GPKI/행정전자서명)",
    oauth: "OAuth",
  },
  deploy: {
    docker: "Docker 컨테이너",
    kubernetes: "Kubernetes",
    "single-server": "단일 서버",
    serverless: "서버리스",
  },
  network: {
    "internet-allowed": "외부 인터넷 허용",
    "proxy-only": "프록시 경유만",
    offline: "완전 오프라인",
  },
  rdb: {
    postgres: "PostgreSQL",
    mysql: "MySQL",
    mariadb: "MariaDB",
    oracle: "Oracle",
    tibero: "Tibero(국산)",
    none: "없음",
  },
  fileStore: {
    local: "로컬 파일시스템",
    "s3-compatible": "S3 호환 스토리지",
    "gov-storage": "공공 클라우드 스토리지",
    none: "없음",
  },
  sources: {
    "upload-pdf": "PDF 업로드",
    "upload-hwp": "HWP(한글) 업로드",
    "upload-docx": "DOCX 업로드",
    "web-crawl": "웹 크롤링",
    database: "데이터베이스",
    "external-api": "외부 API",
  },
  chunking: {
    fixed: "고정 크기",
    paragraph: "문단 단위",
    semantic: "시맨틱",
    page: "페이지 단위",
  },
  vectorDb: {
    pgvector: "pgvector",
    qdrant: "Qdrant",
    milvus: "Milvus",
    weaviate: "Weaviate",
    chroma: "Chroma",
    faiss: "FAISS(로컬)",
  },
  retrieval: { vector: "벡터 단독", hybrid: "하이브리드(BM25+벡터)" },
  provider: { claude: "Claude (Anthropic)", openai: "OpenAI", opensource: "오픈소스/온프레미스" },
  serving: {
    "official-api": "공식 API",
    proxy: "프록시 경유",
    "self-hosted": "사내 추론 서버(vLLM/Ollama/TGI)",
  },
  tone: { formal: "공손/격식", concise: "간결", friendly: "친근" },
  onUnknown: { apologize: "정중히 한계 안내", rephrase: "재질문 유도", handoff: "상담사 연결" },
  handoff: { none: "없음", "human-agent": "상담원", phone: "전화", email: "이메일" },
  voice: {
    none: "사용 안 함",
    browser: "브라우저 내장",
    "whisper-local": "Whisper(온프레미스)",
    "coqui-local": "Coqui TTS(온프레미스)",
    clova: "네이버 클로바(클라우드)",
    google: "Google(클라우드)",
  },
};

/** 단일 enum 값을 한글 라벨로. 사전에 없으면 원문 반환. */
export function label(group: keyof typeof LABELS, value: string | undefined): string {
  if (!value) return "-";
  return LABELS[group]?.[value] ?? value;
}

/** enum 배열을 "A, B, C" 한글 라벨 목록으로. 비어 있으면 placeholder. */
export function labelList(
  group: keyof typeof LABELS,
  values: readonly string[] | undefined,
  empty = "(미선택)",
): string {
  if (!values || values.length === 0) return empty;
  return values.map((v) => label(group, v)).join(", ");
}

/** boolean → "예/아니오" */
export function yesno(v: boolean | undefined): string {
  return v ? "예" : "아니오";
}

/**
 * 산출물 프로젝트 폴더/패키지 이름으로 쓸 안정적 slug.
 * 기관/챗봇명이 비어 있으면 기본값. 한글·공백은 하이픈으로, 그 외 비ASCII는 제거.
 */
export function projectSlug(spec: AgentSpec): string {
  const base = spec.project.name || spec.project.org || "chatbot";
  const slug = base
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9가-힣]+/g, "-")
    .replace(/[가-힣]+/g, "") // 영문 slug 우선; 한글만 있으면 아래 fallback
    .replace(/^-+|-+$/g, "");
  return slug || "gov-chatbot";
}

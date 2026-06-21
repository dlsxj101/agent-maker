/**
 * AgentSpec — 마법사의 모든 선택을 담는 설정 객체의 단일 진실(SSOT).
 *
 * 이 Zod 스키마가 타입·검증·기본값의 출발점이다. (CLAUDE.md §4, PLAN.md §5)
 * 필드/enum 의 상세 정의는 docs/spec-schema.md 를 따른다. (섹션 번호 일치)
 *
 * 설계 규칙:
 *  - 목록형 선택지(LLM·임베딩·VectorDB·테마·폰트 등)는 이 스키마에서 `string` 으로 두고,
 *    실제 값 목록은 src/catalog/* 에 **데이터**로 둔다. (새 옵션 추가 = 데이터 추가)
 *  - 고정 선택지(enum)는 여기서 정의하고, UI·카탈로그가 재사용한다.
 *  - 필드 추가 시: 이 스키마 → 타입 → UI → 생성기 순으로 일관되게 반영한다.
 *
 * 기본값/필수 2단 설계 (PLAN.md §5, docs/spec-schema.md "Export 차단 게이트"):
 *  - 이 스키마는 **모든 필드에 안전한 기본값**을 부여한다. 따라서 `AgentSpecSchema.parse({})`
 *    만으로 완전한 초안(draft) 스펙이 만들어진다 — 마법사 초기 상태·localStorage 복원·round-trip
 *    에 유리하다.
 *  - "한 방에" 구현에 **필수인 필드(비어 있으면 export 차단)** 는 별도 준비도 검사
 *    (`assertExportReady`, M5 Review 게이트에서 확장)로 다룬다. 스키마 파싱 자체는 막지 않는다.
 */

import { z } from "zod";

/** 스키마 버전 — 변경 시 올리고 docs/spec-schema.md와 함께 갱신 */
export const SPEC_VERSION = "1.0";
/** 산출물 생성기 버전 */
export const GENERATOR_VERSION = "0.1.0";

/* -------------------------------------------------------------------------- */
/* 공통 enum 값 (UI·카탈로그가 재사용하도록 const + z.enum 으로 노출)             */
/* -------------------------------------------------------------------------- */

export const PURPOSES = [
  "civil-complaint", // 민원 안내
  "internal-support", // 내부 업무 지원
  "faq", // FAQ
  "policy-info", // 정책/제도 안내
  "booking", // 예약/신청
  "other",
] as const;

export const AUDIENCES = [
  "citizen", // 일반 국민
  "public-official", // 공무원
  "specific-applicant", // 특정 민원인
  "other",
] as const;

export const LANGUAGES = ["ko", "en", "multi"] as const;

export const DEPLOY_ENVS = [
  "on-premise-airgap", // 폐쇄망(완전 분리)
  "network-separated", // 망분리
  "gov-cloud", // 공공 클라우드(G-Cloud 등)
  "public-cloud", // 일반 클라우드
] as const;

export const TRAFFIC_LEVELS = ["low", "medium", "high"] as const;

export const COLOR_MODES = ["light", "dark", "system"] as const;
export const BUBBLE_RADII = ["sharp", "rounded", "pill"] as const;
export const BUBBLE_ALIGNS = ["left", "right"] as const;
export const INPUT_STYLES = ["box", "underline", "floating"] as const;
export const DENSITIES = ["compact", "comfortable"] as const;
export const LAYOUTS = [
  "full-page", // 전체 페이지형
  "floating-widget", // 우하단 플로팅
  "side-panel", // 사이드 패널
  "iframe-embed", // iframe 임베드
] as const;

export const FRONTEND_FRAMEWORKS = [
  "react",
  "nextjs",
  "vue",
  "vanilla-widget",
  "embed-snippet",
] as const;
export const EMBED_MODES = ["standalone-page", "script-tag", "iframe", "npm-package"] as const;
export const A11Y_LEVELS = ["none", "kwcag-a", "kwcag-aa", "kwcag-aaa"] as const;

export const BACKEND_RUNTIMES = ["node", "python", "java", "go", "none"] as const;
export const AUTH_MODES = ["none", "session", "jwt", "sso-gpki", "oauth"] as const;
export const DEPLOY_FORMS = ["docker", "kubernetes", "single-server", "serverless"] as const;
export const NETWORK_MODES = ["internet-allowed", "proxy-only", "offline"] as const;

export const RDB_OPTIONS = ["postgres", "mysql", "mariadb", "oracle", "tibero", "none"] as const;
export const HISTORY_OPTIONS = ["same-as-rdb", "separate", "none"] as const;
export const CACHE_OPTIONS = ["redis", "none"] as const;
export const FILE_STORE_OPTIONS = ["local", "s3-compatible", "gov-storage", "none"] as const;

export const RAG_SOURCES = [
  "upload-pdf",
  "upload-hwp", // ※ HWP: 공공기관 필수
  "upload-docx",
  "web-crawl",
  "database",
  "external-api",
] as const;
export const CHUNKING_STRATEGIES = ["fixed", "paragraph", "semantic", "page"] as const;
export const VECTOR_DBS = ["pgvector", "qdrant", "milvus", "weaviate", "chroma", "faiss"] as const;
export const RETRIEVAL_STRATEGIES = ["vector", "hybrid"] as const;

export const LLM_PROVIDERS = ["claude", "openai", "opensource"] as const;
export const LLM_SERVINGS = ["official-api", "proxy", "self-hosted"] as const;

export const PERSONA_TONES = ["formal", "concise", "friendly"] as const;
export const FALLBACK_ON_UNKNOWN = ["apologize", "rephrase", "handoff"] as const;
export const HANDOFF_MODES = ["none", "human-agent", "phone", "email"] as const;
export const I18N_DEFAULT_LANGS = ["ko", "en"] as const;

// §9 interaction — 상호작용 & 에이전트 동작
export const AGENT_MODES = ["chatbot", "tool-agent", "rag-cited", "workflow"] as const;
export const TOOL_POLICIES = ["none", "auto", "confirm"] as const;
export const STREAM_SPEEDS = ["slow", "normal", "fast", "instant"] as const;
export const TYPING_INDICATORS = ["dots", "cursor", "none"] as const;
export const CITATION_STYLES = ["none", "inline", "footnote", "chips"] as const;
export const TOOLCALL_DISPLAYS = ["hidden", "collapsed", "expanded"] as const;
export const CHAT_CONTROLS = ["stop", "regenerate", "copy", "feedback", "clear", "export"] as const;
export const FEEDBACK_STYLES = ["none", "thumbs", "rating"] as const;
export const MODALITIES = ["image-input", "file-upload", "voice-input", "voice-output"] as const;
export const OUTPUT_LENGTHS = ["brief", "balanced", "detailed"] as const;
export const STRUCTURED_OUTPUTS = ["none", "sections", "table", "json"] as const;

// §10 agent — 에이전트 능력 & 컨텍스트 & 안전
export const BUILTIN_TOOLS = [
  "web-search",
  "code-interpreter",
  "calculator",
  "file-reader",
  "image-gen",
] as const;
export const CONTEXT_STRATEGIES = ["none", "summarize", "truncate", "sliding-window"] as const;
export const REFUSAL_STYLES = ["polite", "brief", "redirect", "strict"] as const;

// 음성 엔진 (multimodal voice 선택 시) — *-local 은 폐쇄망 적합
export const VOICE_STT_ENGINES = ["none", "browser", "whisper-local", "clova", "google"] as const;
export const VOICE_TTS_ENGINES = ["none", "browser", "coqui-local", "clova", "google"] as const;

// 접근성 사용자 컨트롤 (KWCAG)
export const A11Y_USER_CONTROLS = ["font-size", "high-contrast", "screen-reader-hints"] as const;

// 봇 아바타 스타일 / 배포 채널 / 분석 도구
export const AVATAR_STYLES = ["none", "initials", "icon", "image"] as const;
export const DEPLOY_CHANNELS = ["web", "kakao-channel", "kakao-alimtalk", "app", "slack", "teams"] as const;
export const ANALYTICS_PROVIDERS = ["none", "ga", "matomo", "self-hosted"] as const;

// RAG 문서 접근 제어 / 이용자 본인확인
export const RAG_ACCESS_CONTROLS = ["none", "role-based", "department"] as const;
export const USER_AUTH_MODES = ["none", "simple-auth", "gov-pki", "membership"] as const;

export const API_AUTH_MODES = ["none", "api-key", "oauth", "gpki"] as const;
export const WEBHOOK_CHANNELS = ["email", "sms", "none"] as const;

export const EVAL_METRICS = [
  "retrieval-hit", // RAG 검색 적중
  "citation-accuracy", // 인용 정확도
  "pii-avoidance", // 민감정보 응답 회피
  "refusal-appropriateness", // 거절 적절성
] as const;

export const COMPLIANCE_A11Y = ["none", "kwcag-aa", "kwcag-aaa"] as const;
export const CERTIFICATIONS = ["gs", "cc", "none"] as const;

export const OBSERVABILITY_METRICS = ["tokens", "latency", "error-rate", "none"] as const;
export const CACHING_LAYERS = ["prompt", "embedding", "response", "tool-result", "none"] as const;

/* -------------------------------------------------------------------------- */
/* §0 meta                                                                    */
/* -------------------------------------------------------------------------- */

const MetaSchema = z
  .object({
    specVersion: z.string().default(SPEC_VERSION),
    generatorVersion: z.string().default(GENERATOR_VERSION),
    /** ISO8601 — 직렬화 시점에 기록 (serializeSpec) */
    createdAt: z.string().optional(),
  })
  .prefault({});

/* -------------------------------------------------------------------------- */
/* §1 project — 기관/프로젝트 기본 정보                                        */
/* -------------------------------------------------------------------------- */

const ProjectSchema = z
  .object({
    org: z.string().default(""), // 기관명 (export 게이트에서 비어 있으면 차단)
    dept: z.string().optional(),
    name: z.string().default(""), // 챗봇 명칭
    purpose: z.array(z.enum(PURPOSES)).default([]),
    audience: z.array(z.enum(AUDIENCES)).default([]),
    languages: z.array(z.enum(LANGUAGES)).default(["ko"]),
    deployEnv: z.enum(DEPLOY_ENVS).default("gov-cloud"),
    traffic: z.enum(TRAFFIC_LEVELS).optional(),
  })
  .prefault({});

/* -------------------------------------------------------------------------- */
/* §2 design — 디자인 & 테마 (시각적 선택)                                     */
/* -------------------------------------------------------------------------- */

/** 컬러 토큰 (hex). 산출물에서 CSS 변수/디자인 토큰으로 출력한다. */
const ColorsSchema = z
  .object({
    primary: z.string().default("#1F4E8C"),
    secondary: z.string().default("#3A6EA5"),
    accent: z.string().default("#1B998B"),
    background: z.string().default("#FFFFFF"),
    surface: z.string().default("#F5F7FA"),
    text: z.string().default("#1A1A1A"),
    muted: z.string().default("#6B7280"),
    border: z.string().default("#E5E7EB"),
  })
  .prefault({});

const WidgetStyleSchema = z
  .object({
    bubbleRadius: z.enum(BUBBLE_RADII).default("rounded"),
    avatar: z.boolean().default(true),
    avatarStyle: z.enum(AVATAR_STYLES).default("initials"), // 아바타 표현 방식
    align: z.enum(BUBBLE_ALIGNS).default("left"), // 봇 말풍선 정렬
    inputStyle: z.enum(INPUT_STYLES).default("box"),
    density: z.enum(DENSITIES).default("comfortable"),
  })
  .prefault({});

const DesignSchema = z
  .object({
    /** 프리셋 테마 id (catalog) 또는 "custom" */
    theme: z.string().default("gov-blue"),
    colors: ColorsSchema,
    mode: z.enum(COLOR_MODES).default("light"),
    fonts: z
      .object({
        heading: z.string().default("pretendard"), // 국산 폰트 우선 (catalog)
        body: z.string().default("pretendard"),
      })
      .prefault({}),
    widgetStyle: WidgetStyleSchema,
    layout: z.enum(LAYOUTS).default("floating-widget"),
  })
  .prefault({});

/* -------------------------------------------------------------------------- */
/* §3 frontend                                                                */
/* -------------------------------------------------------------------------- */

const FrontendSchema = z
  .object({
    framework: z.enum(FRONTEND_FRAMEWORKS).default("nextjs"),
    uiLib: z.string().optional(), // (catalog) shadcn/mui/antd/none
    embed: z.enum(EMBED_MODES).default("standalone-page"),
    responsive: z.boolean().default(true),
    a11yLevel: z.enum(A11Y_LEVELS).default("kwcag-aa"),
    localizeUi: z.boolean().default(false), // UI 문구 다국어 현지화
    rtl: z.boolean().default(false), // 우→좌 언어 지원
    channels: z.array(z.enum(DEPLOY_CHANNELS)).default(["web"]), // 배포 채널
    userAuth: z.enum(USER_AUTH_MODES).default("none"), // 이용자 본인확인/로그인
  })
  .prefault({});

/* -------------------------------------------------------------------------- */
/* §4 backend                                                                 */
/* -------------------------------------------------------------------------- */

const BackendSchema = z
  .object({
    runtime: z.enum(BACKEND_RUNTIMES).default("node"),
    framework: z.string().optional(), // (catalog) nestjs/express/fastapi/django/spring…
    auth: z.enum(AUTH_MODES).default("session"),
    deploy: z.enum(DEPLOY_FORMS).default("docker"),
    network: z.enum(NETWORK_MODES).default("internet-allowed"),
    logging: z
      .object({
        audit: z.boolean().default(true), // 감사 로그(공공기관 대응)
        monitoring: z.string().optional(), // (catalog) prometheus/none
      })
      .prefault({}),
    sla: z
      .object({
        targetLatencyMs: z.number().optional(),
        concurrency: z.number().optional(),
      })
      .optional(),
  })
  .prefault({});

/* -------------------------------------------------------------------------- */
/* §5 database                                                                */
/* -------------------------------------------------------------------------- */

const DatabaseSchema = z
  .object({
    rdb: z.enum(RDB_OPTIONS).default("postgres"),
    history: z.enum(HISTORY_OPTIONS).default("same-as-rdb"),
    cache: z.enum(CACHE_OPTIONS).optional(),
    fileStore: z.enum(FILE_STORE_OPTIONS).default("local"),
  })
  .prefault({});

/* -------------------------------------------------------------------------- */
/* §6 rag — RAG 파이프라인 (핵심)                                              */
/* -------------------------------------------------------------------------- */

const RagSchema = z
  .object({
    enabled: z.boolean().default(true),
    sources: z.array(z.enum(RAG_SOURCES)).default([]),
    ingest: z
      .object({
        ocr: z.boolean().default(false),
        tables: z.boolean().default(false),
        images: z.boolean().default(false),
      })
      .prefault({}),
    chunking: z
      .object({
        strategy: z.enum(CHUNKING_STRATEGIES).default("paragraph"),
        size: z.number().optional(), // 토큰/문자
        overlap: z.number().optional(),
      })
      .prefault({}),
    embedding: z.string().default("bge-m3"), // (catalog) — 한국어·온프레미스 기본
    vectorDb: z.enum(VECTOR_DBS).default("pgvector"),
    retrieval: z
      .object({
        strategy: z.enum(RETRIEVAL_STRATEGIES).default("hybrid"), // BM25 + 벡터
        topK: z.number().optional(),
        reranker: z.string().optional(), // (catalog) bge-reranker/none
      })
      .prefault({}),
    citations: z.boolean().default(true), // 출처/페이지 표기 (공공 신뢰성)
    accessControl: z.enum(RAG_ACCESS_CONTROLS).default("none"), // 문서 권한 기반 검색
  })
  .prefault({});

/* -------------------------------------------------------------------------- */
/* §7 llm — 생성 모델                                                          */
/* -------------------------------------------------------------------------- */

const LlmSchema = z
  .object({
    provider: z.enum(LLM_PROVIDERS).default("claude"),
    model: z.string().default("claude-sonnet-4-6"), // (catalog)
    serving: z.enum(LLM_SERVINGS).default("official-api"),
    params: z
      .object({
        temperature: z.number().default(0.3),
        maxTokens: z.number().default(2048),
        persona: z.string().optional(), // 시스템 프롬프트 톤/페르소나
      })
      .prefault({}),
    guardrails: z
      .object({
        groundedOnly: z.boolean().default(true), // 근거 기반 답변 강제(환각 억제)
        piiFilter: z.boolean().default(true), // 민감정보 필터
        bannedTopics: z.array(z.string()).optional(),
      })
      .prefault({}),
    routing: z.boolean().optional(), // 비용/난이도 기반 모델 라우팅
    session: z
      .object({
        multiTurn: z.boolean().default(true),
        historyTurns: z.number().optional(),
        contextWindow: z.number().optional(),
        timeoutMin: z.number().optional(),
      })
      .prefault({}),
    budget: z
      .object({
        estMonthlyQueries: z.number().optional(),
        maxCostPerMonth: z.number().optional(),
      })
      .optional(),
  })
  .prefault({});

/* -------------------------------------------------------------------------- */
/* §8 conversation — 대화 설계 (챗봇의 "내용")                                 */
/* -------------------------------------------------------------------------- */

const ConversationSchema = z
  .object({
    persona: z
      .object({
        tone: z.enum(PERSONA_TONES).default("formal"),
        speaker: z.string().optional(), // 화자 (예: "OO기관 안내")
        systemPrompt: z.string().optional(),
      })
      .prefault({}),
    intents: z
      .array(
        z.object({
          name: z.string(), // 예: "증명서 발급 안내"
          examples: z.array(z.string()).optional(),
          flow: z.string().optional(),
        }),
      )
      .default([]),
    quickReplies: z.array(z.string()).optional(),
    fallback: z
      .object({
        onUnknown: z.enum(FALLBACK_ON_UNKNOWN).default("apologize"),
        handoff: z.enum(HANDOFF_MODES).optional(),
        handoffSlaMin: z.number().optional(), // 상담사 연결 목표 응답시간(분)
        showQueue: z.boolean().default(false), // 대기열 순번/예상 대기시간 표시
        offHoursMessage: z.string().optional(),
      })
      .prefault({}),
    i18n: z
      .object({
        perLanguageKb: z.boolean().optional(),
        defaultLanguage: z.enum(I18N_DEFAULT_LANGS).optional(),
      })
      .optional(),
  })
  .prefault({});

/* -------------------------------------------------------------------------- */
/* §9 interaction — 상호작용 & 에이전트 동작 방식 (행동/UX)                      */
/* -------------------------------------------------------------------------- */

const InteractionSchema = z
  .object({
    agentMode: z.enum(AGENT_MODES).default("rag-cited"),
    toolPolicy: z.enum(TOOL_POLICIES).default("none"),
    maxSteps: z.number().optional(), // 에이전트 루프 최대 반복 (tool-agent)
    parallelTools: z.boolean().optional(),
    streaming: z
      .object({
        enabled: z.boolean().default(true),
        speed: z.enum(STREAM_SPEEDS).default("normal"),
        indicator: z.enum(TYPING_INDICATORS).default("dots"),
      })
      .prefault({}),
    rendering: z
      .object({
        markdown: z.boolean().default(true),
        codeBlocks: z.boolean().default(true),
        citationStyle: z.enum(CITATION_STYLES).default("chips"),
        toolCallDisplay: z.enum(TOOLCALL_DISPLAYS).default("collapsed"),
        showContextMeter: z.boolean().default(false), // 컨텍스트 사용량 화면 표시
      })
      .prefault({}),
    output: z
      .object({
        length: z.enum(OUTPUT_LENGTHS).default("balanced"), // 답변 길이 성향
        structured: z.enum(STRUCTURED_OUTPUTS).default("none"), // 구조화 출력
      })
      .prefault({}),
    welcome: z
      .object({
        greeting: z.string().optional(),
        showSuggestions: z.boolean().default(true),
      })
      .prefault({}),
    controls: z.array(z.enum(CHAT_CONTROLS)).default(["copy", "feedback"]),
    feedback: z.enum(FEEDBACK_STYLES).default("thumbs"),
    multimodal: z.array(z.enum(MODALITIES)).default([]),
    // 음성 엔진 (multimodal 에 voice-* 선택 시)
    voice: z
      .object({
        stt: z.enum(VOICE_STT_ENGINES).default("none"),
        tts: z.enum(VOICE_TTS_ENGINES).default("none"),
      })
      .prefault({}),
    // 이용 고지 / 동의 배너 (공공기관)
    disclaimer: z
      .object({
        aiNotice: z.boolean().default(true), // "AI가 답변합니다" 고지
        consent: z.boolean().default(false), // 개인정보/이용 동의 필요
        text: z.string().optional(),
      })
      .prefault({}),
    // 상태 메시지
    states: z
      .object({
        error: z.string().optional(),
        offline: z.string().optional(),
        empty: z.string().optional(),
      })
      .prefault({}),
    // 접근성 사용자 컨트롤 (KWCAG)
    a11yControls: z.array(z.enum(A11Y_USER_CONTROLS)).default([]),
    // 능동 상호작용 (후속 질문 추천 / 유휴 재참여)
    proactive: z
      .object({
        followupSuggestions: z.boolean().default(false), // 답변 후 후속 질문 추천
        reengageAfterMin: z.number().optional(), // 유휴 후 재참여(분)
      })
      .prefault({}),
    // 입력 제한
    inputLimits: z
      .object({
        maxChars: z.number().optional(), // 입력 글자수 상한
        maxFileMb: z.number().optional(), // 업로드 파일 크기 상한(MB)
        allowedFileTypes: z.array(z.string()).optional(), // 허용 확장자
      })
      .prefault({}),
  })
  .prefault({});

/* -------------------------------------------------------------------------- */
/* §10 agent — 에이전트 능력 & 컨텍스트 & 안전                                  */
/* -------------------------------------------------------------------------- */

const AgentSchema = z
  .object({
    // 명확화 질문: 정보가 부족하면 사용자에게 되묻기 (AskUserQuestion식)
    askUser: z.boolean().default(false),
    // 서브에이전트: 하위 작업을 분담하는 보조 에이전트
    subAgents: z
      .object({
        enabled: z.boolean().default(false),
        maxParallel: z.number().optional(),
        // 역할(role) 명세 — 하위 에이전트가 맡을 전문 역할
        roles: z
          .array(z.object({ name: z.string(), purpose: z.string().optional() }))
          .default([]),
      })
      .prefault({}),
    // 내장 도구 (integrations.tools = 커스텀 API, 이건 일반 능력 도구)
    builtinTools: z.array(z.enum(BUILTIN_TOOLS)).default([]),
    // 장기 기억: 세션을 넘어 사용자/지식을 벡터로 기억
    memory: z
      .object({
        longTerm: z.boolean().default(false),
      })
      .prefault({}),
    // 컨텍스트 관리: 윈도가 찰 때 자동 압축
    context: z
      .object({
        autoCompact: z.boolean().default(false),
        strategy: z.enum(CONTEXT_STRATEGIES).default("none"),
        budgetTokens: z.number().optional(), // 압축 트리거 토큰 예산
      })
      .prefault({}),
    // 안전 (§7 llm.guardrails 보완)
    safety: z
      .object({
        refusalStyle: z.enum(REFUSAL_STYLES).default("polite"),
        rateLimitPerMin: z.number().optional(), // 대화 단위 분당 요청 상한
        abuseFilter: z.boolean().default(false), // 남용/욕설/도배 필터
      })
      .prefault({}),
  })
  .prefault({});

/* -------------------------------------------------------------------------- */
/* §11 integrations — 연동 & API                                               */
/* -------------------------------------------------------------------------- */

const IntegrationsSchema = z
  .object({
    apis: z
      .array(
        z.object({
          name: z.string(),
          auth: z.enum(API_AUTH_MODES).default("none"),
          rateLimit: z.number().optional(),
        }),
      )
      .default([]),
    tools: z
      .array(
        z.object({
          name: z.string(),
          description: z.string(),
          // 도구 입력 스키마 (JSON Schema) — LLM tool-use 시 인자 선택에 사용. 없으면 빈 객체.
          parameters: z.record(z.string(), z.unknown()).optional(),
        }),
      )
      .default([]),
    webhooks: z.array(z.enum(WEBHOOK_CHANNELS)).default([]),
  })
  .prefault({});

/* -------------------------------------------------------------------------- */
/* §12 evaluation — 평가 & 테스트 (납품 품질 보증)                             */
/* -------------------------------------------------------------------------- */

const EvaluationSchema = z
  .object({
    testset: z
      .array(
        z.object({
          question: z.string(),
          expectedAnswer: z.string().optional(),
          expectedSource: z.string().optional(),
        }),
      )
      .default([]),
    metrics: z.array(z.enum(EVAL_METRICS)).default([]),
    abTesting: z.boolean().default(false), // 프롬프트/모델 변형 A/B 응답 비교
    acceptance: z
      .object({
        minRetrievalHit: z.number().optional(),
        minCitationAccuracy: z.number().optional(),
      })
      .optional(),
  })
  .prefault({});

/* -------------------------------------------------------------------------- */
/* §13 compliance — 컴플라이언스 (공공기관 필수)                               */
/* -------------------------------------------------------------------------- */

const ComplianceSchema = z
  .object({
    privacy: z
      .object({
        collectsPii: z.boolean().default(false),
        piiItems: z.array(z.string()).optional(),
        masking: z.boolean().default(true),
        retentionDays: z.number().optional(),
      })
      .prefault({}),
    security: z
      .object({
        dataResidencyKR: z.boolean().default(true), // 데이터 국내 보관
        networkSeparation: z.boolean().default(false),
        nisReview: z.boolean().optional(), // 국정원 보안성 검토
      })
      .prefault({}),
    a11y: z.enum(COMPLIANCE_A11Y).default("kwcag-aa"), // frontend.a11yLevel과 정합
    procurement: z
      .object({
        domesticPreferred: z.boolean().default(true), // 국산 우선
        offlineInstaller: z.boolean().default(false), // 망분리용 오프라인 설치 패키지
      })
      .optional(),
    licensing: z
      .object({
        ossLicenseCheck: z.boolean().default(true),
        certifications: z.array(z.enum(CERTIFICATIONS)).optional(),
      })
      .optional(),
  })
  .prefault({});

/* -------------------------------------------------------------------------- */
/* §14 ops — 운영 · 관측 (compliance에서 분리)                                 */
/* -------------------------------------------------------------------------- */

const OpsSchema = z
  .object({
    audit: z.boolean().default(true), // 대화 로그/감사 이력
    observability: z
      .object({
        metrics: z.array(z.enum(OBSERVABILITY_METRICS)).default([]),
        adminDashboard: z.boolean().default(false),
        alertThreshold: z.string().optional(),
        analytics: z.enum(ANALYTICS_PROVIDERS).default("none"), // 사용 분석 도구
      })
      .optional(),
    performance: z
      .object({
        caching: z.array(z.enum(CACHING_LAYERS)).default([]),
        promptCacheTtlSec: z.number().optional(), // 프롬프트 캐시 TTL(초)
      })
      .optional(),
    process: z
      .object({
        kbUpdateCycle: z.string().optional(),
        owner: z.string().optional(),
      })
      .optional(),
  })
  .prefault({});

/* -------------------------------------------------------------------------- */
/* AgentSpec — 전체                                                            */
/* -------------------------------------------------------------------------- */

export const AgentSpecSchema = z.object({
  meta: MetaSchema, // §0
  project: ProjectSchema, // §1
  design: DesignSchema, // §2
  frontend: FrontendSchema, // §3
  backend: BackendSchema, // §4
  database: DatabaseSchema, // §5
  rag: RagSchema, // §6
  llm: LlmSchema, // §7
  conversation: ConversationSchema, // §8
  interaction: InteractionSchema, // §9
  agent: AgentSchema, // §10
  integrations: IntegrationsSchema, // §11
  evaluation: EvaluationSchema, // §12
  compliance: ComplianceSchema, // §13
  ops: OpsSchema, // §14
});

/** 마법사 전역 상태로 쓰이는 설정 타입 */
export type AgentSpec = z.infer<typeof AgentSpecSchema>;

/* -------------------------------------------------------------------------- */
/* 헬퍼 — 생성/직렬화/역직렬화                                                  */
/* -------------------------------------------------------------------------- */

/**
 * 기본값으로 채워진 새 초안 스펙을 만든다. (마법사 초기 상태 / 테스트 픽스처 기반)
 * 부분 입력(`seed`)을 주면 그 위에 기본값을 채운다.
 */
export function createDraftSpec(seed: unknown = {}): AgentSpec {
  return AgentSpecSchema.parse(seed);
}

/**
 * AgentSpec → JSON 문자열 (산출물 `agent-spec.json` 의 정본).
 * 직렬화 시점에 `meta.createdAt` 을 기록한다.
 */
export function serializeSpec(spec: AgentSpec, now: Date = new Date()): string {
  const withMeta: AgentSpec = {
    ...spec,
    meta: {
      ...spec.meta,
      specVersion: spec.meta.specVersion ?? SPEC_VERSION,
      generatorVersion: spec.meta.generatorVersion ?? GENERATOR_VERSION,
      createdAt: spec.meta.createdAt ?? now.toISOString(),
    },
  };
  return JSON.stringify(withMeta, null, 2);
}

/**
 * JSON 문자열 → 검증된 AgentSpec. (재현/재편집: `agent-spec.json` 로드)
 * 알 수 없는 키는 무시되고, 누락된 필드는 기본값으로 채워진다.
 */
export function deserializeSpec(json: string): AgentSpec {
  return AgentSpecSchema.parse(JSON.parse(json));
}

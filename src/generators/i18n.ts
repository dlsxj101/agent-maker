/**
 * 산출물 문서 국제화(i18n) — ko/en 문자열 테이블.
 *
 * docs.ts 에서 생성하는 문서(PROMPT/DESIGN/CLAUDE/ARCHITECTURE/README)의 하드코딩된
 * 제목·섹션명·지시문·체크리스트 등을 여기에 모아 docs.ts 의 가독성을 높인다.
 *
 * 원칙:
 *  - 구조(마크다운 헤딩 레벨·줄 수·섹션 순서)는 언어에 무관하게 동일하다. 텍스트만 바뀐다.
 *  - 동적 보간(기관명·hex·모델 id 등)은 docs.ts 에서 처리한다.
 *  - 영어는 공공기관 기술문서 수준의 간결·전문적 어조를 쓴다.
 */

export type Lang = "ko" | "en";

/** t(lang) 으로 해당 언어 문자열 맵을 꺼낸다. */
export function t(lang: Lang) {
  return lang === "en" ? EN : KO;
}

/* -------------------------------------------------------------------------- */
/* 한국어 문자열 (기준) */
/* -------------------------------------------------------------------------- */

export const KO = {
  /* PROMPT.md */
  prompt: {
    title: "구현 지시 (Claude Code 마스터 프롬프트)",
    preamble: (org: string, name: string) =>
      `이 파일은 **Claude Code에게 주는 첫 지시**다. 이 폴더를 열고 아래를 순서대로 수행해\n> **${org}**의 챗봇 **"${name}"**을 완성하라.`,
    sec0: "0. 가장 먼저 — 공공기관 제약 (위반 금지)",
    constraintFooter:
      "> 위 제약과 충돌하는 구현은 하지 않는다. 충돌이 보이면 멈추고 `agent-spec.json`을 기준으로 재확인한다.",
    sec1: "1. 무엇을 만드는가",
    orgDept: "기관/부서",
    botName: "챗봇 명칭",
    purpose: "용도",
    audience: "대상 사용자",
    opLang: "운영 언어",
    stack: "스택",
    ragOff: "RAG 미사용",
    sec2: "2. 구현 순서 (이 순서를 지킨다 — 각 단계 끝에서 검증)",
    sec3: "3. 완료 기준 (acceptance)",
    acc1: "빌드 및 서버 기동 성공 (`/health` 200)",
    acc2: "디자인 토큰(컬러/폰트/위젯/레이아웃)이 UI에 반영됨",
    accRag: "RAG 검색이 동작하고 답변에 출처가 표기됨",
    acc3: (a11y: string) => `접근성 ${a11y} / 개인정보·감사 로그 요건 충족`,
    acc4: "`evaluation` 골든셋 테스트 통과",
    sec4: "4. 원칙",
    principles: `- **\`agent-spec.json\`이 정본**이다. 모호하면 거기서 답을 찾는다. 그래도 없으면 보수적으로(공공기관 안전) 결정한다.
- 선택되지 않은 기능은 임의로 추가하지 않는다(범위 고정 → 결정적 산출).
- 한국어 사용자 기준으로 카피·오류 메시지·접근성 라벨을 작성한다.`,
    /* 구현 단계 */
    step_skeleton: (
      layout: string,
      hasAvatar: boolean,
      avatarStyle: string,
    ) =>
      `**프로젝트 골격 확인**: 이 폴더의 \`agent-spec.json\`(정본), \`DESIGN.md\`, \`ARCHITECTURE.md\`, \`CLAUDE.md\`를 먼저 읽는다. 모든 결정은 \`agent-spec.json\`을 따른다.` +
      ` 디자인 토큰 적용: \`DESIGN.md\`의 컬러/폰트/위젯 토큰을 UI에 반영한다. 색은 직접 hex가 아니라 CSS 변수로 쓴다. 레이아웃은 "${layout}".` +
      (hasAvatar ? ` 봇 아바타 스타일 "${avatarStyle}".` : ""),
    step_deps:
      `**의존성 설치 & 기동 검증**: 동봉된 매니페스트로 의존성을 설치하고, 진입점(\`/health\`)이 떠서 200을 반환하는지 확인한다. 여기서 빌드/기동이 깨지면 먼저 고친다. **테스트/오프라인 환경에서는 \`LLM_STUB=true\`로 실제 LLM 호출 없이 플러밍을 검증**하고, 실제 키(예: \`ANTHROPIC_API_KEY\`)는 \`.env\`에 둔다.`,
    step_design: (layout: string, hasAvatar: boolean, avatarStyle: string) =>
      `**디자인 토큰 적용**: \`DESIGN.md\`의 컬러/폰트/위젯 토큰을 UI에 반영한다. 색은 직접 hex가 아니라 CSS 변수로 쓴다. 레이아웃은 "${layout}".${hasAvatar ? ` 봇 아바타 스타일 "${avatarStyle}".` : ""}`,
    step_channel_prefix: "**배포 채널/프론트 반영**",
    step_channel_kakao:
      "카카오 채널/알림톡은 비즈니스 채널 등록 + 메시지 템플릿 심사가 필요하니 연동 어댑터를 둔다",
    step_channel_auth: (mode: string) => `이용자 본인확인 "${mode}"(민감 민원 전 신원 확인)`,
    step_channel_localize: "UI 문구 다국어 현지화(i18n 리소스 분리)",
    step_channel_rtl: "RTL 레이아웃 지원",
    step_rag_prefix: "**RAG 파이프라인 구현**",
    step_rag_hwp:
      "HWP(한글)는 표준 Node 파서가 없다 — **권장: `libreoffice --headless --convert-to txt`로 변환 후 텍스트 추출**(폐쇄망은 libreoffice를 오프라인 설치 패키지에 포함). 변환 실패 파일은 적재 로그에 남긴다.",
    step_rag_dev_fallback:
      "개발/CI(`EMBEDDING_API_URL`·`DATABASE_URL` 미설정)에서는 `src/rag/pipeline.ts`의 샘플 코퍼스 키워드 폴백으로 동작한다(골든셋 통과용). **실제 문서 적재 + 벡터 검색 구현으로 반드시 이를 대체**한다.",
    step_rag_server: (emb: string) =>
      `임베딩 \`${emb}\`은 API가 아니라 별도 추론 서버가 필요하다 — \`EMBEDDING_API_URL\` 엔드포인트로 연결한다(ARCHITECTURE 참조).`,
    step_rag_cite_yes: "반드시 표기한다",
    step_rag_cite_no: "표기하지 않는다",
    step_rag_access: (ctrl: string) =>
      ` 문서 접근 제어 "${ctrl}": 이용자 신원/권한으로 검색 결과를 필터링한다(공개/내부 문서 구분).`,
    step_llm_prefix: "**LLM 연동**",
    step_llm_multiturn: (turns?: number) =>
      ` 멀티턴: \`/api/chat\`에 \`sessionId\`를 받아 세션별 대화 이력(messages 배열)을 유지해 \`complete()\`에 함께 전달한다${turns ? `(최근 ${turns}턴)` : ""}.`,
    step_llm_stream:
      ` 스트리밍: \`/api/chat/stream\`(SSE, \`text/event-stream\`)이 토큰 \`{delta}\` 이벤트를 전송한다(\`answerStream\`). 비스트리밍은 \`/api/chat\`(JSON).`,
    step_conv_prefix: "**대화 설계 반영**",
    step_conv_noIntent:
      " 인텐트가 비어 있으면 `agent-spec.json`의 `conversation`을 보고 대표 시나리오를 먼저 정의한다.",
    step_conv_handoff: (mode: string, sla?: number, showQueue?: boolean) =>
      ` 상담사 연결(${mode})${sla ? `, 목표 ${sla}분 내` : ""}${showQueue ? ", 대기열 순번/대기시간 표시" : ""}.`,
    agentModes: {
      chatbot: "일반 챗봇(모델 단독 대화)",
      "tool-agent": "도구호출 에이전트(추론→도구 호출→관찰 반복, trace 표시)",
      "rag-cited": "RAG 인용형(검색→근거 기반 답변+출처)",
      workflow: "워크플로우 가이드(단계별 입력/분기)",
    } as Record<string, string>,
    step_interaction_prefix: "**상호작용/동작 방식 구현**: 동작 방식은",
    step_toolagent_loop: (max: number, parallel: boolean, tools: string) =>
      `에이전트 루프(최대 ${max}회${parallel ? ", 병렬" : ""}): 도구 = ${tools}.`,
    step_toolagent_impl:
      "실제 LLM tool-use 로 구현한다 — `src/tools.ts`의 `TOOL_DEFS`(Anthropic `tools` 형식, input_schema 포함)를 `messages.create({ tools })`에 전달하고, `stop_reason===\"tool_use\"`면 `TOOLS`로 실행→`tool_result` 회신→반복. (스캐폴드의 단순 루프를 이 방식으로 대체)",
    step_toolagent_confirm:
      `도구 실행 정책 "confirm"(HITL): 도구 실행 전 사용자 승인을 받는다 — \`/api/chat\`가 \`{ type:"awaiting_confirmation", toolName, toolArgs, confirmToken }\`를 반환하고, 프론트 승인 후 \`/api/chat/confirm\`(스텁 동봉)으로 실행한다.`,
    step_toolagent_policy: (p: string) => `도구 실행 정책 "${p}".`,
    step_toolagent_trace: (d: string) =>
      `도구호출 trace 표시 "${d}": 스트리밍에 \`{trace}\` 이벤트(도구명/인자/결과)를 추가해 UI에 단계로 렌더한다.`,
    step_interaction_stream: (speed: string, indicator: string) =>
      `응답 스트리밍(속도 ${speed}, 인디케이터 ${indicator})`,
    step_interaction_nostream: "응답 비스트리밍",
    step_interaction_render: (md: string, cite: string) => `렌더링: 마크다운 ${md}·인용 "${cite}".`,
    step_interaction_output: (len: string, struct: string) => `출력 형식: 길이 "${len}"·구조 "${struct}"`,
    step_interaction_meter: ", 컨텍스트 사용량 미터 표시",
    step_interaction_multimodal: (mods: string) => `멀티모달: ${mods} (접근성 연계).`,
    step_interaction_voice: (stt: string, tts: string) => `음성 엔진: STT ${stt}·TTS ${tts}.`,
    step_interaction_disclaimer: (parts: string) => `고지/동의: ${parts}.`,
    step_interaction_ainotice: "AI 답변 고지",
    step_interaction_consent: "이용 동의 필요",
    step_interaction_a11y: (ctrls: string) => `접근성 컨트롤: ${ctrls} (KWCAG).`,
    step_interaction_proactive: (parts: string) => `능동: ${parts}.`,
    step_interaction_proactive_followup: "후속 질문 추천",
    step_interaction_proactive_reengage: (min: number) => `${min}분 유휴 재참여`,
    step_interaction_input: (parts: string) => `입력 제한: ${parts}.`,
    step_interaction_controls: (ctrls: string, fb?: string) =>
      `대화 컨트롤: ${ctrls}${fb ? ` (피드백 ${fb})` : ""}.`,
    step_agent_prefix: "**에이전트 능력/안전 구현**",
    step_agent_askuser: "정보 부족 시 사용자에게 명확화 질문(AskUser)",
    step_agent_subagent: (max?: number) => `서브에이전트${max ? `(최대 ${max} 병렬)` : ""}`,
    step_agent_roles: (roles: string) => ` — 역할: ${roles}`,
    step_agent_builtin: (tools: string) => `내장 도구: ${tools}`,
    step_agent_memory: "장기 기억(세션 간 벡터 기억)",
    step_agent_compact: (strategy: string, budget?: number) =>
      `컨텍스트 자동 압축(${strategy}${budget ? `, ${budget} 토큰` : ""})`,
    step_agent_safety: (style: string, rate?: number, abuse?: boolean) =>
      `안전 — 거절 스타일 "${style}"${rate ? `, 분당 ${rate}회 제한` : ""}${abuse ? ", 남용 필터 적용" : ""}. (§7 가드레일과 함께 적용)`,
    step_golden:
      "**평가 골든셋 검증**: 동봉된 테스트 골격(`tests/`)을 실행해 `evaluation` 골든셋을 통과시킨다. 통과 못 하면 RAG/프롬프트를 조정한다.",
    step_abtest: " 프롬프트/모델 변형 A/B 응답 비교를 구성한다.",
    step_compliance_prefix: "**컴플라이언스 점검**",
    step_compliance_a11y: "접근성",
    step_compliance_pii: "개인정보 마스킹",
    step_compliance_audit: "감사 로그",
    step_compliance_footer:
      "최종 확인한다. 동봉된 감사 로그 미들웨어·마스킹 유틸 stub을 실제 정책에 맞게 채운다.",
    step_ops_prefix: "**운영/관측 반영**",
    step_ops_analytics: (provider: string) => `사용 분석 도구 "${provider}" 연동`,
    step_ops_cache: (layers: string, ttl?: number) =>
      `캐시 계층 ${layers}${ttl ? ` (프롬프트 TTL ${ttl}s)` : ""}`,
    /* 제약 요약 */
    constraint_deploy: (env: string) => `**배포 환경**: ${env}`,
    constraint_airgap:
      "  - ⚠️ 외부 인터넷 호출 불가 — 모든 모델/임베딩/의존성은 온프레미스 또는 사내망으로 해결한다.",
    constraint_a11y: (level: string) => `**웹 접근성**: ${level} 준수 (KWCAG 2.2)`,
    constraint_pii: (collect: string, mask: string) => `**개인정보**: 수집 ${collect}, 마스킹 ${mask}`,
    constraint_residency: (v: string) => `**데이터 국내 보관**: ${v}`,
    constraint_domestic: "**조달**: 국산/오픈소스 우선",
  },

  /* DESIGN.md */
  design: {
    title: "디자인 시스템 (DESIGN.md)",
    preamble: (name: string) =>
      `"${name}"의 시각 결정을 텍스트로 고정한 문서. UI 구현은 이 토큰을 따른다.\n> 색은 **직접 hex가 아니라 CSS 변수**로 사용한다.`,
    sec_theme: "테마",
    preset: "프리셋",
    mode: "모드",
    layout: "레이아웃",
    sec_colors: "컬러 토큰",
    col_token: "토큰",
    col_value: "값",
    col_usage: "용도",
    colors: {
      primary: "주요 액션·강조",
      secondary: "보조",
      accent: "포인트",
      background: "배경",
      surface: "카드/말풍선 표면",
      text: "본문 텍스트",
      muted: "보조 텍스트",
      border: "경계선",
    } as Record<string, string>,
    sec_fonts: "폰트",
    font_heading: "제목",
    font_body: "본문",
    sec_widget: "챗 위젯 스타일",
    widget_radius: "말풍선 모서리",
    widget_avatar: "아바타 표시",
    widget_align: "봇 말풍선 정렬",
    widget_input: "입력창 형태",
    widget_density: "밀도",
    sec_css: "CSS 변수 (그대로 복사해 사용)",
    sec_a11y: "접근성 (KWCAG 2.2)",
    a11y_goal: "목표 등급",
    a11y_note: "텍스트/배경 대비, 키보드 내비게이션, `aria-*` 라벨, 포커스 표시를 기본값으로 한다.",
  },

  /* CLAUDE.md */
  claude: {
    title: (name: string) => `CLAUDE.md — ${name} 작업 지침`,
    preamble: "이 파일은 **이 챗봇 프로젝트에서 작업하는 Claude Code를 위한 지침**이다.\n> 구현 착수 지시는 `PROMPT.md`, 전체 설정 정본은 `agent-spec.json`을 본다.",
    sec1: "1. 프로젝트 개요",
    org: "기관",
    bot: "챗봇",
    purpose: "용도",
    deploy: "배포 환경",
    sec2: "2. 절대 규칙 (공공기관)",
    sec3: "3. 스택",
    frontend: "프론트엔드",
    embed_label: "임베드",
    backend: "백엔드",
    auth_label: "인증",
    deploy_label: "배포",
    db_label: "DB",
    filestore_label: "파일저장소",
    llm_label: "LLM",
    rag_line: (vdb: string, emb: string, retrieval: string) =>
      `RAG: ${vdb} + 임베딩 ${emb} + 검색 ${retrieval}`,
    rag_off: "RAG: 미사용",
    sec4: "4. 작업 원칙",
    principle_spec: "`agent-spec.json`이 단일 진실. 설정과 코드가 어긋나면 spec을 따른다.",
    principle_tone: (tone: string) => `답변은 ${tone} 톤.`,
    principle_grounded: " 근거 없는 내용은 답하지 않는다(환각 억제).",
    principle_cite: " 답변에 출처/페이지를 표기한다.",
    principle_unknown: (fallback: string) => `모르는 질문은 "${fallback}"로 처리한다.`,
    principle_text: (a11y: string) => `모든 사용자 대면 텍스트는 한국어, 접근성(${a11y})을 지킨다.`,
    sec5: "5. 검증",
    verify: "빌드/기동(`/health`) 후 `tests/`의 평가 골든셋을 돌려 통과를 확인한다.",
  },

  /* ARCHITECTURE.md */
  arch: {
    title: "아키텍처 (ARCHITECTURE.md)",
    sec1: "전체 구성",
    frontend_label: "프론트엔드",
    backend_label: "백엔드",
    deploy_label: "배포",
    data_label: "데이터",
    rdb_label: "RDB",
    file_label: "파일",
    network_label: "네트워크",
    auth_label: "인증",
    sec2: "RAG 파이프라인",
    rag_off: "_RAG 미사용 — LLM 단독 응답._",
    rag_source: "지식 소스",
    rag_ingest: (ocr: string, table: string) => `적재 (OCR ${ocr} / 표 ${table})`,
    rag_chunk: "청킹",
    rag_embed: "임베딩",
    rag_vdb: "Vector DB",
    rag_search: "검색",
    rag_reranker: "리랭커",
    rag_answer: "답변",
    rag_cite: "(+출처 표기)",
    rag_server_note: (emb: string) =>
      `> 임베딩 \`${emb}\`은 클라우드 API가 아니라 **추론 서버**가 필요하다. 별도 컨테이너/서버로 띄우고 \`EMBEDDING_API_URL\`로 연결한다. 폐쇄망에서는 오프라인 설치 패키지에 모델 가중치를 포함한다.\n>\n> **API 계약(예시)**: \`POST {EMBEDDING_API_URL}/embed\` 요청 \`{ "text": "..." }\` → 응답 \`{ "embedding": number[] }\`. 예: \`text-embeddings-inference\`(HuggingFace) 또는 자체 FastAPI 래퍼. 미설정 시 \`src/rag/pipeline.ts\`는 샘플 코퍼스 폴백으로 동작한다.`,
    sec3: "보안 · 컴플라이언스",
    residency: "데이터 국내 보관",
    network_sep: "망분리 준수",
    audit: "감사 로그",
    a11y: "접근성",
    sec4: "운영",
    multiturn: "멀티턴 세션",
    dashboard: "관리자 대시보드",
  },

  /* README.md */
  readme: {
    default_title: "공공기관 챗봇",
    by: (org: string, dept: string) => `${org} ${dept} 챗봇 프로젝트.`,
    preamble:
      "> 이 폴더는 **agent-maker**가 생성한 산출물이다. Claude Code로 구현을 시작하려면\n> 먼저 `PROMPT.md`를 읽게 하라.",
    sec1: "무엇인가",
    purpose: "용도",
    audience: "대상",
    deploy: "배포 환경",
    sec2: "구현 시작",
    step1: "이 폴더에서 Claude Code를 연다.",
    step2: "`PROMPT.md`의 지시를 따른다. (정본 설정: `agent-spec.json`)",
    step3: "빌드/기동 후 `tests/`의 평가 골든셋을 통과시킨다.",
    sec3: "포함 파일",
    files: `- \`PROMPT.md\` — Claude Code 구현 지시
- \`DESIGN.md\` — 디자인 시스템(토큰)
- \`ARCHITECTURE.md\` — 아키텍처
- \`CLAUDE.md\` — 이 프로젝트 작업 지침
- \`agent-spec.json\` — 전체 설정(정본)
- 스캐폴딩 코드(\`src/\`, 매니페스트, \`tests/\` 등)`,
  },

  /* 공통 */
  yesno: { yes: "예", no: "아니오" } as const,
  empty: "(미선택)" as const,
};

/* -------------------------------------------------------------------------- */
/* 영어 문자열 */
/* -------------------------------------------------------------------------- */

export const EN = {
  /* PROMPT.md */
  prompt: {
    title: "Implementation Instructions (Claude Code Master Prompt)",
    preamble: (org: string, name: string) =>
      `This file is the **first instruction to Claude Code**.\n> Open this folder and complete the following steps in order to build the chatbot **"${name}"** for **${org}**.`,
    sec0: "0. First — Public-Sector Constraints (Must Not Violate)",
    constraintFooter:
      "> Do not implement anything that conflicts with the constraints above. If a conflict is detected, stop and re-verify against `agent-spec.json`.",
    sec1: "1. What to Build",
    orgDept: "Organization / Department",
    botName: "Chatbot Name",
    purpose: "Purpose",
    audience: "Target Users",
    opLang: "Operating Language(s)",
    stack: "Stack",
    ragOff: "RAG not used",
    sec2: "2. Implementation Order (follow this order — verify at each step)",
    sec3: "3. Acceptance Criteria",
    acc1: "Build and server startup succeed (`/health` returns 200)",
    acc2: "Design tokens (colors, fonts, widget, layout) are applied to the UI",
    accRag: "RAG search is operational and citations are included in answers",
    acc3: (a11y: string) => `Accessibility ${a11y} / privacy and audit-log requirements met`,
    acc4: "`evaluation` golden-set tests pass",
    sec4: "4. Principles",
    principles: `- **\`agent-spec.json\` is the source of truth.** When in doubt, consult it. If still unclear, choose the conservative (public-sector-safe) option.
- Do not add features that were not selected (fixed scope → deterministic output).
- Write all user-facing copy, error messages, and accessibility labels in Korean.`,
    /* 구현 단계 */
    step_skeleton: (
      _layout: string,
      _hasAvatar: boolean,
      _avatarStyle: string,
    ) =>
      `**Verify project scaffold**: Read \`agent-spec.json\` (source of truth), \`DESIGN.md\`, \`ARCHITECTURE.md\`, and \`CLAUDE.md\` first. All decisions follow \`agent-spec.json\`.`,
    step_deps:
      `**Install dependencies & verify startup**: Install dependencies from the bundled manifests and confirm the entry point (\`/health\`) starts and returns 200. Fix any build or startup failures before proceeding. **In test/offline environments, use \`LLM_STUB=true\` to verify plumbing without real LLM calls**; place actual keys (e.g. \`ANTHROPIC_API_KEY\`) in \`.env\`.`,
    step_design: (layout: string, hasAvatar: boolean, avatarStyle: string) =>
      `**Apply design tokens**: Apply the color/font/widget tokens from \`DESIGN.md\` to the UI. Use CSS variables instead of raw hex values. Layout: "${layout}".${hasAvatar ? ` Bot avatar style: "${avatarStyle}".` : ""}`,
    step_channel_prefix: "**Apply deploy channels / frontend options**",
    step_channel_kakao:
      "KakaoTalk channels and notification messages require business channel registration and message template review — add an integration adapter",
    step_channel_auth: (mode: string) => `User identity verification "${mode}" (required before sensitive requests)`,
    step_channel_localize: "UI localization (separate i18n resource files)",
    step_channel_rtl: "RTL layout support",
    step_rag_prefix: "**Implement RAG pipeline**",
    step_rag_hwp:
      "HWP (Korean word processor) has no standard Node parser — **recommended: convert with `libreoffice --headless --convert-to txt`** (include LibreOffice in the offline installer package for air-gapped environments). Log files that fail to convert.",
    step_rag_dev_fallback:
      "In development/CI (when `EMBEDDING_API_URL` or `DATABASE_URL` are not set), the sample corpus keyword fallback in `src/rag/pipeline.ts` is active (sufficient for golden-set runs). **Replace this with a real document ingestion and vector search implementation.**",
    step_rag_server: (emb: string) =>
      `Embedding \`${emb}\` requires a dedicated inference server — connect via the \`EMBEDDING_API_URL\` endpoint (see ARCHITECTURE.md).`,
    step_rag_cite_yes: "must be included",
    step_rag_cite_no: "should not be included",
    step_rag_access: (ctrl: string) =>
      ` Document access control "${ctrl}": filter search results by user identity/role (distinguish public vs. internal documents).`,
    step_llm_prefix: "**Integrate LLM**",
    step_llm_multiturn: (turns?: number) =>
      ` Multi-turn: accept \`sessionId\` in \`/api/chat\`, maintain per-session message history, and pass it to \`complete()\`${turns ? ` (last ${turns} turns)` : ""}.`,
    step_llm_stream:
      ` Streaming: \`/api/chat/stream\` (SSE, \`text/event-stream\`) sends token \`{delta}\` events (\`answerStream\`). Non-streaming uses \`/api/chat\` (JSON).`,
    step_conv_prefix: "**Implement conversation design**",
    step_conv_noIntent:
      " If intents are empty, define representative scenarios from `agent-spec.json` → `conversation` before proceeding.",
    step_conv_handoff: (mode: string, sla?: number, showQueue?: boolean) =>
      ` Handoff to ${mode}${sla ? `, target response within ${sla} min` : ""}${showQueue ? ", show queue position / estimated wait time" : ""}.`,
    agentModes: {
      chatbot: "Standard chatbot (model-only conversation)",
      "tool-agent": "Tool-calling agent (reason → call tools → observe, with trace)",
      "rag-cited": "RAG-cited (retrieve → grounded answer with citations)",
      workflow: "Guided workflow (step-by-step input / branching)",
    } as Record<string, string>,
    step_interaction_prefix: "**Implement interaction / behavior**. Agent mode:",
    step_toolagent_loop: (max: number, parallel: boolean, tools: string) =>
      `Agent loop (max ${max} steps${parallel ? ", parallel" : ""}): tools = ${tools}.`,
    step_toolagent_impl:
      "Implement using real LLM tool-use — pass `TOOL_DEFS` from `src/tools.ts` (Anthropic `tools` format with `input_schema`) to `messages.create({ tools })`. On `stop_reason===\"tool_use\"`, execute via `TOOLS` → send `tool_result` → repeat. (Replace the simple scaffold loop with this pattern.)",
    step_toolagent_confirm:
      `Tool execution policy "confirm" (HITL): obtain user approval before executing a tool. \`/api/chat\` returns \`{ type: "awaiting_confirmation", toolName, toolArgs, confirmToken }\`; after the user approves, execute via the bundled \`/api/chat/confirm\` stub.`,
    step_toolagent_policy: (p: string) => `Tool execution policy: "${p}".`,
    step_toolagent_trace: (d: string) =>
      `Tool-call trace display "${d}": add \`{trace}\` events (tool name, args, result) to the SSE stream and render them as steps in the UI.`,
    step_interaction_stream: (speed: string, indicator: string) =>
      `Streaming response (speed: ${speed}, indicator: ${indicator})`,
    step_interaction_nostream: "Non-streaming response",
    step_interaction_render: (md: string, cite: string) => `Rendering: markdown ${md} · citation "${cite}".`,
    step_interaction_output: (len: string, struct: string) => `Output: length "${len}" · structure "${struct}"`,
    step_interaction_meter: ", context usage meter visible",
    step_interaction_multimodal: (mods: string) => `Multimodal: ${mods} (accessibility-linked).`,
    step_interaction_voice: (stt: string, tts: string) => `Voice engines: STT ${stt} · TTS ${tts}.`,
    step_interaction_disclaimer: (parts: string) => `Disclosures / consent: ${parts}.`,
    step_interaction_ainotice: "AI response notice",
    step_interaction_consent: "privacy / usage consent required",
    step_interaction_a11y: (ctrls: string) => `Accessibility controls: ${ctrls} (KWCAG).`,
    step_interaction_proactive: (parts: string) => `Proactive: ${parts}.`,
    step_interaction_proactive_followup: "follow-up suggestions",
    step_interaction_proactive_reengage: (min: number) => `re-engage after ${min} min idle`,
    step_interaction_input: (parts: string) => `Input limits: ${parts}.`,
    step_interaction_controls: (ctrls: string, fb?: string) =>
      `Chat controls: ${ctrls}${fb ? ` (feedback: ${fb})` : ""}.`,
    step_agent_prefix: "**Implement agent capabilities / safety**",
    step_agent_askuser: "Clarification questions when information is insufficient (AskUser)",
    step_agent_subagent: (max?: number) => `Sub-agents${max ? ` (max ${max} parallel)` : ""}`,
    step_agent_roles: (roles: string) => ` — roles: ${roles}`,
    step_agent_builtin: (tools: string) => `Built-in tools: ${tools}`,
    step_agent_memory: "Long-term memory (cross-session vector memory)",
    step_agent_compact: (strategy: string, budget?: number) =>
      `Auto context compaction (${strategy}${budget ? `, ${budget} tokens` : ""})`,
    step_agent_safety: (style: string, rate?: number, abuse?: boolean) =>
      `Safety — refusal style: "${style}"${rate ? `, rate limit: ${rate}/min` : ""}${abuse ? ", abuse filter enabled" : ""}. (Apply together with §7 guardrails.)`,
    step_golden:
      "**Validate golden set**: Run the bundled test scaffold (`tests/`) and ensure all `evaluation` golden-set cases pass. Adjust RAG or prompts if they fail.",
    step_abtest: " Set up A/B response comparison for prompt/model variants.",
    step_compliance_prefix: "**Compliance check**",
    step_compliance_a11y: "Accessibility",
    step_compliance_pii: "PII masking",
    step_compliance_audit: "Audit log",
    step_compliance_footer:
      "— verify final conformance. Fill in the bundled audit-log middleware and masking utility stubs to match the actual policy.",
    step_ops_prefix: "**Apply observability / ops settings**",
    step_ops_analytics: (provider: string) => `Integrate analytics tool "${provider}"`,
    step_ops_cache: (layers: string, ttl?: number) =>
      `Cache layers: ${layers}${ttl ? ` (prompt cache TTL: ${ttl}s)` : ""}`,
    /* 제약 요약 */
    constraint_deploy: (env: string) => `**Deployment environment**: ${env}`,
    constraint_airgap:
      "  - ⚠️ No external internet access — all models, embeddings, and dependencies must be resolved on-premises or within the internal network.",
    constraint_a11y: (level: string) => `**Web accessibility**: ${level} compliance required (KWCAG 2.2)`,
    constraint_pii: (collect: string, mask: string) => `**Personal data**: collection ${collect}, masking ${mask}`,
    constraint_residency: (v: string) => `**Data residency (South Korea)**: ${v}`,
    constraint_domestic: "**Procurement**: domestic / open-source software preferred",
  },

  /* DESIGN.md */
  design: {
    title: "Design System (DESIGN.md)",
    preamble: (name: string) =>
      `Visual decisions for "${name}" codified as text. All UI implementation must follow these tokens.\n> Use CSS variables — never raw hex values.`,
    sec_theme: "Theme",
    preset: "Preset",
    mode: "Mode",
    layout: "Layout",
    sec_colors: "Color Tokens",
    col_token: "Token",
    col_value: "Value",
    col_usage: "Usage",
    colors: {
      primary: "Primary action / highlight",
      secondary: "Secondary",
      accent: "Accent",
      background: "Background",
      surface: "Card / bubble surface",
      text: "Body text",
      muted: "Supplementary text",
      border: "Border",
    } as Record<string, string>,
    sec_fonts: "Fonts",
    font_heading: "Heading",
    font_body: "Body",
    sec_widget: "Chat Widget Style",
    widget_radius: "Bubble radius",
    widget_avatar: "Avatar",
    widget_align: "Bot bubble alignment",
    widget_input: "Input style",
    widget_density: "Density",
    sec_css: "CSS Variables (copy and use as-is)",
    sec_a11y: "Accessibility (KWCAG 2.2)",
    a11y_goal: "Target level",
    a11y_note:
      "Ensure sufficient text/background contrast, keyboard navigation, `aria-*` labels, and visible focus indicators by default.",
  },

  /* CLAUDE.md */
  claude: {
    title: (name: string) => `CLAUDE.md — ${name} Work Instructions`,
    preamble: "This file contains **work instructions for Claude Code operating in this chatbot project**.\n> See `PROMPT.md` for the implementation prompt and `agent-spec.json` for the full configuration.",
    sec1: "1. Project Overview",
    org: "Organization",
    bot: "Chatbot",
    purpose: "Purpose",
    deploy: "Deployment environment",
    sec2: "2. Absolute Rules (Public Sector)",
    sec3: "3. Stack",
    frontend: "Frontend",
    embed_label: "Embed",
    backend: "Backend",
    auth_label: "Auth",
    deploy_label: "Deploy",
    db_label: "DB",
    filestore_label: "File store",
    llm_label: "LLM",
    rag_line: (vdb: string, emb: string, retrieval: string) =>
      `RAG: ${vdb} + embedding ${emb} + retrieval ${retrieval}`,
    rag_off: "RAG: not used",
    sec4: "4. Working Principles",
    principle_spec: "`agent-spec.json` is the single source of truth. When code and spec disagree, follow the spec.",
    principle_tone: (tone: string) => `Responses use a ${tone} tone.`,
    principle_grounded: " Do not answer without supporting evidence (hallucination prevention).",
    principle_cite: " Include citations/page references in every answer.",
    principle_unknown: (fallback: string) => `Handle unknown questions with: "${fallback}".`,
    principle_text: (a11y: string) => `All user-facing text must be in Korean; follow accessibility standard ${a11y}.`,
    sec5: "5. Verification",
    verify: "After build/startup (`/health`), run the golden-set evaluation in `tests/` and confirm all cases pass.",
  },

  /* ARCHITECTURE.md */
  arch: {
    title: "Architecture (ARCHITECTURE.md)",
    sec1: "Overall Structure",
    frontend_label: "Frontend",
    backend_label: "Backend",
    deploy_label: "Deployment",
    data_label: "Data",
    rdb_label: "RDB",
    file_label: "Files",
    network_label: "Network",
    auth_label: "Auth",
    sec2: "RAG Pipeline",
    rag_off: "_RAG not used — LLM standalone response._",
    rag_source: "Knowledge sources",
    rag_ingest: (ocr: string, table: string) => `Ingest (OCR ${ocr} / tables ${table})`,
    rag_chunk: "Chunking",
    rag_embed: "Embedding",
    rag_vdb: "Vector DB",
    rag_search: "Retrieval",
    rag_reranker: "reranker",
    rag_answer: "Answer",
    rag_cite: "(+ citations)",
    rag_server_note: (emb: string) =>
      `> Embedding \`${emb}\` requires a dedicated **inference server** (not a cloud API). Run it as a separate container/server and connect via \`EMBEDDING_API_URL\`. For air-gapped environments, include model weights in the offline installer package.\n>\n> **API contract (example)**: \`POST {EMBEDDING_API_URL}/embed\` body \`{ "text": "..." }\` → response \`{ "embedding": number[] }\`. Compatible with \`text-embeddings-inference\` (HuggingFace) or a custom FastAPI wrapper. When not configured, \`src/rag/pipeline.ts\` falls back to the sample corpus.`,
    sec3: "Security & Compliance",
    residency: "Data residency (South Korea)",
    network_sep: "Network separation compliance",
    audit: "Audit log",
    a11y: "Accessibility",
    sec4: "Operations",
    multiturn: "Multi-turn session",
    dashboard: "Admin dashboard",
  },

  /* README.md */
  readme: {
    default_title: "Government Chatbot",
    by: (org: string, dept: string) => `${org} ${dept} chatbot project.`,
    preamble:
      "> This folder contains artifacts generated by **agent-maker**. To begin implementation with Claude Code,\n> have it read `PROMPT.md` first.",
    sec1: "What Is This",
    purpose: "Purpose",
    audience: "Target users",
    deploy: "Deployment environment",
    sec2: "Getting Started",
    step1: "Open this folder in Claude Code.",
    step2: "Follow the instructions in `PROMPT.md`. (Canonical config: `agent-spec.json`)",
    step3: "After build/startup, run the golden-set evaluation in `tests/` and verify all cases pass.",
    sec3: "Included Files",
    files: `- \`PROMPT.md\` — Claude Code implementation instructions
- \`DESIGN.md\` — Design system (tokens)
- \`ARCHITECTURE.md\` — Architecture
- \`CLAUDE.md\` — Project work instructions
- \`agent-spec.json\` — Full configuration (source of truth)
- Scaffold code (\`src/\`, manifests, \`tests/\`, etc.)`,
  },

  /* 공통 */
  yesno: { yes: "Yes", no: "No" } as const,
  empty: "(none selected)" as const,
};

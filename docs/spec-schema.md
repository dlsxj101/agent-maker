# `AgentSpec` 스키마 상세

> 마법사의 모든 선택을 담는 설정 객체 `AgentSpec`의 **필드·타입·선택지(enum)** 정의 문서.
> 구현 시 이 문서를 기준으로 `src/lib/agent-spec.ts`(Zod 스키마)를 작성한다.
> 선택지(enum) 중 목록형(LLM·임베딩·VectorDB 등)은 `src/catalog/`에 **데이터로 분리**한다.
>
> 상위 설계 맥락은 [PLAN.md](../PLAN.md) §4·§5 참조.

---

## 표기 규약

- `필드: 타입` — 타입 표기. `?`는 선택(optional).
- `enum{a|b|c}` — 고정 선택지. (확장 가능한 목록은 "catalog"로 표시)
- (catalog) — 값 목록을 `src/catalog/`에서 데이터로 관리. 새 값 추가 = 데이터 추가.
- ✅ 이 문서의 enum 값은 **M1에서 확정**되어 `src/lib/agent-spec.ts`(Zod)와 1:1 대응한다.
- 모든 필드에 안전한 기본값이 있어 `AgentSpecSchema.parse({})`만으로 완전한 초안이 만들어진다.
  "비어 있으면 export 차단"하는 필수 항목(아래 "Export 차단 게이트")은 별도 준비도 검사로 M5에서 강제한다.

---

## 0. `meta`

```
meta: {
  specVersion: string        # 스키마 버전 (예: "1.0")
  generatorVersion: string   # 산출물 생성기 버전
  createdAt: string          # ISO8601
}
```

---

## 1. `project` — 기관/프로젝트 기본 정보

```
project: {
  org: string                          # 기관명
  dept?: string                        # 부서
  name: string                         # 챗봇 명칭
  purpose: enum[]{                     # 용도(복수)
    civil-complaint |                  # 민원 안내
    internal-support |                 # 내부 업무 지원
    faq |                              # FAQ
    policy-info |                      # 정책/제도 안내
    booking |                          # 예약/신청
    other
  }
  audience: enum[]{ citizen | public-official | specific-applicant | other }
  languages: enum[]{ ko | en | multi }
  deployEnv: enum{                     # 배포 환경 (핵심 제약)
    on-premise-airgap |                # 폐쇄망(완전 분리)
    network-separated |                # 망분리
    gov-cloud |                        # 공공 클라우드(G-Cloud 등)
    public-cloud                       # 일반 클라우드
  }
  traffic?: enum{ low | medium | high }
}
```

---

## 2. `design` — 디자인 & 테마 (시각적 선택)

```
design: {
  theme: string                        # 프리셋 테마 id (catalog) 또는 "custom"
  colors: {                            # 컬러 토큰 (hex)
    primary, secondary, accent,
    background, surface, text, muted, border: string
  }
  mode: enum{ light | dark | system }
  fonts: {                             # 국산 폰트 우선 (catalog)
    heading: string                    # 예: "Pretendard"
    body: string
  }
  widgetStyle: {
    bubbleRadius: enum{ sharp | rounded | pill }
    avatar: boolean
    align: enum{ left | right }        # 봇 말풍선 정렬
    inputStyle: enum{ box | underline | floating }
    density: enum{ compact | comfortable }
  }
  layout: enum{                        # 챗봇 배치 형태
    full-page |                        # 전체 페이지형
    floating-widget |                  # 우하단 플로팅
    side-panel |                       # 사이드 패널
    iframe-embed                       # iframe 임베드
  }
}
```

> 산출물에서는 `colors`/`fonts`를 **CSS 변수/디자인 토큰**으로 출력한다(`DESIGN.md`).

---

## 3. `frontend`

```
frontend: {
  framework: enum{ react | nextjs | vue | vanilla-widget | embed-snippet }   # (catalog)
  uiLib?: string                       # (catalog) 예: shadcn, mui, antd, none
  embed: enum{ standalone-page | script-tag | iframe | npm-package }
  responsive: boolean
  a11yLevel: enum{ none | kwcag-a | kwcag-aa | kwcag-aaa }   # 웹 접근성 목표
}
```

---

## 4. `backend`

```
backend: {
  runtime: enum{ node | python | java | go | none }          # (catalog)
  framework?: string                   # (catalog) nestjs/express/fastapi/django/spring…
  auth: enum{ none | session | jwt | sso-gpki | oauth }      # 공공: GPKI/행정전자서명
  deploy: enum{ docker | kubernetes | single-server | serverless }
  network: enum{ internet-allowed | proxy-only | offline }   # 외부 호출 가능 여부
  logging: {
    audit: boolean                     # 감사 로그(공공기관 대응)
    monitoring?: string                # (catalog) 예: prometheus, none
  }
  sla?: {                              # 성능 목표 (상세 관측은 §12 ops)
    targetLatencyMs?: number           # 목표 응답시간
    concurrency?: number               # 동시 접속 목표
  }
}
```

---

## 5. `database`

```
database: {
  rdb: enum{ postgres | mysql | mariadb | oracle | tibero | none }   # (catalog, 국산 포함)
  history: enum{ same-as-rdb | separate | none }   # 대화 이력 저장
  cache?: enum{ redis | none }
  fileStore: enum{ local | s3-compatible | gov-storage | none }
}
```

---

## 6. `rag` — RAG 파이프라인 (핵심)

```
rag: {
  enabled: boolean
  sources: enum[]{                     # 지식 소스
    upload-pdf | upload-hwp |          # ※ HWP: 공공기관 필수
    upload-docx | web-crawl |
    database | external-api
  }
  ingest: {
    ocr: boolean                       # 스캔 문서 OCR
    tables: boolean                    # 표 추출
    images: boolean
  }
  chunking: {
    strategy: enum{ fixed | paragraph | semantic | page }
    size?: number                      # 토큰/문자
    overlap?: number
  }
  embedding: string                    # (catalog) — 아래 후보 참조
  vectorDb: enum{ pgvector | qdrant | milvus | weaviate | chroma | faiss }   # (catalog)
  retrieval: {
    strategy: enum{ vector | hybrid }  # hybrid = BM25 + 벡터
    topK?: number
    reranker?: string                  # (catalog) 예: bge-reranker, none
  }
  citations: boolean                   # 답변에 출처/페이지 표기 (공공 신뢰성)
}
```

**임베딩 모델 후보 (catalog)**
- 클라우드: `openai-text-embedding-3-large/small`, `cohere-embed`, `voyage`
- 온프레미스/한국어: `bge-m3`, `kure`, `ko-sroberta`, `multilingual-e5`

> ⚠️ `project.deployEnv = on-premise-airgap`인데 임베딩이 클라우드 API면 **충돌 경고**.

---

## 7. `llm` — 생성 모델

```
llm: {
  provider: enum{ claude | openai | opensource }            # (catalog)
  model: string                        # (catalog) 아래 참조
  serving: enum{                       # 호출 방식
    official-api |                     # 공식 API
    proxy |                            # 프록시 경유
    self-hosted                        # 사내 추론(vLLM/Ollama/TGI)
  }
  params: {
    temperature: number
    maxTokens: number
    persona?: string                   # 시스템 프롬프트 톤/페르소나
  }
  guardrails: {
    groundedOnly: boolean              # 근거 기반 답변 강제(환각 억제)
    piiFilter: boolean                 # 민감정보 필터
    bannedTopics?: string[]            # 거절 정책
  }
  routing?: boolean                    # 비용/난이도 기반 모델 라우팅
  session: {                           # 멀티턴/세션·컨텍스트 정책
    multiTurn: boolean                 # 멀티턴 기억 사용
    historyTurns?: number              # 기억할 직전 턴 수
    contextWindow?: number             # 컨텍스트 윈도우 관리(토큰)
    timeoutMin?: number                # 세션 만료/타임아웃(분)
  }
  budget?: {                           # 비용 추정 입력 (운영 §12와 연계)
    estMonthlyQueries?: number         # 월 예상 질의 수
    maxCostPerMonth?: number           # 월 비용 상한(원)
  }
}
```

**모델 후보 (catalog)**
- Claude: `claude-opus-4-8`, `claude-sonnet-4-6`, `claude-haiku-4-5` (기본 권장)
- 오픈소스/온프레미스: Llama 계열, Qwen, **EXAONE(국산)**, **HyperCLOVA(국산)** 등

> ⚠️ 폐쇄망 + `provider=claude/openai` + `serving=official-api`면 충돌 경고 → `self-hosted`/`proxy` 제안.

---

## 8. `conversation` — 대화 설계 (챗봇의 "내용")

> 이게 비면 산출물이 빈 껍데기가 된다. 공공기관 민원 챗봇 품질의 핵심. (PLAN.md §4 Step 7)

```
conversation: {
  persona: {                           # 페르소나/톤
    tone: enum{ formal | concise | friendly }   # 말투
    speaker?: string                   # 화자(예: "OO기관 안내")
    systemPrompt?: string              # 시스템 프롬프트 본문/구조
  }
  intents: Array<{                     # 인텐트/주요 시나리오
    name: string                       # 예: "증명서 발급 안내"
    examples?: string[]                # 예시 발화
    flow?: string                      # 응답 흐름/절차
  }>
  quickReplies?: string[]              # 시작 화면 버튼/추천 질문
  fallback: {                          # 폴백 / 상담사 연결(에스컬레이션)
    onUnknown: enum{ apologize | rephrase | handoff }   # 모르는 질문 처리
    handoff?: enum{ none | human-agent | phone | email } # 상담원 전환 수단
    offHoursMessage?: string           # 운영시간 외 안내
  }
  i18n?: {                             # 다국어 응답 정책 (project.languages와 정합)
    perLanguageKb?: boolean            # 언어별 지식소스 분리
    defaultLanguage?: enum{ ko | en }
  }
}
```

---

## 9. `interaction` — 상호작용 & 에이전트 동작 방식 (행동/UX, 신규)

> "무엇을 말하나"(§8)와 별개로 **"어떻게 동작하고 보이나"**. 모든 필드 기본값 있음(필수 없음).

```
interaction: {
  agentMode: enum{                     # 에이전트 동작 방식
    chatbot |                          # 일반 대화
    tool-agent |                       # 도구호출 에이전트(ReAct식, trace 표시)
    rag-cited |                        # 검색+인용 중심 (기본)
    workflow                           # 단계별 가이드(폼/버튼 흐름)
  }
  toolPolicy: enum{ none | auto | confirm }   # 도구 실행 정책 (confirm=사람 승인, HITL)
  maxSteps?: number                    # 에이전트 루프 최대 반복(tool-agent)
  parallelTools?: boolean              # 병렬 도구 호출
  streaming: {
    enabled: boolean                   # 응답 스트리밍
    speed: enum{ slow | normal | fast | instant }
    indicator: enum{ dots | cursor | none }     # 타이핑 인디케이터
  }
  rendering: {
    markdown: boolean
    codeBlocks: boolean
    citationStyle: enum{ none | inline | footnote | chips }   # 인용 표시 방식
    toolCallDisplay: enum{ hidden | collapsed | expanded }    # 도구호출 표시
  }
  welcome: {
    greeting?: string                  # 인사말
    showSuggestions: boolean           # 추천 질문(quickReplies) 노출
  }
  controls: enum[]{ stop | regenerate | copy | feedback }     # 대화 컨트롤
  feedback: enum{ none | thumbs | rating }                    # 피드백 방식
  multimodal: enum[]{ image-input | file-upload | voice-input | voice-output }
}
```

> ⚠️ `agentMode=tool-agent` 인데 `integrations.tools` 가 비면 충돌 경고(C12).

---

## 10. `integrations` — 연동 & API

```
integrations: {
  apis: Array<{                        # 외부/내부 API
    name: string
    auth: enum{ none | api-key | oauth | gpki }
    rateLimit?: number
  }>
  tools: Array<{                       # 챗봇이 호출할 액션(tool use / function calling)
    name: string
    description: string
  }>
  webhooks: enum[]{ email | sms | none }
}
```

---

## 11. `evaluation` — 평가 & 테스트 (납품 품질 보증)

> "한 방에" 만든 결과의 품질을 잴 수 없으면 공공기관 납품 리스크. 산출물에 테스트셋·E2E 테스트
> 골격을 포함해 생성될 챗봇이 자체 검증할 수 있게 한다. (PLAN.md §4 Step 9)

```
evaluation: {
  testset: Array<{                     # 골든셋: 대표 질문–기대 쌍
    question: string
    expectedAnswer?: string
    expectedSource?: string            # 기대 근거 문서/페이지
  }>
  metrics: enum[]{                     # 평가 지표
    retrieval-hit |                    # RAG 검색 적중
    citation-accuracy |                # 인용 정확도
    pii-avoidance |                    # 민감정보 응답 회피
    refusal-appropriateness            # 거절 적절성
  }
  acceptance?: {                       # 합격선
    minRetrievalHit?: number           # 예: 0.8
    minCitationAccuracy?: number
  }
}
```

---

## 12. `compliance` — 컴플라이언스 (공공기관 필수)

```
compliance: {
  privacy: {
    collectsPii: boolean
    piiItems?: string[]                # 수집 항목
    masking: boolean                   # 마스킹/비식별
    retentionDays?: number             # 보관 기간
  }
  security: {
    dataResidencyKR: boolean           # 데이터 국내 보관
    networkSeparation: boolean         # 망분리 준수
    nisReview?: boolean                # 국정원 보안성 검토 대응
  }
  a11y: enum{ none | kwcag-aa | kwcag-aaa }   # frontend.a11yLevel과 정합
  procurement?: {                      # 조달 요건
    domesticPreferred: boolean         # 국산 우선
    offlineInstaller: boolean          # 망분리용 오프라인 설치 패키지
  }
  licensing?: {                        # 라이선스/인증
    ossLicenseCheck: boolean           # 오픈소스 라이선스 적합성
    certifications?: enum[]{ gs | cc | none }   # GS인증/CC인증
  }
}
```

---

## 13. `ops` — 운영 · 관측 (compliance에서 분리)

```
ops: {
  audit: boolean                       # 대화 로그/감사 이력
  observability?: {                    # 관측
    metrics: enum[]{ tokens | latency | error-rate | none }
    adminDashboard: boolean            # 관리자 대시보드
    alertThreshold?: string            # 알림 임계치
  }
  performance?: {                      # 캐싱 등 (backend.sla와 연계)
    caching: enum[]{ prompt | embedding | response | none }
  }
  process?: {                          # 운영 프로세스
    kbUpdateCycle?: string             # 지식베이스 갱신 주기
    owner?: string                     # 운영 담당
  }
}
```

---

## 교차 검증 규칙 (마법사 "충돌 감지")

구현 시 아래 규칙으로 사용자 선택의 모순을 경고한다. (PLAN.md §7 "충돌 감지")

| # | 조건 | 경고/제안 |
|---|---|---|
| C1 | `deployEnv=on-premise-airgap` + 클라우드 임베딩 | 온프레미스 임베딩(BGE-M3 등) 제안 |
| C2 | `deployEnv=on-premise-airgap` + `llm.serving=official-api` | `self-hosted` 또는 오픈소스 모델 제안 |
| C3 | `backend.network=offline` + `integrations.apis`에 외부 API | 외부 호출 불가 — 프록시/내부망 API로 변경 제안 |
| C4 | `frontend.a11yLevel`과 `compliance.a11y` 불일치 | 더 높은 등급으로 통일 제안 |
| C5 | `rag.enabled=true` + `sources`에 `upload-hwp` 없음(공공기관) | HWP 지원 권고 |
| C6 | `compliance.privacy.collectsPii=true` + `masking=false` | 마스킹/보관기간 설정 권고 |
| C7 | `security.dataResidencyKR=true` + 해외 클라우드 LLM/임베딩 | 국내 리전/온프레미스 제안 |
| C8 | `rag.enabled=true` + `conversation.intents` 비어 있음 | 주요 시나리오/인텐트 입력 권고(빈 챗봇 방지) |
| C9 | `project.purpose`에 민원 + `conversation.fallback.handoff=none` | 상담사 연결(에스컬레이션) 권고 |
| C10 | `compliance.procurement.offlineInstaller=true` + 클라우드 의존(LLM/임베딩/DB) | 온프레미스 구성으로 변경 제안 |
| C11 | `project.languages=multi` + `conversation.i18n` 미설정 | 언어별 응답/지식소스 정책 권고 |
| C12 | `interaction.agentMode=tool-agent` + `integrations.tools` 비어 있음 | 호출할 도구 정의 권고(빈 에이전트 방지) |

### Export 차단 게이트 (검토 반영)

충돌 경고(C1~C11)와 별개로, "한 방에" 구현에 **필수인 필드가 비어 있으면 ZIP export를 차단**한다.
(경고는 통과 가능, 게이트는 차단.) 예시 필수 항목:
- `project`(org/name/deployEnv), `design.layout`, `frontend.framework`, `backend.runtime`
- `rag.enabled=true`인 경우: `embedding`, `vectorDb`, `chunking.strategy`
- `llm`(provider/model/serving), `conversation.persona.tone`
- 미입력 필수 필드는 Review 화면에서 명시 표시하고, export 버튼을 비활성화한다.

---

## 버전 관리

- 스키마 변경 시 `meta.specVersion`을 올리고 이 문서와 `src/lib/agent-spec.ts`를 함께 갱신한다.
- 산출물(`agent-spec.json`)에는 항상 `meta`를 포함해 재현·마이그레이션이 가능하게 한다.

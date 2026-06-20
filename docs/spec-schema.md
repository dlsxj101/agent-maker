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
- 이 문서의 enum 값은 **초안**이며 M1에서 확정한다.

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
}
```

**모델 후보 (catalog)**
- Claude: `claude-opus-4-8`, `claude-sonnet-4-6`, `claude-haiku-4-5` (기본 권장)
- 오픈소스/온프레미스: Llama 계열, Qwen, **EXAONE(국산)**, **HyperCLOVA(국산)** 등

> ⚠️ 폐쇄망 + `provider=claude/openai` + `serving=official-api`면 충돌 경고 → `self-hosted`/`proxy` 제안.

---

## 8. `integrations` — 연동 & API

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

## 9. `compliance` — 컴플라이언스 & 운영 (공공기관 필수)

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
  audit: boolean                       # 대화 로그/감사 이력
  ops: {
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

---

## 버전 관리

- 스키마 변경 시 `meta.specVersion`을 올리고 이 문서와 `src/lib/agent-spec.ts`를 함께 갱신한다.
- 산출물(`agent-spec.json`)에는 항상 `meta`를 포함해 재현·마이그레이션이 가능하게 한다.

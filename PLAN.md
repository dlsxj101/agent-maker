# agent-maker — 프로젝트 계획서 (PLAN.md)

> 이 문서는 agent-maker의 **단일 진실 공급원(Single Source of Truth)** 이다.
> 설계 결정, 마법사 단계 구성, 산출물 스펙, 로드맵을 모두 여기서 관리한다.
> 코드보다 이 문서가 우선한다. 구현 중 결정이 바뀌면 **먼저 이 문서를 고치고** 코드를 고친다.

---

## 1. 한 줄 정의

**agent-maker** 는 공공기관 납품용 챗봇 에이전트를 만들기 위해 필요한 모든 결정을
사용자가 **시각적 예시를 보며 단계별로 선택**하게 하고, 그 결과를
**Claude Code가 한 번에 챗봇을 구현할 수 있는 산출물 묶음(ZIP)** 으로 내보내 주는
**구성 마법사(configurator) 웹 애플리케이션**이다.

agent-maker 자신은 챗봇을 만들지 않는다. **챗봇을 만들기 위한 "설계도 + 지시서"를 만든다.**

```
[사용자]
   │ 단계별 선택 (테마/스택/RAG/LLM/API/컴플라이언스…)
   ▼
[agent-maker 마법사 UI]  ◀── 실시간 미리보기(테마, 위젯, 컬러)
   │ 선택 완료
   ▼
[산출물 생성기]
   │ PROMPT.md + DESIGN.md + CLAUDE.md + agent-spec.json + README.md
   ▼
[ZIP 다운로드]
   │ 사용자가 새 폴더에 풀고
   ▼
[Claude Code]  ──▶  "한 방에" 실제 공공기관 챗봇 구현
```

---

## 2. 핵심 원칙

1. **모든 선택지는 눈으로 보고 고른다.** 텍스트 라디오 버튼이 아니라, 실제 렌더된 카드/스와치/위젯 미리보기를 보며 선택한다. (테마, 색 조합, 말풍선 스타일, 레이아웃 등)
2. **공공기관 제약을 1급 시민으로 다룬다.** 폐쇄망/온프레미스, 망분리, 개인정보보호, KWCAG(웹 접근성), 국정원 보안 가이드, 국산/오픈소스 우선 등은 옵션이 아니라 곳곳에 녹아 있어야 한다.
3. **산출물은 "Claude Code가 읽고 바로 실행"하는 것이 목표.** 사람이 읽기 좋은 문서가 아니라, **에이전트가 모호함 없이 구현에 착수**할 수 있을 만큼 구체적이어야 한다.
4. **마법사는 상태를 잃지 않는다.** 모든 선택은 단일 설정 객체(`AgentSpec`)에 누적되며, 언제든 이전 단계로 돌아가 수정 가능하고, 진행 상황은 로컬에 저장된다.
5. **확장 가능해야 한다.** 새 LLM, 새 Vector DB, 새 임베딩 모델이 나오면 **데이터(카탈로그)만 추가**하면 마법사에 자동 반영되도록 설계한다. (선택지를 코드에 하드코딩하지 않는다.)

---

## 3. 기술 스택 (마법사 자체)

| 영역 | 선택 | 비고 |
|---|---|---|
| 프레임워크 | **Next.js (App Router)** | React 19, TypeScript |
| 언어 | TypeScript (strict) | |
| 스타일 | Tailwind CSS | 테마 토큰/CSS 변수 기반 미리보기에 유리 |
| UI 프리미티브 | (추후 확정) Radix UI 또는 shadcn/ui 후보 | 접근성 좋은 컴포넌트 |
| 상태 관리 | 경량 store (Zustand 후보) + URL/localStorage 영속화 | 마법사 진행 상태 |
| 폼/검증 | Zod (스키마 = 검증 = 타입) | `AgentSpec` 스키마의 SSOT |
| 산출물 ZIP | 클라이언트 사이드 zip (예: `fflate`/`jszip` 후보) | 서버 불필요, 폐쇄망 친화 |
| 템플릿 렌더 | 자체 템플릿 함수 (문자열 빌더) | PROMPT/DESIGN/CLAUDE.md 생성 |
| 배포 | (추후) 정적/Node 서버 모두 가능하도록 | 공공기관은 온프레미스 가능성 |

> 후보(`후보` 표기)는 골격 단계에서 placeholder만 두고, 구현 세션에서 확정한다.

---

## 4. 마법사가 수집하는 구성 요소 (단계 설계)

마법사는 다음 **9개 단계(스텝)** 로 구성한다. 각 단계의 결과는 `AgentSpec`의 한 섹션에 매핑된다.

### Step 0 — 기관/프로젝트 기본 정보
- 기관명, 부서, 챗봇 명칭
- 챗봇 목적/용도 (민원 안내 / 내부 업무 지원 / FAQ / 정책 안내 / 복합)
- 주요 대상 사용자 (일반 국민 / 공무원 / 특정 민원인)
- 예상 트래픽 규모, 운영 언어(한/영/다국어)
- 배포 환경: **폐쇄망(온프레미스) / 망분리 / 클라우드(공공 G-Cloud 등) / 일반 클라우드**

### Step 1 — 디자인 & 테마 (★시각적 선택의 핵심)
- **컬러 테마**: 사전 정의 팔레트 스와치 + 커스텀 컬러 픽커 (primary/secondary/accent/배경/텍스트)
  - 공공기관 톤(차분/신뢰감) 프리셋 제공
- **다크/라이트/시스템 모드**
- **폰트**: 본문/제목 (국산 폰트 우선 — Pretendard, 나눔, 본고딕 등)
- **챗 위젯 스타일**: 말풍선 모양/모서리 둥글기, 아바타, 버블 정렬, 입력창 형태 — 실시간 미리보기
- **레이아웃**: 전체 페이지형 / 우하단 플로팅 위젯 / 사이드 패널 / iframe 임베드
- 산출물: `DESIGN.md` + 디자인 토큰(JSON/CSS 변수)

### Step 2 — 프론트엔드
- 프레임워크: React / Next.js / Vue / 순수 JS 위젯 / 임베드 스니펫
- UI 라이브러리/컴포넌트 셋
- 임베드 방식: 독립 페이지 / 스크립트 한 줄 삽입 / iframe / npm 패키지
- 반응형/모바일 지원 범위
- 접근성 수준: **KWCAG 2.2 준수 여부 및 등급**

### Step 3 — 백엔드
- 런타임/언어: Node(NestJS/Express) / Python(FastAPI/Django) / Java(Spring) / Go
- 인증/인가: 없음 / 세션 / JWT / SSO(공공 GPKI·행정전자서명) / OAuth
- 배포 형태: 컨테이너(Docker) / 쿠버네티스 / 단일 서버 / 서버리스
- 폐쇄망 고려: 외부 인터넷 호출 가능 여부 (LLM API 직접 호출 vs 프록시 vs 완전 오프라인)
- 로깅/모니터링/감사 로그 정책 (공공기관 감사 대응)

### Step 4 — 데이터베이스
- 관계형 DB: PostgreSQL / MySQL / MariaDB(국산 선호) / Oracle / Tibero(국산)
- 대화 이력/세션 저장소
- 캐시: Redis 등
- 파일/문서 저장소: 로컬 / S3 호환 / 공공 클라우드 스토리지

### Step 5 — RAG 파이프라인 (★공공기관 챗봇의 핵심)
- **지식 소스**: 업로드 문서(PDF/HWP/DOCX/웹) / DB / 외부 API
  - ※ HWP(한글)는 공공기관 필수 — 파서 선택 포함
- **문서 적재/전처리**: OCR 필요 여부, 표/이미지 처리
- **청킹 전략**: 고정 크기 / 문단 / 시맨틱 / 페이지 단위 + 청크 크기/오버랩
- **임베딩 모델**:
  - 클라우드: OpenAI text-embedding-3 / Cohere / Voyage 등
  - 오픈소스/온프레미스: BGE-M3, KURE, Ko-SROBERTa, multilingual-e5 등 (한국어·폐쇄망 대응)
- **Vector DB**: pgvector / Qdrant / Milvus / Weaviate / Chroma / FAISS(로컬)
- **검색 전략**: 벡터 단독 / 하이브리드(BM25+벡터) / 리랭커 사용 여부(예: BGE-reranker)
- **인용/출처 표기**: 답변에 근거 문서·페이지 표시 여부 (공공기관 신뢰성 필수)

### Step 6 — LLM (생성 모델)
- 모델 제공자:
  - **Claude** (claude-opus-4-8 / claude-sonnet-4-6 / claude-haiku-4-5) — 기본 권장
  - 폐쇄망/온프레미스: 오픈소스 LLM (예: Llama 계열, Qwen, EXAONE(국산), HyperCLOVA(국산) 등)
- 호출 방식: 공식 API / 프록시 / 사내 추론 서버(vLLM·Ollama·TGI)
- 파라미터: temperature, max tokens, 시스템 프롬프트 톤/페르소나
- 안전장치: 환각 억제(근거 기반 답변 강제), 금칙어/민감정보 필터, 거절 정책
- 폴백/라우팅: 비용·난이도에 따른 모델 라우팅(선택)

### Step 7 — 연동 & API
- 외부/내부 API 연동 (민원 시스템, 예약, 검색, 행정 DB 등)
- 인증 방식(API Key/OAuth/GPKI), Rate limit
- 도구 사용(Function calling / Tool use) 정의 — 챗봇이 호출할 액션 목록
- 웹훅/알림(이메일·문자) 연동

### Step 8 — 컴플라이언스 & 운영 (공공기관 필수)
- **개인정보보호**: 개인정보 수집 항목, 마스킹/비식별, 보관 기간, 파기 정책
- **보안**: 망분리 준수, 국정원 보안성 검토 대응, 데이터 국내 보관
- **접근성**: KWCAG 2.2 등급 목표
- **감사/이력**: 대화 로그 보관, 관리자 대시보드 필요 여부
- **운영**: 업데이트 주기, 지식베이스 갱신 프로세스, 담당자

> ⚠️ 위 단계별 **세부 선택지(카탈로그)** 는 `docs/spec-schema.md` 와 `src/catalog/*` (구현 시)로 분리하여 관리한다. 새 옵션 추가 = 카탈로그 데이터 추가.

---

## 5. 데이터 모델 — `AgentSpec`

마법사의 모든 선택은 하나의 직렬화 가능한 객체에 누적된다. (Zod 스키마로 정의 → 타입/검증/기본값의 SSOT)

```
AgentSpec {
  meta:        { specVersion, createdAt, generatorVersion }
  project:     { org, dept, name, purpose[], audience[], languages[], deployEnv, traffic }
  design:      { theme, colors{...}, mode, fonts{...}, widgetStyle{...}, layout }
  frontend:    { framework, uiLib, embed, responsive, a11yLevel }
  backend:     { runtime, framework, auth, deploy, network, logging }
  database:    { rdb, history, cache, fileStore }
  rag:         { sources[], ingest, chunking{...}, embedding, vectorDb, retrieval{...}, citations }
  llm:         { provider, model, serving, params{...}, guardrails{...}, routing }
  integrations:{ apis[], tools[], webhooks[] }
  compliance:  { privacy{...}, security{...}, a11y, audit, ops }
}
```

> 스키마의 정확한 필드/enum 값은 `docs/spec-schema.md`에서 상세 정의한다. (이 문서는 구조만 명시)

---

## 6. 산출물 (Export) 스펙

마법사 완료 시 다음 파일들을 묶어 **ZIP**으로 내려준다. 이 ZIP을 새 폴더에 풀고 Claude Code를 실행하면 챗봇 구현이 시작된다.

| 파일 | 역할 |
|---|---|
| `PROMPT.md` | Claude Code에 줄 **첫 지시 프롬프트**. "이 폴더의 문서를 읽고 이러이러한 챗봇을 구현하라"는 마스터 지시 + 단계별 구현 순서. |
| `DESIGN.md` | 디자인 시스템: 컬러 토큰, 폰트, 위젯 스타일, 레이아웃, 컴포넌트 가이드. (시각 결정의 텍스트화) |
| `CLAUDE.md` | 생성될 **챗봇 프로젝트용** 작업 지침. (agent-maker 자신의 CLAUDE.md와는 별개) |
| `agent-spec.json` | 기계가 읽는 전체 설정(`AgentSpec` 직렬화). 재현/재편집 가능. |
| `README.md` | 생성된 챗봇 프로젝트의 사람용 개요/실행법. |
| `.gitignore` | 선택된 스택에 맞는 ignore. |
| (선택) `ARCHITECTURE.md` | 백엔드/RAG/배포 아키텍처 다이어그램·설명. |
| (선택) `env.example` | 필요한 환경변수 목록(키 자리표시자). |

**`PROMPT.md` 품질 기준** (가장 중요):
- 모호함 0: 스택, 버전, 폴더 구조, 구현 순서를 명시
- 공공기관 제약을 맨 앞에 못 박음 (폐쇄망/접근성/개인정보)
- "먼저 X를 만들고, 검증하고, 다음 Y로" 식의 **순차 실행 계획** 포함
- `agent-spec.json`을 정본으로 참조하라고 지시

---

## 7. 화면 흐름 (UX)

```
랜딩(소개)
  → 마법사 (좌: 진행 스텝퍼 / 중앙: 선택 카드 / 우: 실시간 미리보기)
      Step 0 … Step 8  (이전/다음, 자동 저장, 유효성 표시)
  → 검토(Review): 모든 선택 요약 + 경고(누락/충돌)
  → 미리보기: 생성될 PROMPT.md / DESIGN.md 등 파일 미리보기 (탭)
  → 내보내기: ZIP 다운로드 (+ 전체 복사 옵션)
```

- 모든 스텝에서 **우측 패널은 항상 현재 선택을 시각적으로 반영**한다.
- "충돌 감지" 예: 폐쇄망 선택 + 클라우드 임베딩 API 선택 → 경고 및 대안 제시.

---

## 8. 로드맵 (마일스톤)

- **M0 — 프로젝트 세팅** ✅ *(이번 세션)*
  - 저장소 초기화, 계획/지침 문서(PLAN/CLAUDE/README), .gitignore
  - Next.js 골격, `AgentSpec` 스키마 자리표시자, 디렉토리 구조, 초기 커밋/푸시
- **M1 — 스키마 & 카탈로그**
  - `AgentSpec` Zod 스키마 확정, 단계별 선택지 카탈로그 데이터화
- **M2 — 마법사 셸 & 상태**
  - 스텝퍼, 라우팅, 상태 store, 자동 저장, 이전/다음/검증
- **M3 — 시각적 선택 UI**
  - 테마/컬러/위젯 미리보기, 카드형 선택, 실시간 프리뷰 패널
- **M4 — 산출물 생성기**
  - PROMPT/DESIGN/CLAUDE.md 템플릿, agent-spec.json, ZIP 내보내기
- **M5 — 검토/충돌 감지 & 다듬기**
  - 누락·충돌 경고, 접근성/공공기관 체크리스트, i18n
- **M6 — 배포 & 문서화**

---

## 9. 미해결/추후 결정 사항

- UI 라이브러리 확정 (shadcn/ui vs Radix 직접)
- 상태 관리 라이브러리 확정 (Zustand vs Context+reducer)
- ZIP 라이브러리 확정 (fflate vs jszip)
- 산출물 다국어(한/영) 지원 범위
- 마법사 자체의 배포 타깃(정적 export 가능 여부 — 폐쇄망 배포 시나리오)
- 생성된 챗봇의 "레퍼런스 구현" 템플릿을 얼마나 포함할지 (문서만 vs 스캐폴딩 코드까지)
- `npm audit` moderate 2건: Next.js 16이 내부적으로 쓰는 `postcss <8.5.10`(transitive) XSS 권고. `audit fix --force`는 Next를 9.x로 다운그레이드하므로 **적용하지 않음**. Next.js 상위 릴리스에서 해소될 때까지 보류/모니터링.

---

## 10. 용어

- **마법사 / configurator**: agent-maker의 프론트엔드 (이 저장소).
- **산출물 / export**: 마법사가 생성하는 ZIP 묶음.
- **생성될 챗봇 / target chatbot**: 산출물을 받아 Claude Code가 만들 실제 공공기관 챗봇.
- **`AgentSpec`**: 사용자의 모든 선택을 담은 설정 객체.
- **카탈로그(catalog)**: 단계별 선택지 정의 데이터(LLM 목록, 임베딩 목록 등).

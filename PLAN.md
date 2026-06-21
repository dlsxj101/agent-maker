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
   │ 문서(PROMPT.md + DESIGN.md + CLAUDE.md + agent-spec.json …)
   │ + 스캐폴딩 코드(폴더 트리·매니페스트·진입점·RAG 골격·Dockerfile …)
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

마법사는 다음 **14개 단계(스텝)** 로 구성한다. 각 단계의 결과는 `AgentSpec`의 한 섹션에 매핑된다.

> 설계 의도: 인프라/스택(백엔드·DB·RAG·LLM)뿐 아니라 **챗봇이 무엇을·어떻게 말하고(대화 설계),
> 얼마나 잘 동작하며(평가), 어떻게 운영·과금되는가(운영/비용/조달)** 까지 "싹 다" 결정한다.
> 이 영역이 비면 산출물이 빈 껍데기가 되어 "한 방에" 구현이 깨진다. (검토 반영)

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
- **멀티턴/세션·컨텍스트 정책**: 대화 기억 범위, 컨텍스트 윈도우 관리, 세션 만료/타임아웃

### Step 7 — 대화 설계 (★챗봇의 "내용", 신규)
> 이게 없으면 Claude Code가 빈 껍데기만 만든다. 공공기관 민원 챗봇의 품질 핵심.
- **페르소나/톤**: 말투(공손/간결), 1인칭/기관 화자, 시스템 프롬프트 구조
- **인텐트/주요 시나리오**: 인사·메뉴 안내·주요 민원 흐름(예: 증명서 발급, 신청 절차)
- **빠른 응답(퀵 리플라이)/추천 질문**: 시작 화면 버튼, 예시 질의셋
- **폴백 / 상담사 연결(에스컬레이션)**: 모르는 질문 처리, 운영시간 외 안내, 상담원 전환 트리거
- **다국어 응답 정책**: 언어별 응답·지식소스 매핑 (Step 0 운영 언어와 정합)

### Step 8 — 상호작용 & 에이전트 동작 방식 (★행동/UX, 신규)
> "무엇을 말하나(대화 설계)"와 별개로 **"어떻게 동작하고 보이나"**. 일반 챗봇이냐 도구호출 에이전트냐,
> 응답이 어떻게 스트리밍되고 렌더되나 — 이게 비면 행동/UX가 결정 안 돼 산출물이 모호해진다.
- **에이전트 동작 방식**: 일반 챗봇 / 도구호출 에이전트(ReAct식 trace) / RAG 인용형 / 워크플로우(가이드형)
- **도구 실행 정책**: 자동 / 사람 승인(confirm) / 없음, 에이전트 루프 최대 반복, 병렬 도구
- **스트리밍/타이핑**: 응답 스트리밍 on/off, 속도, 타이핑 인디케이터(점 애니/커서/없음)
- **메시지 렌더링**: 마크다운/코드블록, 인용 표시 방식(인라인/각주/칩), 도구호출 표시(숨김/접힘/펼침)
- **시작 화면/웰컴**: 인사말, 추천 질문 노출
- **대화 컨트롤**: 중지/재생성/복사/피드백(좋아요·평점)
- **멀티모달**: 이미지 입력, 파일 업로드, 음성 입력(STT)/출력(TTS) — 접근성 연계
- **출력 형식**: 답변 길이(간결/균형/상세), 구조화 출력(섹션/표/JSON), 컨텍스트 사용량 미터
- **대화 컨트롤 확장**: 대화 초기화/내보내기
- **음성 엔진**: STT/TTS 엔진 선택(온프레미스 whisper/coqui vs 클라우드 클로바/구글)
- **이용 고지/동의**: AI 답변 고지, 개인정보 동의 배너 / **상태 메시지**(오류·오프라인·빈) / **접근성 사용자 컨트롤**(글자크기·고대비·스크린리더 힌트, KWCAG)
- *시각 선택*: 인디케이터·인용·구조화·피드백·거절 스타일 등 동등 선택지는 **미리보기 카드**로 보고 고른다

### Step 9 — 에이전트 능력 & 컨텍스트 & 안전 (★능력, 신규)
> "어떻게 보이나"(§9)와 별개로 **"무엇을 할 수 있나"**. 에이전트의 능력·컨텍스트 관리·안전.
- **명확화 질문(AskUser)**: 정보가 부족하면 사용자에게 되묻기
- **서브에이전트**: 하위 작업을 분담하는 보조 에이전트(최대 동시 실행)
- **내장 도구**: 웹 검색·코드 실행·계산기·파일 읽기·이미지 생성 (커스텀 API 는 연동 단계)
- **장기 기억**: 세션을 넘는 벡터 기억
- **서브에이전트 역할(role)**: 하위 에이전트가 맡을 전문 역할 명세(검색/요약/검증 등)
- **컨텍스트 관리**: 윈도가 찰 때 자동 압축(요약/절단/슬라이딩 윈도우), 압축 트리거 토큰
- **안전**: 거절 스타일(정중/간결/대안안내/엄격), 분당 요청 상한, 남용 필터 (§7 가드레일 보완)

### Step 10 — 연동 & API
- 외부/내부 API 연동 (민원 시스템, 예약, 검색, 행정 DB 등)
- 인증 방식(API Key/OAuth/GPKI), Rate limit
- 도구 사용(Function calling / Tool use) 정의 — 챗봇이 호출할 액션 목록
- 웹훅/알림(이메일·문자) 연동

### Step 11 — 평가 & 테스트 (★납품 품질 보증, 신규)
> "한 방에" 만든 결과의 품질을 잴 수 없으면 공공기관 납품 리스크.
- **테스트 질의셋(골든셋)**: 대표 질문–기대 답변/근거 쌍
- **평가 지표**: RAG 검색 적중, 인용 정확도, 금칙·민감정보 응답 회피, 거절 적절성
- **합격선(acceptance)**: 지표별 목표치 (예: 인용 적중률 ≥ X%)
- 산출물에 테스트셋·E2E 테스트 골격 포함 → 생성될 챗봇이 자체 검증 가능

### Step 12 — 컴플라이언스 (공공기관 필수)
- **개인정보보호**: 개인정보 수집 항목, 마스킹/비식별, 보관 기간, 파기 정책
- **보안**: 망분리 준수, 국정원 보안성 검토 대응, 데이터 국내 보관
- **접근성**: KWCAG 2.2 등급 목표 (Step 2 프론트엔드 등급과 정합)
- **조달/라이선스/인증**: 오픈소스 라이선스 적합성, GS/CC 인증, 국산 우선, 망분리용 오프라인 설치 패키지

### Step 13 — 운영 · 관측 · 비용
- **감사/이력**: 대화 로그 보관, 관리자 대시보드 필요 여부
- **관측(Observability)**: 토큰/지연/에러율 메트릭, 알림 임계치, 로깅 상세
- **성능/SLA**: 목표 응답시간, 동시 접속, 캐싱 전략(프롬프트/임베딩/응답 캐시)
- **비용 추정**: 트래픽 × 모델 단가 기반 월 비용 가늠 (조달·예산 결정 지원)
- **운영 프로세스**: 업데이트 주기, 지식베이스 갱신, 담당자

> ⚠️ 위 단계별 **세부 선택지(카탈로그)** 는 `docs/spec-schema.md` 와 `src/catalog/*` (구현 시)로 분리하여 관리한다. 새 옵션 추가 = 카탈로그 데이터 추가.
>
> 💡 **시각화 원칙**: "모든 요소에 실제 시각적 예시"라는 의도에 따라, 각 단계의 선택지 카드는
> 가능한 한 미리보기/비교 시각물을 갖는다 — 레이아웃 4종 썸네일, RAG 검색전략·아키텍처 다이어그램,
> 임베딩/모델 비교표, 말풍선 라이브 렌더 등. (시각 형식은 `docs/spec-schema.md`/M-UI에서 정의)

---

## 5. 데이터 모델 — `AgentSpec`

마법사의 모든 선택은 하나의 직렬화 가능한 객체에 누적된다. (Zod 스키마로 정의 → 타입/검증/기본값의 SSOT)

```
AgentSpec {
  meta:        { specVersion, createdAt, generatorVersion }
  project:     { org, dept, name, purpose[], audience[], languages[], deployEnv, traffic }
  design:      { theme, colors{...}, mode, fonts{...}, widgetStyle{...+avatarStyle}, layout }
  frontend:    { framework, uiLib, embed, responsive, a11yLevel, localizeUi, rtl, channels[], userAuth }
  backend:     { runtime, framework, auth, deploy, network, logging, sla{...} }
  database:    { rdb, history, cache, fileStore }
  rag:         { sources[], ingest, chunking{...}, embedding, vectorDb, retrieval{...}, citations, accessControl }
  llm:         { provider, model, serving, params{...}, guardrails{...}, routing, session{...}, budget{...} }
  conversation:{ persona{...}, intents[], quickReplies[], fallback{...}, i18n{...} }   # 신규
  interaction: { agentMode, toolPolicy, ..., voice{stt,tts}, disclaimer{...}, states{...}, a11yControls[], proactive{...}, inputLimits{...} }  # 신규(행동/UX)
  agent:       { askUser, subAgents{enabled,maxParallel,roles[]}, builtinTools[], memory{longTerm}, context{autoCompact,strategy,budgetTokens}, safety{refusalStyle,rateLimitPerMin,abuseFilter} }  # 신규(능력/컨텍스트/안전)
  integrations:{ apis[], tools[], webhooks[] }
  evaluation:  { testset[], metrics[], acceptance{...} }                                # 신규
  compliance:  { privacy{...}, security{...}, a11y, procurement{...}, licensing{...} }
  ops:         { audit, observability{...}, performance{...}, process{...} }            # 신규(컴플라이언스에서 분리)
}
```

> 스키마의 정확한 필드/enum 값은 `docs/spec-schema.md`에서 상세 정의한다. (이 문서는 구조만 명시)
>
> **필수/기본값 원칙**: "한 방에" 구현에 필수인 필드는 `required`로 강제하고, 나머지는 안전한
> 기본값을 부여한다. Review 단계에서 미결정 필수 필드가 있으면 **export를 차단**한다. (검토 반영)

---

## 6. 산출물 (Export) 스펙

마법사 완료 시 다음 파일들을 묶어 **ZIP**으로 내려준다. 이 ZIP을 새 폴더에 풀고 Claude Code를 실행하면 챗봇 구현이 시작된다.

> **결정: 산출물 = 문서 + 스캐폴딩 코드.** (검토 반영, 사용자 확정)
> 문서만 주면 Claude Code가 폴더 구조·의존성·glue 코드를 매번 처음부터 추론해 **실행마다
> 결과가 달라진다(비결정성).** 사용자 의도("그것만 전달하면 한 방에")를 충족하려면, 선택된
> 스택에 맞는 **최소 실행 가능한 골격 코드**를 함께 넣어 "어디에·어떻게"를 고정해야 한다.

### 6.1 문서 (무엇을·왜)
| 파일 | 역할 |
|---|---|
| `PROMPT.md` | Claude Code에 줄 **첫 지시 프롬프트**. "이 폴더의 문서·골격을 읽고 이러이러한 챗봇을 완성하라"는 마스터 지시 + 단계별 구현 순서. |
| `DESIGN.md` | 디자인 시스템: 컬러 토큰, 폰트, 위젯 스타일, 레이아웃, 컴포넌트 가이드. (시각 결정의 텍스트화) |
| `CLAUDE.md` | 생성될 **챗봇 프로젝트용** 작업 지침. (agent-maker 자신의 CLAUDE.md와는 별개) |
| `ARCHITECTURE.md` | 백엔드/RAG/배포 아키텍처 설명·다이어그램. |
| `agent-spec.json` | 기계가 읽는 전체 설정(`AgentSpec` 직렬화). **정본** — 재현/재편집 가능. |
| `README.md` | 생성된 챗봇 프로젝트의 사람용 개요/실행법. |

### 6.2 스캐폴딩 코드 (어디에·어떻게) — 선택된 스택별 생성
| 산출물 | 역할 |
|---|---|
| 디렉토리 트리 | 프론트/백엔드/RAG 폴더 구조 (빈 폴더 + 진입점 stub) |
| 패키지 매니페스트 | 스택에 맞는 `package.json` / `requirements.txt` / `pom.xml` 등 (의존성 핀 포함) |
| 진입점 stub | 서버 부팅, 헬스체크(`/health`), 기본 라우트 |
| RAG 파이프라인 골격 | 적재·청킹·임베딩·검색 함수 시그니처 + 선택된 Vector DB 연결 stub |
| 챗 위젯/UI 골격 | 선택된 디자인 토큰이 적용된 최소 채팅 UI |
| `env.example` | 필요한 환경변수 목록(키 자리표시자) |
| `Dockerfile` / compose | 배포 형태에 맞는 컨테이너 정의 (선택 시) |
| 테스트 골격 | `evaluation` 골든셋 기반 E2E/단위 테스트 stub |
| `.gitignore` | 선택된 스택에 맞는 ignore |

> 스캐폴딩은 **컴파일/기동되는 최소 골격**을 목표로 한다(빈 껍데기 금지, 단 비즈니스 로직은
> Claude Code가 PROMPT.md 지시에 따라 채운다). 스택별 템플릿은 `src/generators/templates/`(구현 시).

### 6.3 `PROMPT.md` 품질 기준 (가장 중요)
- **모호함 0**: 스택, 버전, 폴더 구조, 구현 순서를 명시
- **결정성(determinism)**: 동일 `agent-spec.json` → 동일 산출 구조. 폴더 구조·파일명·구현 순서를 고정 템플릿으로 못 박는다.
- 공공기관 제약을 맨 앞에 못 박음 (폐쇄망/접근성/개인정보/조달)
- "먼저 X를 만들고, **검증하고**(테스트 골격 실행), 다음 Y로" 식의 **순차 실행 계획** 포함
- `agent-spec.json`을 정본으로 참조하라고 지시
- 완료 기준(acceptance) 제시: 빌드/기동 성공 + `evaluation` 골든셋 통과

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

> **설계 원칙 (검토 반영):**
> 1. **수직 슬라이스 우선** — 레이어를 다 쌓고 끝에서 통합하지 않는다. "샘플 스펙 → 생성기 →
>    ZIP → 실제 Claude Code 실행"을 **초기에 한 번 관통**해, 제품의 핵심 가정(산출물이 진짜
>    동작한다)을 일찍 검증한다. 가장 위험한 생성기/검증을 앞으로 당긴다.
> 2. **E2E 검증은 게이트** — "한 방에"는 측정 가능한 합격 기준이다. 통과 못 하면 다음으로 못 간다.
> 3. **§9 라이브러리 결정은 해당 마일스톤의 "0번 작업(spike)"** 으로 못 박는다(미결정인 채 진입 금지).
> 4. 단방향 데이터 흐름(스키마→타입→UI→생성기, CLAUDE.md §4.2)은 유지하되, 영역을 좁혀 끝까지 관통한다.

- **M0 — 프로젝트 세팅** ✅ *(완료)*
  - 저장소 초기화, 계획/지침 문서(PLAN/CLAUDE/README/spec-schema), .gitignore/.gitattributes
  - Next.js 골격, `AgentSpec`·생성기·카탈로그 자리표시자, 초기 커밋/푸시

- **M1 — 스키마 골격 + 슬라이스용 카탈로그** ✅ *(완료)*
  - `AgentSpec` Zod **전체 골격**(§0~§12 전 섹션 타입) 확정 (`src/lib/agent-spec.ts`) + 직렬화 round-trip 테스트 (`src/lib/agent-spec.test.ts`, 11 케이스 통과)
  - 슬라이스용 카탈로그 데이터화: 디자인(테마 프리셋·폰트) `src/catalog/design.ts`, LLM(제공자·모델) `src/catalog/llm.ts`, 진입점 `src/catalog/index.ts`
  - **기본값/필수 2단 설계**: 스키마는 전 필드 기본값 부여(`parse({})` → 완전한 초안 생성, 마법사 초기상태·localStorage·round-trip 용이). "필수 필드가 비어 있으면 export 차단"하는 게이트는 별도 준비도 검사로 **M5 Review에서** 구현(`createDraftSpec`/`serializeSpec`/`deserializeSpec` 헬퍼 제공).
  - Zod 4 메모: 중첩 객체 기본값은 `.default({})`(원시 `{}` 반환, 내부 기본값 미적용)가 아니라 **`.prefault({})`**(기본값을 스키마로 파싱)를 써야 내부 기본값이 재귀 적용된다.

- **M2 — 산출물 생성기 + E2E 검증 (★수직 슬라이스의 핵심)** ✅ *(완료 — 에이전트 E2E 게이트 통과 + 피드백 반영)*
  - ✅ 0번 작업: **ZIP 라이브러리 = fflate** 확정 (`src/generators/index.ts`, `bundleToZip`/`bundleToZipBytes`)
  - ✅ 손으로 쓴 샘플 `AgentSpec` 픽스처(cloud/airgap, `src/generators/fixtures.ts`) → 생성기 → 문서 6종 + **스캐폴딩 코드**(Node/TS 백엔드 + 토큰 적용 채팅 UI + RAG/LLM 골격 + 평가 테스트) + ZIP
    - 생성기 모듈: `format.ts`(한글 라벨) · `tokens.ts`(디자인 토큰/CSS 변수) · `docs.ts`(PROMPT/DESIGN/CLAUDE/ARCHITECTURE/README) · `scaffold.ts` · `index.ts`(오케스트레이터)
  - ✅ 골든 산출물 **스냅샷 테스트** + 결정성/제약반영/ZIP round-trip 테스트 (`generators.test.ts`, 22 케이스 통과)
  - ✅ **기계적 기동 검증**: 생성 ZIP 해제 → `npm install` → `tsc` 빌드 → 서버 기동 → `/health` 200 확인.
    (스캐폴드가 컴파일/기동되는 최소 골격임을 증명. LLM 클라이언트는 지연 초기화 → 키 없이도 `/health` 기동.)
  - ✅ **에이전트 E2E 게이트 통과:** cloud 프로필 ZIP을 격리 폴더에 풀어 Sonnet 서브에이전트가 `PROMPT.md`만으로 구현 시도 → 빌드/기동/골든셋(LLM_STUB) 통과 확인. acceptance 4종(착수·기동·골든셋·결정성) 충족.
  - ✅ **피드백 루프 반영(게이트 발견 → 생성기 개선):**
    - LLM **스텁 모드**(`LLM_STUB=true`) 추가 → 키 없이 골든셋 플러밍 검증 가능 (scaffold + PROMPT + .env.example)
    - `design.layout` 을 채팅 컨테이너 CSS 에 반영(floating-widget/side-panel/full-page)
    - 골든 테스트가 `expectedSource` 기반 실제 합격 기준(`it.todo`)을 노출
    - `search()` 무음 빈 반환 → 경고 로그 / express 핸들러 반환 정리
    - 감사 로그 미들웨어·PII 마스킹 stub(플래그 조건부) + HWP·온프레미스 임베딩 서빙 안내(PROMPT/ARCHITECTURE)
  - ⏭️ 잔여(차기): 실제 RAG/임베딩/HWP 구현 깊이는 대상 챗봇 구현 영역. M6 전 범위 재검증 시 airgap 프로필도 게이트.

- **M3 — 마법사 셸 & 상태** ✅ *(완료)*
  - ✅ 0번 작업: **상태관리 = Zustand 확정**. `persist` 미들웨어로 localStorage 자동 저장 (`src/lib/store.ts`)
  - ✅ 셸 3단 레이아웃(좌 스텝퍼 / 중 스텝 폼 / 우 미리보기), 이전·다음, 스텝 클릭 이동, 자동 저장, 하이드레이션 가드 (`src/components/wizard/*`, `/wizard` 라우트, 랜딩 진입 버튼)
  - ✅ 슬라이스 3단계(project/design/llm)는 동작하는 기본 폼(카탈로그 주도), 나머지는 자리표시자(폼은 M5)
  - ✅ 충돌 감지 엔진(`src/lib/conflicts.ts`) — 대표 규칙 C1·C2·C3·C5·C8·C9·C11 + 준비도 점검(`readiness.ts`). 스텝퍼 배지·미리보기 경고로 노출. 단위 테스트 10케이스.
  - ⏭️ 나머지 충돌 규칙(C4·C6·C7·C10)·export 차단 게이트 완성은 M5.

- **M4 — 시각적 선택 UI (★제품 차별점)** ✅ *(디자인 라이브 프리뷰 완료 / 전 스텝 폼은 M5)*
  - ✅ 0번 작업: **UI = 커스텀 Tailwind 컴포넌트**로 결정(프레임워크 미도입). 핵심 UI(컬러 스와치·말풍선 라이브 렌더·레이아웃)가 커스텀 시각물이라 off-the-shelf 이점이 적음. a11y 프리미티브 필요 시 Radix 최소 도입.
  - ✅ **Step 1(디자인) 실시간 미리보기**: 프리셋 테마 + 커스텀 컬러 픽커(8토큰) + 폰트(제목/본문) + 챗 위젯 스타일(모서리/정렬/입력창/밀도/아바타) + 모드/레이아웃 → 우측 `ChatPreview` 라이브 렌더 (`src/components/wizard/ChatPreview.tsx`, `DesignStep.tsx`)
  - ⏭️ 나머지 스텝 카드형 폼 확장은 M5(전 스텝 완성)와 통합.

- **M5 — 나머지 카탈로그 + 전 스텝 완성 + 검토/충돌** ✅ *(완료)*
  - ✅ 카탈로그 추가: RAG(임베딩/VectorDB/리랭커 `catalog/rag.ts`), 백엔드 프레임워크(`catalog/backend.ts`), LLM 단가
  - ✅ 전 12스텝 폼 완성(`components/wizard/steps/*` + 공용 컨트롤 `controls.tsx`) — project/design/frontend/backend/database/rag/llm/conversation/integrations/evaluation/compliance/ops
  - ✅ 검토(Review) 화면(`Review.tsx`, `/wizard/review`): 충돌·누락 표시, 파일 미리보기 탭, **ZIP 내보내기**(브라우저 다운로드)
  - ✅ **export 차단 게이트**: 필수 누락 시 내보내기 버튼 비활성화(`readiness.ts`)
  - ✅ 충돌 규칙 완성(C1~C11) + **비용 추정**(`cost.ts`) Review 노출
  - 단위 테스트: 충돌/준비도/비용 17케이스 (총 39 통과)

- **M6 — 전체 회귀 검증 & 배포 & 문서화** ✅ *(완료)*
  - ✅ **전 범위 E2E 재검증**: cloud + airgap 두 프로필 모두 생성 ZIP → `npm install` → `tsc` 빌드 → `/health` 200 → 골든셋(LLM_STUB) 통과.
    - 회귀로 버그 1건 발견·수정: 골든셋에 `expectedSource` 케이스가 없으면 빈 `describe` 생성 → vitest "No test found" 실패. → 케이스가 있을 때만 해당 describe 출력하도록 생성기 수정.
  - ✅ **배포 타깃 확정 = 정적 export**(`next.config.ts` `output: "export"`). 앱이 완전 클라이언트 사이드라 `out/` 정적 파일만으로 폐쇄망 어떤 웹서버에서도 서빙 가능.
  - ✅ `npm audit` 재확인: moderate 2건(postcss transitive, Next 9.x 다운그레이드 유발)으로 **보류 유지**(변동 없음).
  - ✅ i18n(산출물 다국어) → **백로그**로 확정(§9). 현재는 한국어 기준 산출물.
  - ✅ README 갱신(동작 상태·검증·정적 export 배포).

> **검증 루프 요약** (제품의 본질이므로 로드맵에 명시):
> - 자동: 골든 산출물 스냅샷 테스트 · `AgentSpec` round-trip · 충돌 규칙 단위 테스트
> - 반자동(게이트): 생성된 ZIP → 실제 Claude Code 실행 → 빌드/기동 + 골든셋 통과. **M2에서 1회, M6에서 전 범위 재검증.**

---

## 9. 미해결/추후 결정 사항

**확정된 결정 (검토 후):**
- ✅ **산출물 = 문서 + 스캐폴딩 코드.** (§6 참조) "한 방에" 보장을 위해 코드 골격 포함.
- ✅ **테스트 러너 = Vitest** (M1에서 도입). TS·`@/*` 경로 별칭·스냅샷(M2 골든 산출물) 지원. `npm test` → `vitest run`. 설정은 `vitest.config.ts`.

**마일스톤에 결정 시점이 묶인 항목** (해당 M의 0번 작업으로 확정):
- ✅ ZIP 라이브러리 = **fflate** 확정 (M2). 근거: 의존성 0·번들 매우 작음·빠름·트리셰이킹(클라이언트/폐쇄망 친화). `bundleToZip`에 격리되어 교체 용이.
- ✅ 상태 관리 = **Zustand** 확정 (M3). 근거: 단일 큰 `AgentSpec`을 여러 스텝이 슬라이스로 갱신 + localStorage 자동저장에 최적, `persist` 내장(서버 불필요·폐쇄망 친화), provider 보일러플레이트 없음(~1KB).
- ✅ UI = **커스텀 Tailwind 컴포넌트** 확정 (M4). shadcn/ui·Radix 프레임워크는 미도입(핵심이 커스텀 시각물). 접근성 프리미티브(탭/다이얼로그)가 필요한 곳만 추후 `@radix-ui/*` 최소 도입.
- ✅ **앱 디자인 방향 = 절제된 개발자 도구형 + 딥 틸**(사용자 확정). 토큰 시스템 `src/app/globals.css`, 문서 `docs/app-design.md`. mono 'spec' 모티프·헤어라인·컴팩트. (산출물 챗봇 DESIGN.md 와 별개)

**스캐폴드 깊이 강화 (2026-06-21):** 생성 코드가 더 많은 영역을 실제 구현해 "원큐" 폭을 넓힘.
- **멀티턴 세션**(`llm.session.multiTurn`): `chat.ts`에 sessionId별 메모리 히스토리 + `/api/chat`·UI sessionId 전달.
- **스트리밍**(`interaction.streaming.enabled`): `llm/client.ts completeStream`(Claude SSE / OpenAI호환 SSE 파싱) + `chat.ts answerStream` + `server.ts /api/chat/stream`(text/event-stream) + `app.js` SSE 소비.
- **tool-agent**(`agentMode=tool-agent`): `src/tools.ts`(integrations.tools→스텁 레지스트리) + `chat.ts` 도구 호출 루프(maxSteps), 결과를 컨텍스트/출처에 누적.
- **tool-agent trace**: `gather()`가 도구 trace 수집 → `answerStream`이 답변 전 `{trace}` SSE 이벤트 전송(toolCallDisplay≠hidden), `app.js` trace 말풍선 렌더. 런타임 확인.
- **가드레일 주입**: `buildSystemPrompt`에 거절 스타일·금칙 주제(`bannedTopics`)·PII 정책을 실제 주입(기존엔 톤/근거만).
- 4프로필(cloud/airgap/toolagent/voice) **tsc 클린 빌드 + 골든셋 + 런타임 스모크(SSE 토큰/trace 스트림, tool-agent 도구호출, confirm, 가드) 통과**.

**export-verify E2E 게이트 로그 (2026-06-21):**
- 대표 2종(cloud / airgap) 산출물로 실행. **합격 기준 4/4 통과** — ① PROMPT.md 단독 구현 착수(Sonnet 구현 에이전트 "mostly", 빌드/기동/골든셋 자력 통과) ② 빌드+기동(`/health` 200) ③ 골든셋 통과 ④ 결정성(재생성 동일).
- 구현 에이전트가 찾은 모호함 → 생성기에 반영(피드백 루프 완료):
  - **(BLOCKER) RAG `search()`가 빈 결과** → `src/rag/pipeline.ts`에 골든셋 파생 샘플 코퍼스 + 키워드 폴백 추가(개발/CI에서 인용 경로 동작). 골든셋의 "근거 정확도" 테스트를 todo→실제 검증으로 활성화(`/api/chat` sources 채워짐 확인).
  - **(MAJOR) PII 마스킹이 collectsPii에만** → `guardrails.piiFilter`에도 적용 + 이메일 패턴 추가.
  - **(MAJOR) 멀티턴/스트리밍/HWP/임베딩 계약 안내 부족** → PROMPT(멀티턴 sessionId·SSE·HWP libreoffice 확정·개발 폴백)·ARCHITECTURE(임베딩 API 계약 예시) 보강.
  - 에이전트가 "모델 ID claude-sonnet-4-6이 비실재"라 했으나 **오판(학습 시점 한계)** — 유효 ID, 변경 안 함.

**export-verify 2차 (2026-06-21, 스캐폴드 깊이 후):** cloud/airgap/**toolagent** 3종 — tsc 클린 + 골든셋 통과. 런타임 스모크로 **SSE 스트리밍·tool-agent 도구호출·세션ID** 동작 확인. 게이트가 생성 코드의 실제 타입버그(세션 리터럴 `Msg` 미좁힘)를 잡아 수정 → `export-verify` 스킬에 "tsc 별도 실행/골든셋≠동작/에이전트 보고 비판검증" 교훈 반영.

**export-verify 3차 (2026-06-21, tool-agent 구현 에이전트 1-shot):** toolagent 프로필에 Sonnet 구현 에이전트 투입 → **합격 6/6**(install·tsc·test·/api/chat 도구출처·SSE·가드400). criterion 1 "mostly". 지적된 tool-agent 과소명세를 생성기에 반영:
  - 스키마: `integrations.tools[].parameters`(JSON Schema) 추가.
  - 스캐폴드: `tools.ts`에 `TOOL_DEFS`(Anthropic `tools` 형식, input_schema) + 실제 tool-use 루프 안내, `toolPolicy=confirm` 시 `/api/chat/confirm` 스텁 라우트.
  - PROMPT: 도구를 이름으로 명시, 실제 LLM tool-use 루프(stop_reason→tool_result) 설명, confirm HITL 계약, trace 이벤트, 스트리밍 엔드포인트 `/api/chat/stream` 정정.
  - 재검증: 재생성 → tsc 클린 + 골든 + 런타임(/api/chat/confirm 200·400) 통과.

**여전히 열려 있는 항목:**
- ✅ 마법사 배포 타깃 = **정적 export 확정**(M6, `output: "export"`). 폐쇄망 배포 시 `out/` 정적 파일 서빙.
- 📌 **백로그**: 산출물 다국어(한/영) — 현재는 한국어 기준. 수요 발생 시 PROMPT/DESIGN 템플릿·UI 라벨 다국어화.
- ✅ **상호작용/에이전트 능력 옵션(2~3패스 구현 완료)**: §9 interaction(동작방식·도구정책/루프·스트리밍·렌더링·출력형식·컨텍스트미터·웰컴·컨트롤[초기화/내보내기]·피드백·멀티모달) + §10 agent(서브에이전트·AskUser·내장도구·장기기억·컨텍스트 자동압축·안전[거절/rate limit/남용]). guardrails(groundedOnly·piiFilter·bannedTopics)는 §7 llm.
- ✅ **(구현 완료)** 서브에이전트 역할 명세, 도구결과 캐싱(ops.caching tool-result), 핸드오프 SLA, A/B 응답 비교, 음성 STT/TTS 엔진, 이용 고지/동의·상태 메시지·접근성 사용자 컨트롤.
- ✅ **시각 선택 감사(완료)**: 모든 단일선택 select를 `OptionCards`(미리보기 카드)로 전환. backend(런타임/프레임워크/인증/배포/망)·database(RDB/이력/캐시/파일)·frontend(프레임워크/임베드/KWCAG)·rag(청킹/임베딩/벡터DB/검색/리랭커)·llm(모델/호출)·conversation(톤·예시발화/폴백/핸드오프)·interaction(정책/속도/표시/길이/음성)·compliance(KWCAG). 단일선택 평문 드롭다운 0개.
- ✅ **(구현 완료)** 프롬프트 캐시 TTL, 핸드오프 대기열 표시, 봇 아바타 스타일, 유휴 재참여·후속질문 추천, 입력 글자수/파일 제한, 다국어 UI·RTL, 분석 도구(GA/Matomo/자체), 배포 채널(웹/카카오/앱/Slack/Teams).
- ✅ **(추가 완료)** RAG 문서 접근 제어(role/부서), 이용자 본인확인(간편인증/공동인증/회원).
- 🏁 **선택지 포화 판단(2026-06-21)**: 14개 섹션 전수 점검 결과, 에이전트 구축에 필요한 **distinct 선택지는 사실상 소진**. 남은 아이디어는 (a) 기존 옵션에 포함, (b) 마법사 선택이 아닌 산출물 PROMPT/런타임 구현 디테일(예: 아바타 이미지 업로드 UI, 카카오 알림톡 템플릿 편집기, SSE/WS 전송, 모델 failover, 감정 기반 에스컬레이션), (c) 기존 필드의 하위 변형 — 새 선택지로서의 추가 가치 없음. 이후로는 **선택지 추가가 아니라 산출물 품질(export-verify)·스캐폴드 깊이**가 다음 작업 축.
- 📌 **백로그**: 스캐폴딩 깊이 — 현재 Node/TS 백엔드 스택 중심(다른 스택은 문서 + 기본 골격). 스택별 깊은 템플릿(Python/Java/Go 진입점·매니페스트)은 수요 기반 확장. 라이선스: 미정.
- `npm audit` moderate 2건: Next.js 16이 내부적으로 쓰는 `postcss <8.5.10`(transitive) XSS 권고. `audit fix --force`는 Next를 9.x로 다운그레이드하므로 **적용하지 않음**. Next.js 상위 릴리스에서 해소될 때까지 보류/모니터링. (M6 재확인: 변동 없음, 보류 유지)
- ✅ **`npm run lint` 정상화(M1)**: Next 16은 `next lint`를 제거했고 FlatCompat+`extends("next/...")`는 ESLint 9에서 circular JSON 오류를 냈다. → `eslint-config-next` **네이티브 flat config**(`/core-web-vitals` + `/typescript`)를 직접 import 하고 스크립트를 `eslint .`로 변경해 해결. `_` 접두사 미사용 변수는 허용 규칙 추가.

---

## 10. 용어

- **마법사 / configurator**: agent-maker의 프론트엔드 (이 저장소).
- **산출물 / export**: 마법사가 생성하는 ZIP 묶음.
- **생성될 챗봇 / target chatbot**: 산출물을 받아 Claude Code가 만들 실제 공공기관 챗봇.
- **`AgentSpec`**: 사용자의 모든 선택을 담은 설정 객체.
- **카탈로그(catalog)**: 단계별 선택지 정의 데이터(LLM 목록, 임베딩 목록 등).

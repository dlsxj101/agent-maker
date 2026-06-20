# agent-maker

> 공공기관 납품용 **챗봇 에이전트 구성 마법사**.
> 테마·스택·RAG·LLM·API·컴플라이언스 등 챗봇에 필요한 모든 결정을 **보면서 선택**하고,
> **Claude Code가 한 번에 챗봇을 구현할 수 있는 산출물 묶음(ZIP)** 을 내보냅니다.

agent-maker는 챗봇을 직접 만들지 않습니다. **챗봇을 만들기 위한 설계도 + 지시서**를 만듭니다.

```
사용자가 마법사에서 단계별로 선택
        ▼
PROMPT.md · DESIGN.md · CLAUDE.md · agent-spec.json …  →  ZIP
        ▼
새 폴더에 풀고 Claude Code 실행  →  실제 공공기관 챗봇 구현
```

---

## 왜?

공공기관 챗봇은 폐쇄망/온프레미스, 웹 접근성(KWCAG), 개인정보보호, 데이터 국내 보관,
국산·오픈소스 우선 등 **제약이 많고 결정할 것이 많습니다.** agent-maker는 이 결정들을
시각적 예시와 함께 단계별로 안내하고, 그 결과를 Claude Code가 곧장 구현에 착수할 수 있는
**모호함 없는 산출물**로 변환합니다.

---

## 무엇을 선택하나요

마법사는 12개 단계로 구성됩니다. (상세: [PLAN.md](PLAN.md) §4)

1. **기관/프로젝트 정보** — 기관명, 용도, 대상 사용자, 배포 환경(폐쇄망 등)
2. **디자인 & 테마** — 컬러 팔레트, 폰트, 챗 위젯 스타일, 레이아웃 *(실시간 미리보기)*
3. **프론트엔드** — 프레임워크, 임베드 방식, 접근성 수준
4. **백엔드** — 런타임, 인증(GPKI 등), 배포, 망분리
5. **데이터베이스** — RDB(Tibero 등 국산 포함), 캐시, 저장소
6. **RAG 파이프라인** — 문서 소스(HWP 포함), 청킹, 임베딩, Vector DB, 검색 전략
7. **LLM** — Claude / 오픈소스(온프레미스), 호출 방식, 가드레일, 멀티턴/세션
8. **대화 설계** — 페르소나/톤, 인텐트·시나리오, 빠른 응답, 폴백/상담사 연결
9. **연동 & API** — 외부/내부 API, 도구 사용(tool use), 웹훅
10. **평가 & 테스트** — 골든 질의셋, 평가 지표(인용 적중 등), 합격선
11. **컴플라이언스** — 개인정보, 보안, 접근성(KWCAG), 조달/라이선스/인증
12. **운영 · 관측 · 비용** — 감사 로그, 관측(토큰·지연), 성능/SLA, 비용 추정

---

## 산출물 (Export)

마법사 완료 시 ZIP으로 **문서 + 스캐폴딩 코드**를 받습니다. (상세: [PLAN.md](PLAN.md) §6)

**문서** (무엇을·왜)
| 파일 | 역할 |
|---|---|
| `PROMPT.md` | Claude Code에 줄 첫 지시 프롬프트 (구현 순서·완료 기준 포함) |
| `DESIGN.md` | 디자인 시스템(컬러 토큰·폰트·위젯·레이아웃) |
| `CLAUDE.md` | 생성될 챗봇 프로젝트용 작업 지침 |
| `ARCHITECTURE.md` | 백엔드/RAG/배포 아키텍처 설명 |
| `agent-spec.json` | 기계가 읽는 전체 설정(정본 · 재현·재편집 가능) |
| `README.md` | 생성될 챗봇의 사람용 개요 |

**스캐폴딩 코드** (어디에·어떻게) — 선택된 스택별 생성
| 산출물 | 역할 |
|---|---|
| 디렉토리 트리 · 진입점 stub | 프론트/백엔드/RAG 폴더 구조 + 헬스체크 |
| 패키지 매니페스트 | `package.json`/`requirements.txt`/`pom.xml` 등 |
| RAG 파이프라인 골격 | 적재·청킹·임베딩·검색 stub + Vector DB 연결 |
| 챗 위젯 골격 | 디자인 토큰이 적용된 최소 채팅 UI |
| 테스트 골격 | 골든셋 기반 E2E/단위 테스트 stub |
| `Dockerfile` · `env.example` · `.gitignore` | 배포·환경·ignore |

> 산출물이 "문서만"이 아니라 **컴파일/기동되는 최소 골격 코드까지** 포함하므로, Claude Code가
> 폴더 구조를 매번 추론하지 않고 **결정적으로(한 방에)** 챗봇을 완성할 수 있습니다.

---

## 기술 스택

- **Next.js (App Router)** · React 19 · **TypeScript (strict)**
- **Tailwind CSS** · **Zod**(설정 스키마 SSOT)
- 클라이언트 사이드 ZIP 생성 (폐쇄망 친화)

상세 및 미확정 항목은 [PLAN.md](PLAN.md) §3·§9 참조.

---

## 시작하기

마법사 전 단계가 동작합니다. `/` 에서 시작해 `/wizard` 에서 단계별로 선택하고,
`/wizard/review` 에서 산출물을 미리 보고 **ZIP으로 내보냅니다**.

```bash
# 의존성 설치
npm install

# 개발 서버 실행
npm run dev          # http://localhost:3000

# 검증
npm test             # 단위/스냅샷 테스트
npm run typecheck    # 타입 체크
npm run lint         # 린트

# 빌드 (정적 export → out/)
npm run build        # 폐쇄망 배포: out/ 의 정적 파일만으로 어떤 웹서버에서도 서빙 가능
```

요구 사항: **Node.js 20+** (개발은 Node 22/24에서 확인), npm.

> **폐쇄망 배포**: `output: "export"` 로 빌드하면 서버 없이 `out/` 의 정적 파일만으로 동작합니다.
> 산출물 생성·ZIP 묶음이 모두 브라우저에서 처리되어 외부 호출이 없습니다.

---

## 디렉토리 구조

```
agent-maker/
├─ PLAN.md            # ★ 단일 진실 공급원 (설계·로드맵)
├─ CLAUDE.md          # Claude Code 작업 지침
├─ README.md          # 이 문서
├─ docs/
│  └─ spec-schema.md  # AgentSpec 스키마 상세
├─ src/
│  ├─ app/            # Next.js 라우트
│  ├─ components/     # UI 컴포넌트
│  ├─ lib/            # 스키마·상태·유틸
│  ├─ catalog/        # 단계별 선택지 데이터
│  └─ generators/     # 산출물 생성기
└─ public/            # 정적 자산
```

---

## 문서

- [PLAN.md](PLAN.md) — 프로젝트 계획·설계·로드맵 (먼저 읽기)
- [CLAUDE.md](CLAUDE.md) — Claude Code 작업 지침
- [docs/spec-schema.md](docs/spec-schema.md) — `AgentSpec` 설정 스키마 상세

---

## 라이선스

미정 (추후 결정 — PLAN.md §9).

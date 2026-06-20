---
name: catalog-add
version: 0.1.0
description: "agent-maker 마법사에 새 선택지(LLM·임베딩 모델·Vector DB·프레임워크 등)를 카탈로그 데이터로 추가한다. '새 모델 추가', 'Vector DB 추가', '카탈로그에 ~ 넣어줘', '선택지 추가' 같은 요청에 사용."
metadata:
  project: agent-maker
  category: maintenance
---

# catalog-add — 카탈로그 선택지 추가

> 새 LLM, 임베딩 모델, Vector DB, 프레임워크, DB 등 **마법사의 선택지**를 추가할 때 쓰는 절차.
> 핵심 원칙: **선택지는 코드에 하드코딩하지 않는다.** 항상 `src/catalog/`의 데이터로 추가한다.
> (CLAUDE.md §4.1) 이 작업은 가장 자주 반복되므로 절차를 고정해 둔다.

## 언제 쓰나
- "새 LLM/임베딩/Vector DB 추가해줘", "카탈로그에 ~ 넣어줘", "선택지에 ~ 추가" 등.
- 새 기술이 출시되어 마법사 선택지에 반영해야 할 때.

## 먼저 확인 (애매하면 AskUserQuestion)
추가할 항목의 **정확한 식별 정보**가 모호하면 묻는다:
- 어느 카테고리인가? (LLM / 임베딩 / Vector DB / 프론트 프레임워크 / 백엔드 런타임 / RDB …)
- 공식 식별자/버전 (예: 모델 ID, 패키지명)
- 공공기관 제약 관련 속성: **온프레미스(폐쇄망) 가능 여부, 국산 여부, 라이선스**
  → 이 속성이 충돌 감지 규칙(C1·C2·C7·C10 등)에 쓰이므로 반드시 채운다.

## 절차

1. **대상 카탈로그 파일 찾기**
   - `src/catalog/` 아래에서 해당 카테고리 파일을 찾는다. 없으면 새로 만든다.
   - 단계 정의는 `src/catalog/steps.ts`, 항목별 선택지는 카테고리별 파일(예: `llm.ts`, `embedding.ts`, `vectorDb.ts`).
   - 관련 스키마/enum 정의는 `docs/spec-schema.md`와 `src/lib/agent-spec.ts`.

2. **항목 추가 (데이터로)**
   - 기존 항목과 **같은 형태(shape)** 로 새 항목을 추가한다. 안정적 `id`(kebab-case)를 부여.
   - 공공기관 속성 필드를 빠짐없이: `onPremise`(폐쇄망 가능), `domestic`(국산), `license` 등.
   - 시각적 선택을 위한 표시 정보(라벨, 짧은 설명, 가능하면 미리보기/로고 자리)도 채운다.

3. **스키마 정합성**
   - 새 값이 enum에 속한다면 `docs/spec-schema.md`의 해당 enum과 `src/lib/agent-spec.ts`를 함께 갱신.
   - (catalog) 표시된 항목은 자유 문자열이므로 enum 수정이 불필요할 수 있음 — 문서에서 확인.

4. **충돌 규칙 점검**
   - 추가한 항목이 `docs/spec-schema.md`의 교차 검증 규칙(C1~C11)에 영향을 주는지 확인.
   - 예: 클라우드 전용 임베딩이면 C1(폐쇄망 충돌) 대상에 포함되는지 확인.

5. **검증**
   - `npm run typecheck` 와 `npm run build`로 깨지지 않았는지 확인.
   - 가능하면 해당 카탈로그를 쓰는 테스트/스냅샷도 갱신.

6. **마무리**
   - 변경을 커밋한다. **push는 사용자가 요청할 때만.** (CLAUDE.md §7)
   - 같은 카테고리를 자주 추가하게 되면 이 skill의 절차를 보강한다.

## 관련 문서
- `docs/spec-schema.md` — 스키마·enum·충돌 규칙
- `PLAN.md` §4(단계)·§5(AgentSpec)
- `CLAUDE.md` §4(설계 규칙)

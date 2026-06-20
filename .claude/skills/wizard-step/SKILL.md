---
name: wizard-step
version: 0.1.0
description: "agent-maker 마법사에 새 단계(스텝)를 추가하거나 기존 단계를 수정한다. 스키마↔타입↔카탈로그↔UI↔산출물 생성기까지 정합성 있게 반영하는 절차. '마법사에 단계 추가', '스텝 추가/수정', '새 설정 섹션 추가' 같은 요청에 사용."
metadata:
  project: agent-maker
  category: maintenance
---

# wizard-step — 마법사 단계 추가/수정

> 마법사의 단계(스텝)는 **여러 레이어에 걸쳐** 있다: 단계 정의 → AgentSpec 스키마 → 타입 →
> 카탈로그(선택지) → UI(시각 선택) → 산출물 생성기. 한 곳만 고치면 정합성이 깨진다.
> 이 skill은 **단방향 흐름(스키마→타입→UI→생성기, CLAUDE.md §4.2)** 을 따라 빠짐없이 반영하는 절차다.

## 언제 쓰나
- "마법사에 ~ 단계 추가", "스텝 수정", "새 설정 섹션(예: 보안 정책) 추가" 등.
- AgentSpec에 새 섹션이 생기거나 기존 섹션 구조가 바뀔 때.

## 먼저 확인 (애매하면 AskUserQuestion)
- 새 단계가 **어느 위치**에 들어가야 하나? (단계 순서는 논리적 의존성을 따름)
- 어떤 필드/선택지를 담나? **필수 vs 선택**은? (필수는 export 차단 게이트 대상)
- 공공기관 제약·충돌 규칙과 연결되나?

## 절차 (순서 중요 — 단방향 흐름)

1. **설계 먼저: `PLAN.md` §4 갱신**
   - 새 단계를 §4의 단계 목록에 추가/수정. 단계 총개수 문구(예: "12개 단계")도 함께 갱신.
   - `PLAN.md` §5 `AgentSpec` 구조 다이어그램에도 새 섹션 반영.

2. **스키마 상세: `docs/spec-schema.md` 갱신**
   - 새 섹션의 필드·타입·enum·기본값을 상세 정의. 섹션 번호 정합성 유지.
   - 관련 **교차 검증 규칙(C#)** 추가 — 충돌/누락 경고와 export 차단 대상 여부.

3. **스키마 코드: `src/lib/agent-spec.ts`**
   - `AgentSpecSchema`에 새 섹션 추가(현재는 placeholder, 구현 단계면 실제 Zod로).
   - 섹션 주석의 §번호를 `docs/spec-schema.md`와 일치시킨다.

4. **단계 정의: `src/catalog/steps.ts`**
   - `WIZARD_STEPS`에 새 스텝(`id`/`title`/`summary`) 추가. `id`는 AgentSpec 섹션 키와 일치.
   - 순서를 §4와 맞춘다.

5. **선택지 카탈로그: `src/catalog/*`** (선택지가 있으면)
   - 단계의 선택지를 데이터로 추가. → 세부는 `catalog-add` skill 참고.

6. **UI: `src/components/`, `src/app/`** (구현 단계에서)
   - 단계의 시각 선택 UI를 추가. **텍스트 라디오가 아닌 미리보기/카드형**으로(CLAUDE.md §4.3).
   - 마법사 셸의 스텝퍼/라우팅에 연결.

7. **생성기: `src/generators/`** (구현 단계에서)
   - 새 섹션이 산출물(PROMPT/DESIGN/CLAUDE.md, 스캐폴딩 코드)에 어떻게 반영될지 템플릿에 추가.
   - 골든 산출물 스냅샷 테스트 갱신.

8. **문서 정합성 최종 점검**
   - `docs-consistency` skill로 PLAN/spec-schema/agent-spec.ts/steps.ts/README가 어긋나지 않는지 검사.
   - `README.md`의 단계 목록도 갱신.

9. **검증 & 마무리**
   - `npm run typecheck` + `npm run build`.
   - 커밋. **push는 사용자 요청 시에만.**

## 체크리스트 (빠뜨리기 쉬운 곳)
- [ ] PLAN.md §4 단계 목록 + 총개수 문구
- [ ] PLAN.md §5 AgentSpec 다이어그램
- [ ] docs/spec-schema.md 섹션 + 번호 + 충돌 규칙
- [ ] src/lib/agent-spec.ts 섹션 + §주석
- [ ] src/catalog/steps.ts 순서·id
- [ ] README.md 단계 목록
- [ ] typecheck/build 통과

## 관련
- `docs-consistency` skill (정합성 검사)
- `catalog-add` skill (선택지 추가)
- `CLAUDE.md` §4 설계 규칙

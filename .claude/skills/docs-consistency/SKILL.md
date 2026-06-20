---
name: docs-consistency
version: 0.1.0
description: "agent-maker의 설계 문서와 코드가 서로 어긋나지 않는지 검사한다 (PLAN.md ↔ docs/spec-schema.md ↔ src/lib/agent-spec.ts ↔ src/catalog/steps.ts ↔ README.md). '문서 정합성 점검', '문서랑 코드 맞는지 확인', '단계 개수 맞나', 'SSOT 동기화' 같은 요청이나 단계/스키마 변경 후에 사용."
metadata:
  project: agent-maker
  category: verification
---

# docs-consistency — 문서·코드 정합성 점검

> agent-maker는 한 개념(단계·AgentSpec 섹션·선택지)이 **여러 파일에 중복 표현**된다.
> PLAN.md가 SSOT지만, 실제로는 spec-schema/코드/README가 쉽게 어긋난다. 이 skill은 그
> 어긋남을 빠르게 찾아내는 점검 절차다. **단계·스키마를 바꾼 뒤 항상 한 번 돌린다.**

## 언제 쓰나
- 마법사 단계나 AgentSpec 섹션을 추가/수정한 뒤 (`wizard-step` 작업 끝에).
- "문서랑 코드 맞나?", "단계 개수 맞는지", "SSOT 동기화" 요청.
- 커밋 전 마지막 점검.

## 점검 항목 (불일치 찾기)

### 1. 단계(스텝) 정합성
- `PLAN.md` §4의 단계 목록 ↔ `src/catalog/steps.ts`의 `WIZARD_STEPS`
  - **개수**가 같은가? (PLAN의 "N개 단계" 문구 ↔ steps.ts 배열 길이 ↔ README 목록)
  - 각 단계의 **id/제목/순서**가 일치하는가?
- `README.md`의 단계 목록도 같은 개수·순서인가?

### 2. AgentSpec 섹션 정합성
- `PLAN.md` §5 다이어그램의 섹션 ↔ `docs/spec-schema.md`의 섹션(§번호) ↔ `src/lib/agent-spec.ts`의 키
  - **섹션 집합이 동일**한가? (한쪽에만 있는 섹션 = 불일치)
  - `agent-spec.ts`의 `// §N` 주석 번호가 `spec-schema.md`의 섹션 번호와 맞는가?

### 3. 단계 ↔ 섹션 매핑
- 각 `steps.ts`의 `id`가 대응하는 AgentSpec 섹션 키와 일치하는가?
  (예: step id `conversation` ↔ AgentSpec `conversation`)

### 4. 충돌 규칙 참조 무결성
- `docs/spec-schema.md`의 교차 검증 규칙(C#)이 참조하는 필드가 실제 스키마에 존재하는가?

### 5. 산출물 목록 정합성
- `PLAN.md` §6 산출물 목록 ↔ `README.md` 산출물 표 ↔ `src/generators/`의 생성 대상이 일치하는가?

## 빠른 검색 (참고)
정합성 의심 지점을 빠르게 훑을 때:
- 단계 개수 문구: `PLAN.md`/`README.md`에서 "개 단계" / "N개" 검색
- 섹션 키: `agent-spec.ts`의 스키마 키 목록 ↔ `spec-schema.md`의 `## N.` 헤더 목록 대조
- steps.ts의 `id:` 목록 추출 ↔ AgentSpec 키 대조

> Grep으로 각 파일의 섹션/단계 목록을 뽑아 나란히 비교하면 누락이 바로 보인다.

## 절차
1. 위 5개 항목을 차례로 점검하고, **불일치를 모두 목록화**한다.
2. 불일치마다 **SSOT(PLAN.md)를 기준**으로 어느 쪽을 고칠지 판단. (설계 의도가 바뀐 거면 PLAN을 먼저 고침)
3. 수정 후 `npm run typecheck` + `npm run build`로 코드가 깨지지 않았는지 확인.
4. 결과를 간단히 보고(발견된 불일치와 조치). 수정분 커밋. **push는 사용자 요청 시.**

## 관련
- `wizard-step` skill (단계 추가 시 이 skill로 마무리 점검)
- `CLAUDE.md` §0(PLAN이 SSOT), §3(디렉토리 구조)

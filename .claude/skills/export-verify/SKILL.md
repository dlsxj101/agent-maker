---
name: export-verify
version: 0.1.0
description: "agent-maker가 생성한 산출물(ZIP)이 실제로 Claude Code에서 '한 방에' 챗봇으로 구현되는지 end-to-end로 검증하는 게이트. '산출물 검증', 'E2E 검증', '생성된 ZIP 테스트', '한 방에 되는지 확인' 같은 요청에 사용. PLAN.md M2/M6의 핵심 검증 루프."
metadata:
  project: agent-maker
  category: verification
---

# export-verify — 산출물 E2E 검증 (게이트)

> 이 프로젝트의 **존재 이유**는 "산출물만 주면 Claude Code가 한 방에 챗봇을 만든다"이다.
> 그 약속이 진짜 성립하는지는 **실제로 돌려봐야** 안다. 이 skill은 생성된 ZIP을 풀어 실제
> Claude Code로 구현해 보고, **빌드/기동 + 골든셋 통과**를 합격 기준으로 삼는 검증 절차다.
> (PLAN.md §8 M2 게이트 / M6 전 범위 재검증, §6 결정성 기준)

## 언제 쓰나
- 산출물 생성기(M2+)를 만들거나 고친 뒤.
- "이 스펙으로 뽑은 ZIP이 실제로 동작하나?" 확인이 필요할 때.
- M6 배포 전 대표 프로필 전 범위 재검증.

## 합격 기준 (acceptance)
산출물이 "한 방에"를 충족한다고 보려면 **모두** 만족해야 한다:
1. ZIP을 빈 폴더에 풀고 `PROMPT.md`만으로 Claude Code가 **모호함 없이 구현에 착수**한다.
2. 생성된 챗봇이 **빌드/기동**된다(헬스체크 응답 등).
3. 산출물에 포함된 **골든셋(evaluation) 테스트가 통과**한다(또는 합격선 충족).
4. **결정성**: 같은 `agent-spec.json`으로 다시 뽑으면 폴더 구조·파일이 동일하다.

하나라도 실패하면 → **생성기/PROMPT 템플릿/스키마로 피드백**하고 고친 뒤 재검증.

## 절차

1. **테스트 프로필 선정 (애매하면 AskUserQuestion)**
   - 최소 대표 2종을 권장:
     - ⓐ **폐쇄망/온프레미스**: 오픈소스 LLM(self-hosted) + 온프레미스 임베딩(BGE-M3 등) + FAISS/pgvector + HWP 소스
     - ⓑ **클라우드**: Claude API + 클라우드 임베딩 + pgvector/Qdrant
   - 각 프로필의 `agent-spec.json`을 준비(픽스처 또는 마법사로 생성).

2. **산출물 생성**
   - agent-maker로 ZIP을 생성하거나, `src/generators`를 직접 호출해 산출물을 만든다.
   - 산출물을 **스크래치패드의 빈 폴더**에 푼다(사용자 프로젝트 밖). 절대 현재 저장소에 풀지 말 것.

3. **격리 실행 (중요)**
   - 검증용 챗봇 구현은 **별도 디렉토리/worktree**에서 한다. agent-maker 저장소를 오염시키지 않는다.
   - 서브에이전트를 쓸 경우 **Sonnet 이상**(CLAUDE.md §7).

4. **Claude Code로 구현 시도**
   - 푼 폴더에서 `PROMPT.md`를 시작점으로 챗봇을 구현.
   - **막힌 지점·추측이 필요했던 지점·모호했던 부분을 모두 기록**한다 → 이게 생성기 개선의 입력.

5. **합격 기준 평가**
   - 위 4개 기준을 하나씩 체크. 빌드/기동/골든셋 결과를 실제 로그로 남긴다(정직하게 보고, CLAUDE.md §7).

6. **피드백 루프**
   - 실패/모호함이 있으면 원인을 `PROMPT.md` 템플릿, `DESIGN.md`, 스캐폴딩 코드, 스키마 중 어디서
     고쳐야 하는지 판단해 `src/generators/*`(또는 PLAN/spec-schema)에 반영.
   - 재생성 → 재검증. 통과할 때까지.

7. **결과 기록 & 마무리**
   - 검증 결과(프로필별 합격/불합격, 발견된 문제, 조치)를 요약. 반복되면 PLAN.md에 체크리스트로 남긴다.
   - 검증용 임시 폴더는 정리. agent-maker 변경분만 커밋. **push는 사용자 요청 시.**

## 대표 프로필 (최소 권장 — 갈수록 까다롭게)
실측상 아래 3종이 분기 대부분을 덮는다 (`src/generators/fixtures.ts`):
- **cloud**: Claude 공식 API + pgvector + RAG + 멀티턴 + 스트리밍 (일반 + 세션/SSE 경로)
- **airgap**: 폐쇄망 + 오픈소스 self-hosted + qdrant + 리랭커 (제약·OpenAI호환 클라이언트 경로)
- **toolagent**: `agentMode=tool-agent` + `integrations.tools` 정의 (tools.ts + 도구 호출 루프 경로)
- (추가 후보) 음성(voice) · 문서 접근제어(role-based) · 카카오 채널.

## 함정 (실측으로 배운 것 — 반드시 확인)
- **`tsc`를 골든셋과 별도로 돌려라.** vitest/esbuild 는 타입을 검사하지 않아 **타입 에러가 있어도 골든셋이 통과**한다. 생성 코드 타입 안전은 `npx tsc`로만 보장된다(예: 세션 스토어 객체 리터럴이 `Msg`로 안 좁혀지던 버그를 골든셋은 못 잡고 tsc가 잡음).
- **골든셋 "통과" ≠ "동작".** `search()`가 빈 배열을 반환해도 답변 길이만 보는 테스트는 통과한다. → 인용 정확도 테스트로 **출처가 실제로 채워지는지** 검증하고, 새 엔드포인트(`/api/chat/stream` SSE, tool-agent 도구 호출)는 **런타임 curl 스모크**로 직접 확인한다.
- **구현 에이전트 보고를 비판적으로 검증하라.** 서브에이전트 학습 시점이 낡아 **오판**할 수 있다(예: 유효 모델 ID `claude-sonnet-4-6`을 "비실재"라 보고 → 무시). 사실 확인 후에만 생성기에 반영한다.
- **tool-agent 프로필은 메커닉을 PROMPT에 명시했는지 본다.** 도구 이름·input_schema, 실제 LLM tool-use 루프(stop_reason→tool_result), `toolPolicy=confirm`의 HITL 계약, trace 표시까지 PROMPT/스캐폴드에 있어야 한다. `agent-spec.json`에만 두고 PROMPT가 침묵하면 구현자가 막힌다(실측 BLOCKER).

## 주의
- 검증은 **실제 실행**이 핵심이다. "될 것 같다"로 통과시키지 않는다.
- 산출물을 현재 저장소 안에 풀지 않는다(오염 방지). 스크래치패드/worktree 사용.

## 관련
- `PLAN.md` §6(산출물)·§8(M2/M6 검증 루프)
- `docs/spec-schema.md` `evaluation` 섹션(골든셋)

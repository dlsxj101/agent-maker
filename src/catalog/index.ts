/**
 * 카탈로그 진입점 — 단계별 선택지 데이터의 재노출.
 *
 * 마법사 단계 정의(WIZARD_STEPS)와 각 단계의 목록형 선택지(테마·폰트·LLM 등)를 한곳에서 가져온다.
 * M1 슬라이스 범위: steps(전 단계 정의) + design + llm. 나머지(rag·임베딩·VectorDB 등)는 M5에서 추가.
 */

export * from "./steps";
export * from "./design";
export * from "./llm";
export * from "./rag";
export * from "./backend";
export * from "./interaction";

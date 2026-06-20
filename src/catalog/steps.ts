/**
 * 마법사 단계(스텝) 정의 — 데이터.
 * 단계 구성은 PLAN.md §4를 따른다. 각 단계의 세부 선택지(카탈로그)는
 * 추후 별도 파일(src/catalog/*.ts)로 추가한다. (CLAUDE.md §4 — 선택지 하드코딩 금지)
 */

export interface WizardStep {
  /** AgentSpec의 섹션 키와 매핑되는 안정적 id */
  id: string;
  /** 화면에 표시할 제목 */
  title: string;
  /** 한 줄 요약 */
  summary: string;
}

export const WIZARD_STEPS: WizardStep[] = [
  {
    id: "project",
    title: "기관 / 프로젝트 정보",
    summary: "기관명, 챗봇 용도, 대상 사용자, 배포 환경(폐쇄망 등)",
  },
  {
    id: "design",
    title: "디자인 & 테마",
    summary: "컬러 팔레트, 폰트, 챗 위젯 스타일, 레이아웃 (실시간 미리보기)",
  },
  {
    id: "frontend",
    title: "프론트엔드",
    summary: "프레임워크, 임베드 방식, 웹 접근성(KWCAG) 수준",
  },
  {
    id: "backend",
    title: "백엔드",
    summary: "런타임, 인증(GPKI 등), 배포, 망분리",
  },
  {
    id: "database",
    title: "데이터베이스",
    summary: "RDB(국산 포함), 대화 이력, 캐시, 파일 저장소",
  },
  {
    id: "rag",
    title: "RAG 파이프라인",
    summary: "문서 소스(HWP 포함), 청킹, 임베딩, Vector DB, 검색 전략",
  },
  {
    id: "llm",
    title: "LLM (생성 모델)",
    summary: "Claude / 오픈소스(온프레미스), 호출 방식, 가드레일, 멀티턴/세션",
  },
  {
    id: "conversation",
    title: "대화 설계",
    summary: "페르소나/톤, 인텐트·시나리오, 빠른 응답, 폴백/상담사 연결",
  },
  {
    id: "interaction",
    title: "상호작용 & 동작 방식",
    summary: "에이전트 동작(챗봇/도구호출), 스트리밍·타이핑, 메시지 렌더링, 멀티모달 (라이브 프리뷰)",
  },
  {
    id: "agent",
    title: "에이전트 능력 & 컨텍스트",
    summary: "서브에이전트, 명확화 질문, 내장 도구, 장기 기억, 컨텍스트 자동압축·사용량 미터, 안전(거절/남용)",
  },
  {
    id: "integrations",
    title: "연동 & API",
    summary: "외부/내부 API, 도구 사용(tool use), 웹훅",
  },
  {
    id: "evaluation",
    title: "평가 & 테스트",
    summary: "골든 질의셋, 평가 지표(인용 적중 등), 합격선",
  },
  {
    id: "compliance",
    title: "컴플라이언스",
    summary: "개인정보, 보안, 접근성(KWCAG), 조달/라이선스/인증",
  },
  {
    id: "ops",
    title: "운영 · 관측 · 비용",
    summary: "감사 로그, 관측(토큰·지연), 성능/SLA, 비용 추정",
  },
];

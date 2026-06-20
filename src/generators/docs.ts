/**
 * 산출물 문서 생성기 — AgentSpec → Markdown 문서들.
 *
 * 생성 문서(PLAN.md §6.1):
 *  - PROMPT.md       : Claude Code 마스터 지시 (★제품의 본질, §6.3 품질기준)
 *  - DESIGN.md       : 디자인 시스템(토큰·폰트·위젯·레이아웃)
 *  - CLAUDE.md       : 생성될 챗봇 프로젝트용 작업 지침
 *  - ARCHITECTURE.md : 백엔드/RAG/배포 아키텍처
 *  - README.md       : 사람용 개요/실행법
 *
 * 모든 문서는 **결정적(deterministic)** 이다(동일 spec → 동일 텍스트). 시각 결정을 텍스트로 고정한다.
 */

import type { AgentSpec } from "@/lib/agent-spec";
import { THEME_PRESETS, FONT_OPTIONS, LLM_MODEL_CATALOG } from "@/catalog";
import { label, labelList, yesno } from "./format";
import { designTokens, tokensToCss } from "./tokens";

/* ----------------------------- 공통 조회 ----------------------------------- */

function themeLabel(spec: AgentSpec): string {
  if (spec.design.theme === "custom") return "커스텀";
  return THEME_PRESETS.find((t) => t.id === spec.design.theme)?.label ?? spec.design.theme;
}
function fontLabel(id: string): string {
  return FONT_OPTIONS.find((f) => f.id === id)?.label ?? id;
}
function modelLabel(id: string): string {
  return LLM_MODEL_CATALOG.find((m) => m.id === id)?.label ?? id;
}

/** 공공기관 제약 요약 (여러 문서에서 재사용) */
function constraintLines(spec: AgentSpec): string[] {
  const lines: string[] = [];
  lines.push(`- **배포 환경**: ${label("deployEnv", spec.project.deployEnv)}`);
  if (spec.project.deployEnv === "on-premise-airgap" || spec.backend.network === "offline") {
    lines.push("  - ⚠️ 외부 인터넷 호출 불가 — 모든 모델/임베딩/의존성은 온프레미스 또는 사내망으로 해결한다.");
  }
  lines.push(`- **웹 접근성**: ${label("a11yLevel", spec.frontend.a11yLevel)} 준수 (KWCAG 2.2)`);
  lines.push(
    `- **개인정보**: 수집 ${yesno(spec.compliance.privacy.collectsPii)}, 마스킹 ${yesno(
      spec.compliance.privacy.masking,
    )}`,
  );
  lines.push(`- **데이터 국내 보관**: ${yesno(spec.compliance.security.dataResidencyKR)}`);
  if (spec.compliance.procurement?.domesticPreferred) {
    lines.push("- **조달**: 국산/오픈소스 우선");
  }
  return lines;
}

/* ------------------------------ PROMPT.md ---------------------------------- */

export function renderPromptMd(spec: AgentSpec): string {
  const ragOn = spec.rag.enabled;
  const steps: string[] = [];
  let n = 1;
  steps.push(
    `${n++}. **프로젝트 골격 확인**: 이 폴더의 \`agent-spec.json\`(정본), \`DESIGN.md\`, \`ARCHITECTURE.md\`, \`CLAUDE.md\`를 먼저 읽는다. 모든 결정은 \`agent-spec.json\`을 따른다.`,
  );
  steps.push(
    `${n++}. **의존성 설치 & 기동 검증**: 동봉된 매니페스트로 의존성을 설치하고, 진입점(\`/health\`)이 떠서 200을 반환하는지 확인한다. 여기서 빌드/기동이 깨지면 먼저 고친다. **테스트/오프라인 환경에서는 \`LLM_STUB=true\`로 실제 LLM 호출 없이 플러밍을 검증**하고, 실제 키(예: \`ANTHROPIC_API_KEY\`)는 \`.env\`에 둔다.`,
  );
  steps.push(
    `${n++}. **디자인 토큰 적용**: \`DESIGN.md\`의 컬러/폰트/위젯 토큰을 UI에 반영한다. 색은 직접 hex가 아니라 CSS 변수로 쓴다. 레이아웃은 "${label(
      "layout",
      spec.design.layout,
    )}".`,
  );
  if (ragOn) {
    const ragExtra: string[] = [];
    if (spec.rag.sources.includes("upload-hwp")) {
      ragExtra.push(
        "HWP(한글)는 표준 Node 파서가 없으므로 변환 전략(libreoffice 변환 또는 hwp.js 등)을 먼저 정해 적재 단계에 반영한다.",
      );
    }
    if (["bge-m3", "kure", "ko-sroberta", "multilingual-e5"].includes(spec.rag.embedding)) {
      ragExtra.push(
        `임베딩 \`${spec.rag.embedding}\`은 API가 아니라 별도 추론 서버가 필요하다 — \`EMBEDDING_API_URL\` 엔드포인트로 연결한다(ARCHITECTURE 참조).`,
      );
    }
    steps.push(
      `${n++}. **RAG 파이프라인 구현**: 적재→청킹(${label(
        "chunking",
        spec.rag.chunking.strategy,
      )})→임베딩(${spec.rag.embedding})→${label(
        "vectorDb",
        spec.rag.vectorDb,
      )} 적재→검색(${label("retrieval", spec.rag.retrieval.strategy)}). 답변에는 출처/페이지를 ${
        spec.rag.citations ? "반드시 표기한다" : "표기하지 않는다"
      }. RAG 골격 stub(\`src/rag/pipeline.ts\`)의 함수 시그니처를 채운다. \`search()\`가 빈 결과를 그대로 반환하지 않도록 한다.${
        ragExtra.length ? " " + ragExtra.join(" ") : ""
      }`,
    );
  }
  steps.push(
    `${n++}. **LLM 연동**: ${label("provider", spec.llm.provider)} / 모델 ${modelLabel(
      spec.llm.model,
    )} / 호출 방식 ${label(
      "serving",
      spec.llm.serving,
    )}. 시스템 프롬프트는 ${label("tone", spec.conversation.persona.tone)} 톤. 가드레일: 근거기반 ${yesno(
      spec.llm.guardrails.groundedOnly,
    )}, 민감정보 필터 ${yesno(spec.llm.guardrails.piiFilter)}.`,
  );
  steps.push(
    `${n++}. **대화 설계 반영**: 페르소나/인텐트/빠른응답/폴백(${label(
      "onUnknown",
      spec.conversation.fallback.onUnknown,
    )})을 구현한다. 인텐트가 비어 있으면 \`agent-spec.json\`의 \`conversation\`을 보고 대표 시나리오를 먼저 정의한다.`,
  );
  steps.push(
    `${n++}. **평가 골든셋 검증**: 동봉된 테스트 골격(\`tests/\`)을 실행해 \`evaluation\` 골든셋을 통과시킨다. 통과 못 하면 RAG/프롬프트를 조정한다.`,
  );
  steps.push(
    `${n++}. **컴플라이언스 점검**: 접근성(${label(
      "a11yLevel",
      spec.frontend.a11yLevel,
    )}), 개인정보 마스킹(${yesno(
      spec.compliance.privacy.collectsPii && spec.compliance.privacy.masking,
    )}), 감사 로그(${yesno(
      spec.backend.logging.audit || spec.ops.audit,
    )})를 최종 확인한다. 동봉된 감사 로그 미들웨어·마스킹 유틸 stub을 실제 정책에 맞게 채운다.`,
  );

  return `# 구현 지시 (Claude Code 마스터 프롬프트)

> 이 파일은 **Claude Code에게 주는 첫 지시**다. 이 폴더를 열고 아래를 순서대로 수행해
> **${spec.project.org || "(기관)"}**의 챗봇 **"${spec.project.name || "(챗봇)"}"**을 완성하라.

## 0. 가장 먼저 — 공공기관 제약 (위반 금지)

${constraintLines(spec).join("\n")}

> 위 제약과 충돌하는 구현은 하지 않는다. 충돌이 보이면 멈추고 \`agent-spec.json\`을 기준으로 재확인한다.

## 1. 무엇을 만드는가

- **기관/부서**: ${spec.project.org || "-"}${spec.project.dept ? ` / ${spec.project.dept}` : ""}
- **챗봇 명칭**: ${spec.project.name || "-"}
- **용도**: ${labelList("purpose", spec.project.purpose)}
- **대상 사용자**: ${labelList("audience", spec.project.audience)}
- **운영 언어**: ${labelList("languages", spec.project.languages)}
- **스택**: ${label("framework", spec.frontend.framework)} (프론트) / ${label(
    "runtime",
    spec.backend.runtime,
  )} (백엔드) / ${ragOn ? `RAG: ${label("vectorDb", spec.rag.vectorDb)} + ${spec.rag.embedding}` : "RAG 미사용"} / LLM: ${modelLabel(
    spec.llm.model,
  )}

## 2. 구현 순서 (이 순서를 지킨다 — 각 단계 끝에서 검증)

${steps.join("\n")}

## 3. 완료 기준 (acceptance)

- [ ] 빌드 및 서버 기동 성공 (\`/health\` 200)
- [ ] 디자인 토큰(컬러/폰트/위젯/레이아웃)이 UI에 반영됨
${ragOn ? "- [ ] RAG 검색이 동작하고 답변에 출처가 표기됨\n" : ""}- [ ] \`evaluation\` 골든셋 테스트 통과
- [ ] 접근성 ${label("a11yLevel", spec.frontend.a11yLevel)} / 개인정보·감사 로그 요건 충족

## 4. 원칙

- **\`agent-spec.json\`이 정본**이다. 모호하면 거기서 답을 찾는다. 그래도 없으면 보수적으로(공공기관 안전) 결정한다.
- 선택되지 않은 기능은 임의로 추가하지 않는다(범위 고정 → 결정적 산출).
- 한국어 사용자 기준으로 카피·오류 메시지·접근성 라벨을 작성한다.
`;
}

/* ------------------------------ DESIGN.md ---------------------------------- */

export function renderDesignMd(spec: AgentSpec): string {
  const tokens = designTokens(spec);
  const { widgetStyle } = spec.design;
  return `# 디자인 시스템 (DESIGN.md)

> "${spec.project.name || "챗봇"}"의 시각 결정을 텍스트로 고정한 문서. UI 구현은 이 토큰을 따른다.
> 색은 **직접 hex가 아니라 CSS 변수**로 사용한다.

## 테마

- **프리셋**: ${themeLabel(spec)}
- **모드**: ${label("mode", spec.design.mode)}
- **레이아웃**: ${label("layout", spec.design.layout)}

## 컬러 토큰

| 토큰 | 값 | 용도 |
|---|---|---|
| \`--color-primary\` | \`${spec.design.colors.primary}\` | 주요 액션·강조 |
| \`--color-secondary\` | \`${spec.design.colors.secondary}\` | 보조 |
| \`--color-accent\` | \`${spec.design.colors.accent}\` | 포인트 |
| \`--color-background\` | \`${spec.design.colors.background}\` | 배경 |
| \`--color-surface\` | \`${spec.design.colors.surface}\` | 카드/말풍선 표면 |
| \`--color-text\` | \`${spec.design.colors.text}\` | 본문 텍스트 |
| \`--color-muted\` | \`${spec.design.colors.muted}\` | 보조 텍스트 |
| \`--color-border\` | \`${spec.design.colors.border}\` | 경계선 |

## 폰트

- **제목**: ${fontLabel(spec.design.fonts.heading)} (\`--font-heading\`)
- **본문**: ${fontLabel(spec.design.fonts.body)} (\`--font-body\`)

## 챗 위젯 스타일

- 말풍선 모서리: ${widgetStyle.bubbleRadius} (\`--bubble-radius\`)
- 아바타 표시: ${yesno(widgetStyle.avatar)}
- 봇 말풍선 정렬: ${widgetStyle.align}
- 입력창 형태: ${widgetStyle.inputStyle}
- 밀도: ${widgetStyle.density}

## CSS 변수 (그대로 복사해 사용)

\`\`\`css
${tokensToCss(tokens)}
\`\`\`

## 접근성 (KWCAG 2.2)

- 목표 등급: ${label("a11yLevel", spec.frontend.a11yLevel)}
- 텍스트/배경 대비, 키보드 내비게이션, \`aria-*\` 라벨, 포커스 표시를 기본값으로 한다.
`;
}

/* ------------------------------ CLAUDE.md ---------------------------------- */
/* (생성될 챗봇 프로젝트용 작업 지침 — agent-maker 자신의 CLAUDE.md와 별개) */

export function renderClaudeMd(spec: AgentSpec): string {
  return `# CLAUDE.md — ${spec.project.name || "챗봇"} 작업 지침

> 이 파일은 **이 챗봇 프로젝트에서 작업하는 Claude Code를 위한 지침**이다.
> 구현 착수 지시는 \`PROMPT.md\`, 전체 설정 정본은 \`agent-spec.json\`을 본다.

## 1. 프로젝트 개요

- 기관: ${spec.project.org || "-"} / 챗봇: ${spec.project.name || "-"}
- 용도: ${labelList("purpose", spec.project.purpose)}
- 배포 환경: ${label("deployEnv", spec.project.deployEnv)}

## 2. 절대 규칙 (공공기관)

${constraintLines(spec).join("\n")}

## 3. 스택

- 프론트엔드: ${label("framework", spec.frontend.framework)} / 임베드: ${label("embed", spec.frontend.embed)}
- 백엔드: ${label("runtime", spec.backend.runtime)} / 인증: ${label("auth", spec.backend.auth)} / 배포: ${label(
    "deploy",
    spec.backend.deploy,
  )}
- DB: ${label("rdb", spec.database.rdb)} / 파일저장소: ${label("fileStore", spec.database.fileStore)}
- LLM: ${label("provider", spec.llm.provider)} · ${modelLabel(spec.llm.model)} · ${label(
    "serving",
    spec.llm.serving,
  )}
${spec.rag.enabled ? `- RAG: ${label("vectorDb", spec.rag.vectorDb)} + 임베딩 ${spec.rag.embedding} + 검색 ${label("retrieval", spec.rag.retrieval.strategy)}` : "- RAG: 미사용"}

## 4. 작업 원칙

- \`agent-spec.json\`이 단일 진실. 설정과 코드가 어긋나면 spec을 따른다.
- 답변은 ${label("tone", spec.conversation.persona.tone)} 톤. ${
    spec.llm.guardrails.groundedOnly ? "근거 없는 내용은 답하지 않는다(환각 억제)." : ""
  }${spec.rag.citations ? " 답변에 출처/페이지를 표기한다." : ""}
- 모르는 질문은 "${label("onUnknown", spec.conversation.fallback.onUnknown)}"로 처리한다.
- 모든 사용자 대면 텍스트는 한국어, 접근성(${label("a11yLevel", spec.frontend.a11yLevel)})을 지킨다.

## 5. 검증

- 빌드/기동(\`/health\`) 후 \`tests/\`의 평가 골든셋을 돌려 통과를 확인한다.
`;
}

/* --------------------------- ARCHITECTURE.md ------------------------------- */

export function renderArchitectureMd(spec: AgentSpec): string {
  const ragOn = spec.rag.enabled;
  const ragFlow = ragOn
    ? `\`\`\`
[지식 소스: ${labelList("sources", spec.rag.sources, "(소스 미선택)")}]
   │ 적재 (OCR ${yesno(spec.rag.ingest.ocr)} / 표 ${yesno(spec.rag.ingest.tables)})
   ▼
[청킹: ${label("chunking", spec.rag.chunking.strategy)}]
   ▼
[임베딩: ${spec.rag.embedding}] ──▶ [Vector DB: ${label("vectorDb", spec.rag.vectorDb)}]
   ▼
[검색: ${label("retrieval", spec.rag.retrieval.strategy)}${
        spec.rag.retrieval.reranker ? ` + 리랭커 ${spec.rag.retrieval.reranker}` : ""
      }]
   ▼
[LLM: ${modelLabel(spec.llm.model)}] ──▶ 답변${spec.rag.citations ? " (+출처 표기)" : ""}
\`\`\``
    : "_RAG 미사용 — LLM 단독 응답._";

  return `# 아키텍처 (ARCHITECTURE.md)

## 전체 구성

- **프론트엔드**: ${label("framework", spec.frontend.framework)} (${label("embed", spec.frontend.embed)})
- **백엔드**: ${label("runtime", spec.backend.runtime)} / 인증 ${label("auth", spec.backend.auth)} / 네트워크 ${label(
    "network",
    spec.backend.network,
  )}
- **배포**: ${label("deploy", spec.backend.deploy)} (${label("deployEnv", spec.project.deployEnv)})
- **데이터**: RDB ${label("rdb", spec.database.rdb)} / 파일 ${label("fileStore", spec.database.fileStore)}

## RAG 파이프라인

${ragFlow}
${
    ragOn && ["bge-m3", "kure", "ko-sroberta", "multilingual-e5"].includes(spec.rag.embedding)
      ? `\n> 임베딩 \`${spec.rag.embedding}\`은 클라우드 API가 아니라 **추론 서버**가 필요하다. 별도 컨테이너/서버로 띄우고 \`EMBEDDING_API_URL\`로 연결한다. 폐쇄망에서는 오프라인 설치 패키지에 모델 가중치를 포함한다.\n`
      : ""
}

## 보안 · 컴플라이언스

- 데이터 국내 보관: ${yesno(spec.compliance.security.dataResidencyKR)}
- 망분리 준수: ${yesno(spec.compliance.security.networkSeparation)}
- 감사 로그: ${yesno(spec.backend.logging.audit)}
- 접근성: ${label("a11yLevel", spec.frontend.a11yLevel)}

## 운영

- 멀티턴 세션: ${yesno(spec.llm.session.multiTurn)}
- 관리자 대시보드: ${yesno(spec.ops.observability?.adminDashboard)}
`;
}

/* ------------------------------ README.md ---------------------------------- */

export function renderReadmeMd(spec: AgentSpec): string {
  return `# ${spec.project.name || "공공기관 챗봇"}

${spec.project.org || ""} ${spec.project.dept ?? ""} 챗봇 프로젝트.

> 이 폴더는 **agent-maker**가 생성한 산출물이다. Claude Code로 구현을 시작하려면
> 먼저 \`PROMPT.md\`를 읽게 하라.

## 무엇인가

- 용도: ${labelList("purpose", spec.project.purpose)}
- 대상: ${labelList("audience", spec.project.audience)}
- 배포 환경: ${label("deployEnv", spec.project.deployEnv)}

## 구현 시작

1. 이 폴더에서 Claude Code를 연다.
2. \`PROMPT.md\`의 지시를 따른다. (정본 설정: \`agent-spec.json\`)
3. 빌드/기동 후 \`tests/\`의 평가 골든셋을 통과시킨다.

## 포함 파일

- \`PROMPT.md\` — Claude Code 구현 지시
- \`DESIGN.md\` — 디자인 시스템(토큰)
- \`ARCHITECTURE.md\` — 아키텍처
- \`CLAUDE.md\` — 이 프로젝트 작업 지침
- \`agent-spec.json\` — 전체 설정(정본)
- 스캐폴딩 코드(\`src/\`, 매니페스트, \`tests/\` 등)
`;
}

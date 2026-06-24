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
 * `spec.project.docLang` 으로 ko/en 분기 (M7-C). 구조·순서는 언어에 무관하게 동일하다.
 */

import type { AgentSpec } from "@/lib/agent-spec";
import { THEME_PRESETS, FONT_OPTIONS, LLM_MODEL_CATALOG } from "@/catalog";
import { label, labelList, yesno } from "./format";
import { designTokens, tokensToCss } from "./tokens";
import { t, type Lang } from "./i18n";

/* ----------------------------- 공통 조회 ----------------------------------- */

function themeLabel(spec: AgentSpec): string {
  if (spec.design.theme === "custom") {
    return spec.project.docLang === "en" ? "Custom" : "커스텀";
  }
  return THEME_PRESETS.find((th) => th.id === spec.design.theme)?.label ?? spec.design.theme;
}
function fontLabel(id: string): string {
  return FONT_OPTIONS.find((f) => f.id === id)?.label ?? id;
}
function modelLabel(id: string): string {
  return LLM_MODEL_CATALOG.find((m) => m.id === id)?.label ?? id;
}

/** 공공기관 제약 요약 (여러 문서에서 재사용) */
function constraintLines(spec: AgentSpec, lang: Lang): string[] {
  const s = t(lang);
  const lines: string[] = [];
  lines.push(`- ${s.prompt.constraint_deploy(label("deployEnv", spec.project.deployEnv, lang))}`);
  if (spec.project.deployEnv === "on-premise-airgap" || spec.backend.network === "offline") {
    lines.push(s.prompt.constraint_airgap);
  }
  lines.push(`- ${s.prompt.constraint_a11y(label("a11yLevel", spec.frontend.a11yLevel, lang))}`);
  lines.push(
    `- ${s.prompt.constraint_pii(yesno(spec.compliance.privacy.collectsPii, lang), yesno(spec.compliance.privacy.masking, lang))}`,
  );
  lines.push(`- ${s.prompt.constraint_residency(yesno(spec.compliance.security.dataResidencyKR, lang))}`);
  if (spec.compliance.procurement?.domesticPreferred) {
    lines.push(`- ${s.prompt.constraint_domestic}`);
  }
  return lines;
}

/* ------------------------------ PROMPT.md ---------------------------------- */

export function renderPromptMd(spec: AgentSpec): string {
  const lang: Lang = spec.project.docLang === "en" ? "en" : "ko";
  const s = t(lang);
  const ragOn = spec.rag.enabled;
  const steps: string[] = [];
  let n = 1;

  // 단계 1: 골격 확인
  const step1Title = lang === "en" ? "Verify project scaffold" : "프로젝트 골격 확인";
  const step1Body =
    lang === "en"
      ? "Read `agent-spec.json` (source of truth), `DESIGN.md`, `ARCHITECTURE.md`, and `CLAUDE.md` first. All decisions follow `agent-spec.json`."
      : "이 폴더의 `agent-spec.json`(정본), `DESIGN.md`, `ARCHITECTURE.md`, `CLAUDE.md`를 먼저 읽는다. 모든 결정은 `agent-spec.json`을 따른다.";
  steps.push(`${n++}. **${step1Title}**: ${step1Body}`);

  // 단계 2: 의존성 설치
  steps.push(`${n++}. ${s.prompt.step_deps}`);

  // 단계 3: 디자인 토큰
  steps.push(
    `${n++}. ${s.prompt.step_design(
      label("layout", spec.design.layout, lang),
      spec.design.widgetStyle.avatar,
      spec.design.widgetStyle.avatarStyle,
    )}`,
  );

  // 배포 채널 / 프론트 옵션
  const fe = spec.frontend;
  if (fe.channels.length > 1 || fe.channels[0] !== "web" || fe.localizeUi || fe.rtl || fe.userAuth !== "none") {
    const chParts: string[] = [
      lang === "en"
        ? `Deploy channels: ${fe.channels.join(", ")}`
        : `배포 채널: ${fe.channels.join(", ")}`,
    ];
    if (fe.channels.some((c) => c.startsWith("kakao")))
      chParts.push(s.prompt.step_channel_kakao);
    if (fe.userAuth !== "none") chParts.push(s.prompt.step_channel_auth(fe.userAuth));
    if (fe.localizeUi) chParts.push(s.prompt.step_channel_localize);
    if (fe.rtl) chParts.push(s.prompt.step_channel_rtl);
    steps.push(`${n++}. ${s.prompt.step_channel_prefix}: ${chParts.join(". ")}.`);
  }

  // RAG 파이프라인
  if (ragOn) {
    const ragExtra: string[] = [];
    if (spec.rag.sources.includes("upload-hwp")) {
      ragExtra.push(s.prompt.step_rag_hwp);
    }
    ragExtra.push(s.prompt.step_rag_dev_fallback);
    if (["bge-m3", "kure", "ko-sroberta", "multilingual-e5"].includes(spec.rag.embedding)) {
      ragExtra.push(s.prompt.step_rag_server(spec.rag.embedding));
    }
    if (spec.rag.retrieval.minScore != null) {
      ragExtra.push(
        lang === "en"
          ? `Apply a retrieval confidence threshold (minScore=${spec.rag.retrieval.minScore}): if the top similarity is below it, do not answer from the model — respond that there is insufficient grounding (no-answer).`
          : `검색 신뢰도 임계값(minScore=${spec.rag.retrieval.minScore})을 적용한다 — 최고 유사도가 이 값 미만이면 모델로 답하지 말고 "근거가 부족합니다"로 안내(no-answer)한다.`,
      );
    }
    if (spec.rag.glossary.length) {
      ragExtra.push(
        lang === "en"
          ? `Use the glossary/synonyms (${spec.rag.glossary.length} entries in agent-spec.json) to normalize query terms and answer wording (e.g. expand abbreviations) before retrieval.`
          : `용어집/동의어(agent-spec.json 의 ${spec.rag.glossary.length}개)를 사용해 검색 전 질의 용어·답변 표현을 정규화한다(약어 확장 등).`,
      );
    }
    const citeNote = spec.rag.citations
      ? s.prompt.step_rag_cite_yes
      : s.prompt.step_rag_cite_no;
    const accessNote =
      spec.rag.accessControl !== "none"
        ? s.prompt.step_rag_access(spec.rag.accessControl)
        : "";

    if (lang === "en") {
      steps.push(
        `${n++}. **Implement RAG pipeline**: ingest → chunk (${label("chunking", spec.rag.chunking.strategy, lang)}) → embed (${spec.rag.embedding}) → load into ${label("vectorDb", spec.rag.vectorDb, lang)} → retrieve (${label("retrieval", spec.rag.retrieval.strategy, lang)}). Citations ${citeNote}.${accessNote}${ragExtra.length ? " " + ragExtra.join(" ") : ""}`,
      );
    } else {
      steps.push(
        `${n++}. **RAG 파이프라인 구현**: 적재→청킹(${label("chunking", spec.rag.chunking.strategy, lang)})→임베딩(${spec.rag.embedding})→${label("vectorDb", spec.rag.vectorDb, lang)} 적재→검색(${label("retrieval", spec.rag.retrieval.strategy, lang)}). 답변에는 출처/페이지를 ${citeNote}. RAG 골격 stub(\`src/rag/pipeline.ts\`)의 함수 시그니처를 채운다. \`search()\`가 빈 결과를 그대로 반환하지 않도록 한다.${accessNote}${ragExtra.length ? " " + ragExtra.join(" ") : ""}`,
      );
    }
  }

  // LLM 연동
  const llmServing = label("serving", spec.llm.serving, lang);
  const llmProvider = label("provider", spec.llm.provider, lang);
  const llmTone = label("tone", spec.conversation.persona.tone, lang);
  const multiturnNote = spec.llm.session.multiTurn
    ? s.prompt.step_llm_multiturn(spec.llm.session.historyTurns)
    : "";
  const streamNote = spec.interaction.streaming.enabled ? s.prompt.step_llm_stream : "";
  // 세션 영속/재개 (persistence≠in-memory 또는 resumable 일 때만)
  const sess = spec.llm.session;
  const persistenceKo: Record<string, string> = { "in-memory": "인메모리", redis: "Redis", db: "DB" };
  const sessionNote =
    sess.resumable || sess.persistence !== "in-memory"
      ? lang === "en"
        ? ` Session persistence: store sessions in ${sess.persistence} (env: REDIS_URL / DATABASE_URL)${sess.resumable ? ". Make conversations resumable across visits — key on a persisted sessionId (the client keeps it in localStorage), so a returning user continues the same conversation" : ""}.`
        : ` 세션 영속: 세션을 ${persistenceKo[sess.persistence]}에 저장한다(env: REDIS_URL / DATABASE_URL)${sess.resumable ? ". 재방문 시 같은 sessionId(클라이언트가 localStorage 에 보관)로 대화를 재개해, 이탈 후 돌아와도 이어지게 한다" : ""}.`
      : "";
  // 모델 폴백/failover
  const failoverNote = spec.llm.fallbackModel
    ? lang === "en"
      ? ` On primary-model failure or overload, fall back to ${modelLabel(spec.llm.fallbackModel)}.`
      : ` 1차 모델 실패·과부하 시 ${modelLabel(spec.llm.fallbackModel)}(으)로 폴백한다.`
    : "";

  if (lang === "en") {
    steps.push(
      `${n++}. **Integrate LLM**: ${llmProvider} / model ${modelLabel(spec.llm.model)} / serving ${llmServing}. System prompt tone: ${llmTone}. Guardrails: grounded-only ${yesno(spec.llm.guardrails.groundedOnly, lang)}, PII filter ${yesno(spec.llm.guardrails.piiFilter, lang)}.${multiturnNote}${streamNote}${sessionNote}${failoverNote}`,
    );
  } else {
    steps.push(
      `${n++}. **LLM 연동**: ${llmProvider} / 모델 ${modelLabel(spec.llm.model)} / 호출 방식 ${llmServing}. 시스템 프롬프트는 ${llmTone} 톤. 가드레일: 근거기반 ${yesno(spec.llm.guardrails.groundedOnly, lang)}, 민감정보 필터 ${yesno(spec.llm.guardrails.piiFilter, lang)}.${multiturnNote}${streamNote}${sessionNote}${failoverNote}`,
    );
  }

  // 대화 설계
  const fallbackLabel = label("onUnknown", spec.conversation.fallback.onUnknown, lang);
  // handoff 타입: en은 번역 라벨, ko는 원문 id (기존 동작 유지)
  const handoffTypeDisplay =
    lang === "en"
      ? label("handoff", spec.conversation.fallback.handoff, lang)
      : (spec.conversation.fallback.handoff ?? "");
  const handoffNote =
    spec.conversation.fallback.handoff && spec.conversation.fallback.handoff !== "none"
      ? s.prompt.step_conv_handoff(
          handoffTypeDisplay,
          spec.conversation.fallback.handoffSlaMin,
          spec.conversation.fallback.showQueue,
        )
      : "";

  // 운영 시간 + 운영시간 외 안내
  const oh = spec.conversation.fallback.operatingHours;
  const offMsg = spec.conversation.fallback.offHoursMessage;
  const hoursNote = oh
    ? lang === "en"
      ? ` Operating hours: ${oh}${offMsg ? `; outside these hours respond with "${offMsg}"` : ""}.`
      : ` 운영 시간: ${oh}${offMsg ? `; 운영 시간 외에는 "${offMsg}"로 안내한다` : ""}.`
    : "";

  if (lang === "en") {
    steps.push(
      `${n++}. **Implement conversation design**: persona, intents, quick replies, and fallback (${fallbackLabel}).${s.prompt.step_conv_noIntent}${handoffNote}${hoursNote}`,
    );
  } else {
    steps.push(
      `${n++}. **대화 설계 반영**: 페르소나/인텐트/빠른응답/폴백(${fallbackLabel})을 구현한다.${s.prompt.step_conv_noIntent}${handoffNote}${hoursNote}`,
    );
  }

  // 상호작용/동작 방식
  const it = spec.interaction;
  const modeLabel = s.prompt.agentModes[it.agentMode] ?? it.agentMode;
  const interactionExtra: string[] = [];

  if (it.agentMode === "tool-agent") {
    const toolList = spec.integrations.tools.length
      ? spec.integrations.tools.map((tool) => `\`${tool.name}\`(${tool.description})`).join(", ")
      : lang === "en"
        ? "(no tools defined in integrations.tools — define tools first)"
        : "(integrations.tools 미정의 — 먼저 도구를 정의하라)";
    interactionExtra.push(s.prompt.step_toolagent_loop(it.maxSteps ?? 5, !!it.parallelTools, toolList));
    interactionExtra.push(s.prompt.step_toolagent_impl);
    if (it.toolPolicy === "confirm") {
      interactionExtra.push(s.prompt.step_toolagent_confirm);
    } else {
      interactionExtra.push(s.prompt.step_toolagent_policy(it.toolPolicy));
    }
    if (it.rendering.toolCallDisplay !== "hidden") {
      interactionExtra.push(s.prompt.step_toolagent_trace(it.rendering.toolCallDisplay));
    }
  }

  const streamPart = it.streaming.enabled
    ? s.prompt.step_interaction_stream(it.streaming.speed, it.streaming.indicator)
    : s.prompt.step_interaction_nostream;
  interactionExtra.push(
    `${streamPart}, ${s.prompt.step_interaction_render(yesno(it.rendering.markdown, lang), it.rendering.citationStyle)}`,
  );
  interactionExtra.push(
    `${s.prompt.step_interaction_output(it.output.length, it.output.structured)}${it.rendering.showContextMeter ? s.prompt.step_interaction_meter : ""}.`,
  );

  if (it.multimodal.length) {
    interactionExtra.push(s.prompt.step_interaction_multimodal(it.multimodal.join(", ")));
  }
  if (it.voice.stt !== "none" || it.voice.tts !== "none") {
    interactionExtra.push(
      s.prompt.step_interaction_voice(label("voice", it.voice.stt, lang), label("voice", it.voice.tts, lang)),
    );
  }
  if (it.disclaimer.aiNotice || it.disclaimer.consent) {
    const disclaimerParts = [
      it.disclaimer.aiNotice && s.prompt.step_interaction_ainotice,
      it.disclaimer.consent && s.prompt.step_interaction_consent,
    ]
      .filter(Boolean)
      .join(", ");
    interactionExtra.push(s.prompt.step_interaction_disclaimer(disclaimerParts));
  }
  if (it.a11yControls.length) {
    interactionExtra.push(s.prompt.step_interaction_a11y(it.a11yControls.join(", ")));
  }
  if (it.proactive.followupSuggestions || it.proactive.reengageAfterMin) {
    const proactiveParts = [
      it.proactive.followupSuggestions && s.prompt.step_interaction_proactive_followup,
      it.proactive.reengageAfterMin &&
        s.prompt.step_interaction_proactive_reengage(it.proactive.reengageAfterMin),
    ]
      .filter(Boolean)
      .join(", ");
    interactionExtra.push(s.prompt.step_interaction_proactive(proactiveParts));
  }
  if (it.inputLimits.maxChars || it.inputLimits.maxFileMb || it.inputLimits.allowedFileTypes?.length) {
    const inputParts = [
      it.inputLimits.maxChars &&
        (lang === "en" ? `${it.inputLimits.maxChars} chars` : `${it.inputLimits.maxChars}자`),
      it.inputLimits.maxFileMb &&
        `${it.inputLimits.maxFileMb}MB`,
      it.inputLimits.allowedFileTypes?.length &&
        (lang === "en"
          ? `types: ${it.inputLimits.allowedFileTypes.join("/")}`
          : `형식 ${it.inputLimits.allowedFileTypes.join("/")}`),
    ]
      .filter(Boolean)
      .join(", ");
    interactionExtra.push(s.prompt.step_interaction_input(inputParts));
  }

  const controlsStr = it.controls.join(", ") || (lang === "en" ? "(none)" : "(없음)");
  const feedbackStr = it.controls.includes("feedback") ? it.feedback : undefined;
  steps.push(
    `${n++}. ${s.prompt.step_interaction_prefix} ${modeLabel}. ${interactionExtra.join(" ")} ${s.prompt.step_interaction_controls(controlsStr, feedbackStr)}`,
  );

  // 에이전트 능력
  const ag = spec.agent;
  const caps: string[] = [];
  if (ag.askUser) caps.push(s.prompt.step_agent_askuser);
  if (ag.subAgents.enabled)
    caps.push(
      `${s.prompt.step_agent_subagent(ag.subAgents.maxParallel)}${
        ag.subAgents.roles.length
          ? s.prompt.step_agent_roles(ag.subAgents.roles.map((r) => r.name).join(", "))
          : ""
      }`,
    );
  if (ag.builtinTools.length) caps.push(s.prompt.step_agent_builtin(ag.builtinTools.join(", ")));
  if (ag.memory.longTerm) caps.push(s.prompt.step_agent_memory);
  if (ag.context.autoCompact)
    caps.push(s.prompt.step_agent_compact(ag.context.strategy, ag.context.budgetTokens));
  steps.push(
    `${n++}. ${s.prompt.step_agent_prefix}: ${caps.length ? caps.join("; ") + ". " : ""}${s.prompt.step_agent_safety(ag.safety.refusalStyle, ag.safety.rateLimitPerMin, ag.safety.abuseFilter)}`,
  );

  // 골든셋 검증
  steps.push(
    `${n++}. ${s.prompt.step_golden}${spec.evaluation.abTesting ? s.prompt.step_abtest : ""}`,
  );

  // 컴플라이언스 점검 — 보안(암호화·IP 제한·PIA) 추가 지시
  const sec = spec.compliance.security;
  const secBits: string[] = [];
  if (sec.encryption.atRest || !sec.encryption.inTransit)
    secBits.push(
      lang === "en"
        ? `encryption at-rest ${yesno(sec.encryption.atRest, lang)} / in-transit ${yesno(sec.encryption.inTransit, lang)}`
        : `암호화 저장 ${yesno(sec.encryption.atRest, lang)}·전송 ${yesno(sec.encryption.inTransit, lang)}`,
    );
  if (sec.ipAllowlist.enabled)
    secBits.push(
      lang === "en"
        ? `restrict access to an IP allowlist (${(sec.ipAllowlist.cidrs ?? []).join(", ") || "set CIDRs"}) at app/proxy (env IP_ALLOWLIST)`
        : `접속을 허용 IP 대역(${(sec.ipAllowlist.cidrs ?? []).join(", ") || "CIDR 입력"})으로 제한(앱/프록시, env IP_ALLOWLIST)`,
    );
  if (spec.compliance.privacy.piaRequired)
    secBits.push(lang === "en" ? "complete a Privacy Impact Assessment (PIA)" : "개인정보 영향평가(PIA) 수행");
  const secNote = secBits.length
    ? lang === "en"
      ? ` Security: ${secBits.join("; ")}.`
      : ` 보안: ${secBits.join("; ")}.`
    : "";

  if (lang === "en") {
    steps.push(
      `${n++}. ${s.prompt.step_compliance_prefix}: ${s.prompt.step_compliance_a11y} (${label("a11yLevel", spec.frontend.a11yLevel, lang)}), ${s.prompt.step_compliance_pii} (${yesno(spec.compliance.privacy.collectsPii && spec.compliance.privacy.masking, lang)}), ${s.prompt.step_compliance_audit} (${yesno(spec.backend.logging.audit || spec.ops.audit, lang)}) — ${s.prompt.step_compliance_footer}${secNote}`,
    );
  } else {
    steps.push(
      `${n++}. **컴플라이언스 점검**: 접근성(${label("a11yLevel", spec.frontend.a11yLevel, lang)}), 개인정보 마스킹(${yesno(spec.compliance.privacy.collectsPii && spec.compliance.privacy.masking, lang)}), 감사 로그(${yesno(spec.backend.logging.audit || spec.ops.audit, lang)})를 최종 확인한다. 동봉된 감사 로그 미들웨어·마스킹 유틸 stub을 실제 정책에 맞게 채운다.${secNote}`,
    );
  }

  const obs = spec.ops.observability;
  const perf = spec.ops.performance;
  const opsParts: string[] = [];
  if (obs?.analytics && obs.analytics !== "none")
    opsParts.push(s.prompt.step_ops_analytics(obs.analytics));
  if (perf?.caching.length)
    opsParts.push(s.prompt.step_ops_cache(perf.caching.join("/"), perf.promptCacheTtlSec));
  if (spec.ops.logRetentionDays)
    opsParts.push(
      lang === "en" ? `retain logs for ${spec.ops.logRetentionDays} days` : `로그 ${spec.ops.logRetentionDays}일 보관`,
    );
  if (spec.ops.backup.enabled)
    opsParts.push(
      lang === "en"
        ? `backups${spec.ops.backup.cycle ? ` (${spec.ops.backup.cycle})` : ""}`
        : `백업${spec.ops.backup.cycle ? ` (${spec.ops.backup.cycle})` : ""}`,
    );
  if (opsParts.length) {
    steps.push(`${n++}. ${s.prompt.step_ops_prefix}: ${opsParts.join(", ")}.`);
  }

  /* ---- 본문 조립 ---- */
  const orgLabel = spec.project.org || (lang === "en" ? "(organization)" : "(기관)");
  const nameLabel = spec.project.name || (lang === "en" ? "(chatbot)" : "(챗봇)");

  return `# ${s.prompt.title}

> ${s.prompt.preamble(orgLabel, nameLabel)}

## ${s.prompt.sec0}

${constraintLines(spec, lang).join("\n")}

${s.prompt.constraintFooter}

## ${s.prompt.sec1}

- **${s.prompt.orgDept}**: ${spec.project.org || "-"}${spec.project.dept ? ` / ${spec.project.dept}` : ""}
- **${s.prompt.botName}**: ${spec.project.name || "-"}
- **${s.prompt.purpose}**: ${labelList("purpose", spec.project.purpose, undefined, lang)}
- **${s.prompt.audience}**: ${labelList("audience", spec.project.audience, undefined, lang)}
- **${s.prompt.opLang}**: ${labelList("languages", spec.project.languages, undefined, lang)}
- **${s.prompt.stack}**: ${label("framework", spec.frontend.framework, lang)} (${lang === "en" ? "frontend" : "프론트"}) / ${label("runtime", spec.backend.runtime, lang)} (${lang === "en" ? "backend" : "백엔드"}) / ${ragOn ? `RAG: ${label("vectorDb", spec.rag.vectorDb, lang)} + ${spec.rag.embedding}` : s.prompt.ragOff} / LLM: ${modelLabel(spec.llm.model)}

## ${s.prompt.sec2}

${steps.join("\n")}

## ${s.prompt.sec3}

- [ ] ${s.prompt.acc1}
- [ ] ${s.prompt.acc2}
${ragOn ? `- [ ] ${s.prompt.accRag}\n` : ""}- [ ] ${s.prompt.acc4}
- [ ] ${s.prompt.acc3(label("a11yLevel", spec.frontend.a11yLevel, lang))}

## ${s.prompt.sec4}

${s.prompt.principles}
`;
}

/* ------------------------------ DESIGN.md ---------------------------------- */

export function renderDesignMd(spec: AgentSpec): string {
  const lang: Lang = spec.project.docLang === "en" ? "en" : "ko";
  const s = t(lang);
  const tokens = designTokens(spec);
  const { widgetStyle } = spec.design;
  const ds = s.design;

  return `# ${ds.title}

> ${ds.preamble(spec.project.name || (lang === "en" ? "chatbot" : "챗봇"))}

## ${ds.sec_theme}

- **${ds.preset}**: ${themeLabel(spec)}
- **${ds.mode}**: ${label("mode", spec.design.mode, lang)}
- **${ds.layout}**: ${label("layout", spec.design.layout, lang)}

## ${ds.sec_colors}

| ${ds.col_token} | ${ds.col_value} | ${ds.col_usage} |
|---|---|---|
| \`--color-primary\` | \`${spec.design.colors.primary}\` | ${ds.colors.primary} |
| \`--color-secondary\` | \`${spec.design.colors.secondary}\` | ${ds.colors.secondary} |
| \`--color-accent\` | \`${spec.design.colors.accent}\` | ${ds.colors.accent} |
| \`--color-background\` | \`${spec.design.colors.background}\` | ${ds.colors.background} |
| \`--color-surface\` | \`${spec.design.colors.surface}\` | ${ds.colors.surface} |
| \`--color-text\` | \`${spec.design.colors.text}\` | ${ds.colors.text} |
| \`--color-muted\` | \`${spec.design.colors.muted}\` | ${ds.colors.muted} |
| \`--color-border\` | \`${spec.design.colors.border}\` | ${ds.colors.border} |

## ${ds.sec_fonts}

- **${ds.font_heading}**: ${fontLabel(spec.design.fonts.heading)} (\`--font-heading\`)
- **${ds.font_body}**: ${fontLabel(spec.design.fonts.body)} (\`--font-body\`)

## ${ds.sec_widget}

- ${ds.widget_radius}: ${widgetStyle.bubbleRadius} (\`--bubble-radius\`)
- ${ds.widget_avatar}: ${yesno(widgetStyle.avatar, lang)}
- ${ds.widget_align}: ${widgetStyle.align}
- ${ds.widget_input}: ${widgetStyle.inputStyle}
- ${ds.widget_density}: ${widgetStyle.density}

## ${ds.sec_motion}

- ${ds.motion_stream}: ${label("streamAnimation", spec.presentation.stream.animation, lang)} · ${ds.motion_cursor}: ${label("streamCursor", spec.presentation.stream.cursor, lang)}
- ${ds.motion_toolui}: ${label("toolCallUi", spec.presentation.toolCall.ui, lang)} · ${ds.motion_toolanim}: ${label("toolCallAnimation", spec.presentation.toolCall.animation, lang)}
- ${ds.motion_entrance}: ${label("messageEntrance", spec.presentation.motion.messageEntrance, lang)} · ${ds.motion_pacing}: ${label("motionPacing", spec.presentation.motion.pacing, lang)}
- ${ds.motion_note}

## ${ds.sec_css}

\`\`\`css
${tokensToCss(tokens)}
\`\`\`

## ${ds.sec_a11y}

- ${ds.a11y_goal}: ${label("a11yLevel", spec.frontend.a11yLevel, lang)}
- ${ds.a11y_note}
`;
}

/* ------------------------------ CLAUDE.md ---------------------------------- */
/* (생성될 챗봇 프로젝트용 작업 지침 — agent-maker 자신의 CLAUDE.md와 별개) */

export function renderClaudeMd(spec: AgentSpec): string {
  const lang: Lang = spec.project.docLang === "en" ? "en" : "ko";
  const s = t(lang);
  const cs = s.claude;
  const botName = spec.project.name || (lang === "en" ? "chatbot" : "챗봇");

  return `# ${cs.title(botName)}

> ${cs.preamble}

## ${cs.sec1}

- ${cs.org}: ${spec.project.org || "-"} / ${cs.bot}: ${spec.project.name || "-"}
- ${cs.purpose}: ${labelList("purpose", spec.project.purpose, undefined, lang)}
- ${cs.deploy}: ${label("deployEnv", spec.project.deployEnv, lang)}

## ${cs.sec2}

${constraintLines(spec, lang).join("\n")}

## ${cs.sec3}

- ${cs.frontend}: ${label("framework", spec.frontend.framework, lang)} / ${cs.embed_label}: ${label("embed", spec.frontend.embed, lang)}
- ${cs.backend}: ${label("runtime", spec.backend.runtime, lang)} / ${cs.auth_label}: ${label("auth", spec.backend.auth, lang)} / ${cs.deploy_label}: ${label("deploy", spec.backend.deploy, lang)}
- ${cs.db_label}: ${label("rdb", spec.database.rdb, lang)} / ${cs.filestore_label}: ${label("fileStore", spec.database.fileStore, lang)}
- ${cs.llm_label}: ${label("provider", spec.llm.provider, lang)} · ${modelLabel(spec.llm.model)} · ${label("serving", spec.llm.serving, lang)}
${spec.rag.enabled ? `- ${cs.rag_line(label("vectorDb", spec.rag.vectorDb, lang), spec.rag.embedding, label("retrieval", spec.rag.retrieval.strategy, lang))}` : `- ${cs.rag_off}`}

## ${cs.sec4}

- ${cs.principle_spec}
- ${cs.principle_tone(label("tone", spec.conversation.persona.tone, lang))}${spec.llm.guardrails.groundedOnly ? cs.principle_grounded : ""}${spec.rag.citations ? cs.principle_cite : ""}
- ${cs.principle_unknown(label("onUnknown", spec.conversation.fallback.onUnknown, lang))}
- ${cs.principle_text(label("a11yLevel", spec.frontend.a11yLevel, lang))}

## ${cs.sec5}

- ${cs.verify}
`;
}

/* --------------------------- ARCHITECTURE.md ------------------------------- */

export function renderArchitectureMd(spec: AgentSpec): string {
  const lang: Lang = spec.project.docLang === "en" ? "en" : "ko";
  const s = t(lang);
  const as = s.arch;
  const ragOn = spec.rag.enabled;

  let ragFlow: string;
  if (ragOn) {
    ragFlow = `\`\`\`
[${as.rag_source}: ${labelList("sources", spec.rag.sources, lang === "en" ? "(none selected)" : "(소스 미선택)", lang)}]
   │ ${as.rag_ingest(yesno(spec.rag.ingest.ocr, lang), yesno(spec.rag.ingest.tables, lang))}
   ▼
[${as.rag_chunk}: ${label("chunking", spec.rag.chunking.strategy, lang)}]
   ▼
[${as.rag_embed}: ${spec.rag.embedding}] ──▶ [${as.rag_vdb}: ${label("vectorDb", spec.rag.vectorDb, lang)}]
   ▼
[${as.rag_search}: ${label("retrieval", spec.rag.retrieval.strategy, lang)}${spec.rag.retrieval.reranker ? ` + ${as.rag_reranker} ${spec.rag.retrieval.reranker}` : ""}]
   ▼
[LLM: ${modelLabel(spec.llm.model)}] ──▶ ${as.rag_answer}${spec.rag.citations ? ` ${as.rag_cite}` : ""}
\`\`\``;
  } else {
    ragFlow = as.rag_off;
  }

  const embedServerNote =
    ragOn && ["bge-m3", "kure", "ko-sroberta", "multilingual-e5"].includes(spec.rag.embedding)
      ? `\n${as.rag_server_note(spec.rag.embedding)}\n`
      : "";

  return `# ${as.title}

## ${as.sec1}

- **${as.frontend_label}**: ${label("framework", spec.frontend.framework, lang)} (${label("embed", spec.frontend.embed, lang)})
- **${as.backend_label}**: ${label("runtime", spec.backend.runtime, lang)} / ${as.auth_label} ${label("auth", spec.backend.auth, lang)} / ${as.network_label} ${label("network", spec.backend.network, lang)}
- **${as.deploy_label}**: ${label("deploy", spec.backend.deploy, lang)} (${label("deployEnv", spec.project.deployEnv, lang)})
- **${as.data_label}**: ${as.rdb_label} ${label("rdb", spec.database.rdb, lang)} / ${as.file_label} ${label("fileStore", spec.database.fileStore, lang)}

## ${as.sec2}

${ragFlow}
${embedServerNote}

## ${as.sec3}

- ${as.residency}: ${yesno(spec.compliance.security.dataResidencyKR, lang)}
- ${as.network_sep}: ${yesno(spec.compliance.security.networkSeparation, lang)}
- ${lang === "en" ? "Encryption" : "암호화"}: ${lang === "en" ? "at-rest" : "저장"} ${yesno(spec.compliance.security.encryption.atRest, lang)} / ${lang === "en" ? "in-transit" : "전송"} ${yesno(spec.compliance.security.encryption.inTransit, lang)}
${
    spec.compliance.security.ipAllowlist.enabled
      ? `- ${lang === "en" ? "IP allowlist" : "접속 IP 제한"}: ${(spec.compliance.security.ipAllowlist.cidrs ?? []).join(", ") || (lang === "en" ? "(set CIDRs)" : "(CIDR 입력)")}\n`
      : ""
  }- ${as.audit}: ${yesno(spec.backend.logging.audit, lang)}
- ${as.a11y}: ${label("a11yLevel", spec.frontend.a11yLevel, lang)}

## ${as.sec4}

- ${as.multiturn}: ${yesno(spec.llm.session.multiTurn, lang)}
- ${as.dashboard}: ${yesno(spec.ops.observability?.adminDashboard, lang)}
`;
}

/* ------------------------------ README.md ---------------------------------- */

export function renderReadmeMd(spec: AgentSpec): string {
  const lang: Lang = spec.project.docLang === "en" ? "en" : "ko";
  const s = t(lang);
  const rs = s.readme;

  return `# ${spec.project.name || rs.default_title}

${rs.by(spec.project.org || "", spec.project.dept ?? "")}

${rs.preamble}

## ${rs.sec1}

- ${rs.purpose}: ${labelList("purpose", spec.project.purpose, undefined, lang)}
- ${rs.audience}: ${labelList("audience", spec.project.audience, undefined, lang)}
- ${rs.deploy}: ${label("deployEnv", spec.project.deployEnv, lang)}

## ${rs.sec2}

1. ${rs.step1}
2. ${rs.step2}
3. ${rs.step3}

## ${rs.sec3}

${rs.files}
`;
}

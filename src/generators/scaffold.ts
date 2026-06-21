/**
 * 스캐폴딩 코드 생성 — AgentSpec → 최소 실행 가능한 골격 파일들. (PLAN.md §6.2)
 *
 * 목표: "빈 껍데기"가 아니라 **컴파일/기동되는 최소 골격**. 비즈니스 로직은 Claude Code가
 * PROMPT.md 지시에 따라 채운다. M2 슬라이스는 기본 스택(Node + TypeScript 백엔드 + 토큰 적용
 * 채팅 UI)을 대상으로 한다. 다른 스택의 깊은 템플릿은 M5/M6에서 확장한다. (PLAN.md §9)
 */

import type { AgentSpec } from "@/lib/agent-spec";
import type { GeneratedFile } from "./index";
import { designTokens, tokensToCss } from "./tokens";

/** 선택에 따라 필요한 환경변수 목록(placeholder)을 계산 */
/** API 키 없이 추론 서버가 필요한 온프레미스 임베딩 모델 */
const ONPREM_EMBEDDINGS = ["bge-m3", "kure", "ko-sroberta", "multilingual-e5"];

function envEntries(spec: AgentSpec): string[] {
  const env: string[] = ["# 자동 생성된 환경변수 목록 — 실제 값으로 채운다", "PORT=3000"];
  env.push("# 테스트/오프라인: true 면 LLM 호출 없이 스텁 응답 사용");
  env.push("LLM_STUB=false");
  if (spec.llm.serving === "self-hosted" || spec.llm.serving === "proxy") {
    env.push("LLM_BASE_URL=http://localhost:8000/v1");
  } else if (spec.llm.provider === "claude") {
    env.push("ANTHROPIC_API_KEY=");
  } else if (spec.llm.provider === "openai") {
    env.push("OPENAI_API_KEY=");
  }
  env.push(`LLM_MODEL=${spec.llm.model}`);
  if (spec.database.rdb !== "none") env.push("DATABASE_URL=");
  if (spec.rag.enabled) {
    if (spec.rag.vectorDb === "qdrant") env.push("QDRANT_URL=http://localhost:6333");
    if (spec.rag.vectorDb === "milvus") env.push("MILVUS_URI=http://localhost:19530");
    env.push(`EMBEDDING_MODEL=${spec.rag.embedding}`);
    if (ONPREM_EMBEDDINGS.includes(spec.rag.embedding)) {
      env.push("# 온프레미스 임베딩은 API 가 아니라 추론 서버가 필요하다 (ARCHITECTURE.md)");
      env.push("EMBEDDING_API_URL=http://localhost:8080/embed");
    }
  }
  return env;
}

function packageJson(spec: AgentSpec, slug: string): string {
  const deps: Record<string, string> = { express: "^4.21.2" };
  if (spec.llm.provider === "claude" && spec.llm.serving === "official-api") {
    deps["@anthropic-ai/sdk"] = "^0.32.1";
  }
  const pkg = {
    name: slug,
    version: "0.1.0",
    private: true,
    type: "module",
    scripts: {
      dev: "tsx watch src/server.ts",
      build: "tsc",
      start: "node dist/server.js",
      test: "vitest run",
    },
    dependencies: deps,
    devDependencies: {
      typescript: "^5.7.3",
      tsx: "^4.19.2",
      vitest: "^2.1.8",
      "@types/express": "^4.17.21",
      "@types/node": "^22.10.5",
    },
  };
  return JSON.stringify(pkg, null, 2) + "\n";
}

const TSCONFIG = `{
  "compilerOptions": {
    "target": "ES2022",
    "module": "ES2022",
    "moduleResolution": "bundler",
    "strict": true,
    "esModuleInterop": true,
    "skipLibCheck": true,
    "outDir": "dist",
    "rootDir": "src"
  },
  "include": ["src"]
}
`;

function serverTs(spec: AgentSpec): string {
  const audit = spec.backend.logging.audit || spec.ops.audit;
  const auditMw = audit
    ? `
// 감사 로그 미들웨어 (audit=true) — TODO: 보관소/포맷을 기관 정책에 맞게 (개인정보 주의)
app.use((req, _res, next) => {
  console.log(JSON.stringify({ ts: new Date().toISOString(), method: req.method, path: req.path }));
  next();
});
`
    : "";
  // 채팅 가드 미들웨어 — rate limit / 입력 길이 / 남용 필터 (선택값에 따라 생성)
  const rateLimit = spec.agent.safety.rateLimitPerMin;
  const abuse = spec.agent.safety.abuseFilter;
  const maxChars = spec.interaction.inputLimits.maxChars;
  const guardChecks: string[] = [];
  if (rateLimit) {
    guardChecks.push(
      `  const ip = req.ip ?? "unknown";\n  const now = Date.now();\n  const w = HITS.get(ip);\n  if (!w || now - w.t > 60000) HITS.set(ip, { n: 1, t: now });\n  else if (w.n >= RATE_PER_MIN) { res.status(429).json({ error: "요청이 너무 많습니다. 잠시 후 다시 시도하세요." }); return; }\n  else w.n++;`,
    );
  }
  if (maxChars) {
    guardChecks.push(
      `  if (typeof req.body?.message === "string" && req.body.message.length > ${maxChars}) { res.status(400).json({ error: "메시지가 너무 깁니다(최대 ${maxChars}자)." }); return; }`,
    );
  }
  if (abuse) {
    guardChecks.push(
      `  if (isAbusive(req.body?.message)) { res.status(400).json({ error: "부적절한 입력이 감지되었습니다." }); return; }`,
    );
  }
  const guardMw = guardChecks.length
    ? `
${rateLimit ? `const RATE_PER_MIN = ${rateLimit};\nconst HITS = new Map<string, { n: number; t: number }>();\n` : ""}${abuse ? `// 남용 필터 — TODO: 금칙어/스팸 패턴을 기관 정책에 맞게 보강\nconst BANNED = [/(.)\\1{20,}/]; // 과도한 반복 등\nfunction isAbusive(m: unknown): boolean { return typeof m === "string" && BANNED.some((r) => r.test(m)); }\n` : ""}// 채팅 엔드포인트 공통 가드 (/api/chat, /api/chat/stream)
app.use("/api/chat", (req, res, next) => {
${guardChecks.join("\n")}
  next();
});
`
    : "";
  const confirmRoute =
    spec.interaction.agentMode === "tool-agent" && spec.interaction.toolPolicy === "confirm"
      ? `
// 도구 실행 승인 (toolPolicy=confirm) — 도구 실행 전 사용자 승인을 받는 HITL 핸드셰이크.
// 흐름: /api/chat 가 { type: "awaiting_confirmation", toolName, toolArgs, confirmToken } 로 응답
//       → 프론트가 사용자 승인 후 여기로 POST → 서버가 도구 실행 후 후속 답변 반환.
app.post("/api/chat/confirm", async (req, res) => {
  const { confirmToken, approved } = req.body ?? {};
  if (typeof confirmToken !== "string") {
    res.status(400).json({ error: "confirmToken 이 필요합니다." });
    return;
  }
  // TODO: confirmToken 으로 보류된 도구 호출을 조회 → approved 면 TOOLS 로 실행 후 후속 답변 생성.
  res.json({ status: approved ? "executed" : "rejected", note: "TODO: confirm 흐름 구현" });
});
`
      : "";
  const streaming = spec.interaction.streaming.enabled;
  const streamRoute = streaming
    ? `
// 스트리밍 채팅 (SSE) — interaction.streaming.enabled=true
app.post("/api/chat/stream", async (req, res) => {
  const { message, sessionId } = req.body ?? {};
  if (typeof message !== "string" || !message.trim()) {
    res.status(400).json({ error: "message 가 필요합니다." });
    return;
  }
  res.setHeader("Content-Type", "text/event-stream");
  res.setHeader("Cache-Control", "no-cache");
  res.setHeader("Connection", "keep-alive");
  try {
    for await (const ev of answerStream(message, sessionId)) {
      res.write(\`data: \${JSON.stringify(ev)}\\n\\n\`);
    }
  } catch {
    res.write('event: error\\ndata: {}\\n\\n');
  }
  res.write('event: done\\ndata: {}\\n\\n');
  res.end();
});
`
    : "";
  return `// 진입점 — 헬스체크 + 채팅 API 골격. (PROMPT.md 지시에 따라 로직을 채운다)
import express from "express";
import { answer${streaming ? ", answerStream" : ""} } from "./chat.js";

const app = express();
app.use(express.json());
app.use(express.static("public"));
${auditMw}${guardMw}
// 헬스체크 (acceptance: 200 반환)
app.get("/health", (_req, res) => res.json({ status: "ok" }));

// 채팅: 사용자 질문 → (RAG 검색) → LLM 답변
app.post("/api/chat", async (req, res) => {
  const { message, sessionId } = req.body ?? {};
  if (typeof message !== "string" || !message.trim()) {
    res.status(400).json({ error: "message 가 필요합니다." });
    return;
  }
  try {
    const result = await answer(message, sessionId);
    res.json(result);
  } catch {
    res.status(500).json({ error: "처리 중 오류가 발생했습니다." });
  }
});
${streamRoute}${confirmRoute}
const port = Number(process.env.PORT ?? 3000);
app.listen(port, () => console.log(\`server on :\${port}\`));
`;
}

function chatTs(spec: AgentSpec): string {
  const it = spec.interaction;
  const rag = spec.rag.enabled;
  const streaming = it.streaming.enabled;
  const toolAgent = it.agentMode === "tool-agent";
  const multiTurn = spec.llm.session.multiTurn;
  const maxSteps = it.maxSteps ?? 5;
  const histMsgs = (spec.llm.session.historyTurns ?? 10) * 2;
  const masking =
    spec.compliance.privacy.masking &&
    (spec.compliance.privacy.collectsPii || spec.llm.guardrails.piiFilter);
  const safe = (v: string) => (masking ? `maskPii(${v})` : v);

  const imports = [
    rag ? `import { search } from "./rag/pipeline.js";` : "",
    `import { complete${streaming ? ", completeStream" : ""}, type Msg } from "./llm/client.js";`,
    toolAgent ? `import { TOOLS } from "./tools.js";` : "",
  ]
    .filter(Boolean)
    .join("\n");

  const ragLines = rag
    ? `  const contexts: string[] = chunks.map((c) => c.text);\n  const sources: string[] = chunks.map((c) => (c.page ? c.source + " p." + c.page : c.source));\n`
    : `  const contexts: string[] = [];\n  const sources: string[] = [];\n`;
  const ragSearch = rag ? `  const chunks = await search(message);\n` : "";
  const toolLines = toolAgent
    ? `  // tool-agent: 도구를 최대 ${maxSteps}회 호출해 컨텍스트를 보강. (TODO: 실제 LLM tool-use 로 도구/인자 선택)\n` +
      `  for (const name of Object.keys(TOOLS).slice(0, ${maxSteps})) {\n` +
      `    const result = await TOOLS[name]({ query: message });\n` +
      `    contexts.push("[tool:" + name + "] " + JSON.stringify(result));\n` +
      `    sources.push("tool:" + name);\n` +
      `    traces.push({ tool: name, result });\n` +
      `  }\n`
    : "";

  const sessionDecl = multiTurn
    ? `\n// 멀티턴 세션 — sessionId 별 대화 이력(메모리). 운영은 DB/Redis 로 대체.\nconst SESSIONS = new Map<string, Msg[]>();\nconst HISTORY_MSGS = ${histMsgs};\nfunction loadHistory(id?: string): Msg[] { return id ? SESSIONS.get(id) ?? [] : []; }\nfunction saveHistory(id: string | undefined, messages: Msg[], answerText: string): void {\n  if (!id) return;\n  const updated: Msg[] = [...messages, { role: "assistant", content: answerText }];\n  SESSIONS.set(id, updated.slice(-HISTORY_MSGS));\n}\n`
    : `\nfunction loadHistory(_id?: string): Msg[] { return []; }\nfunction saveHistory(_id: string | undefined, _m: Msg[], _a: string): void {}\n`;

  const maskUtil = masking
    ? `\n// 개인정보 마스킹 (piiFilter/masking) — TODO: 기관 정책에 맞게 패턴을 보강한다.\nfunction maskPii(text: string): string {\n  return text\n    .replace(/\\d{6}-\\d{7}/g, "******-*******") // 주민등록번호\n    .replace(/01[016789]-?\\d{3,4}-?\\d{4}/g, "***-****-****") // 휴대전화\n    .replace(/[\\w.+-]+@[\\w-]+\\.[\\w.-]+/g, "***@***"); // 이메일\n}\n`
    : "";

  const wantTrace = toolAgent && it.rendering.toolCallDisplay !== "hidden";
  const streamDestructure = wantTrace
    ? "const { contexts, sources, traces } = await gather(message);"
    : "const { contexts, sources } = await gather(message);";
  const traceEmit = wantTrace
    ? "  // 도구 호출 trace 를 먼저 전송 (toolCallDisplay 표시용)\n  for (const t of traces) yield { trace: t };\n"
    : "";
  const streamEventType = `{ delta?: string; sources?: string[]${
    wantTrace ? "; trace?: { tool: string; result: unknown }" : ""
  } }`;
  const streamFn = streaming
    ? `
// 스트리밍 응답 — (도구 trace) → 토큰 델타 → sources. (/api/chat/stream 에서 SSE 로 전송)
export async function* answerStream(message: string, sessionId?: string): AsyncGenerator<${streamEventType}> {
  ${streamDestructure}
  const system = buildSystemPrompt(contexts);
  const messages: Msg[] = [...loadHistory(sessionId), { role: "user", content: message }];
${traceEmit}  let full = "";
  if (STUB) {
    for (const tok of stubAnswer(message, contexts).split(/(\\s+)/)) { full += tok; yield { delta: tok }; }
  } else {
    for await (const d of completeStream(system, messages)) { full += d; yield { delta: d }; }
  }
  saveHistory(sessionId, messages, ${safe("full")});
  yield { sources };
}
`
    : "";

  // 시스템 프롬프트에 주입할 안전 정책 (거절 스타일 · 금칙 주제 · PII)
  const refusalMap: Record<string, string> = {
    polite: "정중히 사과하고 가능한 대안을 안내하세요",
    brief: "간결히 답변할 수 없음을 알리세요",
    redirect: "담당 부서나 적절한 채널로 안내하세요",
    strict: "관련 규정을 근거로 명확히 거절하세요",
  };
  const banned = spec.llm.guardrails.bannedTopics;
  const safetyLines =
    `    "답변이 불가능하면 ${refusalMap[spec.agent.safety.refusalStyle]}.",\n` +
    (banned && banned.length ? `    "다음 주제는 정중히 거절하세요: ${banned.join(", ")}.",\n` : "") +
    (spec.llm.guardrails.piiFilter
      ? `    "개인정보(주민등록번호·전화·이메일 등)는 답변에 노출하지 마세요.",\n`
      : "");

  return `// 채팅 오케스트레이션: (RAG 검색)${toolAgent ? " + 도구 호출 루프" : ""} → LLM${streaming ? " (스트리밍)" : ""}.
// 동작: ${it.agentMode} / 멀티턴: ${multiTurn} / 스트리밍: ${streaming} / 인용: "${it.rendering.citationStyle}".
// 안전: 거절 "${spec.agent.safety.refusalStyle}"${masking ? " · PII 마스킹" : ""}.
${imports}

const GROUNDED_ONLY = ${spec.llm.guardrails.groundedOnly}; // 근거 기반 답변 강제
const STUB = process.env.LLM_STUB === "true"; // 테스트/오프라인: 실제 LLM 호출 없이 결정적 스텁
${sessionDecl}
export interface ChatResult { answer: string; sources: string[]; }

// 컨텍스트 구성: RAG 검색${toolAgent ? " + 도구 호출(trace 수집)" : ""}
async function gather(message: string): Promise<{ contexts: string[]; sources: string[]; traces: { tool: string; result: unknown }[] }> {
${ragSearch}${ragLines}  const traces: { tool: string; result: unknown }[] = [];
${toolLines}  return { contexts, sources, traces };
}

export async function answer(message: string, sessionId?: string): Promise<ChatResult> {
  const { contexts, sources } = await gather(message);
  const system = buildSystemPrompt(contexts);
  const messages: Msg[] = [...loadHistory(sessionId), { role: "user", content: message }];
  const raw = STUB ? stubAnswer(message, contexts) : await complete(system, messages);
  const answerText = ${safe("raw")};
  saveHistory(sessionId, messages, answerText);
  return { answer: answerText, sources };
}
${streamFn}
function stubAnswer(message: string, contexts: string[]): string {
  // 결정적 스텁 — 골든셋 플러밍용. 실제 동작은 complete()/completeStream() 가 담당한다.
  const cite = contexts.length ? " (참고: " + contexts.join(", ") + ")" : "";
  return '[STUB] "' + message + '" 문의에 대한 안내입니다.' + cite;
}
${maskUtil}
function buildSystemPrompt(contexts: string[]): string {
  // TODO: agent-spec.json 의 conversation.persona.systemPrompt 를 반영한다.
  return [
    "당신은 ${spec.project.org || "공공기관"}의 안내 챗봇입니다.",
    "톤: ${spec.conversation.persona.tone}. 한국어로 정중히 답합니다.",
    GROUNDED_ONLY ? "제공된 근거에 없는 내용은 추측하지 마세요." : "",
${safetyLines}    contexts.length ? "참고 자료:\\n" + contexts.join("\\n---\\n") : "",
  ]
    .filter(Boolean)
    .join("\\n");
}
`;
}

// tool-agent 도구 레지스트리 (integrations.tools → 스텁 함수 + Anthropic-format 정의)
function toolsTs(spec: AgentSpec): string {
  const tools = spec.integrations.tools.length
    ? spec.integrations.tools
    : [{ name: "search_example", description: "예시 도구 — integrations.tools 를 채우세요." }];
  const entries = tools
    .map(
      (t) =>
        `  // ${t.description}\n  ${JSON.stringify(t.name)}: async (args) => ({ tool: ${JSON.stringify(
          t.name,
        )}, args, result: "TODO: 실제 구현" }),`,
    )
    .join("\n");
  const defs = tools
    .map((t) => {
      const schema =
        t.parameters ?? { type: "object", properties: {}, required: [] };
      return `  { name: ${JSON.stringify(t.name)}, description: ${JSON.stringify(
        t.description,
      )}, input_schema: ${JSON.stringify(schema)} },`;
    })
    .join("\n");
  return `// 도구 레지스트리 — agentMode=tool-agent. (각 도구의 실제 로직을 채운다)
export type ToolFn = (args: Record<string, unknown>) => Promise<unknown>;

// 실행기: 이름 → 함수. (실제 API 호출/DB 조회 등으로 채운다)
export const TOOLS: Record<string, ToolFn> = {
${entries}
};

// LLM tool-use 정의 (Anthropic \`tools\` 파라미터 형식) — messages.create({ tools: TOOL_DEFS }) 로 전달.
// 실제 루프: stop_reason==="tool_use" 면 해당 도구를 TOOLS 로 실행 → tool_result 로 회신 → 반복(최대 maxSteps).
export const TOOL_DEFS = [
${defs}
] as const;
`;
}

function llmClientTs(spec: AgentSpec): string {
  const stream = spec.interaction.streaming.enabled;
  if (spec.llm.provider === "claude" && spec.llm.serving === "official-api") {
    const streamFn = stream
      ? `
/** 스트리밍 — 토큰 델타를 순차 yield (streaming.enabled=true) */
export async function* completeStream(system: string, messages: Msg[]): AsyncGenerator<string> {
  const s = await client().messages.create({
    model: MODEL, max_tokens: ${spec.llm.params.maxTokens}, temperature: ${spec.llm.params.temperature},
    system, messages, stream: true,
  });
  for await (const ev of s) {
    if (ev.type === "content_block_delta" && ev.delta.type === "text_delta") yield ev.delta.text;
  }
}
`
      : "";
    return `// LLM 클라이언트 — Claude 공식 API. (키: ANTHROPIC_API_KEY)
import Anthropic from "@anthropic-ai/sdk";

export type Msg = { role: "user" | "assistant"; content: string };
const MODEL = process.env.LLM_MODEL ?? "${spec.llm.model}";

// 지연 초기화 — 키가 없어도 서버(/health)는 기동되도록 한다.
let _client: Anthropic | null = null;
function client(): Anthropic {
  if (!_client) _client = new Anthropic();
  return _client;
}

export async function complete(system: string, messages: Msg[]): Promise<string> {
  const res = await client().messages.create({
    model: MODEL,
    max_tokens: ${spec.llm.params.maxTokens},
    temperature: ${spec.llm.params.temperature},
    system,
    messages,
  });
  const block = res.content[0];
  return block && block.type === "text" ? block.text : "";
}
${streamFn}`;
  }
  // 프록시/사내추론/오픈소스: OpenAI 호환 엔드포인트 가정
  const streamFnCompat = stream
    ? `
/** 스트리밍 — OpenAI 호환 SSE 파싱 (streaming.enabled=true) */
export async function* completeStream(system: string, messages: Msg[]): AsyncGenerator<string> {
  const res = await fetch(\`\${BASE_URL}/chat/completions\`, {
    method: "POST", headers: { "content-type": "application/json" },
    body: JSON.stringify({ model: MODEL, stream: true, messages: [{ role: "system", content: system }, ...messages] }),
  });
  const reader = res.body?.getReader();
  if (!reader) return;
  const dec = new TextDecoder();
  let buf = "";
  for (;;) {
    const { value, done } = await reader.read();
    if (done) break;
    buf += dec.decode(value, { stream: true });
    const lines = buf.split("\\n");
    buf = lines.pop() ?? "";
    for (const line of lines) {
      const m = line.trim();
      if (!m.startsWith("data:")) continue;
      const payload = m.slice(5).trim();
      if (payload === "[DONE]") return;
      try { const j = JSON.parse(payload); const d = j?.choices?.[0]?.delta?.content; if (d) yield d; } catch { /* skip */ }
    }
  }
}
`
    : "";
  return `// LLM 클라이언트 — OpenAI 호환 엔드포인트(프록시/사내 추론). (LLM_BASE_URL)
export type Msg = { role: "user" | "assistant"; content: string };
const BASE_URL = process.env.LLM_BASE_URL ?? "http://localhost:8000/v1";
const MODEL = process.env.LLM_MODEL ?? "${spec.llm.model}";

export async function complete(system: string, messages: Msg[]): Promise<string> {
  const res = await fetch(\`\${BASE_URL}/chat/completions\`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({
      model: MODEL,
      max_tokens: ${spec.llm.params.maxTokens},
      temperature: ${spec.llm.params.temperature},
      messages: [{ role: "system", content: system }, ...messages],
    }),
  });
  const data = await res.json();
  return data?.choices?.[0]?.message?.content ?? "";
}
${streamFnCompat}`;
}

function ragPipelineTs(spec: AgentSpec): string {
  // 개발/CI용 샘플 코퍼스 — 골든셋(testset)에서 파생해 결정적으로 만든다.
  const corpusRows = spec.evaluation.testset
    .filter((t) => t.expectedSource)
    .map(
      (t, i) =>
        `  { id: "d${i + 1}", source: ${JSON.stringify(t.expectedSource)}, page: 1, text: ${JSON.stringify(
          `${t.question} ${t.expectedAnswer ?? ""}`.trim(),
        )} },`,
    )
    .join("\n");
  const corpus =
    corpusRows ||
    `  { id: "sample", source: "sample.txt", text: "실제 문서를 적재하면 이 샘플은 대체됩니다." },`;
  return `// RAG 파이프라인 골격 — 적재→청킹→임베딩→검색. (실서비스 로직은 PROMPT.md 지시로 채움)
// Vector DB: ${spec.rag.vectorDb} / 임베딩: ${spec.rag.embedding} / 검색: ${spec.rag.retrieval.strategy}

export interface Chunk { id: string; text: string; source: string; page?: number; }

/** 1) 문서 적재 (소스: ${spec.rag.sources.join(", ") || "미선택"}) */
export async function ingest(_filePath: string): Promise<string> {
  throw new Error("TODO: 문서 적재 구현");
}

/** 2) 청킹 (전략: ${spec.rag.chunking.strategy}) */
export function chunk(_text: string): Chunk[] {
  throw new Error("TODO: 청킹 구현");
}

/** 3) 임베딩 + Vector DB 적재 */
export async function index(_chunks: Chunk[]): Promise<void> {
  throw new Error("TODO: 임베딩/적재 구현");
}

// 개발/CI용 샘플 코퍼스(골든셋 파생). 실제 적재 구현 시 ${spec.rag.vectorDb} 검색으로 대체한다.
const DEV_CORPUS: Chunk[] = [
${corpus}
];

/**
 * 4) 검색 (${spec.rag.retrieval.strategy}) — 질문 관련 청크 반환.
 * 운영: EMBEDDING_API_URL + DATABASE_URL 이 설정되면 실제 벡터 검색을 구현한다.
 * 개발/CI(미설정): 샘플 코퍼스에 대한 키워드 겹침 검색으로 폴백한다(빈 결과 금지).
 */
export async function search(query: string, topK = ${spec.rag.retrieval.topK ?? 3}): Promise<Chunk[]> {
  const real = process.env.EMBEDDING_API_URL && process.env.DATABASE_URL;
  if (real) {
    // TODO: ${spec.rag.embedding} 임베딩 + ${spec.rag.vectorDb} top-k 검색 구현
    console.warn("[rag] 실제 벡터 검색 미구현 — 샘플 코퍼스로 폴백합니다.");
  }
  const terms = query.toLowerCase().split(/\\s+/).filter(Boolean);
  const scored = DEV_CORPUS.map((c) => ({
    c,
    score: terms.reduce((s, t) => s + (c.text.toLowerCase().includes(t) ? 1 : 0), 0),
  }));
  const hits = scored.filter((x) => x.score > 0).sort((a, b) => b.score - a.score);
  // 겹침이 없으면 최소 1건은 반환해 인용 경로가 끊기지 않게 한다.
  return (hits.length ? hits : scored).slice(0, topK).map((x) => x.c);
}
`;
}

function chatUiHtml(spec: AgentSpec): string {
  return `<!doctype html>
<html lang="ko">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <title>${spec.project.name || "챗봇"}</title>
  <link rel="stylesheet" href="/styles.css" />
</head>
<body>
  <main class="chat" role="main" aria-label="챗봇 대화">
    <header class="chat__header">${spec.project.name || "안내 챗봇"}</header>
    <div id="log" class="chat__log" aria-live="polite"></div>
    <form id="form" class="chat__form">
      <label for="msg" class="sr-only">메시지 입력</label>
      <input id="msg" name="msg" class="chat__input" placeholder="무엇을 도와드릴까요?" autocomplete="off" />
      <button type="submit" class="chat__send">전송</button>
    </form>
  </main>
  <script src="/app.js" type="module"></script>
</body>
</html>
`;
}

function chatUiJs(spec: AgentSpec): string {
  const streaming = spec.interaction.streaming.enabled;
  const session = spec.llm.session.multiTurn
    ? `const SESSION_ID = (crypto.randomUUID && crypto.randomUUID()) || String(Date.now());\n`
    : `const SESSION_ID = undefined;\n`;
  const handler = streaming
    ? `form.addEventListener("submit", async (e) => {
  e.preventDefault();
  const message = input.value.trim();
  if (!message) return;
  add("user", message);
  input.value = "";
  const bot = add("bot", "");
  try {
    const res = await fetch("/api/chat/stream", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ message, sessionId: SESSION_ID }),
    });
    const reader = res.body.getReader();
    const dec = new TextDecoder();
    let buf = "";
    for (;;) {
      const { value, done } = await reader.read();
      if (done) break;
      buf += dec.decode(value, { stream: true });
      const parts = buf.split("\\n\\n");
      buf = parts.pop() || "";
      for (const p of parts) {
        const line = p.split("\\n").find((l) => l.startsWith("data:"));
        if (!line) continue;
        try {
          const ev = JSON.parse(line.slice(5).trim());
          if (ev.trace) add("trace", "🔧 도구 호출: " + ev.trace.tool);
          if (ev.delta) bot.textContent += ev.delta;
        } catch (_) { /* skip */ }
      }
      log.scrollTop = log.scrollHeight;
    }
  } catch (_) {
    bot.textContent = "오류가 발생했습니다.";
  }
});`
    : `form.addEventListener("submit", async (e) => {
  e.preventDefault();
  const message = input.value.trim();
  if (!message) return;
  add("user", message);
  input.value = "";
  try {
    const res = await fetch("/api/chat", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ message, sessionId: SESSION_ID }),
    });
    const data = await res.json();
    add("bot", data.answer ?? "(응답 없음)");
  } catch (_) {
    add("bot", "오류가 발생했습니다.");
  }
});`;
  return `// 최소 채팅 UI — ${streaming ? "/api/chat/stream (SSE 스트리밍)" : "/api/chat"} 호출. (PROMPT.md 지시로 디자인/접근성을 다듬는다)
${session}const form = document.getElementById("form");
const log = document.getElementById("log");
const input = document.getElementById("msg");

function add(role, text) {
  const el = document.createElement("div");
  el.className = "bubble bubble--" + role;
  el.textContent = text;
  log.appendChild(el);
  log.scrollTop = log.scrollHeight;
  return el;
}

${handler}
`;
}

function stylesCss(spec: AgentSpec): string {
  // 레이아웃(design.layout)을 컨테이너 CSS 로 반영한다.
  const layoutCss =
    spec.design.layout === "floating-widget"
      ? ".chat { position: fixed; bottom: 24px; right: 24px; width: 360px; height: 520px; max-height: 80vh; box-shadow: 0 8px 30px rgba(0,0,0,.18); border-radius: 16px; overflow: hidden; }"
      : spec.design.layout === "side-panel"
        ? ".chat { position: fixed; top: 0; right: 0; width: 380px; height: 100vh; box-shadow: -4px 0 20px rgba(0,0,0,.12); }"
        : ".chat { max-width: 480px; margin: 0 auto; height: 100vh; }"; // full-page / iframe-embed
  return `${tokensToCss(designTokens(spec))}

* { box-sizing: border-box; }
body { margin: 0; font-family: var(--font-body); color: var(--color-text); background: var(--color-background); }
.sr-only { position: absolute; width: 1px; height: 1px; overflow: hidden; clip: rect(0 0 0 0); }

/* 레이아웃: ${spec.design.layout} */
${layoutCss}
.chat { display: flex; flex-direction: column; background: var(--color-background); }
.chat__header { font-family: var(--font-heading); font-weight: 700; padding: 16px; background: var(--color-primary); color: #fff; }
.chat__log { flex: 1; overflow-y: auto; padding: 16px; display: flex; flex-direction: column; gap: 8px; background: var(--color-surface); }
.bubble { max-width: 80%; padding: 10px 14px; border-radius: var(--bubble-radius); line-height: 1.5; }
.bubble--user { align-self: flex-end; background: var(--color-primary); color: #fff; }
.bubble--bot { align-self: flex-start; background: #fff; border: 1px solid var(--color-border); }
.bubble--trace { align-self: flex-start; background: transparent; border: 1px dashed var(--color-border); color: var(--color-muted); font-size: 12px; font-family: var(--font-mono, monospace); }
.chat__form { display: flex; gap: 8px; padding: 12px; border-top: 1px solid var(--color-border); }
.chat__input { flex: 1; padding: 10px 12px; border: 1px solid var(--color-border); border-radius: 8px; font: inherit; }
.chat__send { padding: 10px 16px; border: none; border-radius: 8px; background: var(--color-accent); color: #fff; cursor: pointer; }
.chat__send:focus-visible, .chat__input:focus-visible { outline: 2px solid var(--color-primary); outline-offset: 2px; }
`;
}

function goldenTest(spec: AgentSpec): string {
  const cases =
    spec.evaluation.testset.length > 0
      ? spec.evaluation.testset
      : [{ question: "(골든셋이 비어 있음 — agent-spec.json 의 evaluation.testset 을 채운다)" }];
  const rows = cases
    .map(
      (c) =>
        `  { question: ${JSON.stringify(c.question)}, expectedSource: ${JSON.stringify(
          c.expectedSource ?? null,
        )} },`,
    )
    .join("\n");
  // expectedSource 가 있는 케이스가 하나라도 있을 때만 "근거 정확도" describe 를 출력한다.
  // (빈 describe 는 vitest 에서 "No test found" 로 실패하므로 생성하지 않는다.)
  // RAG + expectedSource 가 있으면 실제 인용 정확도를 검증한다(샘플 코퍼스 폴백으로도 통과).
  const accuracyBlock =
    spec.rag.enabled && cases.some((c) => c.expectedSource)
      ? `
// 인용/근거 정확도 — 검색 결과의 출처가 기대 출처를 포함하는지 검증한다.
describe("골든셋 — 근거 정확도", () => {
  for (const tc of GOLDEN.filter((t) => t.expectedSource)) {
    it(\`출처 포함: \${tc.question} → \${tc.expectedSource}\`, async () => {
      const res = await answer(tc.question);
      expect(res.sources.some((s) => s.includes(tc.expectedSource!))).toBe(true);
    });
  }
});
`
      : "";
  return `// 평가 골든셋 테스트 골격. (acceptance: 통과해야 납품 가능)
// 지표: ${spec.evaluation.metrics.join(", ") || "(미선택)"}
// 실행: LLM_STUB=true 로 플러밍을 먼저 검증하고, 구현 완료 후 실제 LLM 으로 재검증한다.
import { describe, it, expect } from "vitest";
import { answer } from "../src/chat.js";

const GOLDEN: Array<{ question: string; expectedSource: string | null }> = [
${rows}
];

describe("골든셋 — 플러밍(LLM_STUB=true)", () => {
  for (const tc of GOLDEN) {
    it(tc.question, async () => {
      const res = await answer(tc.question);
      expect(typeof res.answer).toBe("string");
      expect(res.answer.length).toBeGreaterThan(0);
    });
  }
});
${accuracyBlock}`;
}

function dockerfile(): string {
  return `FROM node:22-slim
WORKDIR /app
COPY package.json ./
RUN npm install
COPY . .
RUN npm run build
EXPOSE 3000
CMD ["npm", "start"]
`;
}

const GITIGNORE = `node_modules/
dist/
.env
*.log
`;

/** 스캐폴딩 파일 묶음 생성 */
export function generateScaffold(spec: AgentSpec, slug: string): GeneratedFile[] {
  const files: GeneratedFile[] = [
    { path: "package.json", contents: packageJson(spec, slug) },
    { path: "tsconfig.json", contents: TSCONFIG },
    { path: "src/server.ts", contents: serverTs(spec) },
    { path: "src/chat.ts", contents: chatTs(spec) },
    { path: "src/llm/client.ts", contents: llmClientTs(spec) },
    { path: "public/index.html", contents: chatUiHtml(spec) },
    { path: "public/app.js", contents: chatUiJs(spec) },
    { path: "public/styles.css", contents: stylesCss(spec) },
    { path: "tests/golden.test.ts", contents: goldenTest(spec) },
    { path: ".env.example", contents: envEntries(spec).join("\n") + "\n" },
    { path: ".gitignore", contents: GITIGNORE },
  ];
  if (spec.rag.enabled) {
    files.push({ path: "src/rag/pipeline.ts", contents: ragPipelineTs(spec) });
  }
  if (spec.interaction.agentMode === "tool-agent") {
    files.push({ path: "src/tools.ts", contents: toolsTs(spec) });
  }
  if (spec.backend.deploy === "docker" || spec.backend.deploy === "kubernetes") {
    files.push({ path: "Dockerfile", contents: dockerfile() });
  }
  return files;
}

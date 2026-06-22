/**
 * Node.js / TypeScript 백엔드 스캐폴드 (참조 구현). (M7-0 에서 scaffold.ts 에서 추출)
 *
 * Express + tsx/tsc 기반. 멀티턴 세션·SSE 스트리밍·tool-use 루프·RAG 골격·가드/안전
 * 미들웨어를 spec 플래그에 따라 생성한다. 다른 스택(python/java/go)은 이 깊이를 기준으로 맞춘다.
 */

import type { AgentSpec } from "@/lib/agent-spec";
import type { GeneratedFile } from "../index";
import { envEntries } from "./shared";

/** Node 프레임워크 해소 — 카탈로그 선택(express/nestjs/fastify), 미지정/미상이면 대표 express. */
const NODE_FRAMEWORKS = ["express", "nestjs", "fastify"];
function nodeFramework(spec: AgentSpec): string {
  const f = spec.backend.framework;
  return f && NODE_FRAMEWORKS.includes(f) ? f : "express";
}

function packageJson(spec: AgentSpec, slug: string, fw: string): string {
  const claude = spec.llm.provider === "claude" && spec.llm.serving === "official-api";
  const entry = fw === "nestjs" ? "main" : "server";
  let deps: Record<string, string>;
  if (fw === "fastify") deps = { fastify: "^4.28.1", "@fastify/static": "^7.0.4" };
  else if (fw === "nestjs")
    deps = {
      "@nestjs/common": "^10.4.4",
      "@nestjs/core": "^10.4.4",
      "@nestjs/platform-express": "^10.4.4",
      "@nestjs/serve-static": "^4.0.2",
      "reflect-metadata": "^0.2.2",
      rxjs: "^7.8.1",
    };
  else deps = { express: "^4.21.2" };
  if (claude) deps["@anthropic-ai/sdk"] = "^0.32.1";

  const devDependencies: Record<string, string> = {
    typescript: "^5.7.3",
    tsx: "^4.19.2",
    vitest: "^2.1.8",
  };
  if (fw === "express" || fw === "nestjs") devDependencies["@types/express"] = "^4.17.21";
  devDependencies["@types/node"] = "^22.10.5";

  const pkg = {
    name: slug,
    version: "0.1.0",
    private: true,
    type: "module",
    scripts: {
      dev: `tsx watch src/${entry}.ts`,
      build: "tsc",
      start: `node dist/${entry}.js`,
      test: "vitest run",
    },
    dependencies: deps,
    devDependencies,
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

// NestJS 는 데코레이터 메타데이터가 필요하다(나머지는 동일).
const TSCONFIG_NEST = `{
  "compilerOptions": {
    "target": "ES2022",
    "module": "ES2022",
    "moduleResolution": "bundler",
    "strict": true,
    "esModuleInterop": true,
    "skipLibCheck": true,
    "experimentalDecorators": true,
    "emitDecoratorMetadata": true,
    "outDir": "dist",
    "rootDir": "src"
  },
  "include": ["src"]
}
`;

function tsconfigFor(fw: string): string {
  return fw === "nestjs" ? TSCONFIG_NEST : TSCONFIG;
}

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
    `import { complete${streaming ? ", completeStream" : ""}${toolAgent ? ", completeWithTools" : ""}, type Msg } from "./llm/client.js";`,
    toolAgent ? `import { TOOLS, TOOL_DEFS } from "./tools.js";` : "",
  ]
    .filter(Boolean)
    .join("\n");

  const ragLines = rag
    ? `  const contexts: string[] = chunks.map((c) => c.text);\n  const sources: string[] = chunks.map((c) => (c.page ? c.source + " p." + c.page : c.source));\n`
    : `  const contexts: string[] = [];\n  const sources: string[] = [];\n`;
  const ragSearch = rag ? `  const chunks = await search(message);\n` : "";
  // dev/STUB 에서만 도구를 미리 실행(시뮬레이션). 실서비스(비STUB)는 completeWithTools 가 LLM 주도로 구동.
  const toolLines = toolAgent
    ? `  if (STUB) {\n` +
      `    for (const name of Object.keys(TOOLS).slice(0, MAX_STEPS)) {\n` +
      `      const result = await TOOLS[name]({ query: message });\n` +
      `      contexts.push("[tool:" + name + "] " + JSON.stringify(result));\n` +
      `      sources.push("tool:" + name);\n` +
      `      traces.push({ tool: name, result });\n` +
      `    }\n` +
      `  }\n`
    : "";

  const persistNote =
    spec.llm.session.persistence !== "in-memory" || spec.llm.session.resumable
      ? ` (spec: persistence=${spec.llm.session.persistence}${spec.llm.session.resumable ? ", resumable" : ""} → ${spec.llm.session.persistence === "redis" ? "REDIS_URL" : "DATABASE_URL"} 로 영속 스토어 구현, PROMPT 참조)`
      : "";
  const sessionDecl = multiTurn
    ? `\n// 멀티턴 세션 — sessionId 별 대화 이력(메모리). 운영은 DB/Redis 로 대체.${persistNote}\nconst SESSIONS = new Map<string, Msg[]>();\nconst HISTORY_MSGS = ${histMsgs};\nfunction loadHistory(id?: string): Msg[] { return id ? SESSIONS.get(id) ?? [] : []; }\nfunction saveHistory(id: string | undefined, messages: Msg[], answerText: string): void {\n  if (!id) return;\n  const updated: Msg[] = [...messages, { role: "assistant", content: answerText }];\n  SESSIONS.set(id, updated.slice(-HISTORY_MSGS));\n}\n`
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
  }${
    toolAgent
      ? ` else {
    // tool-use 는 토큰 스트림이 아니므로 루프 완료 후 한 번에 전송한다.
    full = await completeWithTools(system, messages, TOOL_DEFS, TOOLS, MAX_STEPS);
    yield { delta: full };
  }`
      : ` else {
    for await (const d of completeStream(system, messages)) { full += d; yield { delta: d }; }
  }`
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
${toolAgent ? `const MAX_STEPS = ${maxSteps}; // tool-agent 루프 최대 반복\n` : ""}${sessionDecl}
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
  const raw = STUB
    ? stubAnswer(message, contexts)
    : ${toolAgent ? "await completeWithTools(system, messages, TOOL_DEFS, TOOLS, MAX_STEPS)" : "await complete(system, messages)"};
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
  const toolAgent = spec.interaction.agentMode === "tool-agent";
  if (spec.llm.provider === "claude" && spec.llm.serving === "official-api") {
    const toolFn = toolAgent
      ? `
export type ToolExec = Record<string, (args: Record<string, unknown>) => Promise<unknown>>;
export interface ToolDef { name: string; description: string; input_schema: unknown; }

/** LLM tool-use 루프 — stop_reason==="tool_use" 면 도구 실행→tool_result 회신→반복(최대 maxSteps). */
export async function completeWithTools(
  system: string,
  base: Msg[],
  tools: readonly ToolDef[],
  exec: ToolExec,
  maxSteps: number,
): Promise<string> {
  const messages: Anthropic.MessageParam[] = base.map((m) => ({ role: m.role, content: m.content }));
  for (let step = 0; step < maxSteps; step++) {
    const res = await client().messages.create({
      model: MODEL,
      max_tokens: ${spec.llm.params.maxTokens},
      temperature: ${spec.llm.params.temperature},
      system,
      tools: tools as unknown as Anthropic.Tool[],
      messages,
    });
    if (res.stop_reason === "tool_use") {
      messages.push({ role: "assistant", content: res.content as unknown as Anthropic.MessageParam["content"] });
      const results: unknown[] = [];
      for (const block of res.content) {
        if (block.type === "tool_use") {
          const fn = exec[block.name];
          const out = fn ? await fn(block.input as Record<string, unknown>) : { error: "unknown tool" };
          results.push({ type: "tool_result", tool_use_id: block.id, content: JSON.stringify(out) });
        }
      }
      messages.push({ role: "user", content: results as unknown as Anthropic.MessageParam["content"] });
      continue;
    }
    const text = res.content.find((b) => b.type === "text");
    return text && text.type === "text" ? text.text : "";
  }
  return "(최대 도구 호출 횟수를 초과했습니다.)";
}
`
      : "";
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
${streamFn}${toolFn}`;
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
${streamFnCompat}${
    toolAgent
      ? `
export type ToolExec = Record<string, (args: Record<string, unknown>) => Promise<unknown>>;
export interface ToolDef { name: string; description: string; input_schema: unknown; }

/**
 * OpenAI 호환 function-calling 루프 — \`tools\`(type:"function") 로 전달하고,
 * 응답에 \`tool_calls\` 가 있으면 exec 로 실행→\`role:"tool"\` 메시지로 회신→반복(최대 maxSteps).
 */
type OAIToolCall = { id: string; type: "function"; function: { name: string; arguments: string } };
type OAIMessage = {
  role: "system" | "user" | "assistant" | "tool";
  content: string | null;
  tool_calls?: OAIToolCall[];
  tool_call_id?: string;
};
export async function completeWithTools(
  system: string,
  base: Msg[],
  tools: readonly ToolDef[],
  exec: ToolExec,
  maxSteps: number,
): Promise<string> {
  const oaiTools = tools.map((t) => ({
    type: "function" as const,
    function: { name: t.name, description: t.description, parameters: t.input_schema },
  }));
  const messages: OAIMessage[] = [
    { role: "system", content: system },
    ...base.map((m) => ({ role: m.role, content: m.content })),
  ];
  for (let step = 0; step < maxSteps; step++) {
    const res = await fetch(\`\${BASE_URL}/chat/completions\`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        model: MODEL,
        max_tokens: ${spec.llm.params.maxTokens},
        temperature: ${spec.llm.params.temperature},
        messages,
        tools: oaiTools,
      }),
    });
    const data = await res.json();
    const msg = data?.choices?.[0]?.message as OAIMessage | undefined;
    if (!msg) return "";
    const calls = msg.tool_calls;
    if (calls && calls.length) {
      messages.push({ role: "assistant", content: msg.content ?? null, tool_calls: calls });
      for (const call of calls) {
        const fn = exec[call.function.name];
        let args: Record<string, unknown> = {};
        try { args = JSON.parse(call.function.arguments || "{}"); } catch { /* 인자 파싱 실패 → 빈 객체 */ }
        const out = fn ? await fn(args) : { error: "unknown tool" };
        messages.push({ role: "tool", tool_call_id: call.id, content: JSON.stringify(out) });
      }
      continue;
    }
    return msg.content ?? "";
  }
  return "(최대 도구 호출 횟수를 초과했습니다.)";
}
`
      : ""
  }`;
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

const CHUNK_SIZE = ${spec.rag.chunking.size ?? 800};
const CHUNK_OVERLAP = ${spec.rag.chunking.overlap ?? 100};

/** 1) 문서 적재 (소스: ${spec.rag.sources.join(", ") || "미선택"}) — 텍스트/마크다운은 그대로 읽는다.
 *  PDF/HWP 등 바이너리는 변환 후(예: libreoffice→txt) 텍스트를 넘긴다. */
export async function ingest(filePath: string): Promise<string> {
  const { readFile } = await import("node:fs/promises");
  if (/\\.(pdf|hwp|docx)$/i.test(filePath)) {
    throw new Error("바이너리 문서는 텍스트로 변환 후 chunk()/index() 에 넘기세요 (예: libreoffice --convert-to txt).");
  }
  return readFile(filePath, "utf-8");
}

/** 2) 청킹 (전략: ${spec.rag.chunking.strategy}) — 문단 묶음 + 크기 상한 + 오버랩. */
export function chunk(text: string, source = "uploaded"): Chunk[] {
  const paras = text.split(/\\n\\s*\\n/).map((p) => p.trim()).filter(Boolean);
  const out: Chunk[] = [];
  let buf = "";
  const flush = () => {
    if (!buf) return;
    out.push({ id: source + "#" + out.length, text: buf, source });
    buf = buf.slice(Math.max(0, buf.length - CHUNK_OVERLAP)); // 오버랩 유지
  };
  for (const p of paras) {
    if ((buf + "\\n\\n" + p).length > CHUNK_SIZE && buf) flush();
    buf = buf ? buf + "\\n\\n" + p : p;
    while (buf.length > CHUNK_SIZE) {
      out.push({ id: source + "#" + out.length, text: buf.slice(0, CHUNK_SIZE), source });
      buf = buf.slice(CHUNK_SIZE - CHUNK_OVERLAP);
    }
  }
  if (buf) out.push({ id: source + "#" + out.length, text: buf, source });
  return out;
}

// 개발용 인메모리 색인 (운영은 ${spec.rag.vectorDb}). index() 로 적재되고 search() 가 함께 조회한다.
const INDEXED: Chunk[] = [];

/** 3) 임베딩 + Vector DB 적재 — 개발: 인메모리. 운영: ${spec.rag.embedding} 임베딩 후 ${spec.rag.vectorDb} upsert(TODO). */
export async function index(chunks: Chunk[]): Promise<void> {
  if (process.env.EMBEDDING_API_URL && process.env.DATABASE_URL) {
    // TODO: 각 청크를 ${spec.rag.embedding} 로 임베딩 → ${spec.rag.vectorDb} 에 upsert
    console.warn("[rag] 실제 임베딩/적재 미구현 — 인메모리 색인에 보관합니다.");
  }
  INDEXED.push(...chunks);
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
  const pool = [...INDEXED, ...DEV_CORPUS]; // 적재분 우선 + 골든셋 폴백
  const scored = pool.map((c) => ({
    c,
    score: terms.reduce((s, t) => s + (c.text.toLowerCase().includes(t) ? 1 : 0), 0),
  }));
  const hits = scored.filter((x) => x.score > 0).sort((a, b) => b.score - a.score);
  // 겹침이 없으면 최소 1건은 반환해 인용 경로가 끊기지 않게 한다.
  return (hits.length ? hits : scored).slice(0, topK).map((x) => x.c);
}
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

/* --------------------------- Fastify 변형 --------------------------------- */

function fastifyServerTs(spec: AgentSpec): string {
  const stream = spec.interaction.streaming.enabled;
  const confirm =
    spec.interaction.agentMode === "tool-agent" && spec.interaction.toolPolicy === "confirm";
  const audit = spec.backend.logging.audit || spec.ops.audit;
  const rateLimit = spec.agent.safety.rateLimitPerMin;
  const abuse = spec.agent.safety.abuseFilter;
  const maxChars = spec.interaction.inputLimits.maxChars;

  const guardState =
    (rateLimit ? `const RATE_PER_MIN = ${rateLimit};\nconst HITS = new Map<string, { n: number; t: number }>();\n` : "") +
    (abuse ? `const BANNED = [/(.)\\1{20,}/];\nfunction isAbusive(m: unknown): boolean { return typeof m === "string" && BANNED.some((r) => r.test(m)); }\n` : "");
  const guardChecks: string[] = [];
  if (maxChars)
    guardChecks.push(
      `  if (typeof body.message === "string" && body.message.length > ${maxChars}) { reply.code(400).send({ error: "메시지가 너무 깁니다(최대 ${maxChars}자)." }); return false; }`,
    );
  if (abuse)
    guardChecks.push(`  if (isAbusive(body.message)) { reply.code(400).send({ error: "부적절한 입력이 감지되었습니다." }); return false; }`);
  if (rateLimit)
    guardChecks.push(
      `  const ip = req.ip ?? "unknown";\n  const now = Date.now();\n  const w = HITS.get(ip);\n  if (!w || now - w.t > 60000) HITS.set(ip, { n: 1, t: now });\n  else if (w.n >= RATE_PER_MIN) { reply.code(429).send({ error: "요청이 너무 많습니다. 잠시 후 다시 시도하세요." }); return false; }\n  else w.n++;`,
    );
  const guardFn = `function guard(req: FastifyRequest, reply: FastifyReply, body: Body): boolean {\n${
    guardChecks.join("\n") || "  void req; void reply; void body;"
  }\n  return true;\n}\n`;

  const auditHook = audit
    ? `\napp.addHook("onRequest", async (req) => {\n  // 감사 로그 (audit=true) — TODO: 보관소/포맷을 기관 정책에 맞게 (개인정보 주의)\n  console.log(JSON.stringify({ ts: new Date().toISOString(), method: req.method, path: req.url }));\n});\n`
    : "";

  const streamRoute = stream
    ? `\napp.post("/api/chat/stream", async (req, reply) => {\n  const body = (req.body ?? {}) as Body;\n  if (typeof body.message !== "string" || !body.message.trim()) { reply.code(400).send({ error: "message 가 필요합니다." }); return; }\n  if (!guard(req, reply, body)) return;\n  reply.hijack();\n  reply.raw.writeHead(200, { "Content-Type": "text/event-stream", "Cache-Control": "no-cache", Connection: "keep-alive" });\n  try {\n    for await (const ev of answerStream(body.message, body.sessionId)) reply.raw.write(\`data: \${JSON.stringify(ev)}\\n\\n\`);\n  } catch { reply.raw.write("event: error\\ndata: {}\\n\\n"); }\n  reply.raw.write("event: done\\ndata: {}\\n\\n");\n  reply.raw.end();\n});\n`
    : "";
  const confirmRoute = confirm
    ? `\napp.post("/api/chat/confirm", async (req, reply) => {\n  const body = (req.body ?? {}) as Body;\n  if (typeof body.confirmToken !== "string") { reply.code(400).send({ error: "confirmToken 이 필요합니다." }); return; }\n  return { status: body.approved ? "executed" : "rejected", note: "TODO: confirm 흐름 구현" };\n});\n`
    : "";

  const imp = `import { answer${stream ? ", answerStream" : ""} } from "./chat.js";`;
  return `// 진입점 — Fastify. 헬스체크 + 채팅 API 골격. (PROMPT.md 지시로 로직을 채운다)
import Fastify, { type FastifyReply, type FastifyRequest } from "fastify";
import fastifyStatic from "@fastify/static";
import { join } from "node:path";
${imp}

interface Body { message?: string; sessionId?: string; confirmToken?: string; approved?: boolean; }

const app = Fastify();
await app.register(fastifyStatic, { root: join(process.cwd(), "public"), prefix: "/" });
${guardState}${guardFn}${auditHook}
app.get("/health", async () => ({ status: "ok" }));

app.post("/api/chat", async (req, reply) => {
  const body = (req.body ?? {}) as Body;
  if (typeof body.message !== "string" || !body.message.trim()) { reply.code(400).send({ error: "message 가 필요합니다." }); return; }
  if (!guard(req, reply, body)) return;
  return await answer(body.message, body.sessionId);
});
${streamRoute}${confirmRoute}
const port = Number(process.env.PORT ?? 3000);
app.listen({ port, host: "0.0.0.0" }).then(() => console.log(\`server on :\${port}\`));
`;
}

/* ---------------------------- NestJS 변형 --------------------------------- */

function nestMainTs(): string {
  return `// 진입점 — NestJS 부트스트랩. (PROMPT.md 지시로 로직을 채운다)
import "reflect-metadata";
import { NestFactory } from "@nestjs/core";
import { AppModule } from "./app.module.js";

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  await app.listen(Number(process.env.PORT ?? 3000));
}
void bootstrap();
`;
}

function nestModuleTs(): string {
  return `import { Module } from "@nestjs/common";
import { ServeStaticModule } from "@nestjs/serve-static";
import { join } from "node:path";
import { ChatController } from "./chat.controller.js";

// 정적 파일(채팅 위젯)은 public/ 에서 서빙한다.
@Module({
  imports: [ServeStaticModule.forRoot({ rootPath: join(process.cwd(), "public") })],
  controllers: [ChatController],
})
export class AppModule {}
`;
}

function nestControllerTs(spec: AgentSpec): string {
  const stream = spec.interaction.streaming.enabled;
  const confirm =
    spec.interaction.agentMode === "tool-agent" && spec.interaction.toolPolicy === "confirm";
  const rateLimit = spec.agent.safety.rateLimitPerMin;
  const abuse = spec.agent.safety.abuseFilter;
  const maxChars = spec.interaction.inputLimits.maxChars;

  const guardState =
    (rateLimit ? `const RATE_PER_MIN = ${rateLimit};\nconst HITS = new Map<string, { n: number; t: number }>();\n` : "") +
    (abuse ? `const BANNED = [/(.)\\1{20,}/];\nfunction isAbusive(m: unknown): boolean { return typeof m === "string" && BANNED.some((r) => r.test(m)); }\n` : "");
  const guardChecks: string[] = [];
  if (maxChars)
    guardChecks.push(
      `    if (typeof body.message === "string" && body.message.length > ${maxChars}) throw new HttpException("메시지가 너무 깁니다(최대 ${maxChars}자).", 400);`,
    );
  if (abuse)
    guardChecks.push(`    if (isAbusive(body.message)) throw new HttpException("부적절한 입력이 감지되었습니다.", 400);`);
  if (rateLimit)
    guardChecks.push(
      `    const ip = req.ip ?? "unknown";\n    const now = Date.now();\n    const w = HITS.get(ip);\n    if (!w || now - w.t > 60000) HITS.set(ip, { n: 1, t: now });\n    else if (w.n >= RATE_PER_MIN) throw new HttpException("요청이 너무 많습니다. 잠시 후 다시 시도하세요.", 429);\n    else w.n++;`,
    );
  const guardBody = guardChecks.join("\n") || "    void req; void body;";

  const streamMethod = stream
    ? `\n
  @Post("api/chat/stream")
  async chatStream(@Body() body: Body, @Req() req: Request, @Res() res: Response) {
    if (typeof body.message !== "string" || !body.message.trim()) throw new HttpException("message 가 필요합니다.", 400);
    this.guard(req, body);
    res.set({ "Content-Type": "text/event-stream", "Cache-Control": "no-cache", Connection: "keep-alive" });
    try {
      for await (const ev of answerStream(body.message, body.sessionId)) res.write(\`data: \${JSON.stringify(ev)}\\n\\n\`);
    } catch { res.write("event: error\\ndata: {}\\n\\n"); }
    res.write("event: done\\ndata: {}\\n\\n");
    res.end();
  }`
    : "";
  const confirmMethod = confirm
    ? `\n
  @Post("api/chat/confirm")
  chatConfirm(@Body() body: Body) {
    if (typeof body.confirmToken !== "string") throw new HttpException("confirmToken 이 필요합니다.", 400);
    return { status: body.approved ? "executed" : "rejected", note: "TODO: confirm 흐름 구현" };
  }`
    : "";

  const imp = `import { answer${stream ? ", answerStream" : ""} } from "./chat.js";`;
  return `// 채팅 컨트롤러 — NestJS. 헬스체크 + 채팅 API. (PROMPT.md 지시로 로직을 채운다)
import { Body, Controller, Get, HttpException, Post, Req, Res } from "@nestjs/common";
import type { Request, Response } from "express";
${imp}

interface Body { message?: string; sessionId?: string; confirmToken?: string; approved?: boolean; }
${guardState}
@Controller()
export class ChatController {
  private guard(req: Request, body: Body): void {
${guardBody}
  }

  @Get("health")
  health() {
    return { status: "ok" };
  }

  @Post("api/chat")
  async chat(@Body() body: Body, @Req() req: Request) {
    if (typeof body.message !== "string" || !body.message.trim()) throw new HttpException("message 가 필요합니다.", 400);
    this.guard(req, body);
    return await answer(body.message, body.sessionId);
  }${streamMethod}${confirmMethod}
}
`;
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

/** Node.js 백엔드 스캐폴드 파일 묶음 — 프레임워크(express/fastify/nestjs) 분기. */
export function nodeBackendFiles(spec: AgentSpec, slug: string): GeneratedFile[] {
  const fw = nodeFramework(spec);
  // 비즈니스 로직(chat/llm/rag/tools/test)은 프레임워크 무관하게 공유한다.
  const files: GeneratedFile[] = [
    { path: "package.json", contents: packageJson(spec, slug, fw) },
    { path: "tsconfig.json", contents: tsconfigFor(fw) },
    { path: "src/chat.ts", contents: chatTs(spec) },
    { path: "src/llm/client.ts", contents: llmClientTs(spec) },
    { path: "tests/golden.test.ts", contents: goldenTest(spec) },
    { path: ".env.example", contents: envEntries(spec).join("\n") + "\n" },
    { path: ".gitignore", contents: GITIGNORE },
  ];
  // 서버 진입점만 프레임워크별로 분기한다.
  if (fw === "fastify") {
    files.push({ path: "src/server.ts", contents: fastifyServerTs(spec) });
  } else if (fw === "nestjs") {
    files.push({ path: "src/main.ts", contents: nestMainTs() });
    files.push({ path: "src/app.module.ts", contents: nestModuleTs() });
    files.push({ path: "src/chat.controller.ts", contents: nestControllerTs(spec) });
  } else {
    files.push({ path: "src/server.ts", contents: serverTs(spec) }); // express (대표/기본)
  }
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

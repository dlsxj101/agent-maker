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
  return `// 진입점 — 헬스체크 + 채팅 API 골격. (PROMPT.md 지시에 따라 로직을 채운다)
import express from "express";
import { answer } from "./chat.js";

const app = express();
app.use(express.json());
app.use(express.static("public"));
${auditMw}
// 헬스체크 (acceptance: 200 반환)
app.get("/health", (_req, res) => res.json({ status: "ok" }));

// 채팅: 사용자 질문 → (RAG 검색) → LLM 답변
app.post("/api/chat", async (req, res) => {
  const { message } = req.body ?? {};
  if (typeof message !== "string" || !message.trim()) {
    res.status(400).json({ error: "message 가 필요합니다." });
    return;
  }
  try {
    const result = await answer(message);
    res.json(result);
  } catch {
    res.status(500).json({ error: "처리 중 오류가 발생했습니다." });
  }
});

const port = Number(process.env.PORT ?? 3000);
app.listen(port, () => console.log(\`server on :\${port}\`));
`;
}

function chatTs(spec: AgentSpec): string {
  const ragImport = spec.rag.enabled ? `import { search } from "./rag/pipeline.js";\n` : "";
  const ragCall = spec.rag.enabled
    ? `  const chunks = await search(message);\n  const contexts = chunks.map((c) => c.text);\n  const sources = chunks.map((c) => (c.page ? c.source + " p." + c.page : c.source));\n`
    : "  const contexts: string[] = [];\n  const sources: string[] = [];\n";
  const citationNote = spec.rag.citations
    ? "  // 출처 표기(citations=true): sources 를 답변과 함께 노출한다.\n"
    : "";
  // 마스킹: 개인정보 수집+마스킹이거나, 가드레일 PII 필터가 켜진 경우(방어적 출력 필터) 적용
  const masking =
    spec.compliance.privacy.masking &&
    (spec.compliance.privacy.collectsPii || spec.llm.guardrails.piiFilter);
  const maskUtil = masking
    ? `
// 개인정보 마스킹 (piiFilter/masking) — TODO: 기관 정책에 맞게 패턴을 보강한다.
function maskPii(text: string): string {
  return text
    .replace(/\\d{6}-\\d{7}/g, "******-*******") // 주민등록번호
    .replace(/01[016789]-?\\d{3,4}-?\\d{4}/g, "***-****-****") // 휴대전화
    .replace(/[\\w.+-]+@[\\w-]+\\.[\\w.-]+/g, "***@***"); // 이메일
}
`
    : "";
  const maskApply = masking ? "  const safe = maskPii(text);\n" : "  const safe = text;\n";
  const it = spec.interaction;
  const agentLoopNote =
    it.agentMode === "tool-agent"
      ? `// 동작: 도구호출 에이전트 — 추론→도구 호출→관찰을 최대 ${it.maxSteps ?? 5}회 반복(정책: ${it.toolPolicy}).\n//       integrations.tools 를 함수로 등록하고 루프를 구현한다. trace 표시: ${it.rendering.toolCallDisplay}.\n`
      : `// 동작: ${it.agentMode}.\n`;
  return `// 채팅 오케스트레이션 골격: (RAG 검색) → LLM 호출.
${agentLoopNote}// 응답 스트리밍: ${it.streaming.enabled ? `사용(속도 ${it.streaming.speed}, 인디케이터 ${it.streaming.indicator}) — SSE 또는 ReadableStream 으로 토큰 전송` : "미사용"}.
// 렌더링: 마크다운 ${it.rendering.markdown} · 인용 "${it.rendering.citationStyle}" · 도구호출 "${it.rendering.toolCallDisplay}".
// 출력: 길이 "${it.output.length}" · 구조 "${it.output.structured}"${it.rendering.showContextMeter ? " · 컨텍스트 사용량 미터 노출" : ""}.
// 에이전트 능력: ${[
    spec.agent.askUser && "명확화 질문",
    spec.agent.subAgents.enabled && "서브에이전트",
    spec.agent.memory.longTerm && "장기 기억",
    spec.agent.builtinTools.length && `내장도구(${spec.agent.builtinTools.join("/")})`,
  ]
    .filter(Boolean)
    .join(" · ") || "(없음)"}.
// 컨텍스트: ${spec.agent.context.autoCompact ? `자동압축 ${spec.agent.context.strategy}${spec.agent.context.budgetTokens ? ` @${spec.agent.context.budgetTokens}tok` : ""}` : "압축 안 함"}.
// 안전: 거절 "${spec.agent.safety.refusalStyle}"${spec.agent.safety.rateLimitPerMin ? ` · ${spec.agent.safety.rateLimitPerMin}/min` : ""}${spec.agent.safety.abuseFilter ? " · 남용필터" : ""}.
${ragImport}import { complete } from "./llm/client.js";

const GROUNDED_ONLY = ${spec.llm.guardrails.groundedOnly}; // 근거 기반 답변 강제
// 테스트/오프라인 환경: LLM_STUB=true 면 실제 LLM 호출 없이 결정적 스텁 응답을 쓴다.
const STUB = process.env.LLM_STUB === "true";

export async function answer(message: string): Promise<{ answer: string; sources: string[] }> {
${ragCall}${citationNote}  const system = buildSystemPrompt(contexts);
  const text = STUB ? stubAnswer(message, contexts) : await complete(system, message);
${maskApply}  return { answer: safe, sources };
}

function stubAnswer(message: string, contexts: string[]): string {
  // 결정적 스텁 — 골든셋 플러밍 테스트용. 실제 동작은 complete() 가 담당한다.
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
    contexts.length ? "참고 자료:\\n" + contexts.join("\\n---\\n") : "",
  ]
    .filter(Boolean)
    .join("\\n");
}
`;
}

function llmClientTs(spec: AgentSpec): string {
  if (spec.llm.provider === "claude" && spec.llm.serving === "official-api") {
    return `// LLM 클라이언트 — Claude 공식 API. (키: ANTHROPIC_API_KEY)
import Anthropic from "@anthropic-ai/sdk";

const MODEL = process.env.LLM_MODEL ?? "${spec.llm.model}";

// 지연 초기화 — 키가 없어도 서버(/health)는 기동되도록 한다.
let _client: Anthropic | null = null;
function client(): Anthropic {
  if (!_client) _client = new Anthropic();
  return _client;
}

export async function complete(system: string, user: string): Promise<string> {
  const res = await client().messages.create({
    model: MODEL,
    max_tokens: ${spec.llm.params.maxTokens},
    temperature: ${spec.llm.params.temperature},
    system,
    messages: [{ role: "user", content: user }],
  });
  const block = res.content[0];
  return block && block.type === "text" ? block.text : "";
}
`;
  }
  // 프록시/사내추론/오픈소스: OpenAI 호환 엔드포인트 가정
  return `// LLM 클라이언트 — OpenAI 호환 엔드포인트(프록시/사내 추론). (LLM_BASE_URL)
const BASE_URL = process.env.LLM_BASE_URL ?? "http://localhost:8000/v1";
const MODEL = process.env.LLM_MODEL ?? "${spec.llm.model}";

export async function complete(system: string, user: string): Promise<string> {
  const res = await fetch(\`\${BASE_URL}/chat/completions\`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({
      model: MODEL,
      max_tokens: ${spec.llm.params.maxTokens},
      temperature: ${spec.llm.params.temperature},
      messages: [
        { role: "system", content: system },
        { role: "user", content: user },
      ],
    }),
  });
  const data = await res.json();
  return data?.choices?.[0]?.message?.content ?? "";
}
`;
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

const CHAT_UI_JS = `// 최소 채팅 UI — /api/chat 호출. (PROMPT.md 지시로 디자인/접근성을 다듬는다)
const form = document.getElementById("form");
const log = document.getElementById("log");
const input = document.getElementById("msg");

function add(role, text) {
  const el = document.createElement("div");
  el.className = "bubble bubble--" + role;
  el.textContent = text;
  log.appendChild(el);
  log.scrollTop = log.scrollHeight;
}

form.addEventListener("submit", async (e) => {
  e.preventDefault();
  const message = input.value.trim();
  if (!message) return;
  add("user", message);
  input.value = "";
  try {
    const res = await fetch("/api/chat", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ message }),
    });
    const data = await res.json();
    add("bot", data.answer ?? "(응답 없음)");
  } catch {
    add("bot", "오류가 발생했습니다.");
  }
});
`;

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
    { path: "public/app.js", contents: CHAT_UI_JS },
    { path: "public/styles.css", contents: stylesCss(spec) },
    { path: "tests/golden.test.ts", contents: goldenTest(spec) },
    { path: ".env.example", contents: envEntries(spec).join("\n") + "\n" },
    { path: ".gitignore", contents: GITIGNORE },
  ];
  if (spec.rag.enabled) {
    files.push({ path: "src/rag/pipeline.ts", contents: ragPipelineTs(spec) });
  }
  if (spec.backend.deploy === "docker" || spec.backend.deploy === "kubernetes") {
    files.push({ path: "Dockerfile", contents: dockerfile() });
  }
  return files;
}

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
function envEntries(spec: AgentSpec): string[] {
  const env: string[] = ["# 자동 생성된 환경변수 목록 — 실제 값으로 채운다", "PORT=3000"];
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

function serverTs(): string {
  return `// 진입점 — 헬스체크 + 채팅 API 골격. (PROMPT.md 지시에 따라 로직을 채운다)
import express from "express";
import { answer } from "./chat.js";

const app = express();
app.use(express.json());
app.use(express.static("public"));

// 헬스체크 (acceptance: 200 반환)
app.get("/health", (_req, res) => res.json({ status: "ok" }));

// 채팅: 사용자 질문 → (RAG 검색) → LLM 답변
app.post("/api/chat", async (req, res) => {
  const { message } = req.body ?? {};
  if (typeof message !== "string" || !message.trim()) {
    return res.status(400).json({ error: "message 가 필요합니다." });
  }
  try {
    const result = await answer(message);
    res.json(result);
  } catch (e) {
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
    ? `  const contexts = await search(message); // TODO: 검색 결과로 컨텍스트 구성\n`
    : "  const contexts: string[] = [];\n";
  const citationNote = spec.rag.citations
    ? '  // TODO: 답변에 출처/페이지를 표기한다 (citations=true).\n'
    : "";
  return `// 채팅 오케스트레이션 골격: (RAG 검색) → LLM 호출.
${ragImport}import { complete } from "./llm/client.js";

const PERSONA_TONE = "${spec.conversation.persona.tone}"; // 답변 톤
const GROUNDED_ONLY = ${spec.llm.guardrails.groundedOnly}; // 근거 기반 답변 강제

export async function answer(message: string): Promise<{ answer: string; sources: string[] }> {
${ragCall}${citationNote}  const system = buildSystemPrompt(contexts);
  const text = await complete(system, message);
  return { answer: text, sources: contexts };
}

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
  return `// RAG 파이프라인 골격 — 적재→청킹→임베딩→검색. (시그니처만; 로직은 PROMPT.md 지시로 채움)
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

/** 4) 검색 (${spec.rag.retrieval.strategy}) — 질문과 관련된 컨텍스트 텍스트 반환 */
export async function search(_query: string): Promise<string[]> {
  // TODO: ${spec.rag.vectorDb} 에서 top-k 검색
  return [];
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
  return `${tokensToCss(designTokens(spec))}

* { box-sizing: border-box; }
body { margin: 0; font-family: var(--font-body); color: var(--color-text); background: var(--color-background); }
.sr-only { position: absolute; width: 1px; height: 1px; overflow: hidden; clip: rect(0 0 0 0); }

.chat { max-width: 480px; margin: 0 auto; display: flex; flex-direction: column; height: 100vh; }
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
    .map((c) => `  { question: ${JSON.stringify(c.question)} },`)
    .join("\n");
  return `// 평가 골든셋 테스트 골격. (acceptance: 통과해야 납품 가능)
// 지표: ${spec.evaluation.metrics.join(", ") || "(미선택)"}
import { describe, it, expect } from "vitest";
import { answer } from "../src/chat.js";

const GOLDEN = [
${rows}
];

describe("골든셋", () => {
  for (const tc of GOLDEN) {
    it("질문: " + tc.question, async () => {
      const res = await answer(tc.question);
      // TODO: 기대 답변/근거(expectedAnswer/expectedSource)와 비교하도록 채운다.
      expect(typeof res.answer).toBe("string");
    });
  }
});
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

/** 스캐폴딩 파일 묶음 생성 */
export function generateScaffold(spec: AgentSpec, slug: string): GeneratedFile[] {
  const files: GeneratedFile[] = [
    { path: "package.json", contents: packageJson(spec, slug) },
    { path: "tsconfig.json", contents: TSCONFIG },
    { path: "src/server.ts", contents: serverTs() },
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

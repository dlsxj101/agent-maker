/**
 * 스택 공통 스캐폴드 — 백엔드 런타임과 무관한 산출물. (M7-0)
 *
 * 채팅 위젯 프론트엔드(HTML/JS/CSS)는 모든 백엔드(Node/Python/Java/Go)가 동일하게 노출하는
 * REST 계약(/api/chat, /api/chat/stream, /api/chat/confirm)을 호출하므로 스택과 무관하게 공유한다.
 * 환경변수(.env) 목록도 LLM/RAG/DB 기준이라 스택 공통이다.
 */

import type { AgentSpec } from "@/lib/agent-spec";
import type { GeneratedFile } from "../index";
import { designTokens, tokensToCss } from "../tokens";

/** API 키 없이 추론 서버가 필요한 온프레미스 임베딩 모델 */
export const ONPREM_EMBEDDINGS = ["bge-m3", "kure", "ko-sroberta", "multilingual-e5"];

/** 선택에 따라 필요한 환경변수 목록(placeholder)을 계산 (스택 공통) */
export function envEntries(spec: AgentSpec): string[] {
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
  if (spec.compliance.security.ipAllowlist.enabled) {
    env.push("# 접속 허용 IP 대역(CIDR) — 앱/프록시에서 이 목록만 허용 (콤마 구분)");
    env.push(`IP_ALLOWLIST=${(spec.compliance.security.ipAllowlist.cidrs ?? []).join(",")}`);
  }
  return env;
}

/* ----------------------------- 프론트엔드 UI (공유) ------------------------- */

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
  const session = !spec.llm.session.multiTurn
    ? `const SESSION_ID = undefined;\n`
    : spec.llm.session.resumable
      ? // 재방문 재개(resumable): sessionId 를 localStorage 에 보관해 새로고침/재방문에도 같은 대화를 잇는다.
        `const SESSION_ID = (() => {\n  let id = localStorage.getItem("chat_session");\n  if (!id) { id = (crypto.randomUUID && crypto.randomUUID()) || String(Date.now()); localStorage.setItem("chat_session", id); }\n  return id;\n})();\n`
      : `const SESSION_ID = (crypto.randomUUID && crypto.randomUUID()) || String(Date.now());\n`;
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
          if (ev.sources) addSources(ev.sources);
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
    if (data.sources) addSources(data.sources);
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

// 출처(인용) 칩 렌더 — citationStyle 에 맞게 다듬는다.
function addSources(sources) {
  if (!sources || !sources.length) return;
  const row = document.createElement("div");
  row.className = "sources";
  for (const s of sources) {
    const c = document.createElement("span");
    c.className = "chip";
    c.textContent = s;
    row.appendChild(c);
  }
  log.appendChild(row);
  log.scrollTop = log.scrollHeight;
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
.sources { display: flex; flex-wrap: wrap; gap: 6px; padding: 0 4px; }
.chip { font-size: 11px; padding: 2px 8px; border: 1px solid var(--color-border); border-radius: 999px; color: var(--color-muted); background: var(--color-surface); }
.chat__form { display: flex; gap: 8px; padding: 12px; border-top: 1px solid var(--color-border); }
.chat__input { flex: 1; padding: 10px 12px; border: 1px solid var(--color-border); border-radius: 8px; font: inherit; }
.chat__send { padding: 10px 16px; border: none; border-radius: 8px; background: var(--color-accent); color: #fff; cursor: pointer; }
.chat__send:focus-visible, .chat__input:focus-visible { outline: 2px solid var(--color-primary); outline-offset: 2px; }
`;
}

/** 프론트엔드 채팅 위젯 파일 (스택 공통) */
export function frontendFiles(spec: AgentSpec): GeneratedFile[] {
  return [
    { path: "public/index.html", contents: chatUiHtml(spec) },
    { path: "public/app.js", contents: chatUiJs(spec) },
    { path: "public/styles.css", contents: stylesCss(spec) },
  ];
}

/**
 * Python 백엔드 스캐폴드 (풀 패리티). (PLAN.md M7-D)
 *
 * 대표 프레임워크 = FastAPI. Node 참조 구현과 동일한 REST 계약(/health, /api/chat[, /stream, /confirm])과
 * 동일 깊이(멀티턴 세션·SSE 스트리밍·tool-use 루프·RAG 골격·가드/안전·PII 마스킹)를 생성한다.
 * 프레임워크 세부 선택(django/flask)은 requirements/주석에 반영하고 골격은 FastAPI 기준이다.
 */

import type { AgentSpec } from "@/lib/agent-spec";
import type { GeneratedFile } from "../index";
import { envEntries } from "./shared";

const REFUSAL_KO: Record<string, string> = {
  polite: "정중히 사과하고 가능한 대안을 안내하세요",
  brief: "간결히 답변할 수 없음을 알리세요",
  redirect: "담당 부서나 적절한 채널로 안내하세요",
  strict: "관련 규정을 근거로 명확히 거절하세요",
};

function requirementsTxt(spec: AgentSpec): string {
  const reqs = ["fastapi>=0.110", "uvicorn[standard]>=0.29", "pydantic>=2.6"];
  if (spec.llm.provider === "claude" && spec.llm.serving === "official-api") {
    reqs.push("anthropic>=0.39");
  } else {
    reqs.push("httpx>=0.27"); // OpenAI 호환 엔드포인트 호출
  }
  reqs.push("pytest>=8.0");
  return reqs.join("\n") + "\n";
}

function llmClientPy(spec: AgentSpec): string {
  const stream = spec.interaction.streaming.enabled;
  const toolAgent = spec.interaction.agentMode === "tool-agent";
  const { maxTokens, temperature } = spec.llm.params;
  const claude = spec.llm.provider === "claude" && spec.llm.serving === "official-api";

  if (claude) {
    const streamFn = stream
      ? `

async def complete_stream(system: str, messages: list[Msg]) -> AsyncGenerator[str, None]:
    """스트리밍 — 토큰 델타를 순차 yield (streaming.enabled=true)."""
    async with _client().messages.stream(
        model=MODEL, max_tokens=${maxTokens}, temperature=${temperature},
        system=system, messages=[m.__dict__ for m in messages],
    ) as s:
        async for text in s.text_stream:
            yield text`
      : "";
    const toolFn = toolAgent
      ? `

async def complete_with_tools(system: str, base: list[Msg], tools: list[dict], execute: dict, max_steps: int) -> str:
    """tool-use 루프 — stop_reason=='tool_use' 면 도구 실행→tool_result 회신→반복(최대 max_steps)."""
    messages: list[dict] = [{"role": m.role, "content": m.content} for m in base]
    for _ in range(max_steps):
        res = await _client().messages.create(
            model=MODEL, max_tokens=${maxTokens}, temperature=${temperature},
            system=system, tools=tools, messages=messages,
        )
        if res.stop_reason == "tool_use":
            messages.append({"role": "assistant", "content": res.content})
            results = []
            for block in res.content:
                if getattr(block, "type", None) == "tool_use":
                    fn = execute.get(block.name)
                    out = await fn(dict(block.input)) if fn else {"error": "unknown tool"}
                    results.append({"type": "tool_result", "tool_use_id": block.id,
                                    "content": json.dumps(out, ensure_ascii=False)})
            messages.append({"role": "user", "content": results})
            continue
        for block in res.content:
            if getattr(block, "type", None) == "text":
                return block.text
        return ""
    return "(최대 도구 호출 횟수를 초과했습니다.)"`
      : "";
    return `"""LLM 클라이언트 — Claude 공식 API. (키: ANTHROPIC_API_KEY)"""
import json
import os
from dataclasses import dataclass
from typing import AsyncGenerator

import anthropic

MODEL = os.environ.get("LLM_MODEL", "${spec.llm.model}")
_inst: anthropic.AsyncAnthropic | None = None


@dataclass
class Msg:
    role: str
    content: str


def _client() -> anthropic.AsyncAnthropic:
    # 지연 초기화 — 키가 없어도 서버(/health)는 기동되도록 한다.
    global _inst
    if _inst is None:
        _inst = anthropic.AsyncAnthropic()
    return _inst


async def complete(system: str, messages: list[Msg]) -> str:
    res = await _client().messages.create(
        model=MODEL, max_tokens=${maxTokens}, temperature=${temperature},
        system=system, messages=[{"role": m.role, "content": m.content} for m in messages],
    )
    for block in res.content:
        if getattr(block, "type", None) == "text":
            return block.text
    return ""${streamFn}${toolFn}
`;
  }

  // OpenAI 호환 엔드포인트 (프록시/사내 추론/오픈소스)
  const streamFnCompat = stream
    ? `

async def complete_stream(system: str, messages: list[Msg]) -> AsyncGenerator[str, None]:
    """스트리밍 — OpenAI 호환 SSE 파싱."""
    payload = {"model": MODEL, "stream": True,
               "messages": [{"role": "system", "content": system}] + [m.__dict__ for m in messages]}
    async with httpx.AsyncClient(timeout=None) as cx:
        async with cx.stream("POST", f"{BASE_URL}/chat/completions", json=payload) as res:
            async for line in res.aiter_lines():
                line = line.strip()
                if not line.startswith("data:"):
                    continue
                data = line[5:].strip()
                if data == "[DONE]":
                    return
                try:
                    j = json.loads(data)
                    delta = j.get("choices", [{}])[0].get("delta", {}).get("content")
                    if delta:
                        yield delta
                except json.JSONDecodeError:
                    continue`
    : "";
  const toolFnCompat = toolAgent
    ? `

async def complete_with_tools(system: str, base: list[Msg], tools: list[dict], execute: dict, max_steps: int) -> str:
    """OpenAI 호환 function-calling 루프 — tool_calls 가 있으면 실행→role:tool 회신→반복(최대 max_steps)."""
    oai_tools = [{"type": "function",
                  "function": {"name": t["name"], "description": t["description"], "parameters": t["input_schema"]}}
                 for t in tools]
    messages: list[dict] = [{"role": "system", "content": system}] + [{"role": m.role, "content": m.content} for m in base]
    async with httpx.AsyncClient(timeout=None) as cx:
        for _ in range(max_steps):
            res = await cx.post(f"{BASE_URL}/chat/completions", json={
                "model": MODEL, "max_tokens": ${maxTokens}, "temperature": ${temperature},
                "messages": messages, "tools": oai_tools,
            })
            msg = res.json().get("choices", [{}])[0].get("message")
            if not msg:
                return ""
            calls = msg.get("tool_calls")
            if calls:
                messages.append({"role": "assistant", "content": msg.get("content"), "tool_calls": calls})
                for call in calls:
                    fn = execute.get(call["function"]["name"])
                    try:
                        args = json.loads(call["function"].get("arguments") or "{}")
                    except json.JSONDecodeError:
                        args = {}
                    out = await fn(args) if fn else {"error": "unknown tool"}
                    messages.append({"role": "tool", "tool_call_id": call["id"],
                                     "content": json.dumps(out, ensure_ascii=False)})
                continue
            return msg.get("content") or ""
    return "(최대 도구 호출 횟수를 초과했습니다.)"`
    : "";
  return `"""LLM 클라이언트 — OpenAI 호환 엔드포인트(프록시/사내 추론). (LLM_BASE_URL)"""
import json
import os
from dataclasses import dataclass
from typing import AsyncGenerator

import httpx

BASE_URL = os.environ.get("LLM_BASE_URL", "http://localhost:8000/v1")
MODEL = os.environ.get("LLM_MODEL", "${spec.llm.model}")


@dataclass
class Msg:
    role: str
    content: str


async def complete(system: str, messages: list[Msg]) -> str:
    async with httpx.AsyncClient(timeout=None) as cx:
        res = await cx.post(f"{BASE_URL}/chat/completions", json={
            "model": MODEL, "max_tokens": ${maxTokens}, "temperature": ${temperature},
            "messages": [{"role": "system", "content": system}] + [m.__dict__ for m in messages],
        })
    data = res.json()
    return (data.get("choices", [{}])[0].get("message", {}) or {}).get("content") or ""${streamFnCompat}${toolFnCompat}
`;
}

function chatPy(spec: AgentSpec): string {
  const it = spec.interaction;
  const rag = spec.rag.enabled;
  const stream = it.streaming.enabled;
  const toolAgent = it.agentMode === "tool-agent";
  const multiTurn = spec.llm.session.multiTurn;
  const maxSteps = it.maxSteps ?? 5;
  const histMsgs = (spec.llm.session.historyTurns ?? 10) * 2;
  const masking =
    spec.compliance.privacy.masking &&
    (spec.compliance.privacy.collectsPii || spec.llm.guardrails.piiFilter);
  const grounded = spec.llm.guardrails.groundedOnly ? "True" : "False";

  const imports = [
    "import json",
    "import os",
    "from typing import Any, AsyncGenerator",
    "",
    `from llm_client import Msg, complete${stream ? ", complete_stream" : ""}${toolAgent ? ", complete_with_tools" : ""}`,
    rag ? "from rag.pipeline import search" : "",
    toolAgent ? "from tools import TOOLS, TOOL_DEFS" : "",
  ]
    .filter((l) => l !== "")
    .join("\n");

  const banned = spec.llm.guardrails.bannedTopics;
  const safetyLines: string[] = [
    `        "답변이 불가능하면 ${REFUSAL_KO[spec.agent.safety.refusalStyle]}.",`,
  ];
  if (banned && banned.length) safetyLines.push(`        "다음 주제는 정중히 거절하세요: ${banned.join(", ")}.",`);
  if (spec.llm.guardrails.piiFilter)
    safetyLines.push(`        "개인정보(주민등록번호·전화·이메일 등)는 답변에 노출하지 마세요.",`);

  const maskFn = masking
    ? `

import re

_PII = [
    (re.compile(r"\\d{6}-\\d{7}"), "******-*******"),       # 주민등록번호
    (re.compile(r"01[016789]-?\\d{3,4}-?\\d{4}"), "***-****-****"),  # 휴대전화
    (re.compile(r"[\\w.+-]+@[\\w-]+\\.[\\w.-]+"), "***@***"),  # 이메일
]


def mask_pii(text: str) -> str:
    """개인정보 마스킹 (piiFilter/masking) — 기관 정책에 맞게 패턴을 보강한다."""
    for pat, rep in _PII:
        text = pat.sub(rep, text)
    return text`
    : "";
  const safe = (v: string) => (masking ? `mask_pii(${v})` : v);

  const sessionFns = multiTurn
    ? `

# 멀티턴 세션 — sessionId 별 대화 이력(메모리). 운영은 DB/Redis 로 대체.
_SESSIONS: dict[str, list[Msg]] = {}
_HISTORY_MSGS = ${histMsgs}


def _load_history(session_id: str | None) -> list[Msg]:
    return list(_SESSIONS.get(session_id, [])) if session_id else []


def _save_history(session_id: str | None, messages: list[Msg], answer_text: str) -> None:
    if not session_id:
        return
    updated = messages + [Msg("assistant", answer_text)]
    _SESSIONS[session_id] = updated[-_HISTORY_MSGS:]`
    : `

def _load_history(session_id: str | None) -> list[Msg]:
    return []


def _save_history(session_id: str | None, messages: list[Msg], answer_text: str) -> None:
    pass`;

  const ragSearch = rag ? `    chunks = await search(message)\n` : "    chunks = []\n";
  const ragCtx = rag
    ? `    contexts = [c["text"] for c in chunks]\n    sources = [f"{c['source']} p.{c['page']}" if c.get("page") else c["source"] for c in chunks]\n`
    : `    contexts: list[str] = []\n    sources: list[str] = []\n`;
  const toolSim = toolAgent
    ? `    if STUB:\n        for name in list(TOOLS.keys())[:MAX_STEPS]:\n            result = await TOOLS[name]({"query": message})\n            contexts.append(f"[tool:{name}] " + json.dumps(result, ensure_ascii=False))\n            sources.append(f"tool:{name}")\n            traces.append({"tool": name, "result": result})\n`
    : "";

  const wantTrace = toolAgent && it.rendering.toolCallDisplay !== "hidden";
  const completeCall = toolAgent
    ? "await complete_with_tools(system, messages, TOOL_DEFS, TOOLS, MAX_STEPS)"
    : "await complete(system, messages)";

  const streamFn = stream
    ? `

async def answer_stream(message: str, session_id: str | None = None) -> AsyncGenerator[dict, None]:
    """스트리밍 응답 — (도구 trace) → 토큰 델타 → sources. (/api/chat/stream 에서 SSE 로 전송)"""
    contexts, sources, traces = await _gather(message)
    system = _build_system_prompt(contexts)
    messages = _load_history(session_id) + [Msg("user", message)]
${wantTrace ? "    for t in traces:\n        yield {\"trace\": t}\n" : ""}    full = ""
    if STUB:
        for tok in _stub_answer(message, contexts).split(" "):
            full += tok + " "
            yield {"delta": tok + " "}
    else:
${
        toolAgent
          ? "        full = await complete_with_tools(system, messages, TOOL_DEFS, TOOLS, MAX_STEPS)\n        yield {\"delta\": full}\n"
          : "        async for d in complete_stream(system, messages):\n            full += d\n            yield {\"delta\": d}\n"
      }    _save_history(session_id, messages, ${safe("full")})
    yield {"sources": sources}`
    : "";

  return `"""채팅 오케스트레이션: (RAG 검색)${toolAgent ? " + 도구 호출 루프" : ""} → LLM${stream ? " (스트리밍)" : ""}.

동작: ${it.agentMode} / 멀티턴: ${multiTurn} / 스트리밍: ${stream} / 인용: "${it.rendering.citationStyle}".
안전: 거절 "${spec.agent.safety.refusalStyle}"${masking ? " · PII 마스킹" : ""}.
"""
${imports}

GROUNDED_ONLY = ${grounded}  # 근거 기반 답변 강제
STUB = os.environ.get("LLM_STUB") == "true"  # 테스트/오프라인: 실제 LLM 호출 없이 결정적 스텁
${toolAgent ? `MAX_STEPS = ${maxSteps}  # tool-agent 루프 최대 반복\n` : ""}${sessionFns}


async def _gather(message: str) -> tuple[list[str], list[str], list[dict]]:
${ragSearch}${ragCtx}    traces: list[dict] = []
${toolSim}    return contexts, sources, traces


def _stub_answer(message: str, contexts: list[str]) -> str:
    cite = f" (참고: {', '.join(contexts)})" if contexts else ""
    return f'[STUB] "{message}" 문의에 대한 안내입니다.' + cite


def _build_system_prompt(contexts: list[str]) -> str:
    # TODO: agent-spec.json 의 conversation.persona.systemPrompt 를 반영한다.
    lines = [
        "당신은 ${spec.project.org || "공공기관"}의 안내 챗봇입니다.",
        "톤: ${spec.conversation.persona.tone}. 한국어로 정중히 답합니다.",
    ]
    if GROUNDED_ONLY:
        lines.append("제공된 근거에 없는 내용은 추측하지 마세요.")
    lines += [
${safetyLines.join("\n")}
    ]
    if contexts:
        lines.append("참고 자료:\\n" + "\\n---\\n".join(contexts))
    return "\\n".join([l for l in lines if l])


async def answer(message: str, session_id: str | None = None) -> dict[str, Any]:
    contexts, sources, _ = await _gather(message)
    system = _build_system_prompt(contexts)
    messages = _load_history(session_id) + [Msg("user", message)]
    raw = _stub_answer(message, contexts) if STUB else ${completeCall}
    answer_text = ${safe("raw")}
    _save_history(session_id, messages, answer_text)
    return {"answer": answer_text, "sources": sources}${streamFn}${maskFn}
`;
}

function mainPy(spec: AgentSpec): string {
  const stream = spec.interaction.streaming.enabled;
  const confirm =
    spec.interaction.agentMode === "tool-agent" && spec.interaction.toolPolicy === "confirm";
  const audit = spec.backend.logging.audit || spec.ops.audit;
  const rateLimit = spec.agent.safety.rateLimitPerMin;
  const abuse = spec.agent.safety.abuseFilter;
  const maxChars = spec.interaction.inputLimits.maxChars;

  const guardBody: string[] = [];
  if (maxChars)
    guardBody.push(
      `    if isinstance(body.get("message"), str) and len(body["message"]) > ${maxChars}:\n        raise HTTPException(400, "메시지가 너무 깁니다(최대 ${maxChars}자).")`,
    );
  if (abuse)
    guardBody.push(
      `    if _is_abusive(body.get("message")):\n        raise HTTPException(400, "부적절한 입력이 감지되었습니다.")`,
    );
  if (rateLimit)
    guardBody.push(
      `    ip = request.client.host if request.client else "unknown"\n    now = time.time()\n    w = _HITS.get(ip)\n    if not w or now - w[1] > 60:\n        _HITS[ip] = [1, now]\n    elif w[0] >= RATE_PER_MIN:\n        raise HTTPException(429, "요청이 너무 많습니다. 잠시 후 다시 시도하세요.")\n    else:\n        w[0] += 1`,
    );
  const guardHelpers =
    (rateLimit ? `RATE_PER_MIN = ${rateLimit}\n_HITS: dict[str, list[float]] = {}\n` : "") +
    (abuse
      ? `import re as _re\n_BANNED = [_re.compile(r"(.)\\1{20,}")]  # 과도한 반복 등\n\n\ndef _is_abusive(m: Any) -> bool:\n    return isinstance(m, str) and any(p.search(m) for p in _BANNED)\n`
      : "");
  const guardFn = guardBody.length
    ? `\n\ndef _guard(request: Request, body: dict) -> None:\n${guardBody.join("\n")}`
    : `\n\ndef _guard(request: Request, body: dict) -> None:\n    return None`;

  const auditMw = audit
    ? `

@app.middleware("http")
async def _audit(request: Request, call_next):
    # 감사 로그 (audit=true) — TODO: 보관소/포맷을 기관 정책에 맞게 (개인정보 주의)
    print(json.dumps({"ts": datetime.utcnow().isoformat(), "method": request.method, "path": request.url.path}))
    return await call_next(request)`
    : "";

  const streamRoute = stream
    ? `


@app.post("/api/chat/stream")
async def chat_stream(request: Request):
    body = await request.json()
    message = body.get("message")
    if not isinstance(message, str) or not message.strip():
        raise HTTPException(400, "message 가 필요합니다.")
    _guard(request, body)

    async def gen():
        try:
            async for ev in answer_stream(message, body.get("sessionId")):
                yield f"data: {json.dumps(ev, ensure_ascii=False)}\\n\\n"
        except Exception:
            yield "event: error\\ndata: {}\\n\\n"
        yield "event: done\\ndata: {}\\n\\n"

    return StreamingResponse(gen(), media_type="text/event-stream")`
    : "";
  const confirmRoute = confirm
    ? `


@app.post("/api/chat/confirm")
async def chat_confirm(request: Request):
    # 도구 실행 승인 (toolPolicy=confirm) — HITL 핸드셰이크.
    body = await request.json()
    if not isinstance(body.get("confirmToken"), str):
        raise HTTPException(400, "confirmToken 이 필요합니다.")
    # TODO: confirmToken 으로 보류된 도구 호출을 조회 → approved 면 실행 후 후속 답변 생성.
    return {"status": "executed" if body.get("approved") else "rejected", "note": "TODO: confirm 흐름 구현"}`
    : "";

  const chatImports = `from chat import answer${stream ? ", answer_stream" : ""}`;

  return `"""진입점 — FastAPI. 헬스체크 + 채팅 API 골격. (PROMPT.md 지시에 따라 로직을 채운다)"""
import json
from datetime import datetime
from typing import Any
${rateLimit ? "import time\n" : ""}
from fastapi import FastAPI, HTTPException, Request
from fastapi.responses import StreamingResponse
from fastapi.staticfiles import StaticFiles

${chatImports}

app = FastAPI()
${guardHelpers}${guardFn}${auditMw}


@app.get("/health")
async def health():
    return {"status": "ok"}


@app.post("/api/chat")
async def chat(request: Request):
    body = await request.json()
    message = body.get("message")
    if not isinstance(message, str) or not message.strip():
        raise HTTPException(400, "message 가 필요합니다.")
    _guard(request, body)
    return await answer(message, body.get("sessionId"))${streamRoute}${confirmRoute}


# 정적 파일(채팅 위젯)은 라우트 정의 뒤에 마운트한다.
app.mount("/", StaticFiles(directory="public", html=True), name="static")
`;
}

function toolsPy(spec: AgentSpec): string {
  const tools = spec.integrations.tools.length
    ? spec.integrations.tools
    : [{ name: "search_example", description: "예시 도구 — integrations.tools 를 채우세요.", parameters: undefined }];
  const entries = tools
    .map(
      (t) =>
        `    ${JSON.stringify(t.name)}: lambda args, _n=${JSON.stringify(t.name)}: _stub(_n, args),  # ${t.description}`,
    )
    .join("\n");
  const defs = tools
    .map((t) => {
      const schema = t.parameters ?? { type: "object", properties: {}, required: [] };
      return `    {"name": ${JSON.stringify(t.name)}, "description": ${JSON.stringify(
        t.description,
      )}, "input_schema": ${JSON.stringify(schema)}},`;
    })
    .join("\n");
  return `"""도구 레지스트리 — agentMode=tool-agent. (각 도구의 실제 로직을 채운다)"""


async def _stub(name: str, args: dict) -> dict:
    return {"tool": name, "args": args, "result": "TODO: 실제 구현"}


# 실행기: 이름 → async 함수. (실제 API 호출/DB 조회 등으로 채운다)
TOOLS = {
${entries}
}

# LLM tool-use 정의 (provider 별로 Anthropic tools / OpenAI function 형식으로 변환해 사용).
TOOL_DEFS = [
${defs}
]
`;
}

function ragPipelinePy(spec: AgentSpec): string {
  const corpusRows = spec.evaluation.testset
    .filter((t) => t.expectedSource)
    .map(
      (t, i) =>
        `    {"id": "d${i + 1}", "source": ${JSON.stringify(t.expectedSource)}, "page": 1, "text": ${JSON.stringify(
          `${t.question} ${t.expectedAnswer ?? ""}`.trim(),
        )}},`,
    )
    .join("\n");
  const corpus =
    corpusRows ||
    `    {"id": "sample", "source": "sample.txt", "page": None, "text": "실제 문서를 적재하면 이 샘플은 대체됩니다."},`;
  return `"""RAG 파이프라인 골격 — 적재→청킹→임베딩→검색. (실서비스 로직은 PROMPT.md 지시로 채움)

Vector DB: ${spec.rag.vectorDb} / 임베딩: ${spec.rag.embedding} / 검색: ${spec.rag.retrieval.strategy}
"""
import os
import re

CHUNK_SIZE = ${spec.rag.chunking.size ?? 800}
CHUNK_OVERLAP = ${spec.rag.chunking.overlap ?? 100}


def ingest(file_path: str) -> str:
    """1) 문서 적재 (소스: ${spec.rag.sources.join(", ") || "미선택"}). 바이너리는 변환 후 텍스트를 넘긴다."""
    if re.search(r"\\.(pdf|hwp|docx)$", file_path, re.I):
        raise ValueError("바이너리 문서는 텍스트로 변환 후 chunk()/index() 에 넘기세요 (예: libreoffice --convert-to txt).")
    with open(file_path, encoding="utf-8") as f:
        return f.read()


def chunk(text: str, source: str = "uploaded") -> list[dict]:
    """2) 청킹 (전략: ${spec.rag.chunking.strategy}) — 문단 묶음 + 크기 상한 + 오버랩."""
    paras = [p.strip() for p in re.split(r"\\n\\s*\\n", text) if p.strip()]
    out: list[dict] = []
    buf = ""
    for p in paras:
        if len(buf + "\\n\\n" + p) > CHUNK_SIZE and buf:
            out.append({"id": f"{source}#{len(out)}", "text": buf, "source": source, "page": None})
            buf = buf[max(0, len(buf) - CHUNK_OVERLAP):]
        buf = buf + "\\n\\n" + p if buf else p
        while len(buf) > CHUNK_SIZE:
            out.append({"id": f"{source}#{len(out)}", "text": buf[:CHUNK_SIZE], "source": source, "page": None})
            buf = buf[CHUNK_SIZE - CHUNK_OVERLAP:]
    if buf:
        out.append({"id": f"{source}#{len(out)}", "text": buf, "source": source, "page": None})
    return out


# 개발용 인메모리 색인 (운영은 ${spec.rag.vectorDb}).
_INDEXED: list[dict] = []


async def index(chunks: list[dict]) -> None:
    """3) 임베딩 + Vector DB 적재 — 개발: 인메모리. 운영: ${spec.rag.embedding} 임베딩 후 ${spec.rag.vectorDb} upsert(TODO)."""
    if os.environ.get("EMBEDDING_API_URL") and os.environ.get("DATABASE_URL"):
        print("[rag] 실제 임베딩/적재 미구현 — 인메모리 색인에 보관합니다.")
    _INDEXED.extend(chunks)


# 개발/CI용 샘플 코퍼스(골든셋 파생). 실제 적재 구현 시 ${spec.rag.vectorDb} 검색으로 대체한다.
_DEV_CORPUS: list[dict] = [
${corpus}
]


async def search(query: str, top_k: int = ${spec.rag.retrieval.topK ?? 3}) -> list[dict]:
    """4) 검색 (${spec.rag.retrieval.strategy}) — 질문 관련 청크 반환.

    운영: EMBEDDING_API_URL + DATABASE_URL 설정 시 실제 벡터 검색 구현.
    개발/CI(미설정): 샘플 코퍼스 키워드 겹침 검색 폴백(빈 결과 금지).
    """
    if os.environ.get("EMBEDDING_API_URL") and os.environ.get("DATABASE_URL"):
        print("[rag] 실제 벡터 검색 미구현 — 샘플 코퍼스로 폴백합니다.")
    terms = [t for t in query.lower().split() if t]
    pool = _INDEXED + _DEV_CORPUS
    scored = [(sum(1 for t in terms if t in c["text"].lower()), c) for c in pool]
    hits = sorted([s for s in scored if s[0] > 0], key=lambda x: -x[0])
    chosen = hits if hits else scored
    return [c for _, c in chosen[:top_k]]
`;
}

function goldenTestPy(spec: AgentSpec): string {
  const cases =
    spec.evaluation.testset.length > 0
      ? spec.evaluation.testset
      : [{ question: "(골든셋이 비어 있음 — agent-spec.json 의 evaluation.testset 을 채운다)" }];
  const rows = cases
    .map(
      (c) =>
        `    {"question": ${JSON.stringify(c.question)}, "expected_source": ${JSON.stringify(
          c.expectedSource ?? null,
        )}},`,
    )
    .join("\n");
  const accuracy =
    spec.rag.enabled && cases.some((c) => c.expectedSource)
      ? `

@pytest.mark.asyncio
@pytest.mark.parametrize("tc", [g for g in GOLDEN if g["expected_source"]])
async def test_citation_accuracy(tc):
    # 인용/근거 정확도 — 검색 결과의 출처가 기대 출처를 포함하는지 검증한다.
    res = await answer(tc["question"])
    assert any(tc["expected_source"] in s for s in res["sources"])`
      : "";
  return `"""평가 골든셋 테스트 골격. (acceptance: 통과해야 납품 가능)

지표: ${spec.evaluation.metrics.join(", ") || "(미선택)"}
실행: LLM_STUB=true pytest — 플러밍 먼저 검증 후 실제 LLM 으로 재검증한다.
"""
import sys
from pathlib import Path

import pytest

sys.path.insert(0, str(Path(__file__).resolve().parents[1]))
from chat import answer  # noqa: E402

GOLDEN = [
${rows}
]


@pytest.mark.asyncio
@pytest.mark.parametrize("tc", GOLDEN)
async def test_golden_plumbing(tc):
    res = await answer(tc["question"])
    assert isinstance(res["answer"], str)
    assert len(res["answer"]) > 0${accuracy}
`;
}

const PYTEST_INI = `[pytest]
asyncio_mode = auto
`;

const GITIGNORE_PY = `__pycache__/
*.pyc
.venv/
venv/
.env
*.log
`;

function dockerfilePy(): string {
  return `FROM python:3.11-slim
WORKDIR /app
COPY requirements.txt ./
RUN pip install --no-cache-dir -r requirements.txt
COPY . .
EXPOSE 3000
CMD ["uvicorn", "main:app", "--host", "0.0.0.0", "--port", "3000"]
`;
}

/** Python(FastAPI) 백엔드 스캐폴드 파일 묶음 */
export function pythonBackendFiles(spec: AgentSpec, _slug: string): GeneratedFile[] {
  void _slug;
  const files: GeneratedFile[] = [
    { path: "requirements.txt", contents: requirementsTxt(spec) },
    { path: "pytest.ini", contents: PYTEST_INI },
    { path: "main.py", contents: mainPy(spec) },
    { path: "chat.py", contents: chatPy(spec) },
    { path: "llm_client.py", contents: llmClientPy(spec) },
    { path: "tests/test_golden.py", contents: goldenTestPy(spec) },
    { path: ".env.example", contents: envEntries(spec).join("\n") + "\n" },
    { path: ".gitignore", contents: GITIGNORE_PY },
  ];
  if (spec.rag.enabled) {
    files.push({ path: "rag/__init__.py", contents: "" });
    files.push({ path: "rag/pipeline.py", contents: ragPipelinePy(spec) });
  }
  if (spec.interaction.agentMode === "tool-agent") {
    files.push({ path: "tools.py", contents: toolsPy(spec) });
  }
  if (spec.backend.deploy === "docker" || spec.backend.deploy === "kubernetes") {
    files.push({ path: "Dockerfile", contents: dockerfilePy() });
  }
  return files;
}

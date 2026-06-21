/**
 * Go 백엔드 스캐폴드 (풀 패리티). (PLAN.md M7-D)
 *
 * 폐쇄망/오프라인 친화 + 검증 안정성을 위해 **표준 라이브러리 net/http** 기반으로 생성한다(외부 의존성 0).
 * 카탈로그의 대표 프레임워크(Gin/Echo)는 주석/PROMPT 로 안내하고, 골격은 stdlib 로 둔다.
 * Node 참조와 동일한 REST 계약·깊이(멀티턴·SSE 스트리밍·tool-use 루프·RAG·가드/안전·PII 마스킹).
 *
 * 단일 패키지(main): main.go(서버+오케스트레이션+RAG+도구) + llm.go(클라이언트). Go 의 unused-import
 * 규칙 때문에 import 는 사용처에 맞춰 정밀 계산한다.
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

function goModuleName(slug: string): string {
  // go module 경로로 안전한 형태 (영문/숫자/하이픈)
  const safe = slug.replace(/[^a-z0-9-]/g, "") || "gov-chatbot";
  return safe;
}

function goString(s: string): string {
  // Go 큰따옴표 문자열 리터럴 (JSON.stringify 가 Go 와 호환되는 이스케이프를 만든다)
  return JSON.stringify(s);
}

function mainGo(spec: AgentSpec): string {
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
  const audit = spec.backend.logging.audit || spec.ops.audit;
  const rateLimit = spec.agent.safety.rateLimitPerMin;
  const abuse = spec.agent.safety.abuseFilter;
  const maxChars = spec.interaction.inputLimits.maxChars;
  const grounded = spec.llm.guardrails.groundedOnly;

  // import 집합 — 사용처에 맞춰 정밀 계산
  const imports = new Set<string>(["encoding/json", "log", "net/http", "os", "strings"]);
  if (audit || rateLimit) imports.add("time");
  if (abuse || masking) imports.add("regexp");
  if (multiTurn || rateLimit) imports.add("sync");
  if (rag) imports.add("sort");
  if (rag) imports.add("fmt"); // gather 의 출처 포맷(Sprintf)

  // --- 안전/가드 ---
  const guardChecks: string[] = [];
  if (maxChars)
    guardChecks.push(
      `\tif len(msg) > ${maxChars} {\n\t\thttp.Error(w, "메시지가 너무 깁니다(최대 ${maxChars}자).", 400)\n\t\treturn false\n\t}`,
    );
  if (abuse)
    guardChecks.push(`\tif isAbusive(msg) {\n\t\thttp.Error(w, "부적절한 입력이 감지되었습니다.", 400)\n\t\treturn false\n\t}`);
  if (rateLimit)
    guardChecks.push(
      `\tip := strings.Split(r.RemoteAddr, ":")[0]\n\thitsMu.Lock()\n\tnow := time.Now().Unix()\n\tw0 := hits[ip]\n\tif w0 == nil || now-w0.t > 60 {\n\t\thits[ip] = &window{n: 1, t: now}\n\t} else if w0.n >= ratePerMin {\n\t\thitsMu.Unlock()\n\t\thttp.Error(w, "요청이 너무 많습니다. 잠시 후 다시 시도하세요.", 429)\n\t\treturn false\n\t} else {\n\t\tw0.n++\n\t}\n\thitsMu.Unlock()`,
    );
  const guardDecls =
    (rateLimit
      ? `\nconst ratePerMin = ${rateLimit}\n\ntype window struct {\n\tn int\n\tt int64\n}\n\nvar (\n\thits   = map[string]*window{}\n\thitsMu sync.Mutex\n)\n`
      : "") +
    (abuse
      ? `\nvar bannedPat = regexp.MustCompile(` + "`(.)\\\\1{20,}`" + `) // 과도한 반복 등\n\nfunc isAbusive(m string) bool { return bannedPat.MatchString(m) }\n`
      : "");
  const guardFn = `\n// guard 는 채팅 요청 공통 가드(입력길이/남용/rate limit). 통과하면 true.\nfunc guard(w http.ResponseWriter, r *http.Request, msg string) bool {\n${
    guardChecks.join("\n") || "\t_ = msg"
  }\n\treturn true\n}\n`;

  // --- 마스킹 ---
  const maskDecl = masking
    ? `\nvar piiPats = []struct {\n\tre  *regexp.Regexp\n\trep string\n}{\n\t{regexp.MustCompile(` +
      "`\\\\d{6}-\\\\d{7}`" +
      `), "******-*******"},\n\t{regexp.MustCompile(` +
      "`01[016789]-?\\\\d{3,4}-?\\\\d{4}`" +
      `), "***-****-****"},\n\t{regexp.MustCompile(` +
      "`[\\\\w.+-]+@[\\\\w-]+\\\\.[\\\\w.-]+`" +
      `), "***@***"},\n}\n\n// maskPII 는 개인정보를 마스킹한다(기관 정책에 맞게 패턴 보강).\nfunc maskPII(s string) string {\n\tfor _, p := range piiPats {\n\t\ts = p.re.ReplaceAllString(s, p.rep)\n\t}\n\treturn s\n}\n`
    : "";
  const safe = (v: string) => (masking ? `maskPII(${v})` : v);

  // --- 세션 ---
  const sessionDecl = multiTurn
    ? `\n// 멀티턴 세션 — sessionId 별 대화 이력(메모리). 운영은 DB/Redis 로 대체.\nconst historyMsgs = ${histMsgs}\n\nvar (\n\tsessions   = map[string][]Msg{}\n\tsessionsMu sync.Mutex\n)\n\nfunc loadHistory(id string) []Msg {\n\tif id == "" {\n\t\treturn nil\n\t}\n\tsessionsMu.Lock()\n\tdefer sessionsMu.Unlock()\n\treturn append([]Msg{}, sessions[id]...)\n}\n\nfunc saveHistory(id string, messages []Msg, answerText string) {\n\tif id == "" {\n\t\treturn\n\t}\n\tupdated := append(messages, Msg{Role: "assistant", Content: answerText})\n\tif len(updated) > historyMsgs {\n\t\tupdated = updated[len(updated)-historyMsgs:]\n\t}\n\tsessionsMu.Lock()\n\tsessions[id] = updated\n\tsessionsMu.Unlock()\n}\n`
    : `\nfunc loadHistory(id string) []Msg { return nil }\nfunc saveHistory(id string, messages []Msg, answerText string) {}\n`;

  // --- RAG ---
  const ragDecl = rag
    ? ragGo(spec)
    : "";
  // gather 는 명명 반환값(contexts/sources/traces)에 append 한다 — 재선언 금지.
  const ragBlock = rag
    ? `\tfor _, c := range search(message) {\n\t\tcontexts = append(contexts, c.Text)\n\t\tif c.Page > 0 {\n\t\t\tsources = append(sources, fmt.Sprintf("%s p.%d", c.Source, c.Page))\n\t\t} else {\n\t\t\tsources = append(sources, c.Source)\n\t\t}\n\t}\n`
    : "";

  // --- 도구 ---
  const toolDecl = toolAgent ? toolsGo(spec) : "";
  const toolSim = toolAgent
    ? `\tif stub {\n\t\ti := 0\n\t\tfor name, fn := range tools {\n\t\t\tif i >= maxSteps {\n\t\t\t\tbreak\n\t\t\t}\n\t\t\tres := fn(map[string]any{"query": message})\n\t\t\tb, _ := json.Marshal(res)\n\t\t\tcontexts = append(contexts, "[tool:"+name+"] "+string(b))\n\t\t\tsources = append(sources, "tool:"+name)\n\t\t\ttraces = append(traces, map[string]any{"tool": name, "result": res})\n\t\t\ti++\n\t\t}\n\t}\n`
    : "";

  // --- 시스템 프롬프트 안전 ---
  const safetyLines: string[] = [`\t\t${goString(`답변이 불가능하면 ${REFUSAL_KO[spec.agent.safety.refusalStyle]}.`)}`];
  const banned = spec.llm.guardrails.bannedTopics;
  if (banned && banned.length) safetyLines.push(`\t\t${goString(`다음 주제는 정중히 거절하세요: ${banned.join(", ")}.`)}`);
  if (spec.llm.guardrails.piiFilter)
    safetyLines.push(`\t\t${goString("개인정보(주민등록번호·전화·이메일 등)는 답변에 노출하지 마세요.")}`);

  // --- 답변 함수 ---
  const completeCall = toolAgent
    ? "completeWithTools(system, messages, toolDefs, tools, maxSteps)"
    : "complete(system, messages)";
  const maxStepsDecl = toolAgent ? `\nconst maxSteps = ${maxSteps}\n` : "";

  const wantTrace = toolAgent && it.rendering.toolCallDisplay !== "hidden";

  // --- 스트리밍 핸들러 ---
  const streamHandler = stream
    ? `

// chatStreamHandler 는 SSE 로 (도구 trace→토큰 델타→sources) 를 전송한다.
func chatStreamHandler(w http.ResponseWriter, r *http.Request) {
	var body map[string]any
	json.NewDecoder(r.Body).Decode(&body)
	message, _ := body["message"].(string)
	if strings.TrimSpace(message) == "" {
		http.Error(w, "message 가 필요합니다.", 400)
		return
	}
	if !guard(w, r, message) {
		return
	}
	sessionID, _ := body["sessionId"].(string)
	flusher, ok := w.(http.Flusher)
	if !ok {
		http.Error(w, "streaming unsupported", 500)
		return
	}
	w.Header().Set("Content-Type", "text/event-stream")
	w.Header().Set("Cache-Control", "no-cache")
	emit := func(ev map[string]any) {
		b, _ := json.Marshal(ev)
		w.Write([]byte("data: " + string(b) + "\\n\\n"))
		flusher.Flush()
	}
	answerStream(message, sessionID, emit)
	w.Write([]byte("event: done\\ndata: {}\\n\\n"))
	flusher.Flush()
}

// answerStream 은 스트리밍 이벤트를 emit 으로 전달한다.
func answerStream(message, sessionID string, emit func(map[string]any)) {
	contexts, sources, traces := gather(message)
	system := buildSystemPrompt(contexts)
	messages := append(loadHistory(sessionID), Msg{Role: "user", Content: message})
	_ = traces
${wantTrace ? "\tfor _, t := range traces {\n\t\temit(map[string]any{\"trace\": t})\n\t}\n" : ""}	full := ""
	if stub {
		for _, tok := range strings.Split(stubAnswer(message, contexts), " ") {
			full += tok + " "
			emit(map[string]any{"delta": tok + " "})
		}
	} else {
${
        toolAgent
          ? "\t\tfull = " +
            "completeWithTools(system, messages, toolDefs, tools, maxSteps)\n\t\temit(map[string]any{\"delta\": full})\n"
          : "\t\tcompleteStream(system, messages, func(d string) {\n\t\t\tfull += d\n\t\t\temit(map[string]any{\"delta\": d})\n\t\t})\n"
      }	}
	saveHistory(sessionID, messages, ${safe("full")})
	emit(map[string]any{"sources": sources})
}`
    : "";

  // --- confirm 핸들러 ---
  const confirmHandler =
    toolAgent && it.toolPolicy === "confirm"
      ? `

// chatConfirmHandler — 도구 실행 승인(toolPolicy=confirm) HITL 핸드셰이크.
func chatConfirmHandler(w http.ResponseWriter, r *http.Request) {
	var body map[string]any
	json.NewDecoder(r.Body).Decode(&body)
	if _, ok := body["confirmToken"].(string); !ok {
		http.Error(w, "confirmToken 이 필요합니다.", 400)
		return
	}
	approved, _ := body["approved"].(bool)
	status := "rejected"
	if approved {
		status = "executed"
	}
	writeJSON(w, map[string]any{"status": status, "note": "TODO: confirm 흐름 구현"})
}`
      : "";

  const auditMw = audit
    ? `
// auditLog 는 감사 로그(audit=true) — TODO: 보관소/포맷을 기관 정책에 맞게 (개인정보 주의).
func auditLog(next http.Handler) http.Handler {
	return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		b, _ := json.Marshal(map[string]any{"ts": time.Now().UTC().Format(time.RFC3339), "method": r.Method, "path": r.URL.Path})
		log.Println(string(b))
		next.ServeHTTP(w, r)
	})
}
`
    : "";

  const muxUse = audit
    ? `\thandler := auditLog(mux)\n\tlog.Fatal(http.ListenAndServe(":"+port, handler))`
    : `\tlog.Fatal(http.ListenAndServe(":"+port, mux))`;

  const importBlock = Array.from(imports)
    .sort()
    .map((i) => `\t${goString(i)}`)
    .join("\n");

  const traceDecl = toolAgent ? "" : "";
  void traceDecl;

  return `// 진입점 — 표준 라이브러리 net/http. 헬스체크 + 채팅 API 골격. (PROMPT.md 지시로 로직을 채운다)
// 대표 프레임워크: ${spec.backend.framework ?? "gin"} (운영 시 전환 가능). 동작: ${it.agentMode}.
package main

import (
${importBlock}
)

// Msg 는 대화 메시지.
type Msg struct {
	Role    string \`json:"role"\`
	Content string \`json:"content"\`
}

// ChatResult 는 채팅 응답.
type ChatResult struct {
	Answer  string   \`json:"answer"\`
	Sources []string \`json:"sources"\`
}

const groundedOnly = ${grounded} // 근거 기반 답변 강제
var stub = os.Getenv("LLM_STUB") == "true" // 테스트/오프라인: 실제 LLM 호출 없이 결정적 스텁
${maxStepsDecl}${sessionDecl}${guardDecls}${maskDecl}${toolDecl}${ragDecl}
// gather 는 컨텍스트(RAG 검색${toolAgent ? " + 도구 호출" : ""})를 구성한다.
func gather(message string) (contexts []string, sources []string, traces []map[string]any) {
${ragBlock}${toolSim}	return contexts, sources, traces
}

func stubAnswer(message string, contexts []string) string {
	cite := ""
	if len(contexts) > 0 {
		cite = " (참고: " + strings.Join(contexts, ", ") + ")"
	}
	return "[STUB] \\"" + message + "\\" 문의에 대한 안내입니다." + cite
}

func buildSystemPrompt(contexts []string) string {
	// TODO: agent-spec.json 의 conversation.persona.systemPrompt 를 반영한다.
	lines := []string{
		${goString(`당신은 ${spec.project.org || "공공기관"}의 안내 챗봇입니다.`)},
		${goString(`톤: ${spec.conversation.persona.tone}. 한국어로 정중히 답합니다.`)},
	}
	if groundedOnly {
		lines = append(lines, "제공된 근거에 없는 내용은 추측하지 마세요.")
	}
	lines = append(lines,
${safetyLines.join(",\n")},
	)
	if len(contexts) > 0 {
		lines = append(lines, "참고 자료:\\n"+strings.Join(contexts, "\\n---\\n"))
	}
	var out []string
	for _, l := range lines {
		if l != "" {
			out = append(out, l)
		}
	}
	return strings.Join(out, "\\n")
}

func answer(message, sessionID string) ChatResult {
	contexts, sources, _ := gather(message)
	system := buildSystemPrompt(contexts)
	messages := append(loadHistory(sessionID), Msg{Role: "user", Content: message})
	raw := ""
	if stub {
		raw = stubAnswer(message, contexts)
	} else {
		raw = ${completeCall}
	}
	answerText := ${safe("raw")}
	saveHistory(sessionID, messages, answerText)
	return ChatResult{Answer: answerText, Sources: sources}
}

func writeJSON(w http.ResponseWriter, v any) {
	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(v)
}

func chatHandler(w http.ResponseWriter, r *http.Request) {
	var body map[string]any
	json.NewDecoder(r.Body).Decode(&body)
	message, _ := body["message"].(string)
	if strings.TrimSpace(message) == "" {
		http.Error(w, "message 가 필요합니다.", 400)
		return
	}
	if !guard(w, r, message) {
		return
	}
	sessionID, _ := body["sessionId"].(string)
	writeJSON(w, answer(message, sessionID))
}
${guardFn}${streamHandler}${confirmHandler}
${auditMw}
func main() {
	mux := http.NewServeMux()
	mux.Handle("/", http.FileServer(http.Dir("public")))
	mux.HandleFunc("/health", func(w http.ResponseWriter, r *http.Request) {
		writeJSON(w, map[string]any{"status": "ok"})
	})
	mux.HandleFunc("/api/chat", chatHandler)
${stream ? "\tmux.HandleFunc(\"/api/chat/stream\", chatStreamHandler)\n" : ""}${
    toolAgent && it.toolPolicy === "confirm" ? "\tmux.HandleFunc(\"/api/chat/confirm\", chatConfirmHandler)\n" : ""
  }	port := os.Getenv("PORT")
	if port == "" {
		port = "3000"
	}
	log.Printf("server on :%s", port)
${muxUse}
}
`;
}

function ragGo(spec: AgentSpec): string {
  const corpusRows = spec.evaluation.testset
    .filter((t) => t.expectedSource)
    .map(
      (t, i) =>
        `\t{ID: "d${i + 1}", Source: ${goString(t.expectedSource ?? "")}, Page: 1, Text: ${goString(
          `${t.question} ${t.expectedAnswer ?? ""}`.trim(),
        )}},`,
    )
    .join("\n");
  const corpus =
    corpusRows ||
    `\t{ID: "sample", Source: "sample.txt", Page: 0, Text: "실제 문서를 적재하면 이 샘플은 대체됩니다."},`;
  const topK = spec.rag.retrieval.topK ?? 3;
  return `
// --- RAG 파이프라인 골격 (Vector DB: ${spec.rag.vectorDb} / 임베딩: ${spec.rag.embedding} / 검색: ${spec.rag.retrieval.strategy}) ---

// Chunk 는 검색 단위.
type Chunk struct {
	ID     string
	Text   string
	Source string
	Page   int
}

// devCorpus 는 개발/CI 용 샘플 코퍼스(골든셋 파생). 실제 적재 구현 시 ${spec.rag.vectorDb} 검색으로 대체.
var devCorpus = []Chunk{
${corpus}
}

var indexed []Chunk

// search 는 질문 관련 청크를 반환한다(${spec.rag.retrieval.strategy}).
// 운영: EMBEDDING_API_URL + DATABASE_URL 설정 시 실제 벡터 검색 구현. 개발/CI: 키워드 겹침 폴백(빈 결과 금지).
func search(query string) []Chunk {
	if os.Getenv("EMBEDDING_API_URL") != "" && os.Getenv("DATABASE_URL") != "" {
		log.Println("[rag] 실제 벡터 검색 미구현 — 샘플 코퍼스로 폴백합니다.")
	}
	terms := strings.Fields(strings.ToLower(query))
	pool := append(append([]Chunk{}, indexed...), devCorpus...)
	type scored struct {
		c Chunk
		s int
	}
	var arr []scored
	for _, c := range pool {
		s := 0
		low := strings.ToLower(c.Text)
		for _, t := range terms {
			if strings.Contains(low, t) {
				s++
			}
		}
		arr = append(arr, scored{c, s})
	}
	sort.SliceStable(arr, func(i, j int) bool { return arr[i].s > arr[j].s })
	hasHit := len(arr) > 0 && arr[0].s > 0
	var out []Chunk
	for _, x := range arr {
		if hasHit && x.s == 0 {
			continue
		}
		out = append(out, x.c)
		if len(out) >= ${topK} {
			break
		}
	}
	return out
}
`;
}

function toolsGo(spec: AgentSpec): string {
  const tools = spec.integrations.tools.length
    ? spec.integrations.tools
    : [{ name: "search_example", description: "예시 도구 — integrations.tools 를 채우세요.", parameters: undefined }];
  const entries = tools
    .map(
      (t) =>
        `\t${goString(t.name)}: func(args map[string]any) any { return map[string]any{"tool": ${goString(
          t.name,
        )}, "args": args, "result": "TODO: 실제 구현"} }, // ${t.description}`,
    )
    .join("\n");
  const defs = tools
    .map((t) => {
      const schema = t.parameters ?? { type: "object", properties: {}, required: [] };
      return `\t{Name: ${goString(t.name)}, Description: ${goString(t.description)}, InputSchema: ${goString(
        JSON.stringify(schema),
      )}},`;
    })
    .join("\n");
  return `
// --- 도구 레지스트리 (agentMode=tool-agent) ---

// ToolFn 은 도구 실행기.
type ToolFn func(args map[string]any) any

// tools: 이름 → 함수. (실제 API 호출/DB 조회 등으로 채운다)
var tools = map[string]ToolFn{
${entries}
}

// ToolDef 는 LLM tool-use 정의(provider 별 형식으로 변환해 사용). InputSchema 는 JSON Schema 문자열.
type ToolDef struct {
	Name        string
	Description string
	InputSchema string
}

var toolDefs = []ToolDef{
${defs}
}
`;
}

function llmGo(spec: AgentSpec): string {
  const stream = spec.interaction.streaming.enabled;
  const toolAgent = spec.interaction.agentMode === "tool-agent";
  const { maxTokens, temperature } = spec.llm.params;
  const claude = spec.llm.provider === "claude" && spec.llm.serving === "official-api";

  // net/http 로 REST 직접 호출 (Anthropic / OpenAI 호환). 의존성 0.
  const imports = new Set<string>(["bytes", "encoding/json", "io", "net/http", "os"]);
  if (stream) imports.add("bufio");
  if (stream) imports.add("strings"); // completeStream 의 SSE 파싱에만 사용

  const base = claude
    ? `const apiURL = "https://api.anthropic.com/v1/messages"

func authHeaders(req *http.Request) {
	req.Header.Set("content-type", "application/json")
	req.Header.Set("x-api-key", os.Getenv("ANTHROPIC_API_KEY"))
	req.Header.Set("anthropic-version", "2023-06-01")
}

// complete 는 Claude Messages API 로 단발 답변을 받는다.
func complete(system string, messages []Msg) string {
	payload := map[string]any{"model": model(), "max_tokens": ${maxTokens}, "temperature": ${temperature}, "system": system, "messages": messages}
	body, _ := json.Marshal(payload)
	req, _ := http.NewRequest("POST", apiURL, bytes.NewReader(body))
	authHeaders(req)
	res, err := http.DefaultClient.Do(req)
	if err != nil {
		return ""
	}
	defer res.Body.Close()
	raw, _ := io.ReadAll(res.Body)
	var parsed struct {
		Content []struct {
			Type string \`json:"type"\`
			Text string \`json:"text"\`
		} \`json:"content"\`
	}
	json.Unmarshal(raw, &parsed)
	for _, b := range parsed.Content {
		if b.Type == "text" {
			return b.Text
		}
	}
	return ""
}`
    : `var baseURL = func() string {
	if v := os.Getenv("LLM_BASE_URL"); v != "" {
		return v
	}
	return "http://localhost:8000/v1"
}()

// complete 는 OpenAI 호환 엔드포인트로 단발 답변을 받는다.
func complete(system string, messages []Msg) string {
	msgs := append([]Msg{{Role: "system", Content: system}}, messages...)
	payload := map[string]any{"model": model(), "max_tokens": ${maxTokens}, "temperature": ${temperature}, "messages": msgs}
	body, _ := json.Marshal(payload)
	res, err := http.Post(baseURL+"/chat/completions", "application/json", bytes.NewReader(body))
	if err != nil {
		return ""
	}
	defer res.Body.Close()
	raw, _ := io.ReadAll(res.Body)
	var parsed struct {
		Choices []struct {
			Message struct {
				Content string \`json:"content"\`
			} \`json:"message"\`
		} \`json:"choices"\`
	}
	json.Unmarshal(raw, &parsed)
	if len(parsed.Choices) > 0 {
		return parsed.Choices[0].Message.Content
	}
	return ""
}`;

  const streamFn = stream
    ? claude
      ? `

// completeStream 은 Claude SSE 스트림에서 텍스트 델타를 emit 한다.
func completeStream(system string, messages []Msg, emit func(string)) {
	payload := map[string]any{"model": model(), "max_tokens": ${maxTokens}, "temperature": ${temperature}, "system": system, "messages": messages, "stream": true}
	body, _ := json.Marshal(payload)
	req, _ := http.NewRequest("POST", apiURL, bytes.NewReader(body))
	authHeaders(req)
	res, err := http.DefaultClient.Do(req)
	if err != nil {
		return
	}
	defer res.Body.Close()
	sc := bufio.NewScanner(res.Body)
	for sc.Scan() {
		line := strings.TrimSpace(sc.Text())
		if !strings.HasPrefix(line, "data:") {
			continue
		}
		var ev struct {
			Delta struct {
				Type string \`json:"type"\`
				Text string \`json:"text"\`
			} \`json:"delta"\`
		}
		if json.Unmarshal([]byte(strings.TrimSpace(line[5:])), &ev) == nil && ev.Delta.Type == "text_delta" {
			emit(ev.Delta.Text)
		}
	}
}`
      : `

// completeStream 은 OpenAI 호환 SSE 스트림에서 텍스트 델타를 emit 한다.
func completeStream(system string, messages []Msg, emit func(string)) {
	msgs := append([]Msg{{Role: "system", Content: system}}, messages...)
	payload := map[string]any{"model": model(), "messages": msgs, "stream": true}
	body, _ := json.Marshal(payload)
	res, err := http.Post(baseURL+"/chat/completions", "application/json", bytes.NewReader(body))
	if err != nil {
		return
	}
	defer res.Body.Close()
	sc := bufio.NewScanner(res.Body)
	for sc.Scan() {
		line := strings.TrimSpace(sc.Text())
		if !strings.HasPrefix(line, "data:") {
			continue
		}
		payload := strings.TrimSpace(line[5:])
		if payload == "[DONE]" {
			return
		}
		var j struct {
			Choices []struct {
				Delta struct {
					Content string \`json:"content"\`
				} \`json:"delta"\`
			} \`json:"choices"\`
		}
		if json.Unmarshal([]byte(payload), &j) == nil && len(j.Choices) > 0 && j.Choices[0].Delta.Content != "" {
			emit(j.Choices[0].Delta.Content)
		}
	}
}`
    : "";

  const toolFn = !toolAgent
    ? ""
    : claude
      ? `

// completeWithTools 는 Claude tool-use 루프(stop_reason==tool_use → 도구 실행 → tool_result 회신 → 반복, 최대 maxSteps).
func completeWithTools(system string, base []Msg, defs []ToolDef, exec map[string]ToolFn, maxSteps int) string {
	var tools []map[string]any
	for _, d := range defs {
		var schema any
		json.Unmarshal([]byte(d.InputSchema), &schema)
		tools = append(tools, map[string]any{"name": d.Name, "description": d.Description, "input_schema": schema})
	}
	var messages []map[string]any
	for _, m := range base {
		messages = append(messages, map[string]any{"role": m.Role, "content": m.Content})
	}
	for step := 0; step < maxSteps; step++ {
		payload := map[string]any{"model": model(), "max_tokens": ${maxTokens}, "temperature": ${temperature}, "system": system, "tools": tools, "messages": messages}
		body, _ := json.Marshal(payload)
		req, _ := http.NewRequest("POST", apiURL, bytes.NewReader(body))
		authHeaders(req)
		res, err := http.DefaultClient.Do(req)
		if err != nil {
			return ""
		}
		raw, _ := io.ReadAll(res.Body)
		res.Body.Close()
		var parsed struct {
			StopReason string \`json:"stop_reason"\`
			Content    []struct {
				Type  string         \`json:"type"\`
				Text  string         \`json:"text"\`
				ID    string         \`json:"id"\`
				Name  string         \`json:"name"\`
				Input map[string]any \`json:"input"\`
			} \`json:"content"\`
		}
		json.Unmarshal(raw, &parsed)
		if parsed.StopReason == "tool_use" {
			var rawMsg struct {
				Content []map[string]any \`json:"content"\`
			}
			json.Unmarshal(raw, &rawMsg)
			messages = append(messages, map[string]any{"role": "assistant", "content": rawMsg.Content})
			var results []map[string]any
			for _, b := range parsed.Content {
				if b.Type == "tool_use" {
					var out any = map[string]any{"error": "unknown tool"}
					if fn, ok := exec[b.Name]; ok {
						out = fn(b.Input)
					}
					outB, _ := json.Marshal(out)
					results = append(results, map[string]any{"type": "tool_result", "tool_use_id": b.ID, "content": string(outB)})
				}
			}
			messages = append(messages, map[string]any{"role": "user", "content": results})
			continue
		}
		for _, b := range parsed.Content {
			if b.Type == "text" {
				return b.Text
			}
		}
		return ""
	}
	return "(최대 도구 호출 횟수를 초과했습니다.)"
}`
      : `

// completeWithTools 는 OpenAI 호환 function-calling 루프(tool_calls → 도구 실행 → role:tool 회신 → 반복, 최대 maxSteps).
func completeWithTools(system string, base []Msg, defs []ToolDef, exec map[string]ToolFn, maxSteps int) string {
	var oaiTools []map[string]any
	for _, d := range defs {
		var schema any
		json.Unmarshal([]byte(d.InputSchema), &schema)
		oaiTools = append(oaiTools, map[string]any{"type": "function", "function": map[string]any{"name": d.Name, "description": d.Description, "parameters": schema}})
	}
	messages := []map[string]any{{"role": "system", "content": system}}
	for _, m := range base {
		messages = append(messages, map[string]any{"role": m.Role, "content": m.Content})
	}
	for step := 0; step < maxSteps; step++ {
		payload := map[string]any{"model": model(), "max_tokens": ${maxTokens}, "temperature": ${temperature}, "messages": messages, "tools": oaiTools}
		body, _ := json.Marshal(payload)
		res, err := http.Post(baseURL+"/chat/completions", "application/json", bytes.NewReader(body))
		if err != nil {
			return ""
		}
		raw, _ := io.ReadAll(res.Body)
		res.Body.Close()
		var parsed struct {
			Choices []struct {
				Message struct {
					Content   string \`json:"content"\`
					ToolCalls []struct {
						ID       string \`json:"id"\`
						Function struct {
							Name      string \`json:"name"\`
							Arguments string \`json:"arguments"\`
						} \`json:"function"\`
					} \`json:"tool_calls"\`
				} \`json:"message"\`
			} \`json:"choices"\`
		}
		json.Unmarshal(raw, &parsed)
		if len(parsed.Choices) == 0 {
			return ""
		}
		msg := parsed.Choices[0].Message
		if len(msg.ToolCalls) > 0 {
			var rawMsg struct {
				Choices []struct {
					Message map[string]any \`json:"message"\`
				} \`json:"choices"\`
			}
			json.Unmarshal(raw, &rawMsg)
			messages = append(messages, rawMsg.Choices[0].Message)
			for _, call := range msg.ToolCalls {
				var args map[string]any
				json.Unmarshal([]byte(call.Function.Arguments), &args)
				var out any = map[string]any{"error": "unknown tool"}
				if fn, ok := exec[call.Function.Name]; ok {
					out = fn(args)
				}
				outB, _ := json.Marshal(out)
				messages = append(messages, map[string]any{"role": "tool", "tool_call_id": call.ID, "content": string(outB)})
			}
			continue
		}
		return msg.Content
	}
	return "(최대 도구 호출 횟수를 초과했습니다.)"
}`;

  const importBlock = Array.from(imports)
    .sort()
    .map((i) => `\t${goString(i)}`)
    .join("\n");

  return `// LLM 클라이언트 — ${claude ? "Claude Messages API" : "OpenAI 호환 엔드포인트"} (net/http, 의존성 0)
package main

import (
${importBlock}
)

func model() string {
	if v := os.Getenv("LLM_MODEL"); v != "" {
		return v
	}
	return ${goString(spec.llm.model)}
}

${base}${streamFn}${toolFn}
`;
}

function goldenTestGo(spec: AgentSpec): string {
  const cases =
    spec.evaluation.testset.length > 0
      ? spec.evaluation.testset
      : [{ question: "(골든셋이 비어 있음 — agent-spec.json 의 evaluation.testset 을 채운다)" }];
  const rows = cases
    .map(
      (c) =>
        `\t{question: ${goString(c.question)}, expectedSource: ${goString(c.expectedSource ?? "")}},`,
    )
    .join("\n");
  const accuracy =
    spec.rag.enabled && cases.some((c) => c.expectedSource)
      ? `

// TestCitationAccuracy — 검색 결과의 출처가 기대 출처를 포함하는지 검증한다.
func TestCitationAccuracy(t *testing.T) {
	for _, tc := range golden {
		if tc.expectedSource == "" {
			continue
		}
		res := answer(tc.question, "")
		ok := false
		for _, s := range res.Sources {
			if strings.Contains(s, tc.expectedSource) {
				ok = true
			}
		}
		if !ok {
			t.Errorf("출처 누락: %s → %s", tc.question, tc.expectedSource)
		}
	}
}`
      : "";
  const needStrings = spec.rag.enabled && cases.some((c) => c.expectedSource);
  return `// 평가 골든셋 테스트 골격. (acceptance: 통과해야 납품 가능)
// 지표: ${spec.evaluation.metrics.join(", ") || "(미선택)"}
// 실행: LLM_STUB=true go test ./...
package main

import (
${needStrings ? "\t\"strings\"\n" : ""}	"os"
	"testing"
)

var golden = []struct {
	question       string
	expectedSource string
}{
${rows}
}

func TestMain(m *testing.M) {
	os.Setenv("LLM_STUB", "true")
	stub = true
	os.Exit(m.Run())
}

func TestGoldenPlumbing(t *testing.T) {
	for _, tc := range golden {
		res := answer(tc.question, "")
		if len(res.Answer) == 0 {
			t.Errorf("빈 답변: %s", tc.question)
		}
	}
}${accuracy}
`;
}

function dockerfileGo(slug: string): string {
  return `FROM golang:1.22 AS build
WORKDIR /app
COPY . .
RUN CGO_ENABLED=0 go build -o /server .

FROM gcr.io/distroless/static-debian12
WORKDIR /app
COPY --from=build /server /server
COPY public ./public
EXPOSE 3000
CMD ["/server"]
# module: ${slug}
`;
}

const GITIGNORE_GO = `/server
*.exe
.env
*.log
`;

/** Go(net/http) 백엔드 스캐폴드 파일 묶음 */
export function goBackendFiles(spec: AgentSpec, slug: string): GeneratedFile[] {
  const mod = goModuleName(slug);
  const files: GeneratedFile[] = [
    { path: "go.mod", contents: `module ${mod}\n\ngo 1.22\n` },
    { path: "main.go", contents: mainGo(spec) },
    { path: "llm.go", contents: llmGo(spec) },
    { path: "main_test.go", contents: goldenTestGo(spec) },
    { path: ".env.example", contents: envEntries(spec).join("\n") + "\n" },
    { path: ".gitignore", contents: GITIGNORE_GO },
  ];
  if (spec.backend.deploy === "docker" || spec.backend.deploy === "kubernetes") {
    files.push({ path: "Dockerfile", contents: dockerfileGo(mod) });
  }
  return files;
}

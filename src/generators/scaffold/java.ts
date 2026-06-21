/**
 * Java 백엔드 스캐폴드 (풀 패리티). (PLAN.md M7-D)
 *
 * 대표 프레임워크 = Spring Boot (공공기관 표준). LLM 호출은 JDK java.net.http(추가 의존성 0),
 * JSON 은 Spring Web 에 포함된 Jackson 을 쓴다. Node 참조와 동일한 REST 계약·깊이
 * (멀티턴 세션·SSE 스트리밍·tool-use 골격·RAG·가드/안전·PII 마스킹).
 *
 * 패키지: com.example.chatbot. 정적 파일(public/)은 application.properties 에서 file:public/ 로 서빙.
 */

import type { AgentSpec } from "@/lib/agent-spec";
import type { GeneratedFile } from "../index";
import { envEntries } from "./shared";

const PKG = "com.example.chatbot";
const PKG_PATH = "src/main/java/com/example/chatbot";

const REFUSAL_KO: Record<string, string> = {
  polite: "정중히 사과하고 가능한 대안을 안내하세요",
  brief: "간결히 답변할 수 없음을 알리세요",
  redirect: "담당 부서나 적절한 채널로 안내하세요",
  strict: "관련 규정을 근거로 명확히 거절하세요",
};

/** Java 문자열 리터럴 (JSON.stringify 의 이스케이프가 Java 와 호환) */
function jstr(s: string): string {
  return JSON.stringify(s);
}

function pomXml(spec: AgentSpec, slug: string): string {
  return `<?xml version="1.0" encoding="UTF-8"?>
<project xmlns="http://maven.apache.org/POM/4.0.0"
         xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance"
         xsi:schemaLocation="http://maven.apache.org/POM/4.0.0 http://maven.apache.org/xsd/maven-4.0.0.xsd">
  <modelVersion>4.0.0</modelVersion>
  <parent>
    <groupId>org.springframework.boot</groupId>
    <artifactId>spring-boot-starter-parent</artifactId>
    <version>3.3.2</version>
    <relativePath/>
  </parent>
  <groupId>com.example</groupId>
  <artifactId>${slug.replace(/[^a-z0-9-]/g, "") || "chatbot"}</artifactId>
  <version>0.1.0</version>
  <properties>
    <java.version>21</java.version>
  </properties>
  <dependencies>
    <dependency>
      <groupId>org.springframework.boot</groupId>
      <artifactId>spring-boot-starter-web</artifactId>
    </dependency>
    <dependency>
      <groupId>org.springframework.boot</groupId>
      <artifactId>spring-boot-starter-test</artifactId>
      <scope>test</scope>
    </dependency>
  </dependencies>
  <build>
    <plugins>
      <plugin>
        <groupId>org.springframework.boot</groupId>
        <artifactId>spring-boot-maven-plugin</artifactId>
      </plugin>
    </plugins>
  </build>
</project>
`;
}

function applicationJava(): string {
  return `package ${PKG};

import org.springframework.boot.SpringApplication;
import org.springframework.boot.autoconfigure.SpringBootApplication;

@SpringBootApplication
public class Application {
    public static void main(String[] args) {
        SpringApplication.run(Application.class, args);
    }
}
`;
}

function controllerJava(spec: AgentSpec): string {
  const it = spec.interaction;
  const stream = it.streaming.enabled;
  const confirm = it.agentMode === "tool-agent" && it.toolPolicy === "confirm";
  const rateLimit = spec.agent.safety.rateLimitPerMin;
  const abuse = spec.agent.safety.abuseFilter;
  const maxChars = spec.interaction.inputLimits.maxChars;

  const guardChecks: string[] = [];
  if (maxChars)
    guardChecks.push(
      `        if (message.length() > ${maxChars}) throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "메시지가 너무 깁니다(최대 ${maxChars}자).");`,
    );
  if (abuse)
    guardChecks.push(
      `        if (BANNED.matcher(message).find()) throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "부적절한 입력이 감지되었습니다.");`,
    );
  if (rateLimit)
    guardChecks.push(
      `        long now = System.currentTimeMillis() / 1000;\n        synchronized (HITS) {\n            long[] w = HITS.get(ip);\n            if (w == null || now - w[1] > 60) HITS.put(ip, new long[]{1, now});\n            else if (w[0] >= RATE_PER_MIN) throw new ResponseStatusException(HttpStatus.TOO_MANY_REQUESTS, "요청이 너무 많습니다. 잠시 후 다시 시도하세요.");\n            else w[0]++;\n        }`,
    );
  const guardFields =
    (rateLimit
      ? `    private static final int RATE_PER_MIN = ${rateLimit};\n    private static final java.util.Map<String, long[]> HITS = new java.util.concurrent.ConcurrentHashMap<>();\n`
      : "") +
    (abuse
      ? `    private static final java.util.regex.Pattern BANNED = java.util.regex.Pattern.compile("(.)\\\\1{20,}");\n`
      : "");
  const guardMethod = `    private void guard(String message, String ip) {
${guardChecks.join("\n") || "        // (가드 없음)"}
    }
`;
  const guardCall = rateLimit
    ? "guard(message, req.getRemoteAddr());"
    : "guard(message, \"\");";

  const streamEndpoint = stream
    ? `

    @PostMapping("/api/chat/stream")
    public SseEmitter chatStream(@RequestBody Map<String, Object> body, HttpServletRequest req) {
        String message = (String) body.getOrDefault("message", "");
        if (message == null || message.isBlank())
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "message 가 필요합니다.");
        ${guardCall}
        String sessionId = (String) body.get("sessionId");
        SseEmitter emitter = new SseEmitter(0L);
        new Thread(() -> {
            try {
                chat.answerStream(message, sessionId, ev -> {
                    try { emitter.send(SseEmitter.event().data(toJson(ev))); } catch (Exception ignored) {}
                });
                emitter.send(SseEmitter.event().name("done").data("{}"));
                emitter.complete();
            } catch (Exception e) {
                emitter.completeWithError(e);
            }
        }).start();
        return emitter;
    }

    private String toJson(Object o) {
        try { return MAPPER.writeValueAsString(o); } catch (Exception e) { return "{}"; }
    }
    private static final com.fasterxml.jackson.databind.ObjectMapper MAPPER = new com.fasterxml.jackson.databind.ObjectMapper();`
    : "";
  const confirmEndpoint = confirm
    ? `

    @PostMapping("/api/chat/confirm")
    public Map<String, Object> chatConfirm(@RequestBody Map<String, Object> body) {
        // 도구 실행 승인 (toolPolicy=confirm) — HITL 핸드셰이크.
        if (!(body.get("confirmToken") instanceof String))
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "confirmToken 이 필요합니다.");
        boolean approved = Boolean.TRUE.equals(body.get("approved"));
        return Map.of("status", approved ? "executed" : "rejected", "note", "TODO: confirm 흐름 구현");
    }`
    : "";

  const sseImport = stream
    ? "import org.springframework.web.servlet.mvc.method.annotation.SseEmitter;\n"
    : "";

  return `package ${PKG};

import jakarta.servlet.http.HttpServletRequest;
import org.springframework.http.HttpStatus;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.server.ResponseStatusException;
${sseImport}import java.util.Map;

@RestController
public class ChatController {

    private final ChatService chat;

    public ChatController(ChatService chat) {
        this.chat = chat;
    }
${guardFields}
    @GetMapping("/health")
    public Map<String, String> health() {
        return Map.of("status", "ok");
    }

    @PostMapping("/api/chat")
    public Map<String, Object> chat(@RequestBody Map<String, Object> body, HttpServletRequest req) {
        String message = (String) body.getOrDefault("message", "");
        if (message == null || message.isBlank())
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "message 가 필요합니다.");
        ${guardCall}
        String sessionId = (String) body.get("sessionId");
        return chat.answer(message, sessionId);
    }${streamEndpoint}${confirmEndpoint}

${guardMethod}}
`;
}

function chatServiceJava(spec: AgentSpec): string {
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
  const grounded = spec.llm.guardrails.groundedOnly;

  const safetyAdds: string[] = [
    `        sys.add(${jstr(`답변이 불가능하면 ${REFUSAL_KO[spec.agent.safety.refusalStyle]}.`)});`,
  ];
  const banned = spec.llm.guardrails.bannedTopics;
  if (banned && banned.length)
    safetyAdds.push(`        sys.add(${jstr(`다음 주제는 정중히 거절하세요: ${banned.join(", ")}.`)});`);
  if (spec.llm.guardrails.piiFilter)
    safetyAdds.push(`        sys.add(${jstr("개인정보(주민등록번호·전화·이메일 등)는 답변에 노출하지 마세요.")});`);

  const maskMethod = masking
    ? `

    String maskPii(String t) {
        // 개인정보 마스킹 (piiFilter/masking) — 기관 정책에 맞게 패턴 보강.
        t = t.replaceAll("\\\\d{6}-\\\\d{7}", "******-*******");
        t = t.replaceAll("01[016789]-?\\\\d{3,4}-?\\\\d{4}", "***-****-****");
        t = t.replaceAll("[\\\\w.+-]+@[\\\\w-]+\\\\.[\\\\w.-]+", "***@***");
        return t;
    }`
    : "";
  const safe = (v: string) => (masking ? `maskPii(${v})` : v);

  const sessionFields = multiTurn
    ? `    private static final int HISTORY_MSGS = ${histMsgs};
    private final Map<String, List<Msg>> sessions = new ConcurrentHashMap<>();

    private List<Msg> loadHistory(String id) {
        if (id == null) return new ArrayList<>();
        return new ArrayList<>(sessions.getOrDefault(id, List.of()));
    }

    private void saveHistory(String id, List<Msg> messages, String answerText) {
        if (id == null) return;
        List<Msg> updated = new ArrayList<>(messages);
        updated.add(new Msg("assistant", answerText));
        if (updated.size() > HISTORY_MSGS) updated = updated.subList(updated.size() - HISTORY_MSGS, updated.size());
        sessions.put(id, new ArrayList<>(updated));
    }
`
    : `    private List<Msg> loadHistory(String id) { return new ArrayList<>(); }
    private void saveHistory(String id, List<Msg> messages, String answerText) {}
`;

  const ragField = rag ? "    private final RagPipeline rag = new RagPipeline();\n" : "";
  const toolField = toolAgent ? "    private final Tools tools = new Tools();\n" : "";
  const gatherRag = rag
    ? `        for (RagPipeline.Chunk c : rag.search(message)) {
            contexts.add(c.text);
            sources.add(c.page > 0 ? c.source + " p." + c.page : c.source);
        }
`
    : "";
  const gatherTool = toolAgent
    ? `        if (STUB) {
            int i = 0;
            for (Map.Entry<String, Tools.ToolFn> e : tools.registry().entrySet()) {
                if (i++ >= ${maxSteps}) break;
                Object res = e.getValue().apply(Map.of("query", message));
                contexts.add("[tool:" + e.getKey() + "] " + res);
                sources.add("tool:" + e.getKey());
                traces.add(Map.of("tool", e.getKey(), "result", res));
            }
        }
`
    : "";
  const completeCall = toolAgent
    ? `llm.completeWithTools(system, messages, tools.defs(), tools.registry(), ${maxSteps})`
    : "llm.complete(system, messages)";

  const wantTrace = toolAgent && it.rendering.toolCallDisplay !== "hidden";
  const streamMethod = stream
    ? `

    public void answerStream(String message, String sessionId, java.util.function.Consumer<Map<String, Object>> emit) {
        Gathered g = gather(message);
        String system = buildSystemPrompt(g.contexts);
        List<Msg> messages = loadHistory(sessionId);
        messages.add(new Msg("user", message));
${wantTrace ? "        for (Map<String, Object> t : g.traces) emit.accept(Map.of(\"trace\", t));\n" : ""}        StringBuilder full = new StringBuilder();
        if (STUB) {
            for (String tok : stubAnswer(message, g.contexts).split(" ")) {
                full.append(tok).append(" ");
                emit.accept(Map.of("delta", tok + " "));
            }
        } else {
${
        toolAgent
          ? `            String out = ${completeCall};\n            full.append(out);\n            emit.accept(Map.of("delta", out));\n`
          : `            llm.completeStream(system, messages, d -> { full.append(d); emit.accept(Map.of("delta", d)); });\n`
      }        }
        saveHistory(sessionId, messages, ${safe("full.toString()")});
        emit.accept(Map.of("sources", g.sources));
    }`
    : "";

  return `package ${PKG};

import org.springframework.stereotype.Service;
import java.util.ArrayList;
import java.util.List;
import java.util.Map;
import java.util.concurrent.ConcurrentHashMap;

/**
 * 채팅 오케스트레이션: (RAG 검색)${toolAgent ? " + 도구 호출 루프" : ""} → LLM${stream ? " (스트리밍)" : ""}.
 * 동작: ${it.agentMode} / 멀티턴: ${multiTurn} / 인용: "${it.rendering.citationStyle}".
 */
@Service
public class ChatService {

    public record Msg(String role, String content) {}

    static final boolean GROUNDED_ONLY = ${grounded};
    static final boolean STUB = "true".equals(System.getenv("LLM_STUB"));

    private final LlmClient llm = new LlmClient();
${ragField}${toolField}${sessionFields}
    private record Gathered(List<String> contexts, List<String> sources, List<Map<String, Object>> traces) {}

    private Gathered gather(String message) {
        List<String> contexts = new ArrayList<>();
        List<String> sources = new ArrayList<>();
        List<Map<String, Object>> traces = new ArrayList<>();
${gatherRag}${gatherTool}        return new Gathered(contexts, sources, traces);
    }

    String stubAnswer(String message, List<String> contexts) {
        String cite = contexts.isEmpty() ? "" : " (참고: " + String.join(", ", contexts) + ")";
        return "[STUB] \\"" + message + "\\" 문의에 대한 안내입니다." + cite;
    }

    String buildSystemPrompt(List<String> contexts) {
        // TODO: agent-spec.json 의 conversation.persona.systemPrompt 를 반영한다.
        List<String> sys = new ArrayList<>();
        sys.add(${jstr(`당신은 ${spec.project.org || "공공기관"}의 안내 챗봇입니다.`)});
        sys.add(${jstr(`톤: ${spec.conversation.persona.tone}. 한국어로 정중히 답합니다.`)});
        if (GROUNDED_ONLY) sys.add("제공된 근거에 없는 내용은 추측하지 마세요.");
${safetyAdds.join("\n")}
        if (!contexts.isEmpty()) sys.add("참고 자료:\\n" + String.join("\\n---\\n", contexts));
        return String.join("\\n", sys);
    }

    public Map<String, Object> answer(String message, String sessionId) {
        Gathered g = gather(message);
        String system = buildSystemPrompt(g.contexts);
        List<Msg> messages = loadHistory(sessionId);
        messages.add(new Msg("user", message));
        String raw = STUB ? stubAnswer(message, g.contexts) : ${completeCall};
        String answerText = ${safe("raw")};
        saveHistory(sessionId, messages, answerText);
        return Map.of("answer", answerText, "sources", g.sources);
    }${streamMethod}${maskMethod}
}
`;
}

function llmClientJava(spec: AgentSpec): string {
  const stream = spec.interaction.streaming.enabled;
  const toolAgent = spec.interaction.agentMode === "tool-agent";
  const { maxTokens, temperature } = spec.llm.params;
  const claude = spec.llm.provider === "claude" && spec.llm.serving === "official-api";

  // 스트리밍/도구 루프는 provider(claude/openai)별 요청·파싱이 달라 분기 생성한다.
  const claudeHeaders = `.header("content-type", "application/json")
                .header("x-api-key", System.getenv().getOrDefault("ANTHROPIC_API_KEY", ""))
                .header("anthropic-version", "2023-06-01")`;

  const claudeStream = stream
    ? `

    public void completeStream(String system, List<ChatService.Msg> messages, java.util.function.Consumer<String> emit) {
        try {
            List<Map<String, String>> msgs = new ArrayList<>();
            for (ChatService.Msg m : messages) msgs.add(Map.of("role", m.role(), "content", m.content()));
            String body = mapper.writeValueAsString(Map.of(
                "model", MODEL, "max_tokens", ${maxTokens}, "temperature", ${temperature},
                "system", system, "messages", msgs, "stream", true));
            HttpRequest req = HttpRequest.newBuilder(URI.create(API_URL))
                ${claudeHeaders}
                .POST(HttpRequest.BodyPublishers.ofString(body)).build();
            HttpResponse<java.util.stream.Stream<String>> res = http.send(req, HttpResponse.BodyHandlers.ofLines());
            res.body().forEach(line -> {
                String t = line.trim();
                if (!t.startsWith("data:")) return;
                try {
                    JsonNode ev = mapper.readTree(t.substring(5).trim());
                    if ("content_block_delta".equals(ev.path("type").asText())
                            && "text_delta".equals(ev.path("delta").path("type").asText())) {
                        emit.accept(ev.path("delta").path("text").asText());
                    }
                } catch (Exception ignored) {}
            });
        } catch (Exception ignored) {}
    }`
    : "";
  const claudeTool = toolAgent
    ? `

    public String completeWithTools(String system, List<ChatService.Msg> messages, List<Map<String, Object>> defs,
                                     Map<String, Tools.ToolFn> exec, int maxSteps) {
        try {
            List<Map<String, Object>> tools = new ArrayList<>();
            for (Map<String, Object> d : defs)
                tools.add(Map.of("name", d.get("name"), "description", d.get("description"),
                    "input_schema", mapper.readTree((String) d.get("input_schema"))));
            List<Object> msgs = new ArrayList<>();
            for (ChatService.Msg m : messages) msgs.add(Map.of("role", m.role(), "content", m.content()));
            for (int step = 0; step < maxSteps; step++) {
                String body = mapper.writeValueAsString(Map.of(
                    "model", MODEL, "max_tokens", ${maxTokens}, "temperature", ${temperature},
                    "system", system, "tools", tools, "messages", msgs));
                HttpRequest req = HttpRequest.newBuilder(URI.create(API_URL))
                    ${claudeHeaders}
                    .POST(HttpRequest.BodyPublishers.ofString(body)).build();
                JsonNode root = mapper.readTree(http.send(req, HttpResponse.BodyHandlers.ofString()).body());
                if ("tool_use".equals(root.path("stop_reason").asText())) {
                    JsonNode content = root.path("content");
                    msgs.add(Map.of("role", "assistant", "content", content));
                    List<Object> results = new ArrayList<>();
                    for (JsonNode b : content) {
                        if ("tool_use".equals(b.path("type").asText())) {
                            Tools.ToolFn fn = exec.get(b.path("name").asText());
                            Map<String, Object> input = mapper.convertValue(b.path("input"), Map.class);
                            Object out = fn != null ? fn.apply(input) : Map.of("error", "unknown tool");
                            results.add(Map.of("type", "tool_result", "tool_use_id", b.path("id").asText(),
                                "content", mapper.writeValueAsString(out)));
                        }
                    }
                    msgs.add(Map.of("role", "user", "content", results));
                    continue;
                }
                for (JsonNode b : root.path("content"))
                    if ("text".equals(b.path("type").asText())) return b.path("text").asText();
                return "";
            }
        } catch (Exception ignored) {}
        return "(최대 도구 호출 횟수를 초과했습니다.)";
    }`
    : "";

  const openaiStream = stream
    ? `

    public void completeStream(String system, List<ChatService.Msg> messages, java.util.function.Consumer<String> emit) {
        try {
            List<Map<String, String>> msgs = new ArrayList<>();
            msgs.add(Map.of("role", "system", "content", system));
            for (ChatService.Msg m : messages) msgs.add(Map.of("role", m.role(), "content", m.content()));
            String body = mapper.writeValueAsString(Map.of("model", MODEL, "messages", msgs, "stream", true));
            HttpRequest req = HttpRequest.newBuilder(URI.create(BASE_URL + "/chat/completions"))
                .header("content-type", "application/json")
                .POST(HttpRequest.BodyPublishers.ofString(body)).build();
            HttpResponse<java.util.stream.Stream<String>> res = http.send(req, HttpResponse.BodyHandlers.ofLines());
            res.body().forEach(line -> {
                String t = line.trim();
                if (!t.startsWith("data:")) return;
                String payload = t.substring(5).trim();
                if ("[DONE]".equals(payload)) return;
                try {
                    JsonNode c = mapper.readTree(payload).path("choices").path(0).path("delta").path("content");
                    if (!c.isMissingNode() && !c.asText().isEmpty()) emit.accept(c.asText());
                } catch (Exception ignored) {}
            });
        } catch (Exception ignored) {}
    }`
    : "";
  const openaiTool = toolAgent
    ? `

    public String completeWithTools(String system, List<ChatService.Msg> messages, List<Map<String, Object>> defs,
                                     Map<String, Tools.ToolFn> exec, int maxSteps) {
        try {
            List<Map<String, Object>> tools = new ArrayList<>();
            for (Map<String, Object> d : defs)
                tools.add(Map.of("type", "function", "function", Map.of(
                    "name", d.get("name"), "description", d.get("description"),
                    "parameters", mapper.readTree((String) d.get("input_schema")))));
            List<Object> msgs = new ArrayList<>();
            msgs.add(Map.of("role", "system", "content", system));
            for (ChatService.Msg m : messages) msgs.add(Map.of("role", m.role(), "content", m.content()));
            for (int step = 0; step < maxSteps; step++) {
                String body = mapper.writeValueAsString(Map.of("model", MODEL, "messages", msgs, "tools", tools));
                HttpRequest req = HttpRequest.newBuilder(URI.create(BASE_URL + "/chat/completions"))
                    .header("content-type", "application/json")
                    .POST(HttpRequest.BodyPublishers.ofString(body)).build();
                JsonNode root = mapper.readTree(http.send(req, HttpResponse.BodyHandlers.ofString()).body());
                JsonNode msg = root.path("choices").path(0).path("message");
                JsonNode calls = msg.path("tool_calls");
                if (calls.isArray() && calls.size() > 0) {
                    msgs.add(mapper.convertValue(msg, Map.class));
                    for (JsonNode call : calls) {
                        Tools.ToolFn fn = exec.get(call.path("function").path("name").asText());
                        Map<String, Object> args;
                        try { args = mapper.readValue(call.path("function").path("arguments").asText("{}"), Map.class); }
                        catch (Exception e) { args = Map.of(); }
                        Object out = fn != null ? fn.apply(args) : Map.of("error", "unknown tool");
                        msgs.add(Map.of("role", "tool", "tool_call_id", call.path("id").asText(),
                            "content", mapper.writeValueAsString(out)));
                    }
                    continue;
                }
                return msg.path("content").asText("");
            }
        } catch (Exception ignored) {}
        return "(최대 도구 호출 횟수를 초과했습니다.)";
    }`
    : "";

  const streamMethod = claude ? claudeStream : openaiStream;
  const toolMethod = claude ? claudeTool : openaiTool;

  if (claude) {
    return `package ${PKG};

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import java.net.URI;
import java.net.http.HttpClient;
import java.net.http.HttpRequest;
import java.net.http.HttpResponse;
import java.util.ArrayList;
import java.util.List;
import java.util.Map;

/** LLM 클라이언트 — Claude Messages API (JDK java.net.http, 추가 의존성 0). 키: ANTHROPIC_API_KEY */
public class LlmClient {

    private static final String API_URL = "https://api.anthropic.com/v1/messages";
    private static final String MODEL = System.getenv().getOrDefault("LLM_MODEL", ${jstr(spec.llm.model)});
    private final HttpClient http = HttpClient.newHttpClient();
    private final ObjectMapper mapper = new ObjectMapper();

    public String complete(String system, List<ChatService.Msg> messages) {
        try {
            List<Map<String, String>> msgs = new ArrayList<>();
            for (ChatService.Msg m : messages) msgs.add(Map.of("role", m.role(), "content", m.content()));
            String body = mapper.writeValueAsString(Map.of(
                "model", MODEL, "max_tokens", ${maxTokens}, "temperature", ${temperature},
                "system", system, "messages", msgs));
            HttpRequest req = HttpRequest.newBuilder(URI.create(API_URL))
                .header("content-type", "application/json")
                .header("x-api-key", System.getenv().getOrDefault("ANTHROPIC_API_KEY", ""))
                .header("anthropic-version", "2023-06-01")
                .POST(HttpRequest.BodyPublishers.ofString(body)).build();
            HttpResponse<String> res = http.send(req, HttpResponse.BodyHandlers.ofString());
            Map<?, ?> parsed = mapper.readValue(res.body(), Map.class);
            List<?> content = (List<?>) parsed.get("content");
            if (content != null) for (Object b : content) {
                Map<?, ?> block = (Map<?, ?>) b;
                if ("text".equals(block.get("type"))) return (String) block.get("text");
            }
        } catch (Exception ignored) {}
        return "";
    }${streamMethod}${toolMethod}
}
`;
  }
  return `package ${PKG};

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import java.net.URI;
import java.net.http.HttpClient;
import java.net.http.HttpRequest;
import java.net.http.HttpResponse;
import java.util.ArrayList;
import java.util.List;
import java.util.Map;

/** LLM 클라이언트 — OpenAI 호환 엔드포인트(프록시/사내 추론). LLM_BASE_URL */
public class LlmClient {

    private static final String BASE_URL = System.getenv().getOrDefault("LLM_BASE_URL", "http://localhost:8000/v1");
    private static final String MODEL = System.getenv().getOrDefault("LLM_MODEL", ${jstr(spec.llm.model)});
    private final HttpClient http = HttpClient.newHttpClient();
    private final ObjectMapper mapper = new ObjectMapper();

    public String complete(String system, List<ChatService.Msg> messages) {
        try {
            List<Map<String, String>> msgs = new ArrayList<>();
            msgs.add(Map.of("role", "system", "content", system));
            for (ChatService.Msg m : messages) msgs.add(Map.of("role", m.role(), "content", m.content()));
            String body = mapper.writeValueAsString(Map.of(
                "model", MODEL, "max_tokens", ${maxTokens}, "temperature", ${temperature}, "messages", msgs));
            HttpRequest req = HttpRequest.newBuilder(URI.create(BASE_URL + "/chat/completions"))
                .header("content-type", "application/json")
                .POST(HttpRequest.BodyPublishers.ofString(body)).build();
            HttpResponse<String> res = http.send(req, HttpResponse.BodyHandlers.ofString());
            Map<?, ?> parsed = mapper.readValue(res.body(), Map.class);
            List<?> choices = (List<?>) parsed.get("choices");
            if (choices != null && !choices.isEmpty()) {
                Map<?, ?> msg = (Map<?, ?>) ((Map<?, ?>) choices.get(0)).get("message");
                Object c = msg.get("content");
                return c == null ? "" : c.toString();
            }
        } catch (Exception ignored) {}
        return "";
    }${streamMethod}${toolMethod}
}
`;
}

function ragPipelineJava(spec: AgentSpec): string {
  const corpusRows = spec.evaluation.testset
    .filter((t) => t.expectedSource)
    .map(
      (t, i) =>
        `        CORPUS.add(new Chunk("d${i + 1}", ${jstr(
          `${t.question} ${t.expectedAnswer ?? ""}`.trim(),
        )}, ${jstr(t.expectedSource ?? "")}, 1));`,
    )
    .join("\n");
  const corpus =
    corpusRows ||
    `        CORPUS.add(new Chunk("sample", "실제 문서를 적재하면 이 샘플은 대체됩니다.", "sample.txt", 0));`;
  const topK = spec.rag.retrieval.topK ?? 3;
  return `package ${PKG};

import java.util.ArrayList;
import java.util.List;

/** RAG 파이프라인 골격 — Vector DB: ${spec.rag.vectorDb} / 임베딩: ${spec.rag.embedding} / 검색: ${spec.rag.retrieval.strategy} */
public class RagPipeline {

    public static class Chunk {
        public final String id, text, source;
        public final int page;
        public Chunk(String id, String text, String source, int page) {
            this.id = id; this.text = text; this.source = source; this.page = page;
        }
    }

    // 개발/CI용 샘플 코퍼스(골든셋 파생). 실제 적재 구현 시 ${spec.rag.vectorDb} 검색으로 대체.
    private static final List<Chunk> CORPUS = new ArrayList<>();
    static {
${corpus}
    }

    /** 검색 (${spec.rag.retrieval.strategy}) — 키워드 겹침 폴백(빈 결과 금지). 운영: 실제 벡터 검색으로 대체. */
    public List<Chunk> search(String query) {
        String[] terms = query.toLowerCase().split("\\\\s+");
        List<Chunk> hits = new ArrayList<>();
        List<Chunk> all = new ArrayList<>();
        int best = 0;
        for (Chunk c : CORPUS) {
            int s = 0;
            String low = c.text.toLowerCase();
            for (String t : terms) if (!t.isBlank() && low.contains(t)) s++;
            all.add(c);
            if (s > 0) { hits.add(c); best = Math.max(best, s); }
        }
        List<Chunk> pool = hits.isEmpty() ? all : hits;
        return pool.subList(0, Math.min(${topK}, pool.size()));
    }
}
`;
}

function toolsJava(spec: AgentSpec): string {
  const tools = spec.integrations.tools.length
    ? spec.integrations.tools
    : [{ name: "search_example", description: "예시 도구 — integrations.tools 를 채우세요.", parameters: undefined }];
  const reg = tools
    .map(
      (t) =>
        `        r.put(${jstr(t.name)}, args -> Map.of("tool", ${jstr(t.name)}, "args", args, "result", "TODO: 실제 구현")); // ${t.description}`,
    )
    .join("\n");
  const defs = tools
    .map((t) => {
      const schema = JSON.stringify(t.parameters ?? { type: "object", properties: {}, required: [] });
      return `        d.add(Map.of("name", ${jstr(t.name)}, "description", ${jstr(
        t.description,
      )}, "input_schema", ${jstr(schema)}));`;
    })
    .join("\n");
  return `package ${PKG};

import java.util.ArrayList;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.function.Function;

/** 도구 레지스트리 — agentMode=tool-agent. (각 도구의 실제 로직을 채운다) */
public class Tools {

    public interface ToolFn extends Function<Map<String, Object>, Object> {}

    public Map<String, ToolFn> registry() {
        Map<String, ToolFn> r = new LinkedHashMap<>();
${reg}
        return r;
    }

    /** LLM tool-use 정의(provider 별 형식으로 변환해 사용). input_schema 는 JSON Schema 문자열. */
    public List<Map<String, Object>> defs() {
        List<Map<String, Object>> d = new ArrayList<>();
${defs}
        return d;
    }
}
`;
}

function goldenTestJava(spec: AgentSpec): string {
  const cases =
    spec.evaluation.testset.length > 0
      ? spec.evaluation.testset
      : [{ question: "(골든셋이 비어 있음 — agent-spec.json 의 evaluation.testset 을 채운다)" }];
  const rows = cases.map((c) => `        ${jstr(c.question)},`).join("\n");
  return `package ${PKG};

import org.junit.jupiter.api.Test;
import java.util.List;
import java.util.Map;

import static org.junit.jupiter.api.Assertions.*;

/** 평가 골든셋 테스트 골격. 실행: LLM_STUB=true mvn test (STUB 로 플러밍 검증) */
class GoldenTest {

    private static final List<String> GOLDEN = List.of(
${rows}
        ""
    );

    @Test
    void goldenPlumbing() {
        ChatService chat = new ChatService();
        for (String q : GOLDEN) {
            if (q.isBlank()) continue;
            Map<String, Object> res = chat.answer(q, null);
            assertNotNull(res.get("answer"));
            assertFalse(res.get("answer").toString().isEmpty());
        }
    }
}
`;
}

function applicationProperties(): string {
  return `server.port=3000
# 정적 파일(채팅 위젯)은 public/ 에서 서빙
spring.web.resources.static-locations=file:public/
`;
}

function dockerfileJava(): string {
  return `FROM maven:3.9-eclipse-temurin-21 AS build
WORKDIR /app
COPY pom.xml ./
COPY src ./src
RUN mvn -q -B package -DskipTests

FROM eclipse-temurin:21-jre
WORKDIR /app
COPY --from=build /app/target/*.jar app.jar
COPY public ./public
EXPOSE 3000
CMD ["java", "-jar", "app.jar"]
`;
}

const GITIGNORE_JAVA = `target/
.env
*.log
`;

/** Java(Spring Boot) 백엔드 스캐폴드 파일 묶음 */
export function javaBackendFiles(spec: AgentSpec, slug: string): GeneratedFile[] {
  const files: GeneratedFile[] = [
    { path: "pom.xml", contents: pomXml(spec, slug) },
    { path: "src/main/resources/application.properties", contents: applicationProperties() },
    { path: `${PKG_PATH}/Application.java`, contents: applicationJava() },
    { path: `${PKG_PATH}/ChatController.java`, contents: controllerJava(spec) },
    { path: `${PKG_PATH}/ChatService.java`, contents: chatServiceJava(spec) },
    { path: `${PKG_PATH}/LlmClient.java`, contents: llmClientJava(spec) },
    { path: "src/test/java/com/example/chatbot/GoldenTest.java", contents: goldenTestJava(spec) },
    { path: ".env.example", contents: envEntries(spec).join("\n") + "\n" },
    { path: ".gitignore", contents: GITIGNORE_JAVA },
  ];
  if (spec.rag.enabled) {
    files.push({ path: `${PKG_PATH}/RagPipeline.java`, contents: ragPipelineJava(spec) });
  }
  if (spec.interaction.agentMode === "tool-agent") {
    files.push({ path: `${PKG_PATH}/Tools.java`, contents: toolsJava(spec) });
  }
  if (spec.backend.deploy === "docker" || spec.backend.deploy === "kubernetes") {
    files.push({ path: "Dockerfile", contents: dockerfileJava() });
  }
  return files;
}

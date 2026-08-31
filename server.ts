import express from "express";
import path from "path";
import fs from "fs";
import dotenv from "dotenv";
import { GoogleGenAI, Type } from "@google/genai";
import { createServer as createViteServer } from "vite";
import { DatabaseSync } from "node:sqlite";

// Load .env first, then let .env.local (gitignored, holds the real
// GEMINI_API_KEY for local dev) override it — dotenv.config() alone only
// reads .env, so a key placed in .env.local per the project's own
// .env.example instructions was silently never picked up.
dotenv.config();
dotenv.config({ path: ".env.local", override: true });

const app = express();
const PORT = 3000;

// strict:false so PUT /api/state/:key accepts primitive JSON bodies too
// (e.g. the active session id is stored as a bare string, not an object).
app.use(express.json({ limit: "10mb", strict: false }));

// ---------------------------------------------------------------------------
// State persistence (SQLite via Node's built-in node:sqlite — no native
// build step required). Mirrors the browser localStorage keys used by
// src/lib/storage.ts so the client can hydrate on boot and write-through on
// every change, giving the app real cross-device/cross-browser persistence.
// ---------------------------------------------------------------------------
const dataDir = path.join(process.cwd(), "data");
if (!fs.existsSync(dataDir)) fs.mkdirSync(dataDir, { recursive: true });
const db = new DatabaseSync(path.join(dataDir, "hanyang.db"));
db.exec(`
  CREATE TABLE IF NOT EXISTS kv_store (
    key TEXT PRIMARY KEY,
    value TEXT NOT NULL,
    updated_at TEXT NOT NULL
  )
`);

app.get("/api/state", (_req, res) => {
  const rows = db.prepare("SELECT key, value FROM kv_store").all() as {
    key: string;
    value: string;
  }[];
  const state: Record<string, unknown> = {};
  for (const row of rows) {
    try {
      state[row.key] = JSON.parse(row.value);
    } catch {
      // skip a corrupted row rather than failing the whole hydration
    }
  }
  res.json(state);
});

app.put("/api/state/:key", (req, res) => {
  const { key } = req.params;
  db.prepare(
    `INSERT INTO kv_store (key, value, updated_at) VALUES (?, ?, ?)
     ON CONFLICT(key) DO UPDATE SET value = excluded.value, updated_at = excluded.updated_at`
  ).run(key, JSON.stringify(req.body), new Date().toISOString());
  res.json({ ok: true });
});

// ---------------------------------------------------------------------------
// NAS document index — real, metadata-only indexing of the company file
// share. Deliberately does NOT read file contents (payroll/personnel/health
// documents live on this share), matching the metadata-only precedent from
// earlier NAS-indexing work on this codebase. Only reachable when the
// process actually has the share mounted (i.e. running locally on an office
// PC), which the Cloud Run deployment never will — /api/nas/status reports
// that honestly instead of inventing results.
// ---------------------------------------------------------------------------
const NAS_ROOT = process.env.NAS_ROOT || "Y:\\총무\\한양고속\\유종열";
const NAS_SKIP_DIRS = new Set(["node_modules", ".git", "@Recycle", "@Recently-Snapshot"]);
// Order matters: the whole share sits under one "총무부_노무" container
// folder, so category comes from matching more specific subfolder names
// first, not that top-level one (see categorizeNasPath below).
const NAS_CATEGORY_MAP: Record<string, string> = {
  "법인카드": "법인카드",
  "피복": "피복/용품",
  "근무복": "피복/용품",
  "복리후생": "식권/복리후생",
  "식권": "식권/복리후생",
  "규정": "사규/규정",
  "단체협약": "사규/규정",
  "보건": "보건/안전",
  "안전": "보건/안전",
  "산재": "보건/안전",
  "시설": "계약/시설",
  "합숙소": "계약/시설",
  "하도급": "경비/결재",
  "경비": "경비/결재",
  "급여": "노무/임금",
  "퇴직금": "노무/임금",
  "임금": "노무/임금",
};

db.exec(`
  CREATE TABLE IF NOT EXISTS nas_files (
    relative_path TEXT PRIMARY KEY,
    file_name TEXT NOT NULL,
    extension TEXT NOT NULL,
    category TEXT NOT NULL,
    size_bytes INTEGER NOT NULL,
    modified_at TEXT NOT NULL
  )
`);
db.exec(`CREATE TABLE IF NOT EXISTS nas_index_meta (key TEXT PRIMARY KEY, value TEXT NOT NULL)`);

function categorizeNasPath(relativePath: string): string {
  // Every real document here lives under one shared "총무부_노무" root
  // folder, so matching only the first path segment always returns the
  // same category — scan the whole path instead so the actual subfolder
  // (규정, 복리후생, 법인카드, ...) determines the category.
  for (const [needle, category] of Object.entries(NAS_CATEGORY_MAP)) {
    if (relativePath.includes(needle)) return category;
  }
  return "전체";
}

interface NasFileMeta {
  relative_path: string;
  file_name: string;
  extension: string;
  category: string;
  size_bytes: number;
  modified_at: string;
}

function walkNasDirectory(dir: string, root: string, out: NasFileMeta[]): void {
  let entries: fs.Dirent[];
  try {
    entries = fs.readdirSync(dir, { withFileTypes: true });
  } catch {
    return; // permission-denied or transient share hiccup — skip, don't crash the whole walk
  }
  for (const entry of entries) {
    if (entry.name.startsWith(".") || NAS_SKIP_DIRS.has(entry.name)) continue;
    const fullPath = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      walkNasDirectory(fullPath, root, out);
    } else if (entry.isFile()) {
      try {
        const stat = fs.statSync(fullPath);
        const relativePath = path.relative(root, fullPath);
        out.push({
          relative_path: relativePath,
          file_name: entry.name,
          extension: path.extname(entry.name).toLowerCase() || "(없음)",
          category: categorizeNasPath(relativePath),
          size_bytes: stat.size,
          modified_at: stat.mtime.toISOString().slice(0, 16).replace("T", " "),
        });
      } catch {
        // file vanished/locked between readdir and stat — skip it
      }
    }
  }
}

app.get("/api/nas/status", (_req, res) => {
  const reachable = fs.existsSync(NAS_ROOT);
  const { count } = db.prepare("SELECT COUNT(*) as count FROM nas_files").get() as { count: number };
  const lastRow = db.prepare("SELECT value FROM nas_index_meta WHERE key = 'last_indexed_at'").get() as
    | { value: string }
    | undefined;
  res.json({ root: NAS_ROOT, reachable, indexedCount: count, lastIndexedAt: lastRow?.value || null });
});

app.post("/api/nas/refresh", (_req, res) => {
  if (!fs.existsSync(NAS_ROOT)) {
    return res.status(503).json({
      error: `NAS 루트(${NAS_ROOT})에 접근할 수 없습니다. 이 서버가 사내망에 연결된 PC에서 실행 중인지 확인하세요.`,
    });
  }
  const files: NasFileMeta[] = [];
  walkNasDirectory(NAS_ROOT, NAS_ROOT, files);

  const insert = db.prepare(
    `INSERT INTO nas_files (relative_path, file_name, extension, category, size_bytes, modified_at)
     VALUES (?, ?, ?, ?, ?, ?)
     ON CONFLICT(relative_path) DO UPDATE SET
       size_bytes = excluded.size_bytes, modified_at = excluded.modified_at`
  );
  db.exec("BEGIN");
  try {
    db.exec("DELETE FROM nas_files");
    for (const f of files) {
      insert.run(f.relative_path, f.file_name, f.extension, f.category, f.size_bytes, f.modified_at);
    }
    const now = new Date().toISOString();
    db.prepare(
      `INSERT INTO nas_index_meta (key, value) VALUES ('last_indexed_at', ?)
       ON CONFLICT(key) DO UPDATE SET value = excluded.value`
    ).run(now);
    db.exec("COMMIT");
    res.json({ indexedCount: files.length, lastIndexedAt: now });
  } catch (err: any) {
    db.exec("ROLLBACK");
    res.status(500).json({ error: err.message || "NAS 색인 중 오류가 발생했습니다." });
  }
});

app.get("/api/nas/search", (req, res) => {
  const { q, category, ext } = req.query as { q?: string; category?: string; ext?: string };
  let sql = "SELECT * FROM nas_files WHERE 1=1";
  const params: string[] = [];
  if (category && category !== "전체") {
    sql += " AND category = ?";
    params.push(category);
  }
  if (ext && ext !== "전체") {
    sql += " AND extension = ?";
    params.push(ext);
  }
  if (q) {
    sql += " AND (file_name LIKE ? OR relative_path LIKE ?)";
    params.push(`%${q}%`, `%${q}%`);
  }
  sql += " ORDER BY modified_at DESC LIMIT 500";
  const rows = db.prepare(sql).all(...params);
  res.json({ files: rows });
});

// Lazy get Google GenAI instance
let aiInstance: GoogleGenAI | null = null;
function getAI(): GoogleGenAI {
  if (!aiInstance) {
    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
      console.warn("GEMINI_API_KEY is not set. Mock responses or error handling will take place.");
    }
    aiInstance = new GoogleGenAI({
      apiKey: apiKey || "dummy-key",
      httpOptions: {
        headers: {
          "User-Agent": "aistudio-build",
        },
      },
    });
  }
  return aiInstance;
}

// Health Check
app.get("/api/health", (_req, res) => {
  res.json({
    status: "ok",
    hasApiKey: Boolean(process.env.GEMINI_API_KEY),
    timestamp: new Date().toISOString(),
  });
});

// Helper: Build System Prompt for the Personalized Agent
function constructAgentSystemPrompt(
  persona: any,
  userProfile: any,
  memories: any[] = [],
  knowledgeDocs: any[] = [],
  goals: any[] = []
): string {
  const agentName = persona?.name || "Lumen";
  const agentRole = persona?.role || "Personal AI Agent & Strategic Partner";
  const tone = persona?.toneOfVoice || "Warm, insightful, proactive, and deeply attentive";
  const honorific = userProfile?.honorificStyle || "존댓말 (다정하고 정중한 어조)";
  const userName = userProfile?.name || "사용자";

  let memoryContext = "";
  if (memories && memories.length > 0) {
    memoryContext = memories
      .map((m: any) => `- [${m.category || "기억"}] ${m.content}`)
      .join("\n");
  } else {
    memoryContext = "(아직 저장된 장기 기억이 없습니다. 대화를 통해 알아가는 중입니다.)";
  }

  let knowledgeContext = "";
  if (knowledgeDocs && knowledgeDocs.length > 0) {
    knowledgeContext = knowledgeDocs
      .map((k: any) => `### [문서: ${k.title}]\n${k.content}`)
      .join("\n\n");
  }

  let goalsContext = "";
  if (goals && goals.length > 0) {
    goalsContext = goals
      .map((g: any) => `- 목표: ${g.title} (진행률: ${g.progress || 0}%)`)
      .join("\n");
  }

  return `
당신은 **${userName}**님만을 위해 특별히 존재하는 전용 퍼스널 AI 에이전트 **「${agentName}」**입니다.
단순한 챗봇이 아니라, 사용자의 삶, 목표, 생각, 취향, 감정을 깊이 이해하고 함께 성장하는 최고의 AI 파트너이자 지적 동반자입니다.

---
### [에이전트 페르소나 정의]
- 에이전트 이름: ${agentName}
- 역할 및 정체성: ${agentRole}
- 기본 톤앤매너: ${tone}
- 말투 지침: ${honorific}을 철저히 유지하며, 기계적인 느낌 없이 자연스럽고 세련되며 생동감 넘치게 대화합니다.
- 공감도 레벨: ${persona?.empathyLevel ?? 85}/100
- 적극성(Proactivity) 레벨: ${persona?.proactivityLevel ?? 80}/100 (사용자가 질문하지 않아도 유용한 후속 질문이나 통찰 제안)
- 사고 깊이 레벨: ${persona?.depthLevel ?? 90}/100
- 사용자 지정 프롬프트/원칙: ${persona?.systemPrompt || "항상 사용자의 관점에서 생각하고, 실천 가능한 구체적인 솔루션을 제시한다."}

---
### [사용자 프로필 (About ${userName})]
- 이름/호칭: ${userName} (${userProfile?.nickname || ""})
- 직업/하는 일: ${userProfile?.role || "미설정"}
- 관심 분야: ${(userProfile?.interests || []).join(", ") || "다양한 분야"}
- 핵심 가치관: ${(userProfile?.values || []).join(", ") || "지속적인 성장, 효율, 웰빙"}
- 현재 집중하고 있는 목표/프로젝트: ${userProfile?.currentFocus || "일상 생산성 향상"}
- 사용자의 추가 메모/선호사항: ${userProfile?.customNotes || "없음"}

---
### [${userName}님에 대한 장기 기억 저장소 (Memory Vault)]
에이전트가 이전 대화나 설정을 통해 학습한 중요한 사실들입니다. 대화 중 자연스럽게 기억하고 있음을 보여주세요:
${memoryContext}

---
${knowledgeContext ? `### [사용자 전용 지식 문서 (Knowledge Base)]\n${knowledgeContext}\n---` : ""}
${goalsContext ? `### [사용자의 현재 목표 (Active Goals)]\n${goalsContext}\n---` : ""}

### [행동 및 답변 원칙]
1. 사용자가 이미 언급한 기억이나 선호도를 기억하고 대화에 자연스럽게 녹여내세요. (예: "지난번에 집중하고 계신다고 했던 프로젝트는 잘 진행되고 있나요?")
2. 답변은 읽기 쉽고 구조화된 마크다운(강조, 불릿, 필요시 표나 코드)을 적극 활용하세요.
3. 질문에 답하는 것에 그치지 않고, 필요시 ${userName}님에게 의미 있는 후속 생각거리나 다음 액션 플랜 1~2가지를 덧붙여주세요.
4. 만약 대화 중에 사용자의 새로운 습관, 취향, 중요한 일정, 선호도 등 앞으로 기억해둘 만한 새로운 사실을 발견했다면, 답변 끝에 아래 형식의 특수 태그를 달아둘 수 있습니다:
   \`[MEMORY_DISCOVERED: 카테고리(preference/fact/goal/habit) | 기억할 핵심 내용]\`
`.trim();
}

// Candidate models for automatic fallback in order of preference.
// Note: gemini-3.1-flash-lite and gemini-flash-latest have highest availability under global peak load.
const CANDIDATE_MODELS = [
  "gemini-3.1-flash-lite",
  "gemini-flash-latest",
  "gemini-3.7-flash",
];

/**
 * Resilient content generation with multi-model fallback and retry on 503/429 errors.
 */
async function generateContentWithRetry(params: {
  contents: any;
  config?: any;
  models?: string[];
}): Promise<any> {
  const modelsToTry = params.models || CANDIDATE_MODELS;
  const ai = getAI();
  let lastError: any = null;

  for (const model of modelsToTry) {
    try {
      const response = await ai.models.generateContent({
        model,
        contents: params.contents,
        config: params.config,
      });
      return response;
    } catch (err: any) {
      lastError = err;
      const is503or429 =
        err?.status === 503 ||
        err?.status === 429 ||
        err?.message?.includes("503") ||
        err?.message?.includes("high demand") ||
        err?.message?.includes("UNAVAILABLE");
      
      console.warn(`[Gemini Fallback] Model ${model} failed (${is503or429 ? "503/High Demand" : err?.message}). Switching to next model...`);
      // Short yield before trying fallback model
      await new Promise((r) => setTimeout(r, 200));
    }
  }
  throw lastError;
}

/**
 * Resilient streaming generation with multi-model fallback.
 */
async function generateContentStreamWithRetry(params: {
  contents: any;
  config?: any;
  models?: string[];
}): Promise<any> {
  const modelsToTry = params.models || CANDIDATE_MODELS;
  const ai = getAI();
  let lastError: any = null;

  for (const model of modelsToTry) {
    try {
      const responseStream = await ai.models.generateContentStream({
        model,
        contents: params.contents,
        config: params.config,
      });
      return responseStream;
    } catch (err: any) {
      lastError = err;
      const is503or429 =
        err?.status === 503 ||
        err?.status === 429 ||
        err?.message?.includes("503") ||
        err?.message?.includes("high demand") ||
        err?.message?.includes("UNAVAILABLE");

      console.warn(`[Gemini Stream Fallback] Model ${model} failed (${is503or429 ? "503/High Demand" : err?.message}). Switching to next model...`);
      await new Promise((r) => setTimeout(r, 200));
    }
  }
  throw lastError;
}

// 1. Streaming Chat Endpoint (SSE)
app.post("/api/agent/chat", async (req, res) => {
  try {
    const {
      messages,
      persona,
      userProfile,
      memories,
      knowledgeDocs,
      goals,
    } = req.body;

    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
      return res.status(400).json({
        error: "GEMINI_API_KEY is not configured in Settings > Secrets.",
      });
    }

    const systemInstruction = constructAgentSystemPrompt(
      persona,
      userProfile,
      memories,
      knowledgeDocs,
      goals
    );

    // Prepare contents history for generateContentStream
    // Keep last 15 messages for rich context
    const recentMessages = (messages || []).slice(-15);
    
    // Format into contents format
    const contents: any[] = [];
    for (const msg of recentMessages) {
      contents.push({
        role: msg.role === "user" ? "user" : "model",
        parts: [{ text: msg.content }],
      });
    }

    // Set headers for Server-Sent Events (SSE)
    res.setHeader("Content-Type", "text/event-stream");
    res.setHeader("Cache-Control", "no-cache");
    res.setHeader("Connection", "keep-alive");

    const responseStream = await generateContentStreamWithRetry({
      contents,
      config: {
        systemInstruction,
        temperature: (persona?.temperature ?? 70) / 100,
      },
    });

    for await (const chunk of responseStream) {
      const text = chunk.text;
      if (text) {
        res.write(`data: ${JSON.stringify({ text })}\n\n`);
      }
    }

    res.write(`data: ${JSON.stringify({ done: true })}\n\n`);
    res.end();
  } catch (error: any) {
    console.error("Error in /api/agent/chat:", error);
    if (!res.headersSent) {
      res.status(500).json({ error: error.message || "Failed to generate chat response." });
    } else {
      res.write(`data: ${JSON.stringify({ error: error.message || "Streaming error" })}\n\n`);
      res.end();
    }
  }
});

// 2. Daily Briefing Generation Endpoint
app.post("/api/agent/daily-briefing", async (req, res) => {
  try {
    const {
      type = "morning", // "morning" | "evening" | "focus"
      persona,
      userProfile,
      memories,
      goals,
      routines,
      currentDateTime,
    } = req.body;

    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
      return res.status(400).json({ error: "GEMINI_API_KEY is not configured." });
    }

    const systemInstruction = constructAgentSystemPrompt(persona, userProfile, memories, [], goals);
    
    const userName = userProfile?.name || "사용자";
    const prompt = `
현재 시간: ${currentDateTime || new Date().toLocaleString("ko-KR")}
브리핑 모드: ${type === "morning" ? "활기찬 아침 데일리 브리핑" : type === "evening" ? "하루를 정리하는 저녁 회고 브리핑" : "집중과 몰입을 위한 포커스 브리핑"}

${userName}님의 현재 상태와 등록된 목표, 루틴을 바탕으로 나만을 위한 맞춤형 ${type === "morning" ? "오늘의 브리핑" : "회고 리포트"}를 작성해주세요.

포함할 항목:
1. **${type === "morning" ? "오늘의 맞춤 모닝 인사 & 마인드셋 문구" : "오늘 하루 수고한 나를 위한 따뜻한 위로와 인정"}**
2. **오늘의 핵심 우선순위 Focus 3가지 (목표와 루틴 연계)**
3. **${persona?.name || "에이전트"}의 개인 맞춤 추천 팁 / 통찰** (기억된 취향과 습관 반영)
4. **활력을 돋우는 한 줄 명언 또는 긍정 확언 (Affirmation)**

따뜻하면서도 실행력이 샘솟도록 구조적이고 아름다운 마크다운으로 작성해주세요.
`.trim();

    const response = await generateContentWithRetry({
      contents: prompt,
      config: {
        systemInstruction,
        temperature: 0.7,
      },
    });

    res.json({ briefing: response.text });
  } catch (error: any) {
    console.error("Error in /api/agent/daily-briefing:", error);
    res.status(500).json({ error: error.message || "Failed to generate briefing." });
  }
});

// 3. Extract Permanent Memories from Recent Conversation
app.post("/api/agent/extract-memories", async (req, res) => {
  try {
    const { messages, userProfile, existingMemories } = req.body;

    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
      return res.status(400).json({ error: "GEMINI_API_KEY is not configured." });
    }

    const conversationText = (messages || [])
      .map((m: any) => `${m.role === "user" ? "사용자" : "에이전트"}: ${m.content}`)
      .join("\n");

    const existingMemoriesText = (existingMemories || [])
      .map((m: any) => m.content)
      .join(", ");

    const prompt = `
다음 대화 내용을 분석하여, **사용자(${userProfile?.name || "사용자"})에 대해 영구적으로 기억해둘 가치가 있는 새로운 핵심 사실, 취향, 습관, 장기 목표, 선호사항, 프로젝트 상황**을 추출하세요.

[이미 알고 있는 기억들]:
${existingMemoriesText || "없음"}

[최근 대화]:
${conversationText}

이미 알고 있는 내용과 중복되지 않고, 실제 사용자의 고유한 정보인 것만 간결한 1문장 형태로 추출하세요. 만약 새로 기억할 만한 정보가 없다면 빈 배열([])을 반환하세요.
`;

    const response = await generateContentWithRetry({
      contents: prompt,
      config: {
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.ARRAY,
          items: {
            type: Type.OBJECT,
            properties: {
              category: {
                type: Type.STRING,
                description: "One of: 'preference', 'fact', 'goal', 'project', 'habit', 'insight'",
              },
              content: {
                type: Type.STRING,
                description: "The memory nugget in Korean, 1 clear sentence.",
              },
              importance: {
                type: Type.STRING,
                description: "One of: 'high', 'medium', 'low'",
              },
            },
            required: ["category", "content", "importance"],
          },
        },
      },
    });

    let extracted: any[] = [];
    try {
      extracted = JSON.parse(response.text || "[]");
    } catch {
      extracted = [];
    }

    res.json({ memories: extracted });
  } catch (error: any) {
    console.error("Error in /api/agent/extract-memories:", error);
    res.status(500).json({ error: error.message || "Failed to extract memories." });
  }
});

// 4. Generate User Dossier & Agent Self-Reflection ("나에 대해 에이전트가 분석한 종합 보고서")
app.post("/api/agent/dossier", async (req, res) => {
  try {
    const { persona, userProfile, memories, knowledgeDocs, goals } = req.body;

    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
      return res.status(400).json({ error: "GEMINI_API_KEY is not configured." });
    }

    const systemInstruction = constructAgentSystemPrompt(persona, userProfile, memories, knowledgeDocs, goals);
    const userName = userProfile?.name || "사용자";

    const prompt = `
퍼스널 에이전트 ${persona?.name || "에이전트"}의 시각에서, 지금까지 파악한 ${userName}님에 대한 **심층 종합 분석 프로필(User Intelligence Dossier) & 맞춤 성장 전략 보고서**를 작성해주세요.

보고서 구성:
1. **🧩 ${userName}님의 핵심 정체성 & 강점 분석** (인지 패턴, 주된 관심사, 잠재력)
2. **⚡ 현재 에너지 분포 & 주요 우선순위 맵** (목표 진행 상태와 몰입 포인트)
3. **🌱 잠재적 병목 및 성장을 위한 에이전트의 제안** (루틴 개선, 마인드셋, 습관)
4. **🤝 ${persona?.name}가 제안하는 앞으로의 협업 방식 & 맞춤 지원 약속**

에이전트 특유의 따뜻하면서도 날카로운 통찰을 담아 세련된 마크다운 보고서로 작성해주세요.
`;

    const response = await generateContentWithRetry({
      contents: prompt,
      config: {
        systemInstruction,
        temperature: 0.7,
      },
    });

    res.json({ dossier: response.text });
  } catch (error: any) {
    console.error("Error in /api/agent/dossier:", error);
    res.status(500).json({ error: error.message || "Failed to generate dossier." });
  }
});

// 5. Enhance / Generate System Prompt for Custom Persona
app.post("/api/agent/generate-persona-prompt", async (req, res) => {
  try {
    const { agentName, role, desiredVibe, userName } = req.body;

    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
      return res.status(400).json({ error: "GEMINI_API_KEY is not configured." });
    }

    const prompt = `
당신은 AI 에이전트 시스템 프롬프트 엔지니어링 전문가입니다.
사용자가 원하는 AI 에이전트 정보:
- 에이전트 이름: ${agentName}
- 역할: ${role}
- 원하는 분위기 및 성향: ${desiredVibe}
- 사용자 이름: ${userName || "사용자"}

이 에이전트가 ${userName}님에게 최상의 몰입감과 실질적인 도움을 줄 수 있도록, 고도로 최적화된 한국어 시스템 지침(System Prompt)과 추천 인사말을 JSON으로 생성해주세요.
`;

    const response = await generateContentWithRetry({
      contents: prompt,
      config: {
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            systemPrompt: {
              type: Type.STRING,
              description: "Detailed system instructions for the agent persona.",
            },
            greetingMessage: {
              type: Type.STRING,
              description: "First warm greeting message to the user.",
            },
            tagline: {
              type: Type.STRING,
              description: "Short catchy tagline for the agent.",
            },
            suggestedTopics: {
              type: Type.ARRAY,
              items: { type: Type.STRING },
              description: "3-4 starter quick question prompts.",
            },
          },
          required: ["systemPrompt", "greetingMessage", "tagline", "suggestedTopics"],
        },
      },
    });

    const data = JSON.parse(response.text || "{}");
    res.json(data);
  } catch (error: any) {
    console.error("Error in /api/agent/generate-persona-prompt:", error);
    res.status(500).json({ error: error.message || "Failed to generate prompt." });
  }
});

// 7. Structured Spreadsheet Generator (.xlsx data)
app.post("/api/agent/generate-spreadsheet", async (req, res) => {
  try {
    const { prompt, persona, userProfile, memories, knowledgeDocs } = req.body;

    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
      return res.status(400).json({ error: "GEMINI_API_KEY is not configured." });
    }

    const systemInstruction = constructAgentSystemPrompt(persona, userProfile, memories, knowledgeDocs, []);

    const userPrompt = `
사용자가 요청한 엑셀(스프레드시트) 명세:
"${prompt}"

사용자의 맥락과 요청에 맞춰 실제 비즈니스/개인 업무에서 바로 쓸 수 있는 완성도 높은 엑셀 데이터를 JSON 형식으로 생성해주세요.
시트 1개 또는 관련된 다중 시트(예: 요약 시트 + 세부 내역 시트)를 포함할 수 있습니다.
각 행은 제목(Header)과 데이터 행들로 구성되어야 하며, 숫자/금액/날짜/텍스트가 실제 데이터처럼 정교하게 구성되어야 합니다.
`;

    const response = await generateContentWithRetry({
      contents: userPrompt,
      config: {
        systemInstruction,
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            title: {
              type: Type.STRING,
              description: "Spreadsheet title (e.g. '2026_1Q_사업_예산안')",
            },
            description: {
              type: Type.STRING,
              description: "Brief overview of what this sheet contains",
            },
            sheets: {
              type: Type.ARRAY,
              items: {
                type: Type.OBJECT,
                properties: {
                  sheetName: {
                    type: Type.STRING,
                    description: "Sheet name, max 30 chars (e.g. '종합 요약', '세부 예산')",
                  },
                  headers: {
                    type: Type.ARRAY,
                    items: { type: Type.STRING },
                    description: "Column header names",
                  },
                  rows: {
                    type: Type.ARRAY,
                    items: {
                      type: Type.ARRAY,
                      items: { type: Type.STRING },
                    },
                    description: "Data rows (array of strings/numbers)",
                  },
                },
                required: ["sheetName", "headers", "rows"],
              },
            },
          },
          required: ["title", "sheets"],
        },
      },
    });

    const parsed = JSON.parse(response.text || "{}");
    res.json(parsed);
  } catch (error: any) {
    console.error("Error in /api/agent/generate-spreadsheet:", error);
    res.status(500).json({ error: error.message || "Failed to generate spreadsheet." });
  }
});

// 8. Structured Document Generator (.docx data)
app.post("/api/agent/generate-document", async (req, res) => {
  try {
    const { topic, docType = "report", persona, userProfile, memories, knowledgeDocs } = req.body;

    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
      return res.status(400).json({ error: "GEMINI_API_KEY is not configured." });
    }

    const systemInstruction = constructAgentSystemPrompt(persona, userProfile, memories, knowledgeDocs, []);

    const userPrompt = `
요청 주제: "${topic}"
문서 유형: ${docType} (예: 사업 기획서, 주간/월간 업무 보고서, 전략 제안서, 가이드라인 등)

전문가 수준의 완성도 높은 워드(.docx) 문서용 마크다운 텍스트를 작성해주세요.
- 명확한 대제목(# 제목)
- 부제목 및 개요
- 핵심 섹션(## 섹션명)
- 세부 소제목(### 소제목)
- 체계적인 불릿 목록 및 넘버링
- 핵심 수치나 비교가 필요한 경우 깔끔한 마크다운 표(| 항목 | 내용 |) 포함
- 결론 및 향후 추진 과제

사용자(${userProfile?.name || "사용자"})님의 가치관과 프로필 맥락을 자연스럽게 반영하여 격조 높은 어조로 작성해주세요.
`;

    const response = await generateContentWithRetry({
      contents: userPrompt,
      config: {
        systemInstruction,
        temperature: 0.7,
      },
    });

    res.json({ documentContent: response.text });
  } catch (error: any) {
    console.error("Error in /api/agent/generate-document:", error);
    res.status(500).json({ error: error.message || "Failed to generate document." });
  }
});

// 9. Gemini OCR Receipt & Document Endpoint
app.post("/api/ocr-receipt", async (req, res) => {
  try {
    const { base64Data, mimeType, targetModule } = req.body;
    if (!base64Data || !mimeType) {
      return res.status(400).json({ error: "Image/PDF base64 data and mimeType are required." });
    }

    const prompt = `
당신은 대한민국 운수회사(한양고속)의 전문 총무·회계 경비 정산 AI 에이전트입니다.
업로드된 영수증, 세금계산서, 간이영수증, 식권 수취표, 카드 전표 이미지 또는 PDF를 정밀 분석하여 정형화된 JSON 표 데이터로 추출하세요.

추출 목표:
1. 거래처명/식당명/가맹점명 (vendor)
2. 결제일자/수취일자 (date: YYYY-MM-DD 형식)
3. 품목/내용/계정과목 (category / item)
4. 총 금액 (totalAmount: 숫자)
5. 결제수단 (paymentMethod: 법인카드, 현금, 계좌이체 등)
6. 세부 행 목록 (rows: 품목, 수량, 단가, 합계금액, 비고)

반드시 아래 JSON 형식으로만 응답하세요:
{
  "title": "추출된 대표 업무/영수증 요약명 (예: 강남소 식권 수취 정산 또는 오피스디포 사무용품 구매)",
  "vendor": "가맹점/거래처명",
  "date": "YYYY-MM-DD",
  "totalAmount": 123450,
  "category": "계정과목 또는 분류 (예: 식권정산, 소모품비, 유류비, 숙소관리비 등)",
  "paymentMethod": "법인카드 or 계좌이체 or 현금",
  "manager": "담당자명 (알 수 없으면 빈 문자열)",
  "note": "특이사항 또는 영수증 세부메모",
  "rows": [
    {"item": "품목명", "quantity": 1, "unitPrice": 50000, "amount": 50000, "note": "비고"}
  ]
}
`.trim();

    const contents = [
      { text: prompt },
      { inlineData: { mimeType, data: base64Data } }
    ];

    const response = await generateContentWithRetry({
      contents,
      config: { responseMimeType: "application/json" }
    });

    const parsed = JSON.parse(response.text || "{}");
    return res.json(parsed);
  } catch (error: any) {
    console.error("Error in /api/ocr-receipt:", error);
    return res.status(500).json({ error: error.message || "Failed to OCR receipt." });
  }
});

// Vite middleware for development & static file serving in production
async function startServer() {
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), "dist");
    app.use(express.static(distPath));
    app.get("*", (_req, res) => {
      res.sendFile(path.join(distPath, "index.html"));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Personal AI Agent Server running on http://0.0.0.0:${PORT}`);
  });
}

startServer();

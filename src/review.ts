import { optional, required } from "./lib/env.js";
import { readText, writeJsonAtomic } from "./lib/io.js";
import { postJson } from "./lib/http.js";
import type { ReviewReport } from "./types/report.js";

const API_URL = optional("API_URL", "https://api.deepseek.com/v1/chat/completions");
const MODEL   = optional("MODEL_NAME", "deepseek-chat");
const OUT     = optional("OUT_JSON", "ai-report.json");
const TIMEOUT = 2 * 60 * 1000; // 2 minutes
const KEY     = optional("DEEPSEEK_API_KEY");
const COMMIT  = optional("TARGET_COMMIT");
const REPORT_SCHEME = '{"commit":string,"issues":[{"severity":"low|medium|high|critical","file":"path.php","line":123,"issue":"title","recommendation":"text","code_suggestion":string|null"}]}';

const diffRaw = readText("diff.patch");
if (!diffRaw) {
  console.error("Missing diff.patch");
  process.exit(2);
}
const diff = diffRaw.trim();

if (!diff) {
  const empty: ReviewReport = { commit: COMMIT, issues: [] };
  writeJsonAtomic(OUT, empty);
  process.exit(0);
}

if (!KEY) {
  console.error("Missing DEEPSEEK_API_KEY");
  process.exit(3);
}

const system =
  `You are a Moodle code reviewer with expert knowledge of PHP, JavaScript, and Moodle’s architecture.
  Follow Moodle’s coding, security, and accessibility guidelines.
  Focus on correctness, maintainability, and security.
  Identify code performance, missing capability checks, input validation flaws, and SQL or permission risks.
  Return JSON only using: ${REPORT_SCHEME}`;

const user = `Commit: ${COMMIT} Diff: ${diff}`;

const requestBody = {
  model: MODEL,
  messages: [
    { role: "system", content: system },
    { role: "user",   content: user }
  ],
  response_format: { type: "json_object" },
  temperature: 0.0
};

(async () => {
  const res = await postJson(API_URL, requestBody, { Authorization: `Bearer ${KEY}` }, TIMEOUT);
  if (res.status < 200 || res.status >= 300) {
    console.error("HTTP error from API:", res.status);
    process.exit(7);
  }

  let report: ReviewReport;
  try {
    const parsed = JSON.parse(res.text);
    const content = parsed?.choices?.[0]?.message?.content ?? "";
    report = JSON.parse(content);
  } catch {
    console.error("Invalid JSON from API");
    process.exit(5);
  }

  if (!report) {
    console.error("Unexpected response format");
    process.exit(6);
  }

  if (!Array.isArray(report.issues)) {
    report.issues = [];
  }
  report.commit = COMMIT;

  writeJsonAtomic(OUT, report);
})().catch(e => {
  console.error("Unhandled error:", e);
  process.exit(9);
});

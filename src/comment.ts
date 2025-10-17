import { required } from "./lib/env.js";
import { readText } from "./lib/io.js";
import { makeAppJWT, repoSlugFromUrl } from "./lib/github.js";
import type { Issue } from "./types/report.js";
import type { HttpMethod, GitHubResponse, CommitCommentPayload } from "./types/github.js";

const GIT_REPO = required("GIT_REPO");
const SHA      = required("TARGET_COMMIT");
const APP_ID   = required("GITHUB_APP_ID");
const INST_ID  = required("GITHUB_INSTALLATION_ID");
const PEM_PATH = required("GITHUB_APP_PEM_FILE");
const REPORT   = "ai-report.json";

function normPath(p: string): string { return p.replace(/^\.\//, ""); }

function formatBody(issue: Issue): string {
  const parts: string[] = [];

  if (issue.severity)
    parts.push(`**Severity:** ${String(issue.severity).toUpperCase()}\n\n`);
  if (issue.issue)
    parts.push(`**Issue:** ${issue.issue}\n\n`);
  if (issue.recommendation)
    parts.push(`**Recommendation:** ${issue.recommendation}\n\n`);
  if (issue.code_suggestion)
    parts.push(`**Code Suggestion:**\n\`\`\`\n${issue.code_suggestion}\`\`\``);

  return parts.join("");
}

async function githubFetch(path: string, method: HttpMethod, body: unknown, token: string): Promise<GitHubResponse> {
  const url = `https://api.github.com${path}`;
  const res = await fetch(url, {
    method,
    headers: {
      Authorization: `Bearer ${token}`,
      Accept: "application/vnd.github+json",
      "User-Agent": "jenkins-ai-peer-review",
      "Content-Type": "application/json"
    },
    body: body ? JSON.stringify(body) : undefined
  });

  return { status: res.status, text: await res.text() };
}

(async () => {
  const instTokenRes = await githubFetch(
    `/app/installations/${encodeURIComponent(INST_ID)}/access_tokens`, "POST", {}, makeAppJWT(APP_ID, PEM_PATH)
  );
  if (instTokenRes.status !== 201) {
    console.error("Failed to get installation token:", instTokenRes.status, instTokenRes.text);
    process.exit(3);
  }

  const instToken = JSON.parse(instTokenRes.text).token as string;
  const slug = repoSlugFromUrl(GIT_REPO);
  const basePath = `/repos/${slug}/commits/${encodeURIComponent(SHA)}/comments`;

  const reportTxt = readText(REPORT);
  if (!reportTxt) {
    console.error("Missing ai-review report");
    process.exit(2);
  }

  const issues: Issue[] = (JSON.parse(reportTxt).issues || []) as Issue[];
  if (!issues.length) {
    console.log("No issues to comment.");
    process.exit(0);
  }

  for (const issue of issues) {
    const body = formatBody(issue);
    const path = issue.file ? normPath(issue.file) : "";
    const lineNum = Number.isFinite(issue.line as number) ? Number(issue.line) : 0;

    const payload: CommitCommentPayload =
      path && lineNum > 0
        ? { body, path, position: lineNum }
        : { body };

    const res = await githubFetch(basePath, "POST", payload, instToken);
    if (res.status !== 201) {
      console.error(`GitHub comment failed (${path || "commit-level"}): ${res.status} ${res.text}`);
    }
  }

  process.exit(0);
})().catch(e => {
  console.error("Unhandled error:", e);
  process.exit(9);
});

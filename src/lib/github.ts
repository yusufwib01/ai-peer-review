import fs from "node:fs";
import crypto from "node:crypto";

export function repoSlugFromUrl(url: string): string {
  let m = url.match(/^https?:\/\/[^/]+\/([^/]+)\/([^.\/\s]+)(?:\.git)?$/i);
  if (m) return `${m[1]}/${m[2]}`;
  m = url.match(/^git@[^:]+:([^/]+)\/([^.\/\s]+)(?:\.git)?$/i);
  if (m) return `${m[1]}/${m[2]}`;
  throw new Error(`Cannot parse repo slug: ${url}`);
}

export function makeAppJWT(appId: string, pemPath: string): string {
  const pem = fs.readFileSync(pemPath, "utf8");
  const now = Math.floor(Date.now() / 1000);
  const header = Buffer.from(JSON.stringify({ alg: "RS256", typ: "JWT" })).toString("base64url");
  const payload = Buffer.from(JSON.stringify({ iat: now - 60, exp: now + 8 * 60, iss: appId })).toString("base64url");
  const unsigned = `${header}.${payload}`;
  const sign = crypto.createSign("RSA-SHA256");
  sign.update(unsigned);
  const signature = sign.sign(pem, "base64url");
  return `${unsigned}.${signature}`;
}

/**
 * [파일 목적]
 * 이 파일은 chatgpt-codex-proxy에서 사용하는 OAuth 인증과 토큰 저장 관리를 담당한다.
 * 로그인 시작, 콜백 처리, 토큰 교환/갱신, 로컬 저장소 읽기/삭제를 한곳에서 처리한다.
 *
 * [주요 흐름]
 * 1. PKCE와 state 값을 생성해 OAuth 인증 URL을 만든다.
 * 2. 로컬 콜백 서버를 열고 브라우저 로그인 결과를 받는다.
 * 3. authorization code를 access/refresh token으로 교환한다.
 * 4. access token에서 account id를 추출해 로컬 파일에 저장한다.
 * 5. 이후 호출에서는 만료 시 refresh token으로 자동 갱신한다.
 *
 * [외부 연결]
 * - OpenAI OAuth endpoint: authorize/token
 * - node:http: 로컬 콜백 서버
 * - 파일 시스템: ~/.chatgpt-codex-proxy/tokens.json
 *
 * [수정시 주의]
 * - redirect URI, client_id, scope를 바꾸면 실제 OAuth 로그인 자체가 깨질 수 있다.
 * - 토큰 파일 구조를 바꾸면 load/save/refresh 전체 흐름을 같이 맞춰야 한다.
 * - account id 추출 규칙이 바뀌면 codex API 호출 헤더도 같이 점검해야 한다.
 */

import { createServer, type IncomingMessage, type ServerResponse } from "node:http";
import { spawn } from "node:child_process";
import { existsSync, mkdirSync, readFileSync, unlinkSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { homedir } from "node:os";
import { createHash, randomBytes } from "node:crypto";

// OAuth Constants (from OpenAI Codex CLI)
export const CLIENT_ID = "app_EMoamEEZ73f0CkXaXp7hrann";
export const AUTHORIZE_URL = "https://auth.openai.com/oauth/authorize";
export const TOKEN_URL = "https://auth.openai.com/oauth/token";
export const REDIRECT_URI = "http://localhost:1455/auth/callback";
export const SCOPE = "openid profile email offline_access";

export interface TokenData {
  access_token: string;
  refresh_token: string;
  expires_at: number;
  chatgpt_account_id?: string;
}

const TOKEN_FILE = join(homedir(), ".chatgpt-codex-proxy", "tokens.json");

/**
 * Generate random state for CSRF protection
 */
export function createState(): string {
  return randomBytes(16).toString("hex");
}

/**
 * Base64 URL encode
 */
function base64UrlEncode(input: Buffer): string {
  return input
    .toString("base64")
    .replace(/\+/g, "-")
    .replace(/\//g, "_")
    .replace(/=+$/g, "");
}

/**
 * Generate PKCE verifier and challenge
 */
export function generatePKCE(): { verifier: string; challenge: string } {
  const verifier = base64UrlEncode(randomBytes(32));
  const challenge = base64UrlEncode(createHash("sha256").update(verifier).digest());
  return { verifier, challenge };
}

/**
 * Decode JWT to extract payload
 */
export function decodeJWT(token: string): Record<string, unknown> | null {
  try {
    const parts = token.split(".");
    if (parts.length !== 3) return null;
    const payload = parts[1];
    const decoded = Buffer.from(payload ?? "", "base64").toString("utf-8");
    return JSON.parse(decoded);
  } catch {
    return null;
  }
}

/**
 * Load tokens from file
 */
export function loadTokens(): TokenData | null {
  try {
    if (!existsSync(TOKEN_FILE)) return null;
    const data = readFileSync(TOKEN_FILE, "utf-8");
    return JSON.parse(data);
  } catch {
    return null;
  }
}

/**
 * Save tokens to file
 */
export function saveTokens(tokens: TokenData): void {
  const dir = dirname(TOKEN_FILE);
  if (!existsSync(dir)) {
    mkdirSync(dir, { recursive: true });
  }
  writeFileSync(TOKEN_FILE, JSON.stringify(tokens, null, 2), "utf-8");
}

/**
 * Exchange authorization code for tokens
 */
export async function exchangeCodeForTokens(
  code: string,
  verifier: string
): Promise<TokenData | null> {
  const res = await fetch(TOKEN_URL, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      grant_type: "authorization_code",
      client_id: CLIENT_ID,
      code,
      code_verifier: verifier,
      redirect_uri: REDIRECT_URI,
    }),
  });

  if (!res.ok) {
    const text = await res.text().catch(() => "");
    console.error("[chatgpt-codex-proxy] Token exchange failed:", res.status, text);
    return null;
  }

  const json = (await res.json()) as {
    access_token?: string;
    refresh_token?: string;
    expires_in?: number;
  };

  if (!json?.access_token || !json?.refresh_token || !json?.expires_in) {
    console.error("[chatgpt-codex-proxy] Token response missing fields");
    return null;
  }

  // Extract account ID from JWT
  const decoded = decodeJWT(json.access_token);
  const accountId = decoded?.["https://api.openai.com/auth"] as { chatgpt_account_id?: string } | undefined;

  return {
    access_token: json.access_token,
    refresh_token: json.refresh_token,
    expires_at: Date.now() + json.expires_in * 1000,
    chatgpt_account_id: accountId?.chatgpt_account_id,
  };
}

/**
 * Refresh access token
 */
export async function refreshAccessToken(refreshToken: string): Promise<TokenData | null> {
  const res = await fetch(TOKEN_URL, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      grant_type: "refresh_token",
      refresh_token: refreshToken,
      client_id: CLIENT_ID,
    }),
  });

  if (!res.ok) {
    const text = await res.text().catch(() => "");
    console.error("[chatgpt-codex-proxy] Token refresh failed:", res.status, text);
    return null;
  }

  const json = (await res.json()) as {
    access_token?: string;
    refresh_token?: string;
    expires_in?: number;
  };

  if (!json?.access_token || !json?.refresh_token || !json?.expires_in) {
    return null;
  }

  const decoded = decodeJWT(json.access_token);
  const accountId = decoded?.["https://api.openai.com/auth"] as { chatgpt_account_id?: string } | undefined;

  return {
    access_token: json.access_token,
    refresh_token: json.refresh_token,
    expires_at: Date.now() + json.expires_in * 1000,
    chatgpt_account_id: accountId?.chatgpt_account_id,
  };
}

/**
 * Get valid tokens (refresh if needed)
 */
export async function getValidTokens(): Promise<TokenData | null> {
  const tokens = loadTokens();
  if (!tokens) return null;

  // Refresh if expired (with 5 min buffer)
  if (Date.now() >= tokens.expires_at - 5 * 60 * 1000) {
    console.log("[chatgpt-codex-proxy] Token expired, refreshing...");
    const newTokens = await refreshAccessToken(tokens.refresh_token);
    if (newTokens) {
      saveTokens(newTokens);
      return newTokens;
    }
    return null;
  }

  return tokens;
}

/**
 * Open URL in default browser
 */
function openBrowser(url: string): void {
  const platform = process.platform;
  let cmd: string;

  switch (platform) {
    case "darwin":
      cmd = "open";
      break;
    case "win32":
      cmd = "start";
      break;
    default:
      cmd = "xdg-open";
  }

  spawn(cmd, [url], { detached: true, stdio: "ignore" }).unref();
}

/**
 * Start OAuth login flow
 */
export async function login(): Promise<TokenData | null> {
  const pkce = generatePKCE();
  const state = createState();

  // Build authorization URL
  const url = new URL(AUTHORIZE_URL);
  url.searchParams.set("response_type", "code");
  url.searchParams.set("client_id", CLIENT_ID);
  url.searchParams.set("redirect_uri", REDIRECT_URI);
  url.searchParams.set("scope", SCOPE);
  url.searchParams.set("code_challenge", pkce.challenge);
  url.searchParams.set("code_challenge_method", "S256");
  url.searchParams.set("state", state);
  url.searchParams.set("codex_cli_simplified_flow", "true");
  url.searchParams.set("originator", "codex_cli_rs");

  console.log("\n========================================");
  console.log("ChatGPT Codex Proxy - OAuth Login");
  console.log("========================================\n");

  // Start local server FIRST, then open browser
  return new Promise((resolve) => {
    const server = createServer((req: IncomingMessage, res: ServerResponse) => {
      if (!req.url?.startsWith("/auth/callback")) {
        res.writeHead(404);
        res.end("Not found");
        return;
      }

      const callbackUrl = new URL(req.url, REDIRECT_URI);
      const code = callbackUrl.searchParams.get("code");
      const returnedState = callbackUrl.searchParams.get("state");

      res.writeHead(200, { "Content-Type": "text/html" });
      res.end(`
        <html>
          <head><title>Authentication Successful</title></head>
          <body style="font-family: sans-serif; display: flex; justify-content: center; align-items: center; height: 100vh; margin: 0; background: #1a1a2e;">
            <div style="text-align: center; color: #eee;">
              <h1 style="color: #10a37f;">Authentication Successful!</h1>
              <p>You can close this window and return to the terminal.</p>
            </div>
          </body>
        </html>
      `);

      if (returnedState !== state) {
        console.error("[chatgpt-codex-proxy] State mismatch - possible CSRF attack");
        server.close();
        resolve(null);
        return;
      }

      if (!code) {
        console.error("[chatgpt-codex-proxy] No authorization code received");
        server.close();
        resolve(null);
        return;
      }

      // Exchange code for tokens
      exchangeCodeForTokens(code, pkce.verifier)
        .then((tokens) => {
          if (tokens) {
            saveTokens(tokens);
            console.log("\n✅ Authentication successful! Tokens saved.\n");
            console.log(`Account ID: ${tokens.chatgpt_account_id}`);
            console.log(`Token expires: ${new Date(tokens.expires_at).toLocaleString()}`);
          }
          server.close();
          resolve(tokens);
        })
        .catch((err) => {
          console.error("[chatgpt-codex-proxy] Token exchange error:", err);
          server.close();
          resolve(null);
        });
    });

    // Start server FIRST
    server.listen(1455, () => {
      console.log("✓ Callback server started on port 1455");
      console.log("Opening browser for authentication...");
      console.log(`\nIf browser doesn't open, visit:\n${url.toString()}\n`);

      // Open browser AFTER server is ready
      openBrowser(url.toString());
    });

    server.on("error", (err: Error) => {
      console.error("[chatgpt-codex-proxy] Server error:", err.message);
      if ((err as NodeJS.ErrnoException).code === "EADDRINUSE") {
        console.error("Port 1455 is already in use. Another login may be in progress.");
      }
      resolve(null);
    });

    // Timeout after 5 minutes
    const timeout = setTimeout(() => {
      console.error("[chatgpt-codex-proxy] Authentication timeout");
      server.close();
      resolve(null);
    }, 5 * 60 * 1000);

    // Clear timeout if server closes early
    server.on("close", () => {
      clearTimeout(timeout);
    });
  });
}

/**
 * Logout (delete tokens)
 */
export function logout(): void {
  if (existsSync(TOKEN_FILE)) {
    unlinkSync(TOKEN_FILE);
    console.log("[chatgpt-codex-proxy] Logged out - tokens deleted");
  }
}

/**
 * Check authentication status
 */
export async function getAuthStatus(): Promise<{
  loggedIn: boolean;
  expired: boolean;
  hasRefreshToken: boolean;
  expiresAt?: number;
}> {
  const tokens = loadTokens();
  if (!tokens) {
    return { loggedIn: false, expired: false, hasRefreshToken: false };
  }

  const expired = Date.now() >= tokens.expires_at - 5 * 60 * 1000;
  return {
    loggedIn: !expired,
    expired,
    hasRefreshToken: Boolean(tokens.refresh_token),
    expiresAt: tokens.expires_at,
  };
}

/**
 * Import tokens from an existing Codex CLI ChatGPT login (~/.codex/auth.json).
 * Useful as a fallback when the browser OAuth flow is unavailable (headless,
 * firewalled, or the localhost callback port is already in use).
 * Refreshes the token first so the stored tokens are fresh.
 */
export async function importTokensFromCodexCli(): Promise<TokenData | null> {
  const authFile = join(homedir(), ".codex", "auth.json");
  if (!existsSync(authFile)) {
    console.error("[chatgpt-codex-proxy] ~/.codex/auth.json not found. Log into the Codex CLI first.");
    return null;
  }

  let auth: { tokens?: { refresh_token?: string; account_id?: string } };
  try {
    auth = JSON.parse(readFileSync(authFile, "utf-8"));
  } catch {
    console.error("[chatgpt-codex-proxy] Failed to parse ~/.codex/auth.json");
    return null;
  }

  const refreshToken = auth?.tokens?.refresh_token;
  const accountId = auth?.tokens?.account_id;
  if (!refreshToken) {
    console.error("[chatgpt-codex-proxy] No refresh_token in ~/.codex/auth.json");
    return null;
  }

  const res = await fetch(TOKEN_URL, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      grant_type: "refresh_token",
      refresh_token: refreshToken,
      client_id: CLIENT_ID,
    }),
  });

  if (!res.ok) {
    const text = await res.text().catch(() => "");
    console.error("[chatgpt-codex-proxy] Token refresh failed:", res.status, text);
    return null;
  }

  const json = (await res.json()) as {
    access_token?: string;
    refresh_token?: string;
    expires_in?: number;
  };

  if (!json?.access_token || !json?.refresh_token || !json?.expires_in) {
    console.error("[chatgpt-codex-proxy] Token response missing fields");
    return null;
  }

  const tokens: TokenData = {
    access_token: json.access_token,
    refresh_token: json.refresh_token,
    expires_at: Date.now() + json.expires_in * 1000,
    chatgpt_account_id: accountId ?? undefined,
  };
  saveTokens(tokens);
  return tokens;
}

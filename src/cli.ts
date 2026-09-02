#!/usr/bin/env node
/**
 * [파일 목적]
 * 이 파일은 chatgpt-codex-proxy용 인증 보조 CLI 진입점이다.
 * 터미널에서 login/logout/status 명령을 받아 auth 모듈 기능을 실행한다.
 *
 * [주요 흐름]
 * 1. process.argv에서 하위 명령을 읽는다.
 * 2. login/logout/status 중 하나로 분기한다.
 * 3. 결과를 콘솔에 출력하고 필요 시 종료 코드를 설정한다.
 *
 * [외부 연결]
 * - ./auth.ts: 실제 OAuth 로그인/로그아웃/상태 조회
 *
 * [수정시 주의]
 * - 명령 이름을 바꾸면 package.json 스크립트나 사용자 사용법도 함께 수정해야 한다.
 */
import { login, logout, getAuthStatus, importTokensFromCodexCli } from "./auth.js";

async function main(): Promise<void> {
  const command = process.argv[2];

  switch (command) {
    case "login": {
      const tokens = await login();
      if (tokens) {
        console.log("\n✅ Login successful!");
      } else {
        console.log("\n❌ Login failed");
        process.exit(1);
      }
      return;
    }

    case "logout": {
      logout();
      console.log("Logged out - tokens deleted");
      return;
    }

    case "status": {
      const status = await getAuthStatus();
      if (!status.loggedIn) {
        if (status.expired) {
          console.log("Status: EXPIRED (run 'npm run login' to refresh)");
        } else {
          console.log("Status: NOT LOGGED IN (run 'npm run login')");
        }
        return;
      }

      console.log("Status: LOGGED IN ✅");
      if (status.expiresAt) {
        console.log(`Expires: ${new Date(status.expiresAt).toLocaleString()}`);
      }
      console.log(`Refresh Token: ${status.hasRefreshToken ? "Yes" : "No"}`);
      return;
    }

    case "import": {
      console.log("Importing tokens from Codex CLI (~/.codex/auth.json)...");
      const tokens = await importTokensFromCodexCli();
      if (tokens) {
        console.log("\n✅ Tokens imported and saved!");
        console.log(`Expires: ${new Date(tokens.expires_at).toLocaleString()}`);
      } else {
        console.log("\n❌ Import failed");
        process.exit(1);
      }
      return;
    }

    default: {
      console.log("ChatGPT Codex Proxy CLI");
      console.log("");
      console.log("Usage:");
      console.log("  npm run login         - Start OAuth login flow");
      console.log("  npm run import-tokens - Import tokens from Codex CLI (~/.codex/auth.json)");
      console.log("  npm run logout        - Delete stored tokens");
      console.log("  npm run status        - Check authentication status");
    }
  }
}

main().catch((err) => {
  console.error("Error:", err instanceof Error ? err.message : String(err));
  process.exit(1);
});

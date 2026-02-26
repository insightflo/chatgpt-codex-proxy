#!/usr/bin/env node
import { login, logout, getAuthStatus } from "./auth.js";

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

    default: {
      console.log("ChatGPT Codex Proxy CLI");
      console.log("");
      console.log("Usage:");
      console.log("  npm run login   - Start OAuth login flow");
      console.log("  npm run logout  - Delete stored tokens");
      console.log("  npm run status  - Check authentication status");
    }
  }
}

main().catch((err) => {
  console.error("Error:", err instanceof Error ? err.message : String(err));
  process.exit(1);
});

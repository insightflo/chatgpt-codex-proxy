/**
 * [파일 목적]
 * 이 파일은 chatgpt-codex-proxy HTTP 서버의 런타임 진입점이다.
 * 환경변수를 로드하고 Express 앱을 실제 포트에 바인딩한다.
 *
 * [주요 흐름]
 * 1. dotenv로 .env 값을 로드한다.
 * 2. PORT 환경변수 또는 기본 포트를 결정한다.
 * 3. server.ts에서 만든 Express 앱을 listen 상태로 올린다.
 *
 * [외부 연결]
 * - ./server.ts: 실제 Express app 구성
 * - dotenv: 로컬 환경변수 로드
 *
 * [수정시 주의]
 * - 부팅 순서나 포트 결정 로직을 바꾸면 실행 방식과 배포 설정이 영향을 받는다.
 */
import dotenv from "dotenv";
import app from "./server.js";
import { mcpToolRegistry } from "./mcp/registry.js";

dotenv.config();

const PORT = Number(process.env.PORT ?? 19080);
// Bind loopback only by default; this proxy is meant to be local-only.
const HOST = process.env.HOST ?? "127.0.0.1";

/*
MCP 레지스트리를 먼저 초기화한 뒤 HTTP 서버를 시작한다.
PROXY_MCP_SERVERS 미설정 시 즉시 완료(논블로킹).
설정된 경우 서버당 최대 20초 타임아웃으로 스키마를 수집한다.
*/
await mcpToolRegistry.initialize();

app.listen(PORT, HOST, () => {
  // eslint-disable-next-line no-console
  console.log(`chatgpt-codex-proxy listening on ${HOST}:${PORT}`);
});

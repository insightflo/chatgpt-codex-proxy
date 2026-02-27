# ChatGPT Codex Proxy

> Claude Code를 ChatGPT Codex API와 함께 사용할 수 있게 해주는 Anthropic 호환 프록시 서버

## 개요

이 프로젝트는 Anthropic API 호환 엔드포인트를 제공하여, Claude Code가 ChatGPT의 Codex API를 "네이티브 Claude"처럼 사용할 수 있게 합니다. `ANTHROPIC_BASE_URL`만 설정하면 바로 사용 가능합니다.

```
Claude Code                    chatgpt-codex-proxy              ChatGPT API
    │                               │                                │
    │  POST /v1/messages            │  POST /codex/responses         │
    │  (Anthropic 형식)             │  (Codex 형식)                  │
    │ ─────────────────────────────>│ ──────────────────────────────>│
    │                               │                                │
    │  Anthropic 응답               │  Codex SSE 응답                │
    │ <─────────────────────────────│<──────────────────────────────│
```

## 기능

- ✅ Anthropic Messages API 호환 (`/v1/messages`)
- ✅ OAuth 2.0 인증 (ChatGPT Plus/Pro 필요)
- ✅ 요청/응답 자동 변환
- ✅ SSE 스트리밍 지원
- ✅ Claude → GPT 모델 자동 매핑

## 설치

```bash
# 저장소 클론
git clone https://github.com/your-username/chatgpt-codex-proxy.git
cd chatgpt-codex-proxy

# 의존성 설치
npm install

# 빌드
npm run build
```

## 사용법

### 1. 로그인

```bash
npm run login
```

브라우저가 열리고 ChatGPT 계정으로 로그인합니다. ChatGPT Plus 또는 Pro 구독이 필요합니다.

### 2. 서버 실행

```bash
# 개발 모드
npm run dev

# 프로덕션 모드
npm run start
```

### 3. Claude Code 설정

```bash
# 환경변수 설정
export ANTHROPIC_BASE_URL=http://localhost:19080
export ANTHROPIC_AUTH_TOKEN=your_chatgpt_oauth_token  # 또는 ANTHROPIC_API_KEY 사용
export ANTHROPIC_API_KEY="$ANTHROPIC_AUTH_TOKEN"        # 클라이언트 호환용

# Claude Code 실행
claude
```

## CLI 명령어

| 명령어 | 설명 |
|:---|:---|
| `npm run login` | OAuth 로그인 |
| `npm run logout` | 토큰 삭제 |
| `npm run status` | 인증 상태 확인 |
| `npm run dev` | 개발 서버 실행 (hot reload) |
| `npm run start` | 프로덕션 서버 실행 |

## 모델 매핑

### 기본 매핑

| Claude 모델 | Codex 모델 |
|:---|:---|
| `claude-sonnet-4-20250514` | `gpt-5.2-codex` |
| `claude-3-5-sonnet-20241022` | `gpt-5.2-codex` |
| `claude-3-haiku-20240307` | `gpt-5.3-codex-spark` |
| `claude-3-opus-20240229` | `gpt-5.3-codex-xhigh` |
| 기본값 | `gpt-5.2-codex` |

### 커스텀 모델 매핑

환경변수로 Codex 모델을 직접 지정할 수 있습니다:

| 환경변수 | 설명 |
|:---|:---|
| `ANTHROPIC_DEFAULT_HAIKU_MODEL` | Haiku 계열 모델이 요청될 때 사용할 Codex 모델 |
| `ANTHROPIC_DEFAULT_SONNET_MODEL` | Sonnet 계열 모델이 요청될 때 사용할 Codex 모델 |
| `ANTHROPIC_DEFAULT_OPUS_MODEL` | Opus 계열 모델이 요청될 때 사용할 Codex 모델 |
| `PASSTHROUGH_MODE` | `true/1/yes/on`이면 요청 모델명을 그대로 Codex에 전달 |

**우선순위**: `PASSTHROUGH_MODE=true`면 passthrough, 아니면 환경변수 > 기본 매핑

예시:
```bash
# Haiku 요청에 gpt-5.3-codex-spark 사용
export ANTHROPIC_DEFAULT_HAIKU_MODEL="gpt-5.3-codex-spark"

# Sonnet 요청에 gpt-5.2-codex 사용
export ANTHROPIC_DEFAULT_SONNET_MODEL="gpt-5.2-codex"
```

### 쉘 함수로 쉽게 설정하기

`.zshrc` 또는 `.bashrc`에 함수를 등록하면 편리합니다:

```bash
# Claude Code + ChatGPT Codex proxy (simple mode)
# 서버는 수동으로 실행하고, gpt는 환경변수만 세팅합니다.
gpt() {
  emulate -L zsh

  local proxy_port="${CHATGPT_CODEX_PROXY_PORT:-19080}"
  local token="${ANTHROPIC_AUTH_TOKEN:-${ANTHROPIC_API_KEY:-dummy}}"

  export ANTHROPIC_BASE_URL="http://127.0.0.1:${proxy_port}"
  export ANTHROPIC_AUTH_TOKEN="$token"
  export ANTHROPIC_API_KEY="${ANTHROPIC_API_KEY:-$token}"
  export API_TIMEOUT_MS="${API_TIMEOUT_MS:-90000}"
  export PASSTHROUGH_MODE="${PASSTHROUGH_MODE:-true}"
  unset CLAUDE_CONFIG_DIR

  echo "🚀 Using local Codex proxy on :${proxy_port}"
  claude "$@"
}
```

사용법:
```bash
# 현재 프로젝트 디렉토리에서 실행
gpt

# 포트 충돌 시 대안 포트 지정
CHATGPT_CODEX_PROXY_PORT=18080 gpt

# 매핑 모드를 강제하고 싶으면
PASSTHROUGH_MODE=false gpt

# 토큰 및 모델을 명시적으로 고정
ANTHROPIC_AUTH_TOKEN=... gpt
```

문제 대응 체크리스트:
- 프록시 기동 확인: `curl -fsS http://127.0.0.1:${CHATGPT_CODEX_PROXY_PORT:-19080}/health`
- 포트 충돌 확인: `lsof -tiTCP:${CHATGPT_CODEX_PROXY_PORT:-19080} -sTCP:LISTEN -nP`
- 요청 모델 그대로 전달(기본): `gpt --model gpt-5.2`
- 매핑 모드로 테스트: `PASSTHROUGH_MODE=false gpt --model gpt-5.2`
- 최근 로그: `tail -n 120 /tmp/chatgpt-codex-proxy.log`

툴 라운드트립 스모크 테스트:
- `python3 scripts/tool_calling_smoke.py --base-url http://127.0.0.1:19080 --model gpt-5.2`


## API 호환성

### 지원 기능

| 기능 | 지원 여부 | 비고 |
|:---|:---|:---|
| 기본 채팅 | ✅ | |
| 스트리밍 | ✅ | SSE |
| 멀티턴 대화 | ✅ | |
| 시스템 프롬프트 | ✅ | `instructions`로 매핑 |
| 이미지 입력 | ⚠️ | 제한적 |
| Tool Calling | ✅ | Anthropic tools/tool_choice/tool_result 브리징 지원 |
| Temperature | ❌ | Codex 미지원 |
| Max Tokens | ❌ | Codex 미지원 |

참고: Tool Calling은 백엔드(Codex/모델)가 function_call/function_call_output을 지원해야 정상 동작합니다.

### 호환성 체크리스트 (권장)

- Messages + 멀티턴: 기본 질의 2턴 이상이 유지되는지 확인
- Streaming: `stream=true`에서 `message_start` -> `content_block_*` -> `message_stop` 순서 확인
- Tool Calling Roundtrip: `tools/tool_choice` -> `tool_use` -> `tool_result` 흐름 확인
- Tool Schema Safety: object schema에 `properties` 누락 시 프록시에서 자동 정규화되는지 확인
- Passthrough/Mapping 모드: `PASSTHROUGH_MODE=true/false` 각각에서 모델 라우팅 기대값 확인

### 엔드포인트

- `POST /v1/messages` - Anthropic Messages API
- `GET /health` - 헬스체크

## 프로젝트 구조

```
chatgpt-codex-proxy/
├── src/
│   ├── index.ts           # 진입점
│   ├── server.ts          # Express 서버
│   ├── cli.ts             # CLI 명령
│   ├── auth.ts            # OAuth 인증
│   ├── routes/
│   │   └── messages.ts    # /v1/messages 엔드포인트
│   ├── transformers/
│   │   ├── request.ts     # Anthropic → Codex 변환
│   │   └── response.ts    # Codex → Anthropic 변환
│   ├── codex/
│   │   ├── client.ts      # Codex API 클라이언트
│   │   └── models.ts      # 모델 매핑
│   ├── types/
│   │   └── anthropic.ts   # 타입 정의
│   └── utils/
│       └── errors.ts      # 에러 처리
├── package.json
├── tsconfig.json
└── README.md
```

## 환경변수

| 변수 | 기본값 | 설명 |
|:---|:---|:---|
| `PORT` | `19080` | 서버 포트 |
| `CODEX_BASE_URL` | `https://chatgpt.com/backend-api` | Codex API URL |
| `ANTHROPIC_DEFAULT_HAIKU_MODEL` | - | Haiku → Codex 모델 매핑 |
| `ANTHROPIC_DEFAULT_SONNET_MODEL` | - | Sonnet → Codex 모델 매핑 |
| `ANTHROPIC_DEFAULT_OPUS_MODEL` | - | Opus → Codex 모델 매핑 |
| `PASSTHROUGH_MODE` | `true` | 기본 passthrough, `false/0/no/off`면 매핑 모드 |

## 보안

- 토큰은 `~/.chatgpt-codex-proxy/tokens.json`에 저장됩니다
- 토큰은 자동으로 갱신됩니다 (5분 버퍼)
- ChatGPT Plus/Pro 구독이 필요합니다

## 주의사항

- 이 프로젝트는 개인용으로 설계되었습니다
- ChatGPT 서비스 약관을 준수하세요
- 과도한 사용은 계정 제한을 받을 수 있습니다

## 라이선스

MIT

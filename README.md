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
export ANTHROPIC_BASE_URL=http://localhost:8080
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

**우선순위**: 환경변수 > 기본 매핑

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
# Claude Code + ChatGPT Codex proxy
# 프록시 서버는 별도 경로에서 실행하고, Claude는 현재 작업 디렉토리에서 띄웁니다.
gpt() {
  emulate -L zsh

  local project_dir="$PWD"
  local proxy_dir="${CHATGPT_CODEX_PROXY_DIR:-$HOME/Projects/mcp/chatgpt-codex-proxy}"
  local proxy_port="${CHATGPT_CODEX_PROXY_PORT:-19080}"
  local proxy_log="${CHATGPT_CODEX_PROXY_LOG:-/tmp/chatgpt-codex-proxy.log}"
  local ready_timeout="${CHATGPT_CODEX_PROXY_READY_TIMEOUT_SEC:-15}"
  local health_url="http://127.0.0.1:${proxy_port}/health"
  local token="${ANTHROPIC_AUTH_TOKEN:-${ANTHROPIC_API_KEY:-}}"
  local occupied_pid=""
  local proxy_pid=""
  local should_cleanup_proxy=0

  # Anthropic 기본 모델 오버라이드(원하면 여기서 값 바꿔 쓰세요)
  local effective_haiku_model="${ANTHROPIC_DEFAULT_HAIKU_MODEL:-gpt-5.3-codex-spark}"
  local effective_sonnet_model="${ANTHROPIC_DEFAULT_SONNET_MODEL:-gpt-5.2}"
  local effective_opus_model="${ANTHROPIC_DEFAULT_OPUS_MODEL:-gpt-5.3-codex-high}"

  export ANTHROPIC_DEFAULT_HAIKU_MODEL="$effective_haiku_model"
  export ANTHROPIC_DEFAULT_SONNET_MODEL="$effective_sonnet_model"
  export ANTHROPIC_DEFAULT_OPUS_MODEL="$effective_opus_model"

  # 토큰 우선순위: ANTHROPIC_AUTH_TOKEN > ANTHROPIC_API_KEY
  # 토큰이 비어 있을 때는 dummy 사용해 시그니처를 안정화합니다.
  if [[ -z "$token" ]]; then
    token="dummy"
    export ANTHROPIC_AUTH_TOKEN="dummy"
    export ANTHROPIC_API_KEY="dummy"
  else
    export ANTHROPIC_AUTH_TOKEN="$token"
    export ANTHROPIC_API_KEY="${ANTHROPIC_API_KEY:-$token}"
  fi

  local token_hint="${token:0:8}"
  local proxy_signature="$proxy_port|$effective_haiku_model|$effective_sonnet_model|$effective_opus_model|$token_hint"
  export CHATGPT_CODEX_PROXY_SIGNATURE="$proxy_signature"

  export ANTHROPIC_BASE_URL="http://127.0.0.1:${proxy_port}"
  export API_TIMEOUT_MS="${API_TIMEOUT_MS:-90000}"
  unset CLAUDE_CONFIG_DIR

  if [[ ! -d "$proxy_dir" ]]; then
    echo "error: CHATGPT_CODEX_PROXY_DIR is invalid: $proxy_dir" >&2
    return 1
  fi

  if command -v lsof >/dev/null 2>&1; then
    occupied_pid="$(lsof -tiTCP:"$proxy_port" -sTCP:LISTEN -nP)"
    if [[ -n "$occupied_pid" ]]; then
      local running_health=""
      local running_signature=""
      if running_health="$(curl -fsS "$health_url" 2>/dev/null)"; then
        running_signature="$(printf "%s" "$running_health" | sed -n 's/.*"proxy_signature":"\([^"\\]*\)".*/\1/p')"
      fi

      if [[ -n "$running_signature" && "$running_signature" = "$proxy_signature" ]]; then
        echo "Reusing existing proxy on port ${proxy_port} (PID: ${occupied_pid})."
      else
        if [[ -n "$running_signature" ]]; then
          echo "Restarting proxy on port ${proxy_port} due to config mismatch."
          echo "  old: ${running_signature}"
          echo "  new: ${proxy_signature}"
        else
          echo "No proxy signature found on occupied port ${proxy_port}; restarting to apply current config."
        fi

        kill "$occupied_pid" 2>/dev/null
        wait "$occupied_pid" 2>/dev/null
        occupied_pid=""
      fi
    fi

    if [[ -z "$occupied_pid" ]]; then
      (
        cd "$proxy_dir" \
        && PORT="$proxy_port" npm run dev >> "$proxy_log" 2>&1
      ) &
      proxy_pid=$!
      should_cleanup_proxy=1

      local waited=0
      local deadline=$((ready_timeout * 5))
      while (( waited < deadline )); do
        if curl -fsS "$health_url" >/dev/null 2>&1; then
          break
        fi
        sleep 0.2
        waited=$((waited + 1))
      done

      if ! curl -fsS "$health_url" >/dev/null 2>&1; then
        echo "error: proxy did not become ready on port ${proxy_port}. Check ${proxy_log}." >&2
        kill "$proxy_pid" 2>/dev/null
        wait "$proxy_pid" 2>/dev/null
        echo "check logs: $proxy_log"
        return 1
      fi
    fi
  else
    echo "warning: lsof not found, starting proxy without port check." >&2
    (
      cd "$proxy_dir" \
      && PORT="$proxy_port" npm run dev >> "$proxy_log" 2>&1
    ) &
    proxy_pid=$!
    should_cleanup_proxy=1
    sleep 1
  fi

  # 현재 시그니처(포트/모델/토큰 프리픽스)
  echo "proxy_signature: ${proxy_signature}"
  echo "effective_overrides: haiku=${effective_haiku_model}, sonnet=${effective_sonnet_model}, opus=${effective_opus_model}"

  cleanup_proxy() {
    if [[ "$should_cleanup_proxy" -eq 1 && -n "$proxy_pid" ]]; then
      kill "$proxy_pid" 2>/dev/null
      wait "$proxy_pid" 2>/dev/null
    fi
  }

  trap cleanup_proxy EXIT INT TERM
  (cd "$project_dir" && claude "$@")
  local claude_status=$?
  trap - EXIT INT TERM
  cleanup_proxy
  return $claude_status
}
```

사용법:
```bash
# 현재 프로젝트 디렉토리에서 실행
gpt

# 포트 충돌 시 대안 포트 지정
CHATGPT_CODEX_PROXY_PORT=18080 gpt

# 토큰 및 모델을 명시적으로 고정
ANTHROPIC_AUTH_TOKEN=... ANTHROPIC_DEFAULT_SONNET_MODEL=gpt-5.2-codex gpt
```

문제 대응 체크리스트:
- 프록시 기동 확인: `curl -fsS http://127.0.0.1:${CHATGPT_CODEX_PROXY_PORT:-8080}/health`
- 시그니처 빠르게 확인:
  - `SIG=$(curl -fsS http://127.0.0.1:${CHATGPT_CODEX_PROXY_PORT:-8080}/health | sed -n 's/.*"proxy_signature":"\([^"\\]*\)".*/\1/p')`
  - `echo "$SIG"`
- 포트 충돌 확인: `lsof -tiTCP:${CHATGPT_CODEX_PROXY_PORT:-8080} -sTCP:LISTEN -nP`
- 모델 변경 시 프록시 재시작 동작 검증:
  - `ANTHROPIC_DEFAULT_SONNET_MODEL=gpt-5.2-codex gpt --model 'hi'`
  - `ANTHROPIC_DEFAULT_SONNET_MODEL=gpt-5.3-codex-spark gpt --model 'hi'`
- 최근 로그: `tail -n 120 /tmp/chatgpt-codex-proxy.log`


## API 호환성

### 지원 기능

| 기능 | 지원 여부 | 비고 |
|:---|:---|:---|
| 기본 채팅 | ✅ | |
| 스트리밍 | ✅ | SSE |
| 멀티턴 대화 | ✅ | |
| 시스템 프롬프트 | ✅ | `instructions`로 매핑 |
| 이미지 입력 | ⚠️ | 제한적 |
| Tool Calling | ❌ | 향후 지원 예정 |
| Temperature | ❌ | Codex 미지원 |
| Max Tokens | ❌ | Codex 미지원 |

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
| `PORT` | `8080` | 서버 포트 |
| `CODEX_BASE_URL` | `https://chatgpt.com/backend-api` | Codex API URL |
| `ANTHROPIC_DEFAULT_HAIKU_MODEL` | - | Haiku → Codex 모델 매핑 |
| `ANTHROPIC_DEFAULT_SONNET_MODEL` | - | Sonnet → Codex 모델 매핑 |
| `ANTHROPIC_DEFAULT_OPUS_MODEL` | - | Opus → Codex 모델 매핑 |

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

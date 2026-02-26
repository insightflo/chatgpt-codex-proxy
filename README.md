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
export ANTHROPIC_API_KEY=dummy  # 프록시가 무시하지만 Claude Code에 필요

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

| Claude 모델 | Codex 모델 |
|:---|:---|
| `claude-sonnet-4-20250514` | `gpt-5.2-codex` |
| `claude-3-5-sonnet-20241022` | `gpt-5.2-codex` |
| `claude-3-haiku-20240307` | `gpt-5.3-codex-spark` |
| `claude-3-opus-20240229` | `gpt-5.3-codex-xhigh` |
| 기본값 | `gpt-5.2-codex` |

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

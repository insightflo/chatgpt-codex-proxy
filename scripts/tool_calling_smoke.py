#!/usr/bin/env python3
import argparse
import json
import sys
import urllib.error
import urllib.request


def post_messages(base_url: str, payload: dict, timeout: float) -> dict:
    data = json.dumps(payload).encode("utf-8")
    req = urllib.request.Request(
        f"{base_url.rstrip('/')}/v1/messages",
        data=data,
        headers={"Content-Type": "application/json"},
        method="POST",
    )
    try:
        with urllib.request.urlopen(req, timeout=timeout) as resp:
            body = resp.read().decode("utf-8")
            return json.loads(body)
    except urllib.error.HTTPError as err:
        detail = err.read().decode("utf-8", errors="replace")
        raise RuntimeError(f"HTTP {err.code}: {detail}") from err


def find_tool_use_block(content_blocks: list[dict]) -> dict | None:
    for block in content_blocks:
        if block.get("type") == "tool_use":
            return block
    return None


def first_text(content_blocks: list[dict]) -> str:
    for block in content_blocks:
        if block.get("type") == "text":
            return str(block.get("text", ""))
    return ""


def main() -> int:
    parser = argparse.ArgumentParser(
        description="Tool-calling roundtrip smoke test for chatgpt-codex-proxy"
    )
    parser.add_argument(
        "--base-url", default="http://127.0.0.1:19080", help="Proxy base URL"
    )
    parser.add_argument("--model", default="gpt-5.2", help="Model to request")
    parser.add_argument(
        "--timeout", type=float, default=60.0, help="HTTP timeout seconds"
    )
    args = parser.parse_args()

    tool = {
        "name": "get_weather",
        "description": "Get current weather for a city",
        "input_schema": {
            "type": "object",
            "properties": {
                "location": {"type": "string"},
            },
            "required": ["location"],
        },
    }

    first_payload = {
        "model": args.model,
        "max_tokens": 512,
        "stream": False,
        "tools": [tool],
        "tool_choice": {"type": "tool", "name": "get_weather"},
        "messages": [
            {"role": "user", "content": "서울 날씨 알려줘."},
        ],
    }

    print("[1/2] requesting tool_use...")
    first_response = post_messages(args.base_url, first_payload, args.timeout)
    first_content = first_response.get("content", [])
    tool_use = find_tool_use_block(first_content)
    if not tool_use:
        preview = json.dumps(first_response, ensure_ascii=False)[:800]
        print("FAIL: tool_use block not found in first response")
        print(preview)
        return 1

    tool_use_id = str(tool_use.get("id", ""))
    if not tool_use_id:
        print("FAIL: tool_use id missing")
        return 1

    print(f"tool_use detected: id={tool_use_id} name={tool_use.get('name')}")

    second_payload = {
        "model": args.model,
        "max_tokens": 512,
        "stream": False,
        "messages": [
            {"role": "user", "content": "서울 날씨 알려줘."},
            {"role": "assistant", "content": [tool_use]},
            {
                "role": "user",
                "content": [
                    {
                        "type": "tool_result",
                        "tool_use_id": tool_use_id,
                        "content": "서울은 맑음, 11C",
                    }
                ],
            },
        ],
    }

    print("[2/2] sending tool_result...")
    second_response = post_messages(args.base_url, second_payload, args.timeout)
    second_content = second_response.get("content", [])
    text = first_text(second_content)
    if not text:
        preview = json.dumps(second_response, ensure_ascii=False)[:800]
        print("FAIL: no text output after tool_result")
        print(preview)
        return 1

    print("PASS: tool-calling roundtrip succeeded")
    print(f"assistant text preview: {text[:160]}")
    return 0


if __name__ == "__main__":
    sys.exit(main())

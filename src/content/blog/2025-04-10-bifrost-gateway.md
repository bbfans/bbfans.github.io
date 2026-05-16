---
title: "Bifrost：本地 AI API 网关 — 聚合多提供商，自动故障转移"
description: "基于 LiteLLM 的本地 LLM API 网关部署实践：统一 OpenAI / Anthropic / DeepSeek / TokenRouter 多 key，负载均衡，Codex CLI + Claude CLI 共用同一 endpoint"
pubDate: 2025-04-10
updatedDate: 2025-04-10
featured: false
heroImage: "/blog-placeholder-1.jpg"
tags: [AI Gateway, LiteLLM, OpenAI, Anthropic, FastAPI]
---

## 问题背景：一个入口，多个厂商

我是 AI builder，但同时也是**命令行用户**。

日常工作流：
```
Codex CLI  →  OpenAI GPT-5
Claude CLI →  Anthropic Claude Opus 4
Python 项目  →  DeepSeek V3  /  TokenRouter
```

每个工具写死自己的 endpoint → 每个厂商的 API key 保存在不同的 shell config →  
**created_at: 2025-01 的这堆配置，2025-04 的我根本不想维护。**

**Bifrost 是解决思路：**把所有 LLM API 请求统一通过一个本地 endpoint 转发，key 管理和故障转移藏在后面。

## Bifrost 架构

```
Codex CLI   ──→
Claude CLI  ──┼─→  localhost:9000  (Bifrost)
Python 脚本  ──┘         │
                       liteLLM Router
                      /      |      \
                DeepSeek  OpenAI  Anthropic
                  (RPM 30)  (key-1)  (key-2)
                       ↑ load balance
                       fault tolerance → failover
```

```python
# app/main.py — Bifrost 最小内核
from fastapi import FastAPI
from httpx import AsyncClient, Limits
import litellm, os

app = FastAPI(title="Bifrost AI Gateway")

# ── 提供商配置 ──────────────────────────────────────────────
PROVIDERS = {
    "deepseek": {
        "api_key": os.environ["DEEPSEEK_API_KEY"],
        "base_url": "https://api.deepseek.com/v1",
        "models": ["deepseek-chat", "deepseek-coder"],
    },
    "openai": {
        "api_key": os.environ["OPENAI_API_KEY"],
        "base_url": None,          # 官方 endpoint，设为自定义绕转 alias
        "models": ["gpt-4o", "gpt-4o-mini"],
    },
    "anthropic": {
        "api_key": os.environ["ANTHROPIC_API_KEY"],
        "base_url": "https://api.anthropic.com",
        "models": ["claude-opus-4-20250514", "claude-sonnet-4-20250514"],
    },
}

# litellm.set_verbose = False                          # 生产关闭 verbose
litellm.drop_params = True                             # 丢弃不支持的参数而非报错

@app.post("/v1/chat/completions")
async def chat_completions(request: dict):
    """统一 chat completions 接口，所有 vendor 路由在此汇聚"""
    provider = detect_provider(request.get("model", ""))
    cfg = PROVIDERS[provider]

    response = await litellm.acompletion(
        model=request["model"],
        messages=request["messages"],
        api_key=cfg["api_key"],
        base_url=cfg["base_url"],
        max_tokens=request.get("max_tokens", 4096),
        temperature=request.get("temperature", 0.7),
        stream=request.get("stream", False),
    )
    return response


def detect_provider(model: str) -> str:
    """通过 model 名称前缀推断提供商"""
    prefices = {"deepseek": "deepseek", "gpt": "openai", "claude": "anthropic"}
    for vendor, prefix in prefices.items():
        if model.lower().startswith(prefix):
            return vendor
    raise ValueError(f"Unknown provider for model: {model}")
```

## 多 key 负载均衡 + 故障转移

 workloads 增长后单 key 不够，Bifrost 实现了两种策略：

**策略 1 — 简单轮询（weighted round-robin）**

```python
from itertools import cycle
from collections import defaultdict

class KeyPool:
    def __init__(self, keys: list[str]):
        self._cycle = cycle(keys)
        self._counts = defaultdict(int)

    def next(self) -> str:
        key = next(self._cycle)
        self._counts[key] += 1
        return key

# 使用示例（OpenAI 双 key 轮询）
openai_pool = KeyPool([
    os.environ["OPENAI_API_KEY_1"],
    os.environ["OPENAI_API_KEY_2"],
])

# litellm 里设置不同 key
async def completion_with_pool(model, messages, **kw):
    api_key = openai_pool.next()
    return await litellm.acompletion(
        model=model, messages=messages,
        api_key=api_key, **kw
    )
```

**策略 2 — 健康检查 + 自动降级**

```bash
# health.sh — 每 30s 检查每个 endpoint 延迟
#!/bin/bash
while true; do
  for provider in deepseek openai anthropic; do
    start=$(date +%s.%N)
    curl -s --max-time 5 "${BIFROST_URL}/health/$provider" > /dev/null
    end=$(date +%s.%N)
    latency=$(echo "$end - $start" | bc)
    provider="$provider latency=${latency}s"
  done
  sleep 30
done
```

```python
# app/health.py — 健康端点
@app.get("/health/{provider}")
async def health_check(provider: str):
    try:
        result = await litellm.acompletion(
            model="gpt-4o-mini",
            messages=[{"role": "user", "content": "pong"}],
            api_key=PROVIDERS[provider]["api_key"],
            max_tokens=3,
        )
        return {"status": "ok", "provider": provider, "latency_ms": result["usage"]["total_tokens"]}
    except Exception as e:
        return {"status": "error", "provider": provider, "error": str(e)}, 503
```

## API Key 注入策略（按调用方隔离）

```python
# config/key_injection.py
from fastapi import Request, Depends

CALLER_CREDENTIALS = {
    "codex-cli":    {"api_key": env.CODEX_API_KEY,    "model": "openai/gpt-4o"},
    "claude-cli":   {"api_key": env.CLAUDE_API_KEY,   "model": "anthropic/claude-opus-4"},
    "python-harness":{"api_key": env.DEEPSEEK_API_KEY,"model": "deepseek/deepseek-chat"},
}

@app.middleware("http")
async def inject_key(request: Request, call_next):
    caller = request.headers.get("X-Bifrost-Caller", "unknown")
    creds  = CALLER_CREDENTIALS.get(caller)
    if not creds:
        return JSONResponse(status_code=403, content={"error": "Unknown caller"})

    # 注入 api_key 到 request state
    request.state.api_key  = creds["api_key"]
    request.state.model    = creds["model"]
    response = await call_next(request)
    return response
```

```bash
# Codex CLI 使用 Bifrost
CODELLM_ENDPOINT="http://localhost:9000/v1"
CODEX_API_KEY="caller-codex-cli"    # 不为 NULL，Bifrost 中间件映射

# Claude CLI 使用 Bifrost 不需要修改 config
ANTHROPIC_API_KEY="caller-claude-cli"
ANTHROPIC_BASE_URL="http://localhost:9000"

# Python 环境变量
export OPENAI_API_KEY=caller-codex-cli
export OPENAI_BASE_URL=http://localhost:9000/v1
```

## wrangler 部署（如果托管到 Cloudflare）

```toml
# wrangler.toml
name = "bifrost-gateway"
main = "src/main.py"
workers_dev = true

[vars]
BIFROST_ENV = "production"

[[kv_namespaces]]
binding = "BIFROST_KV"
id = "kv-bifrost-prod"

# secrets（不写不进 toml）
wrangler secret put DEEPSEEK_API_KEY
wrangler secret put OPENAI_API_KEY
wrangler secret put ANTHROPIC_API_KEY
wrangler secret put TOKENROUTER_API_KEY
wrangler secret put TOKENROUTER_URL
```

## 总结

Bifrost 的核心价值不是“减少 API 调用次数”，是抽象基础设施层。**LLM 提供商更换 = 改一行 KV，配置中心 devops = 改 config/ 目录**。key 的生命周期、审计日志、用量统计都在 Bifrost 层完成，各调用方定义各自的 caller ID，不需要修改各 CLI 的配置方式。
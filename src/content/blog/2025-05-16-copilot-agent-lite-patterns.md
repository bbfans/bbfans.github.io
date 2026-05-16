---
title: "copilot-agent-lite 设计模式：YAML agent + cron + MCP"
description: "超轻量 GitHub Copilot subscription agent 如何用 YAML 驱动 agent、APScheduler cron 调度、MCP 透明透传，全程 Python / FastAPI / Uvicorn 零外部 broker"
pubDate: 2025-05-16
updatedDate: 2025-05-16
featured: true
heroImage: "/blog-placeholder-2.jpg"
tags: [AI Agent, Python, FastAPI, MCP, GitHub Copilot]
---

## 设计动机：Copilot SDK + 全自动化调度

GitHub Copilot 的 AI Agent 能力在 2025 年事实上已达到生产可用，但**手动触发**仍是主要使用模式。Codex CLI、Claude Code……都需要用户在终端前手动输入指令。

`copilot-agent-lite` 要回答的问题是：

> 能不能让 Copilot Agent **自己定时去跑，不依赖人去敲键盘？**

答案是肯定的。但设计上需要一个"框架"让 YAML 配置 → Agent 执行 → MCP 传递成为一条**可观测的流水线**。

```python
# ─── 一行命令启动 ───
uvicorn main:app --reload
# → Swagger UI http://localhost:8000/docs
# → Cron 调度在后台静默运行
```

## 核心设计架构

```
schedule.yaml ──→ APScheduler ──→ Executor ──→ Copilot SDK ──→ MCP Tools ──→ SQLite DB
                         ↑
              (YAML agent definitions)
```

**三层解耦**：Cron 调度层、执行引擎层、MCP 透传层；任何一层都可以单独替换，不需要改动其他两层。

### YAML Agent 定义

```yaml
# agents/security-scan.yaml
name: security-scan
description: "扫描 PR 中的安全敏感信息"

steps:
  # 1. Copilot 用自有代码Completion能力 reads a diff
  - action: copilot_completion
    input: |
      Review this PR diff for hardcoded credentials,
      exposed API keys, and SQL injection risks:
      
      Diff:
      {{ diff_from_github_api }}
      
    output: findings_report

  # 2. 提取结构化发现写回 DB
  - action: python_snippet
    code: |
      from db import save_findings
      save_findings(findings_report.parse_json())
```

YAML 是**声明式的**，不是脚本。这允许分隔：谁来 YAML 写配置（工程团队），谁来维护 Python 执行引擎（核心开发）。

### FastAPI Executor

```python
# src/run.py
import yaml
from copilot_sdk import CopilotAgent
from apscheduler.schedulers.asyncio import AsyncIOScheduler

scheduler = AsyncIOScheduler()

def load_agent(path: str) -> dict:
    with open(path) as f:
        return yaml.safe_load(f)

async def execute_step(agent_cfg: dict, step: dict):
    action = step["action"]

    if action == "copilot_completion":
        return await CopilotAgent.chat(step["input"])

    elif action == "python_snippet":
        # sandboxed exec
        return sandbox_run(step["code"], context)

    elif action == "mcp_tool_call":
        return await mcp_proxy.tool(step["tool"], step["params"])

@app.post("/agents/{name}/run")
async def run_agent(name: str, request: RunRequest):
    cfg = load_agent(f"agents/{name}.yaml")
    result = await execute_steps(cfg, request.context)
    await db.log_result(name, result)
    return result
```

### MCP Server 透明透传

```python
# MCP tool 包装成 copilot-agent-lite 执行步骤
async def mcp_proxy_tool(tool_name: str, params: dict):
    # copilot-agent-lite 知道 MCP endpoint
    endpoint = settings.mcp_servers[tool_name].endpoint

    async with httpx.AsyncClient() as client:
        resp = await client.post(
            f"{endpoint}/tools/execute",
            json={"name": tool_name, "arguments": params},
            headers={"Authorization": f"Bearer {settings.mcp_api_key}"},
        )
    return resp.json()
```

**路径透明**：User → agent YAML → interpreter → MCP 协议 → MCP 服务端（e.g. a GitHub MCP 服务）。对 copilot-agent-lite 来说，MCP 只是另一个执行步骤。

## Cron 调度

```python
# src/schedules.yaml
schedules:
  - agent: security-scan
    cron: "0 9,18 * * 1-5"   # 工作日 9:00 / 18:00
    context:                  # 触发时注入上下文
      diff_from_github_api:
        _branch: "main"
        _compare: "origin/main"
        _repo: "openai/copilot-agent-lite"

  - agent: daily-code-review
    cron: "0 10 * * 1-4"     # 周一至周四 10:00
```

```python
# 动态加载而不重启服务
@app.post("/schedules/reload")
async def reload_schedules():
    with open("schedules.yaml") as f:
        schedules = yaml.safe_load(f)
    scheduler.remove_all_jobs()
    for s in schedules["schedules"]:
        scheduler.add_job(
            run_agent_from_schedule,
            "cron",
            args=[s],
            **cron_to_kwargs(s["cron"]),
        )
    return {"reloaded": len(schedules)}
```

## 资源清单：这个东西有多轻？

| 组件             | 数量 | 说明                      |
|------------------|------|--------------------------|
| 外部 broker      | 0    | 没有 RabbitMQ / Redis    |
| 容器化           | 否   | `uvicorn main:app` 直接跑 |
| 配置文件         | 1    | `schedules.yaml`         |
| 云依赖           | 否   | 本地运行，self-hosted    |
| pip dependencies | ~8   | fastapi, uvicorn, apscheduler, httpx …   |
| k8s / Docker     | 不需要 | 纯 Python               |

**没有 RabbitMQ · 没有 Redis · 没有 LangChain · 删掉 k8s，只有 pip install + uvicorn main:app。**

## 下一步迭代

- ✅ **已发布**：YAML agent 执行引擎 + MCP 透传
- ⏳ Q3 2025：Docker Hub 一键镜像
- ⏳ Q3 2025：Telegram 异常告警
- ⏳ Q4 2025：GitHub Actions action 版本

```bash
git clone https://github.com/bbfans/copilot-agent-lite
cd copilot-agent-lite
pip install -r requirements.txt
uvicorn main:app --reload
```

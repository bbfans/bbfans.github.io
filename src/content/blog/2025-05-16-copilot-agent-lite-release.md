---
heroImage: https://img.1001020.xyz/blog-img/agent-2026-05-23.jpeg
updatedDate: 2026-05-23
title: "copilot-agent-lite v2.4.3: 超轻量 Copilot Agent Runtime 发布"
description: v2.4.3 已发布：YAML 驱动 AI Agent / cron 调度 / MCP stdio runtime bridge /
  MCP Web UI · 全程 Python + FastAPI
pubDate: 2025-05-16
published: true
featured: true
tags:
  - AI Agent
  - FastAPI
  - OpenAI
  - Copilot
---

## 为什么做 copilot-agent-lite？

**最新版本：v2.4.3**
Release: [github.com/bbfans/copilot-agent-lite/releases/tag/v2.4.3](https://github.com/bbfans/copilot-agent-lite/releases/tag/v2.4.3)

很多项目需要一个**轻量、零依赖、可 cron 自动化**的 AI Agent Runtime，但又不想上来就搞八小时的 LangChain + Dapr 重栈。

`copilot-agent-lite` 就是答案。

### 核心痛点

- Claude Code / Codex CLI 都是**手动触发**，需要人工坐在终端前
- 项目检查、自动修复、提交 PR 等任务需要**定时执行**
- Copilot SDK 与 MCP server 的集成路径**文档缺失**
- 许多现有方案都需要**容器化或外部 broker**

### 设计方案

```
YAML agent config → FastAPI executor → Copilot SDK 调用 → MCP 工具透传 → 结果落库
      ↑                                          ↑
  schedule.yaml                           APScheduler cron
```

**没有 RabbitMQ · 没有 Redis · 没有 LangChain · 删掉 k8s，只有 Python + pip install。**

### 路由文件结构

```
src/
├── agents/           # YAML agent 定义
├── run.py            # executor 入口
├── schedules.yaml    # cron 配置
└── mcp_servers/      # MCP server 映射
```

### v2.4.3 更新重点

- 新增 MCP stdio runtime bridge，可从 agent YAML 发现并调用 MCP tools
- 新增独立 MCP Web UI 页面，支持 server 状态、tool discovery 与 preset installer
- 新增 MCP install APIs，用于 curated presets 和 agent YAML 更新
- CLI 新增 `copilot-agent mcp tools`，可列出已发现的 MCP tools
- 公开发布文档补充 MCP 本地执行安全说明（英文 / 中文）
- 启动脚本优先使用 screen-backed process management

### 快速开始

```bash
git clone https://github.com/bbfans/copilot-agent-lite
cd copilot-agent-lite
git checkout v2.4.3
pip install -r requirements.txt
uvicorn main:app --reload
# → http://localhost:8000/docs  (Swagger UI)
```

cron 任务可不重启，在 Web UI 上添加 YAML 后实时生效。

### 当前状态

✅ **shipping · v2.4.3 latest** — 生产可用
✅ 发布前已通过 `./scripts/quality.sh`、临时 virtualenv clean install 与 CLI smoke test

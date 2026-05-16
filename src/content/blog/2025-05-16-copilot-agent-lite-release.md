---
title: "copilot-agent-lite: 超轻量 Copilot Agent Runtime 发布"
description: "用 YAML 驱动 AI Agent / cron 调度 / MCP server 透传 · 全程 Python + FastAPI 不自托管"
pubDate: 2025-05-16
updatedDate: 2025-05-16
featured: true
heroImage: "/blog-placeholder-2.jpg"
tags: ["AI Agent", "FastAPI", "OpenAI", "Copilot"]
---

## 为什么做 copilot-agent-lite？

很多项目需要一个**轻量、零依赖、可 cron 自动化**的 AI Agent .Runtime，但又不想上来就搞八小时的 LangChain + Dapr 重栈。

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

### 快速开始

```bash
git clone https://github.com/bbfans/copilot-agent-lite
cd copilot-agent-lite
pip install -r requirements.txt
uvicorn main:app --reload
# → http://localhost:8000/docs  (Swagger UI)
```

cron 任务可不重启，在 Web UI 上添加 YAML 后实时生效。

### 当前状态

✅ **shipping** — 生产可用  
⏳ 下一个迭代：Docker Hub 一键镜像、Telegram 通知集成

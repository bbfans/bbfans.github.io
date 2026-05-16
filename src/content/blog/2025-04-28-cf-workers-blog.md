---
title: "Zero-database Cloudflare Workers 博客引擎"
description: "如何用 Workers + KV + R2 构建一个零外部数据库、免费 tier 完全托管的博客引擎，支持自定义域名和 Markdown 编辑"
pubDate: 2025-04-28
updatedDate: 2025-04-28
featured: false
heroImage: "/blog-placeholder-5.jpg"
tags: [Cloudflare Workers, KV, R2, Serverless]
---

## 不跑数据库，博客怎么写？

传统博客需要数据库写 post → reader 读 post → relationship（tags、dates、author）存在数据库表里。

但很多人的博客**规模根本不需要数据库**。

```
100篇技术文章 = 100条 KV record
1000次 每日 PV = 1000次 R2 KV 读

每月求和: KV 读写免费额度 1M 次 / R2 免费额度 + Cloudflare 免费 tier 每月 $0
```

用 Cloudflare Workers + KV + R2 就可以跑一个完全托管的博客引擎。不需要外部 DB、不需要 postgres/mongo 的备份策略、不需要 node.js 运行时。

## 架构图

```
Git Push
   │
   ▼
[Cloudflare Pages / Wrangler deploy]
   │
   ├── Worker (main:export)
   │       │
   │       ├── FETCH_HTML  ← get KV:blog.* → render Mustache
   │       ├── FETCH_JSON  ← get KV:blog.* → JSON response
   │       └── STATIC_R2   ← get R2:static/* → image/pdf
   │
   ├── KV NS: blog_kv     ← blog markdown + HTML (存一次，读无限次)
   └── R2 Bucket: r2_blogs ← static assets / featured images
```

## KV Schema 设计

```bash
# KV keys（扁平 namespace，无桶）
blog:2025-05-20-why-i-built-a-portal:frontmatter  → JSON { title, description, featured }
blog:2025-05-20-why-i-built-a-portal:html         → Rendered HTML (body only)
blog:2025-05-20-why-i-built-a-portal:md           → Raw Markdown (backup / re-export)
blog:tags:Astro                                   → Set of entry IDs   ← Wrangler 模拟 set
```

**为什么存 HTML 而不是 Markdown 在 KV 里？**

- Markdown → HTML 转换是 CPU 密集型，Worker 单次 CPU 配额只有 10ms
- 在 deployment pipeline 做转换（pre-render HTML），运行时只需要 `KV.get("html")`
- 即：**CDN 缓存的是 HTML 而非 Markdown**

## Worker 代码

```typescript
// src/index.ts (Wrangler Worker)
import { Hono } from "hono";
import { cors } from "hono/cors";
import { marked } from "marked";
import { renderToString } from "react-dom/server";

type Env = {
  KV_NAMESPACE: kv.KvNamespace;
  R2_BUCKET: R2Bucket;
};

const app = new Hono<{ Bindings: Env }>();

// ── Blog Index ──────────────────────────────────────────
app.get("/", async (c) => {
  const entries = await c.env.KV_NAMESPACE.list({ prefix: "blog:" });

  const posts = await Promise.all(
    entries.keys.map(async (key) => {
      const [fmRaw] = await Promise.all([
        c.env.KV_NAMESPACE.get(key.name + ":frontmatter"),
      ]);
      return JSON.parse(fmRaw);
    }),
  );

  // in-memory sort by pubDate
  posts.sort((a,b) => new Date(b.pubDate).valueOf() - new Date(a.pubDate).valueOf());
  const html = renderBlogIndex(posts);

  return c.html(html, {
    headers: { "Cache-Control": "public, max-age=300, s-maxage=86400" },
  });
});

// ── Blog Post ───────────────────────────────────────────
app.get("/:slug", async (c) => {
  const slug = c.req.param("slug");
  const [html, fm] = await Promise.all([
    c.env.KV_NAMESPACE.get(`blog:${slug}:html`),
    c.env.KV_NAMESPACE.get(`blog:${slug}:frontmatter`),
  ]);

  if (!html) return c.notFound();

  return c.html(renderPost(html, JSON.parse(fm)), {
    headers: { "Cache-Control": "public, max-age=600, s-maxage=604800" },
  });
});
```

## Wrangler 配置

```toml
# wrangler.toml
name = "my-blog-worker"
main = "src/index.ts"
compatibility_date = "2025-05-01"

[[kv_namespaces]]
binding = "KV_NAMESPACE"
id = "xxxxxxx"           # wrangler kv namespace create blog_kv

[[r2_buckets]]
binding = "R2_BUCKET"
bucket_name = "r2_blogs"
```

```bash
wrangler kv namespace create blog_kv          # KV 初始化
wrangler r2 bucket create r2_blogs            # R2 初始化

# 写入一篇博客 markdown
wrangler kv key put "blog:2025-04-28-cf-workers-blog:md" \
  --path="src/content/blog/2025-04-28-cf-workers-blog.md"

# 写入预渲染 HTML（在 build step 用 marked 转换后）
wrangler kv key put "blog:2025-04-28-cf-workers-blog:html" \
  --data-file="dist/html/2025-04-28-cf-workers-blog.html"

wrangler tail             # local dev stream log
wrangler deploy           # deploy to production
```

## Markdown → HTML 预渲染 pipeline

```bash
#!/bin/bash
# scripts/publish-blog.sh
# ── local dev：生成 HTML → 上传 KV ──

SLUG="2025-04-28-cf-workers-blog"
MD="src/content/blog/${SLUG}.md"

# 1. Extract frontmatter + body
FRONTMATTER=$(sed -n '/^---/,/^---/p' "$MD")
BODY=$(sed '1,/^---$/d' "$MD" | sed '/^---$/,$d')

# 2. Render HTML via marked
HTML=$(echo "$BODY" | npx marked)

# 3. Upload to KV
echo "$FRONTMATTER" | wrangler kv key put "blog:${SLUG}:frontmatter" --path=-
echo "$HTML"          | wrangler kv key put "blog:${SLUG}:html" --path=-

wrangler deploy
```

## 优缺点诚实对比

| 维度               | Cloudflare Workers 博客   | Astro Content Collections |
|--------------------|--------------------------|--------------------------|
| 成本               | $0（免费 tier 足够）      | $0（Pages 免费）         |
| 开发体验            | TypeScript Workers API       | 本地 Markdown + hot reload    |
| 富文本             | 需要自己写 render 层         | TSX 直接身在 Astro 文件里     |
| 搜索               | KV full text 自建            | 集成 Algolia / FlexSearch   |
| 多语言             | KV list prefix 模拟          | Astro i18n 插件原生          |
| 排序 / 分页        | in-memory sort（<100篇无压力）| getCollection 天然排序       |
| 迁移成本            | 中等                        | 低                        |

**结论**：千篇以内的轻量博客，Workers + KV + R2 是一个完全免费、稳定、可扩展的选择。当博客需要模块化组件、SSG 等高级特性，Astro 是更好的长期架构。

---
title: "为什么我选择 Astro 而不是纯博客"
description: "从传统博客到 Astro — 我为什么需要一个项目卡片 + 上线动态 + 技术博客三位一体的个人技术门户，以及为什么 Astro Content Collections 是最佳基础设施层"
pubDate: 2025-05-20
updatedDate: 2025-05-20
featured: true
heroImage: "/blog-placeholder-3.jpg"
tags: [Astro, Personal Branding]
---

## 博客已经不是博客

我在技术领域写了四年文章，用过不少博客引擎：WordPress、Hugo、Gatsby、hexo，也试过 Jekyll。

每一代工具都解决了一个具体痛点：Hugo 快，WordPress 后台强，Gatsby 生态好。

但到了 2025 年，我意识到一个本质问题：**我没有「写博客」的问题，我有「内容架构」的问题。**

我的个人网站不止博客。它包含：

- **项目卡片页**（projects）：展示 bbfans-portal、copilot-agent-lite、kijiji-real-time-monitor 等项目状态
- **上线动态页**（changelog）：不定期发布变更记录
- **技术博客**（blog）：深度学习文章

这三类内容共享同一作者品牌，但在首页需要区分展示。

### Hugo 的困境

```markdown
# Hugo front matter
---
title: "My Post"
date: 2025-05-20
tags: [tech]
---

# Content
```

在 Hugo，这三类内容通常放在不同主题色文件夹中。每类用不同的模板渲染没问题，但用 Go template 实现跨 Collection 的关联、统一的 excerpt 生成、tag system 共享，会变成模板体力活。

### 直接上运行时存储的困境

我之前试过把内容放进运行时键值存储：

```sql
-- content schema (概念级)
key: "blog:2025-05-18-building-kijiji-monitor"
value: JSON { title, html_content, tags, pubDate }
```

这能工作，但缺点很明显：SVN archaeology。
每次改 schema 都要手动迁移 key、清理旧字段、维护 one-off 脚本。

### 为什么 Astro Content Collections？

Astro 解决的是**Git 即是 CMS**的问题。

```typescript
// src/content/config.ts
const blog = defineCollection({
  loader: glob({ base: "./src/content/blog", pattern: "**/*.{md,mdx}" }),
  schema: z.object({
    title: z.string(),
    description: z.string(),
    pubDate: z.coerce.date(),
    updatedDate: z.coerce.date().optional(),
    heroImage: z.string().optional(),
    featured: z.boolean().default(false),
  }),
});
```

每个人的 schema 不一样。这不是博客写作，这是**数据建模**。

### 一个文件 = 一段内容 = 一个事实来源

```bash
# Markdown 就是你的 CMS 数据库
ls src/content/
├── blog/       # 技术博客（.md / .mdx）
├── projects/   # 项目卡片
└── changelog/  # 上线动态
```

每次 git push → 自动构建 → 新内容上线，不需要 admin dashboard，不需要 API 调用。

### Git 是多语言版本控制，不是 CMS 版本控制

```bash
# changelog vs blog 的结构化 diff
git diff HEAD~1 src/content/changelog/...  # 上线动态变更
git diff HEAD~1 src/content/blog/...       # 博客编辑
git blame src/content/blog/2025-05-18-building-kijiji-monitor.md   # 内容溯源

# CI 会自动从 ASTRO_DATA_SHEMA 验证 frontmatter
```

博客、项目、changelog 分开追踪，git 可以单独 revert 每类。

### 可组合渲染

```mdx
import HeaderLink from '../../components/HeaderLink.astro';

<HeaderLink href="/projects/copilot-agent-lite">
  参考 copilot-agent-lite 项目
</HeaderLink>
```

Astro 的 0kb JS 默认模式 + `@astrojs/mdx` 支持在文章里直接 import 组件。Hugo/hexo 做不到这点。

### 结论

如果你只是想“写文章”，用 WordPress 或 Notion。
但如果你是一个技术工程师，想把项目状态、上线动态、个人博客全部放在同一个 Git repo，用 **Astro Content Collections**，这是当前 100% pure Git 方案的最优解。

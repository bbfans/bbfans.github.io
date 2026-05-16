---
title: "用 Playwright + Telegram 构建 Kijiji 轮毂实时监控"
description: "从头到尾搭建一名轮毂监控 agent 的技术栈选择与踩坑：Playwright 反爬对抗、Telegram bot 推送、价格历史存储、APScheduler 定时调度"
pubDate: 2025-05-18
updatedDate: 2025-05-18
featured: true
heroImage: "/blog-placeholder-4.jpg"
tags: [Playwright, Python, Telegram, Web Scraping]
---

## 从需求到技术选型

我有一组目标轮毂（BMW M Sport 19" / BMW Oe 18"），Kijiji 上供需波动剧烈——好货色经常在几分钟内出手。

我对这个问题的本质需求是：

```python
# 这不是爬虫，这是 agent 需求
goals = {
    "monitor_keywords": ["BMW M Sport 19\"", "BMW Oe 18\""],
    "schedule": "every_5_minutes",          # 不是一次，是持续
    "alert_channel": "telegram",            # 触达要即時
    "history_enabled": True,                # 价格趋势分析
    "anti_detection": "playwright_with_proxy",
}
```

### 技术栈总览

```
Playwright (headless Firefox)
    → 绕过 Kijiji Cloudflare 挑战页 / JS 渲染
    → xpath / querySelector 稳定选择器
    ↓
Python 提取层
    → price (含货币符号清洗)
    → title / url / posting_date / location
    ↓
SQLite 历史存储
    → 去重 (url unique index)
    → 价格波动记录 (timestamp + price delta)
    ↓
APScheduler 5 分钟轮询
    ↓
Telegram Bot API
    → 格式化消息 → 图片 → 内联键盘去重检查
```

## Playwright 反爬对抗

Kijiji 的基础反爬：Cloudflare Turnstile（免费版）+ 请求频率检测 + IP 封锁。

###接入基础防检测

```python
from playwright.async_api import async_playwright

async def build_browser(headless=True):
    playwright = await async_playwright().start()
    browser = await playwright.firefox.launch(
        headless=headless,
        proxy={
            "server": "socks5h://127.0.0.1:9050",  # Tor 或自建代理
        },
    )
    context = await browser.new_context(
        user_agent=(
            "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) "
            "AppleWebKit/537.36 (KHTML, like Gecko) "
            "Chrome/125.0.0.0 Safari/537.36"
        ),
        viewport={"width": 1400, "height": 900},
        locale="en-CA",
    )
    # 注入 navigator.webdriver = undefined（基础指纹脱敏）
    await context.add_init_script("""
        Object.defineProperty(navigator, 'webdriver', {
            get: () => undefined,
        });
    """)
    return browser, context
```

### 稳定选择器策略

```python
Kijiji_SEARCH_RESULTS = "div.search-item"
Kijiji_PRICE = '[data-testid="price"] span'
Kijiji_TITLE = "a.title"      # <a class="title" href=...>
Kijiji_URL = "a.title::attr(href)"

async def extract_listings(page):
    items = await page.query_selector_all("div[data-v-926ad53e] > div.search-item")
    results = []
    for el in items:
        price_raw = await el.query_selector_eval('span.price', 'el => el.textContent')
        # " $1,200 " → 1200.0
        price = float(re.sub(r'[^\d.]', '', price_raw))
        title = await el.eval_on_selector('a.title', 'el => el.textContent')
        relative_url = await el.eval_on_selector('a.title', 'el => el.href')
        results.append({"price": price, "title": title, "url": relative_url})
    return results
```

## Telegram Bot 推送

```python
import httpx

TELEGRAM_API = "https://api.telegram.org/bot" + BOT_TOKEN + "/sendPhoto"

async def send_telegram_alert(chat_id: int, listing: dict, old_price=None):
    caption = format_alert(listing, old_price)
    # 廉价 idempotency dedupe
    cache_key = f"tg:{listing['url'].split('/')[-1]}"

    async with httpx.AsyncClient() as client:
        await client.post(TELEGRAM_API, json={
            "chat_id": chat_id,
            "photo": listing.get("image_url"),
            "caption": caption,
            "parse_mode": "MarkdownV2",
            "reply_markup": {
                "inline_keyboard": [[
                    {"text": "Visit Listing", "url": listing["url"].replace("m.", "")},
                ]]
            },
        })

def format_alert(listing: dict, old_price=None) -> str:
    delta = ""
    if old_price:
        change = listing["price"] - old_price
        if change != 0:
            emoji = "📈" if change > 0 else "📉"
            delta = f"\n{emoji} 价格变动: ${abs(change):.0f}"

    return (
        f"🛞 *{escape_md(listing['title'])}*\n"
        f"💰 ${listing['price']:.0f}{delta}\n"
        f"📍 {escape_md(listing['location'])}"
    )
```

## SQLite 历史与去重

```python
import sqlite3, datetime

DB_PATH = "data/wheels.db"

def init_db():
    conn = sqlite3.connect(DB_PATH)
    conn.executescript("""
        CREATE TABLE IF NOT EXISTS listings (
            id TEXT PRIMARY KEY,          -- UUID from URL
            url TEXT UNIQUE NOT NULL,
            title TEXT NOT NULL,
            price REAL NOT NULL,
            location TEXT,
            posted_at DATETIME,
            created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
            alert_sent INTEGER DEFAULT 0
        );
        CREATE INDEX IF NOT EXISTS idx_listings_created ON listings(created_at);
    """)
    conn.close()
```

## APScheduler 定时调度

```python
from apscheduler.schedulers.asyncio import AsyncIOScheduler

scheduler = AsyncIOScheduler()

async def monitoring_job():
    new_listings = await scrape_kijiji()
    for listing in new_listings:
        if first_seen(listing["id"]):
            save_listing(listing)
            old = get_previous_price(listing["id"])
            await send_telegram_alert(CHAT_ID, listing, old_price=old)

# CLI 开关，不重启服务就能动态修改调度
# schedule.yaml:
#   interval_minutes: 5
#   enabled: true
```

## 踩坑实录

| 坑          | 根因                          | 解法                                   |
|-------------|-------------------------------|----------------------------------------|
| Kijiji 验证页  | Cloudflare Turnstile          | 首次 headful 登录存 cookie，后续复用  |
| price 解析     | "$ 1, 200 . 00" 格式混乱      | `re.sub(r'[^\d.]', '', raw)` 剥离所有符号 |
| 重复推送       | 同一 listing 在多次抓取中出现  | `url UNIQUE index` + `alert_sent` flag  |
| Telegram 超长消息 | caption 4096 字符限制         | 截断到 4000 字符，附 "..." 和原文链接     |
| 代理黑名单    | 免费代理周期性拉黑              | proxy 列表健康检查 + 自动降级到直连     |

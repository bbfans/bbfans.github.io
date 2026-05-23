# Markdown Negotiation

GitHub Pages cannot perform content negotiation on `Accept: text/markdown`.

bbfans.github.io provides static markdown content at source-compatible URLs through the public repository and keeps blog posts authored in Markdown. A future Cloudflare Worker can add true Markdown for Agents support by returning `Content-Type: text/markdown` when agents send `Accept: text/markdown`.


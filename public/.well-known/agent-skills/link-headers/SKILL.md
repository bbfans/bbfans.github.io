# Link Discovery

bbfans.github.io advertises useful agent discovery resources with HTML `<link>` elements:

- `/.well-known/api-catalog` with `rel="api-catalog"`
- `/openapi.json` with `rel="service-desc"`
- `/docs/api/` with `rel="service-doc"`
- `/.well-known/agent-skills/index.json` with `rel="service-desc"`
- `/.well-known/mcp/server-card.json` with `rel="mcp-server-card"`

GitHub Pages does not support custom response headers. If the site moves behind Cloudflare Workers or Pages Functions, these same relations should also be emitted as RFC 8288 `Link` response headers.


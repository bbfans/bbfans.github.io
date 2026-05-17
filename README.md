# bbfans

Personal engineering portal for bbfans.

Live sites:

- GitHub Pages: https://bbfans.github.io/
- Cloudflare Workers: https://bbfans-portal.jiechen2013.workers.dev/

## What This Site Contains

- Homepage with project highlights and recent shipping notes
- Blog posts and changelog entries from local content collections
- Dark mode support
- Responsive mobile layout
- PWA manifest and service worker for Android install support
- Admin portal deployed on Cloudflare Workers

## Project Layout

```text
src/components/        Shared layout and page components
src/content/blog/      Blog posts
src/content/changelog/ Release and shipping notes
src/content/projects/  Project cards shown on the homepage
src/pages/             Site routes and API endpoints
public/                Static assets, PWA files, fonts, and images
wrangler.json          Cloudflare Workers deployment config
```

## Development

Install dependencies:

```bash
npm install
```

Start the local dev server:

```bash
npm run dev
```

Build the site:

```bash
npm run build
```

Run the project check:

```bash
npm run check
```

Deploy to Cloudflare Workers:

```bash
npm run deploy
```

GitHub Pages is deployed by the workflow in `.github/workflows/pages.yml` when changes are pushed to `main`.

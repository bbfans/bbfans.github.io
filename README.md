# bbfans

Personal engineering portal for bbfans.

Live site: https://bbfans.github.io/

## What This Site Contains

- Homepage with project highlights and recent shipping notes
- Blog posts and changelog entries from local content collections
- Dark mode support
- Responsive mobile layout
- PWA manifest for Android install support

## Project Layout

```text
src/components/        Shared layout and page components
src/content/blog/      Blog posts
src/content/changelog/ Release and shipping notes
src/content/projects/  Project cards shown on the homepage
src/pages/             Site routes
public/                Static assets, PWA files, fonts, and images
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

Deploy the admin runtime:

```bash
npm run deploy
```

GitHub Pages is deployed by the workflow in `.github/workflows/pages.yml` when changes are pushed to `main`.

## To Do

- Raise the Agent Ready score from Level 2 / 83 by adding real `Link` response headers on the homepage.
- Support `Accept: text/markdown` for agent requests so the homepage can return Markdown instead of only HTML.
- These two items need an edge layer or hosting change; GitHub Pages alone cannot emit the required response headers or content negotiation.

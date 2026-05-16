// @ts-check
import { defineConfig } from "astro/config";
import mdx from "@astrojs/mdx";
import sitemap from "@astrojs/sitemap";

import cloudflare from "@astrojs/cloudflare";

// https://astro.build/config
export default defineConfig({
	site: "https://bbfans.github.io",
	integrations: [mdx(), sitemap()],
	adapter: cloudflare({
		platformProxy: {
			enabled: true,
			imageService: "compile",
		},
		r2Buckets: [
			{
				binding: "BLOG_IMAGES",
				bucketName: "blog-images-1001020",
			},
		],
		kvNamespaces: [
			{
				binding: "BLOG_STORE",
				id: "4e44ac1e80ca413d9f97342e3861a39d",
			},
		],
	}),
});

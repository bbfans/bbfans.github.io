import { glob } from "astro/loaders";
import { defineCollection, z } from "astro:content";

const blog = defineCollection({
	loader: glob({ base: "./src/content/blog", pattern: "**/*.{md,mdx}" }),
	schema: z.object({
		title: z.string(),
		description: z.string(),
		pubDate: z.coerce.date(),
		updatedDate: z.coerce.date().optional(),
		heroImage: z.string().optional(),
		featured: z.boolean().default(false),
		published: z.boolean().default(true),
	}),
});

const projects = defineCollection({
	loader: glob({ base: "./src/content/projects", pattern: "**/*.{md,mdx}" }),
	schema: z.object({
		title: z.string(),
		description: z.string(),
		tags: z.array(z.string()).default([]),
		url: z.string().optional(),
		repo: z.string().optional(),
		status: z.enum(["active", "shipping", "deprecated"]).default("active"),
		highlight: z.boolean().default(false),
		published: z.boolean().default(true),
		heroImage: z.string().optional(),
		pubDate: z.coerce.date().optional(),
	}),
});

const changelog = defineCollection({
	loader: glob({ base: "./src/content/changelog", pattern: "**/*.{md,mdx}" }),
	schema: z.object({
		title: z.string(),
		description: z.string(),
		pubDate: z.coerce.date(),
		changeType: z.enum(["new", "update", "deprecated"]),
		project: z.string().optional(),
		repo: z.string().optional(),
		published: z.boolean().default(true),
	}),
});

export const collections = { blog, projects, changelog };

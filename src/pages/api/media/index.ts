import type { APIContext } from "astro";

export const prerender = false;

const GITHUB_REPO = "bbfans/bbfans.github.io";
const R2_PREFIX = "blog-images/";
const PUBLIC_BASE_URL = "https://img.1001020.xyz";

type GitHubRepoResponse = {
	permissions?: {
		admin?: boolean;
		maintain?: boolean;
		push?: boolean;
	};
};

type MediaObject = {
	key: string;
	url: string;
	size: number;
	uploaded: string | null;
	contentType: string | null;
};

function json(body: unknown, status = 200): Response {
	return new Response(JSON.stringify(body), {
		status,
		headers: { "Content-Type": "application/json" },
	});
}

function getBucket(locals: APIContext["locals"]): R2Bucket | undefined {
	return locals.runtime?.env.BLOG_IMAGES
		?? (globalThis as unknown as { BLOG_IMAGES?: R2Bucket }).BLOG_IMAGES;
}

function getToken(request: Request): string {
	const authHeader = request.headers.get("Authorization") ?? "";
	const [, token] = authHeader.match(/^Bearer\s+(.+)$/i) ?? [];
	return token ?? "";
}

async function requireRepoWriteAccess(request: Request): Promise<Response | null> {
	const token = getToken(request);

	if (!token) {
		return json({ error: "Missing GitHub access token" }, 401);
	}

	const repoResponse = await fetch(`https://api.github.com/repos/${GITHUB_REPO}`, {
		headers: {
			Accept: "application/vnd.github+json",
			Authorization: `Bearer ${token}`,
			"User-Agent": "bbfans-portal-r2-media",
			"X-GitHub-Api-Version": "2022-11-28",
		},
	});

	if (!repoResponse.ok) {
		return json({ error: "Could not verify GitHub repository access" }, 403);
	}

	const repo = (await repoResponse.json()) as GitHubRepoResponse;
	const permissions = repo.permissions ?? {};
	if (!permissions.admin && !permissions.maintain && !permissions.push) {
		return json({ error: "GitHub token does not have write access to this repository" }, 403);
	}

	return null;
}

function safeFilename(name: string): string {
	const fallback = "upload";
	const cleaned = name
		.trim()
		.split(/[\\/]/)
		.pop()
		?.replace(/[^a-zA-Z0-9._-]+/g, "-")
		.replace(/^-+|-+$/g, "");

	return cleaned || fallback;
}

function mediaUrl(key: string): string {
	return `${PUBLIC_BASE_URL}/${key}`;
}

function isAllowedKey(key: string): boolean {
	return key.startsWith(R2_PREFIX) && !key.includes("..");
}

export async function GET({ locals, request }: APIContext): Promise<Response> {
	const denied = await requireRepoWriteAccess(request);
	if (denied) return denied;

	const bucket = getBucket(locals);
	if (!bucket) return json({ error: "BLOG_IMAGES R2 binding is not available" }, 500);

	const url = new URL(request.url);
	const cursor = url.searchParams.get("cursor") ?? undefined;
	const limit = Math.min(Number(url.searchParams.get("limit") ?? 100), 200);
	const result = await bucket.list({
		prefix: R2_PREFIX,
		cursor,
		limit,
		include: ["httpMetadata"],
	});

	const objects: MediaObject[] = result.objects.map((object) => ({
		key: object.key,
		url: mediaUrl(object.key),
		size: object.size,
		uploaded: object.uploaded?.toISOString() ?? null,
		contentType: object.httpMetadata?.contentType ?? null,
	}));

	return json({
		bucket: "bbfans-portal-images",
		prefix: R2_PREFIX,
		publicBaseUrl: PUBLIC_BASE_URL,
		objects,
		truncated: result.truncated,
		cursor: result.truncated ? result.cursor : null,
	});
}

export async function PATCH({ locals, request }: APIContext): Promise<Response> {
	const denied = await requireRepoWriteAccess(request);
	if (denied) return denied;

	const bucket = getBucket(locals);
	if (!bucket) return json({ error: "BLOG_IMAGES R2 binding is not available" }, 500);

	const formData = await request.formData();
	const file = formData.get("file");
	if (!(file instanceof File)) {
		return json({ error: "No file provided" }, 400);
	}

	const key = `${R2_PREFIX}${Date.now()}-${safeFilename(file.name)}`;
	await bucket.put(key, await file.arrayBuffer(), {
		httpMetadata: {
			contentType: file.type || "application/octet-stream",
		},
	});

	return json({
		key,
		url: mediaUrl(key),
		size: file.size,
		contentType: file.type || "application/octet-stream",
	});
}

export async function DELETE({ locals, request }: APIContext): Promise<Response> {
	const denied = await requireRepoWriteAccess(request);
	if (denied) return denied;

	const bucket = getBucket(locals);
	if (!bucket) return json({ error: "BLOG_IMAGES R2 binding is not available" }, 500);

	const url = new URL(request.url);
	const key = url.searchParams.get("key") ?? "";
	if (!isAllowedKey(key)) {
		return json({ error: "Invalid media key" }, 400);
	}

	await bucket.delete(key);
	return json({ ok: true, key });
}

export async function OPTIONS(): Promise<Response> {
	return new Response(null, {
		headers: {
			"Access-Control-Allow-Methods": "GET, PATCH, DELETE, OPTIONS",
			"Access-Control-Allow-Headers": "Authorization, Content-Type",
			"Access-Control-Max-Age": "86400",
		},
	});
}

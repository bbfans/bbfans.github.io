const GITHUB_REPO = "bbfans/bbfans.github.io";
const DEFAULT_REDIRECT_URI = "https://bbfans-portal.jiechen2013.workers.dev/api/auth";
const R2_PREFIX = "blog-img/";
const PUBLIC_IMAGE_BASE_URL = "https://img.1001020.xyz";

function json(body, status = 200) {
	return new Response(JSON.stringify(body), {
		status,
		headers: { "Content-Type": "application/json; charset=utf-8" },
	});
}

function html(body, status = 200) {
	return new Response(body, {
		status,
		headers: { "Content-Type": "text/html; charset=utf-8" },
	});
}

function envValue(env, name) {
	return env && typeof env[name] === "string" ? env[name] : "";
}

function cmsAdminHtml() {
	return html(`<!DOCTYPE html>
<html lang="en">
<head>
	<meta charset="UTF-8" />
	<meta name="viewport" content="width=device-width, initial-scale=1.0" />
	<meta name="robots" content="noindex" />
	<title>CMS Admin - bbfans-portal</title>
	<style>
		body{background:#f5f5f5;margin:0}
		.r2-media-link{position:fixed;right:1rem;bottom:1rem;z-index:9999;display:inline-flex;align-items:center;justify-content:center;min-height:40px;padding:.55rem .85rem;border-radius:6px;background:#111827;color:#fff;font:600 14px/1.2 system-ui,-apple-system,BlinkMacSystemFont,"Segoe UI",sans-serif;text-decoration:none;box-shadow:0 10px 24px rgba(0,0,0,.18)}
	</style>
</head>
<body>
	<a class="r2-media-link" href="/admin/r2-media/">R2 Media</a>
	<script>
		if (window.location.hash === '#/media') window.location.replace('/admin/r2-media/');
		window.addEventListener('hashchange', () => {
			if (window.location.hash === '#/media') window.location.replace('/admin/r2-media/');
		});
		window.CMS_MANUAL_INIT = true;
	</script>
	<script>
		window.CONFIG = {
			load_config_file: false,
			backend: {
				name: 'github',
				repo: 'bbfans/bbfans.github.io',
				branch: 'main',
				base_url: 'https://bbfans-portal.jiechen2013.workers.dev',
				auth_endpoint: '/api/auth',
			},
			media_folder: 'public/blog-images',
			public_folder: 'https://img.1001020.xyz',
			collections: [
				{
					name: 'blog',
					label: 'Posts',
					folder: 'src/content/blog',
					create: true,
					slug: '{{year}}-{{month}}-{{slug}}',
					summary: '{{title}} - {{published}} / homepage: {{featured}}',
					fields: [
						{ label: 'Title', name: 'title', widget: 'string', required: true },
						{ label: 'Description', name: 'description', widget: 'text', required: true },
						{ label: 'Publish Date', name: 'pubDate', widget: 'datetime', required: true, format: 'YYYY-MM-DD' },
						{ label: 'Published', name: 'published', widget: 'boolean', default: false, required: false },
						{ label: 'Show on homepage', name: 'featured', widget: 'boolean', default: false, required: false },
						{ label: 'Tags', name: 'tags', widget: 'list', required: false, default: [] },
						{ label: 'Hero Image URL', name: 'heroImage', widget: 'string', required: false, hint: 'Open R2 Media, upload/select an image from blog-images-1001020, then paste the copied https://img.1001020.xyz/blog-img/... URL here.' },
						{ label: 'Body', name: 'body', widget: 'markdown', required: true },
					],
				},
				{
					name: 'projects',
					label: 'Projects',
					folder: 'src/content/projects',
					create: true,
					slug: '{{slug}}',
					summary: '{{title}} - {{published}} / homepage: {{highlight}}',
					fields: [
						{ label: 'Title', name: 'title', widget: 'string', required: true },
						{ label: 'Description', name: 'description', widget: 'text', required: true },
						{ label: 'Status', name: 'status', widget: 'select', options: ['active', 'shipping', 'deprecated'], default: 'active' },
						{ label: 'Show on homepage', name: 'highlight', widget: 'boolean', default: false, required: false },
						{ label: 'Published', name: 'published', widget: 'boolean', default: false, required: false },
						{ label: 'URL', name: 'url', widget: 'string', required: false },
						{ label: 'Repo', name: 'repo', widget: 'string', required: false },
						{ label: 'Tags', name: 'tags', widget: 'list', required: false, default: [] },
						{ label: 'Hero Image URL', name: 'heroImage', widget: 'string', required: false, hint: 'Open R2 Media, upload/select an image from blog-images-1001020, then paste the copied https://img.1001020.xyz/blog-img/... URL here.' },
						{ label: 'Publish Date', name: 'pubDate', widget: 'datetime', required: false, format: 'YYYY-MM-DD' },
						{ label: 'Body', name: 'body', widget: 'markdown', required: true },
					],
				},
				{
					name: 'changelog',
					label: 'Changelog',
					folder: 'src/content/changelog',
					create: true,
					slug: '{{year}}-{{month}}-{{slug}}',
					summary: '{{title}} - {{published}}',
					fields: [
						{ label: 'Title', name: 'title', widget: 'string', required: true },
						{ label: 'Published', name: 'published', widget: 'boolean', default: false, required: false },
						{ label: 'Description', name: 'description', widget: 'text', required: true },
						{ label: 'Publish Date', name: 'pubDate', widget: 'datetime', required: true, format: 'YYYY-MM-DD' },
						{ label: 'Change Type', name: 'changeType', widget: 'select', options: ['new', 'update', 'deprecated'], default: 'new' },
						{ label: 'Project', name: 'project', widget: 'string', required: false },
						{ label: 'Repo', name: 'repo', widget: 'string', required: false },
						{ label: 'Body', name: 'body', widget: 'markdown', required: true },
					],
				},
			],
		};
		if (window.location.pathname !== '/admin/' && window.location.pathname.startsWith('/admin/')) {
			window.location.replace('/admin/');
		}
	</script>
	<script src="https://unpkg.com/decap-cms@^3.0.0/dist/decap-cms.js" onload="window.initCMS({ config: window.CONFIG })"></script>
</body>
</html>`);
}

function callbackHtml(status, payload) {
	const message = `authorization:github:${status}:${JSON.stringify(payload)}`;
	return html(`<!DOCTYPE html>
<html lang="en">
<head>
	<meta charset="utf-8">
	<title>Authorizing Decap</title>
	<script>
		const receiveMessage = () => {
			window.opener.postMessage(${JSON.stringify(message)}, "*");
			window.removeEventListener("message", receiveMessage, false);
		};
		window.addEventListener("message", receiveMessage, false);
		window.opener.postMessage("authorizing:github", "*");
	</script>
</head>
<body><p>Authorizing Decap...</p></body>
</html>`);
}

async function handleAuth(request, env) {
	const githubClientId = envValue(env, "GITHUB_CLIENT_ID");
	const githubClientSecret = envValue(env, "GITHUB_CLIENT_SECRET");
	const redirectUri = envValue(env, "GITHUB_REDIRECT_URI") || DEFAULT_REDIRECT_URI;
	const url = new URL(request.url);

	if (request.method === "GET") {
		const code = url.searchParams.get("code");
		if (!githubClientId) return json({ error: "GITHUB_CLIENT_ID is not set on the server" }, 500);

		if (code) {
			if (!githubClientSecret) {
				return callbackHtml("error", { error: "GitHub OAuth secret is not set on the server" });
			}

			const tokenRes = await fetch("https://github.com/login/oauth/access_token", {
				method: "POST",
				headers: { "Content-Type": "application/json", Accept: "application/json" },
				body: JSON.stringify({
					client_id: githubClientId,
					client_secret: githubClientSecret,
					code,
					redirect_uri: redirectUri,
				}),
			});
			const data = await tokenRes.json();
			if (!data.access_token) {
				return callbackHtml("error", {
					error: data.error_description || data.error || "GitHub did not return an access token",
				});
			}
			return callbackHtml("success", { token: data.access_token });
		}

		const authUrl =
			"https://github.com/login/oauth/authorize" +
			"?response_type=code" +
			`&client_id=${encodeURIComponent(githubClientId)}` +
			`&redirect_uri=${encodeURIComponent(redirectUri)}` +
			`&scope=${encodeURIComponent("public_repo,user")}`;
		return Response.redirect(authUrl, 302);
	}

	if (request.method === "POST") {
		const body = await request.json().catch(() => ({}));
		const code = body && typeof body === "object" ? body.code : "";
		if (!githubClientId || !githubClientSecret) {
			return json({ error: "GitHub OAuth env vars not set on the server" }, 500);
		}
		if (!code) return json({ error: "Missing `code` in request body" }, 400);

		const tokenRes = await fetch("https://github.com/login/oauth/access_token", {
			method: "POST",
			headers: { "Content-Type": "application/json", Accept: "application/json" },
			body: JSON.stringify({
				client_id: githubClientId,
				client_secret: githubClientSecret,
				code,
				redirect_uri: redirectUri,
			}),
		});
		const data = await tokenRes.json();
		if (data.error) return json({ error: data.error_description || data.error }, 400);
		return json({ token: data.access_token, provider: "github", repo: GITHUB_REPO });
	}

	return new Response("Method not allowed", { status: 405 });
}

function getBearerToken(request) {
	const authHeader = request.headers.get("Authorization") || "";
	const match = authHeader.match(/^Bearer\s+(.+)$/i);
	return match ? match[1] : "";
}

async function requireRepoWriteAccess(request) {
	const token = getBearerToken(request);
	if (!token) return json({ error: "Missing GitHub access token" }, 401);

	const repoResponse = await fetch(`https://api.github.com/repos/${GITHUB_REPO}`, {
		headers: {
			Accept: "application/vnd.github+json",
			Authorization: `Bearer ${token}`,
			"User-Agent": "bbfans-portal-r2-media",
			"X-GitHub-Api-Version": "2022-11-28",
		},
	});
	if (!repoResponse.ok) return json({ error: "Could not verify GitHub repository access" }, 403);

	const repo = await repoResponse.json();
	const permissions = repo.permissions || {};
	if (!permissions.admin && !permissions.maintain && !permissions.push) {
		return json({ error: "GitHub token does not have write access to this repository" }, 403);
	}
	return null;
}

function safeFilename(name) {
	return (
		String(name || "upload")
			.trim()
			.split(/[\\/]/)
			.pop()
			.replace(/[^a-zA-Z0-9._-]+/g, "-")
			.replace(/^-+|-+$/g, "") || "upload"
	);
}

function isUploadedFile(value) {
	return value && typeof value === "object" && typeof value.name === "string" && typeof value.arrayBuffer === "function";
}

function mediaUrl(key) {
	return `${PUBLIC_IMAGE_BASE_URL}/${key}`;
}

async function handleMediaApi(request, env) {
	const denied = await requireRepoWriteAccess(request);
	if (denied) return denied;
	if (!env.BLOG_IMAGES) return json({ error: "BLOG_IMAGES R2 binding is not available" }, 500);

	const url = new URL(request.url);
	if (request.method === "GET") {
		const result = await env.BLOG_IMAGES.list({
			prefix: R2_PREFIX,
			cursor: url.searchParams.get("cursor") || undefined,
			limit: Math.min(Number(url.searchParams.get("limit") || 100), 200),
			include: ["httpMetadata"],
		});
		return json({
			prefix: R2_PREFIX,
			publicBaseUrl: PUBLIC_IMAGE_BASE_URL,
			objects: result.objects.map((object) => ({
				key: object.key,
				url: mediaUrl(object.key),
				size: object.size,
				uploaded: object.uploaded ? object.uploaded.toISOString() : null,
				contentType: object.httpMetadata?.contentType || null,
			})),
			truncated: result.truncated,
			cursor: result.truncated ? result.cursor : null,
		});
	}

	if (request.method === "PATCH") {
		const formData = await request.formData();
		const file = formData.get("file");
		if (!isUploadedFile(file)) return json({ error: "No file provided" }, 400);

		const key = `${R2_PREFIX}${Date.now()}-${safeFilename(file.name)}`;
		await env.BLOG_IMAGES.put(key, await file.arrayBuffer(), {
			httpMetadata: { contentType: file.type || "application/octet-stream" },
		});
		return json({ key, url: mediaUrl(key), size: file.size, contentType: file.type || "application/octet-stream" });
	}

	if (request.method === "DELETE") {
		const key = url.searchParams.get("key") || "";
		if (!key.startsWith(R2_PREFIX) || key.includes("..")) return json({ error: "Invalid media key" }, 400);
		await env.BLOG_IMAGES.delete(key);
		return json({ ok: true, key });
	}

	if (request.method === "OPTIONS") {
		return new Response(null, {
			headers: {
				"Access-Control-Allow-Methods": "GET, PATCH, DELETE, OPTIONS",
				"Access-Control-Allow-Headers": "Authorization, Content-Type",
				"Access-Control-Max-Age": "86400",
			},
		});
	}

	return new Response("Method not allowed", { status: 405 });
}

function r2MediaHtml() {
	return html(`<!DOCTYPE html>
<html lang="en">
<head>
	<meta charset="UTF-8" />
	<meta name="viewport" content="width=device-width, initial-scale=1.0" />
	<meta name="robots" content="noindex" />
	<title>R2 Media - bbfans</title>
	<style>
		body{margin:0;background:#f7f8fb;color:#151923;font-family:system-ui,-apple-system,BlinkMacSystemFont,"Segoe UI",sans-serif}
		header,main{width:min(1120px,calc(100% - 2rem));margin:0 auto}
		header{display:flex;justify-content:space-between;align-items:center;padding:1.25rem 0}
		button,a.button{display:inline-flex;align-items:center;justify-content:center;min-height:40px;padding:.5rem .8rem;border:1px solid #dfe4ec;border-radius:6px;background:#fff;color:#151923;text-decoration:none;cursor:pointer}
		button.primary{background:#2347d7;border-color:#2347d7;color:#fff}
		.toolbar{display:flex;justify-content:space-between;gap:.75rem;flex-wrap:wrap;padding:1rem;background:#fff;border:1px solid #dfe4ec;border-radius:8px;margin-bottom:1rem}
		.grid{display:grid;grid-template-columns:repeat(auto-fill,minmax(190px,1fr));gap:1rem;padding-bottom:3rem}
		.card{overflow:hidden;background:#fff;border:1px solid #dfe4ec;border-radius:8px}
		.preview{display:grid;place-items:center;aspect-ratio:4/3;background:#eef2f7}
		.preview img{width:100%;height:100%;object-fit:cover}
		.file{padding:.75rem}.filename{overflow-wrap:anywhere;font-weight:700}.meta,.status{color:#5f6b7a}.error{color:#b42318}
	</style>
</head>
<body>
	<header><h1>R2 Media</h1><a class="button" href="/admin/">Back to CMS</a></header>
	<main>
		<section id="auth" hidden><a class="button primary" href="/api/auth" target="_blank">Login with GitHub</a></section>
		<section class="toolbar">
			<div><strong>Images</strong><div class="meta" id="summary">Loading...</div></div>
			<div><input id="file" type="file" accept="image/*" /> <button class="primary" id="upload">Upload</button> <button id="refresh">Refresh</button></div>
		</section>
		<div class="status" id="status"></div>
		<section class="grid" id="grid"></section>
	</main>
	<script>
		const grid = document.querySelector('#grid');
		const statusEl = document.querySelector('#status');
		const summary = document.querySelector('#summary');
		const auth = document.querySelector('#auth');
		const file = document.querySelector('#file');
		function setStatus(message, error = false) { statusEl.textContent = message; statusEl.classList.toggle('error', error); }
		function token() {
			const raw = localStorage.getItem('decap-cms-user') || localStorage.getItem('netlify-cms-user');
			if (!raw) return '';
			try { const parsed = JSON.parse(raw); return parsed.token || parsed.backend?.token || parsed.auth_token || ''; } catch { return ''; }
		}
		async function api(path, options = {}) {
			const accessToken = token();
			auth.hidden = Boolean(accessToken);
			if (!accessToken) throw new Error('Login with GitHub first, then refresh this page.');
			const response = await fetch(path, { ...options, headers: { ...(options.headers || {}), Authorization: 'Bearer ' + accessToken } });
			const data = await response.json().catch(() => ({}));
			if (!response.ok) throw new Error(data.error || 'Request failed with ' + response.status);
			return data;
		}
		function render(items) {
			summary.textContent = items.length + ' file' + (items.length === 1 ? '' : 's') + ' in R2';
			grid.innerHTML = '';
			for (const item of items) {
				const card = document.createElement('article');
				card.className = 'card';
				card.innerHTML = '<div class="preview"><img alt="" src="' + item.url + '"></div><div class="file"><div class="filename">' + item.key.split('/').pop() + '</div><div class="meta">' + item.key + '</div><button type="button">Copy URL</button></div>';
				card.querySelector('button').addEventListener('click', async () => {
					await navigator.clipboard.writeText(item.url);
					setStatus('Copied ' + item.url);
				});
				grid.append(card);
			}
		}
		async function load() {
			setStatus('Loading R2 media...');
			try { const data = await api('/api/media'); render(data.objects || []); setStatus(''); }
			catch (error) { grid.innerHTML = ''; summary.textContent = 'Could not load media'; setStatus(error.message, true); }
		}
		async function upload() {
			if (!file.files?.[0]) return setStatus('Choose an image first.', true);
			const form = new FormData();
			form.append('file', file.files[0]);
			try {
				const data = await api('/api/media', { method: 'PATCH', body: form });
				await navigator.clipboard.writeText(data.url);
				file.value = '';
				setStatus('Uploaded and copied ' + data.url);
				await load();
			} catch (error) { setStatus(error.message, true); }
		}
		window.addEventListener('message', (event) => {
			if (typeof event.data !== 'string') return;
			if (event.data === 'authorizing:github') { event.source?.postMessage('authorizing:github', event.origin); return; }
			if (!event.data.startsWith('authorization:github:success:')) return;
			const payload = JSON.parse(event.data.replace('authorization:github:success:', ''));
			localStorage.setItem('decap-cms-user', JSON.stringify({ token: payload.token }));
			auth.hidden = true;
			load();
		});
		document.querySelector('#refresh').addEventListener('click', load);
		document.querySelector('#upload').addEventListener('click', upload);
		load();
	</script>
</body>
</html>`);
}

export default {
	async fetch(request, env) {
		const url = new URL(request.url);
		if (url.pathname === "/admin" || url.pathname === "/admin/") return cmsAdminHtml();
		if (url.pathname === "/admin/r2-media" || url.pathname === "/admin/r2-media/") return r2MediaHtml();
		if (url.pathname === "/api/auth") return handleAuth(request, env);
		if (url.pathname === "/api/media") return handleMediaApi(request, env);
		return Response.redirect(`https://bbfans.github.io${url.pathname}${url.search}`, 302);
	},
};

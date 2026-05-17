// src/pages/api/auth.ts
// Astro server endpoint — GitHub OAuth for Decap CMS GitHub backend
// GET  /api/auth  → redirect to GitHub OAuth consent page
// POST /api/auth  → exchange OAuth code for access token

import { env as cloudflareEnv } from "cloudflare:workers";

export const prerender = false;

type OAuthRequestBody = {
  code?: string;
};

type GitHubTokenResponse = {
  access_token?: string;
  error?: string;
  error_description?: string;
};

function envValue(name: string): string {
  const runtimeEnv = cloudflareEnv as unknown as Record<string, string | undefined>;
  return runtimeEnv[name] ?? process.env[name] ?? "";
}

// GitHub OAuth credentials — read from Cloudflare Worker secrets, with process.env as local fallback.
const GITHUB_REPO = envValue("GITHUB_REPO") || "bbfans/bbfans.github.io";
const DEFAULT_REDIRECT_URI = "https://bbfans-portal.jiechen2013.workers.dev/api/auth";

/** JSON response helper */
function json(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json" },
  });
}

function callbackHtml(status: "success" | "error", payload: Record<string, string>): Response {
  const message = `authorization:github:${status}:${JSON.stringify(payload)}`;

  return new Response(
    `<!DOCTYPE html>
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
<body>
  <p>Authorizing Decap...</p>
</body>
</html>`,
    {
      headers: { "Content-Type": "text/html; charset=utf-8" },
    },
  );
}

/** GET /api/auth — redirect the user to GitHub OAuth consent */
export const GET = async (req: Request): Promise<Response> => {
  const githubClientId = envValue("GITHUB_CLIENT_ID");
  const githubClientSecret = envValue("GITHUB_CLIENT_SECRET");

  if (!githubClientId) {
    return json({ error: "GITHUB_CLIENT_ID is not set on the server" }, 500);
  }

  const redirectUri = envValue("GITHUB_REDIRECT_URI") || DEFAULT_REDIRECT_URI;
  const url = new URL(req.url);
  const code = url.searchParams.get("code");

  if (code) {
    if (!githubClientSecret) {
      return callbackHtml("error", { error: "GitHub OAuth secret is not set on the server" });
    }

    const tokenRes = await fetch("https://github.com/login/oauth/access_token", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Accept: "application/json",
      },
      body: JSON.stringify({
        client_id: githubClientId,
        client_secret: githubClientSecret,
        code,
        redirect_uri: redirectUri,
      }),
    });

    const data = await tokenRes.json() as GitHubTokenResponse;

    if (!data.access_token) {
      return callbackHtml("error", {
        error: data.error_description || data.error || "GitHub did not return an access token",
      });
    }

    return callbackHtml("success", { token: data.access_token });
  }

  const scope = "public_repo,user";

  const authUrl =
    "https://github.com/login/oauth/authorize" +
    "?response_type=code" +
    `&client_id=${encodeURIComponent(githubClientId)}` +
    `&redirect_uri=${encodeURIComponent(redirectUri)}` +
    `&scope=${encodeURIComponent(scope)}`;

  return Response.redirect(authUrl, 302);
};

/** POST /api/auth — exchange the OAuth code for an access token */
export const POST = async (req: Request): Promise<Response> => {
  const githubClientId = envValue("GITHUB_CLIENT_ID");
  const githubClientSecret = envValue("GITHUB_CLIENT_SECRET");
  const body = await req.json().catch((): OAuthRequestBody => ({}));
  const code = typeof body === "object" && body !== null ? (body as OAuthRequestBody).code : undefined;

  if (!githubClientId || !githubClientSecret) {
    return json({ error: "GitHub OAuth env vars not set on the server" }, 500);
  }
  if (!code) {
    return json({ error: "Missing `code` in request body" }, 400);
  }

  const tokenRes = await fetch("https://github.com/login/oauth/access_token", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Accept: "application/json",
    },
    body: JSON.stringify({
      client_id:     githubClientId,
      client_secret: githubClientSecret,
      code,
    }),
  });

  const data = await tokenRes.json() as GitHubTokenResponse;

  if (data.error) {
    return json({ error: data.error_description || data.error }, 400);
  }

  // Return the token payload for clients that perform token exchange via POST.
  return json({
    token:    data.access_token,
    provider: "github",
    repo:     GITHUB_REPO,
  });
};

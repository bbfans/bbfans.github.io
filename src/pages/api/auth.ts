// src/pages/api/auth.ts
// Astro server endpoint — GitHub OAuth for Decap CMS git-gateway backend
// GET  /api/auth  → redirect to GitHub OAuth consent page
// POST /api/auth  → exchange OAuth code for access token (called by git-gateway)

// GitHub OAuth credentials — read from Astro platform env (set in wrangler.jsonc or .env)
const GITHUB_CLIENT_ID     = process.env.GITHUB_CLIENT_ID ?? "";
const GITHUB_CLIENT_SECRET = process.env.GITHUB_CLIENT_SECRET ?? "";
const GITHUB_REDIRECT_URI  = process.env.GITHUB_REDIRECT_URI ?? "";
const GITHUB_REPO          = process.env.GITHUB_REPO ?? "bbfans/bbfans.github.io";

/** JSON response helper */
function json(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json" },
  });
}

/** GET /api/auth — redirect the user to GitHub OAuth consent */
export const GET = async (_req: Request): Promise<Response> => {
  if (!GITHUB_CLIENT_ID) {
    return json({ error: "GITHUB_CLIENT_ID is not set on the server" }, 500);
  }

  const redirectUri = GITHUB_REDIRECT_URI || "https://bbfans-portal.pages.dev/api/auth";
  const scope = "public_repo";

  const authUrl =
    "https://github.com/login/oauth/authorize" +
    `?client_id=${encodeURIComponent(GITHUB_CLIENT_ID)}` +
    `&redirect_uri=${encodeURIComponent(redirectUri)}` +
    `&scope=${encodeURIComponent(scope)}`;

  return Response.redirect(authUrl, 302);
};

/** POST /api/auth — exchange the OAuth code for an access token */
export const POST = async (req: Request): Promise<Response> => {
  const body  = await req.json().catch(() => ({} as { code?: string }));
  const code  = body.code;

  if (!GITHUB_CLIENT_ID || !GITHUB_CLIENT_SECRET) {
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
      client_id:     GITHUB_CLIENT_ID,
      client_secret: GITHUB_CLIENT_SECRET,
      code,
    }),
  });

  const data = await tokenRes.json();

  if (data.error) {
    return json({ error: data.error_description || data.error }, 400);
  }

  // Return the token payload git-gateway expects
  return json({
    token:    data.access_token,
    provider: "github",
    repo:     GITHUB_REPO,
  });
};

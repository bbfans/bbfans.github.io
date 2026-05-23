export const prerender = true;

export const GET = () =>
	new Response(
		JSON.stringify({
			status: 'ok',
			site: 'bbfans.github.io',
			agent_native: true,
			homepage: 'https://bbfans.github.io/',
			api_catalog: 'https://bbfans.github.io/.well-known/api-catalog',
			skills: 'https://bbfans.github.io/.well-known/agent-skills/index.json',
		}),
		{
			headers: {
				'Content-Type': 'application/json; charset=utf-8',
			},
		},
	);
